import './shim'; // Polyfills for node-rsa
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StyleSheet, StatusBar, Platform, AppState, AppRegistry } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './src/store/store';
import { fetchMetadata, checkAppConfig } from './src/store/slices/configSlice';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';
import GlobalReminderPopup from './src/components/GlobalReminderPopup';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import UpdateRequiredScreen from './src/screens/UpdateRequiredScreen';
import SubscriptionExpiredScreen from './src/screens/SubscriptionExpiredScreen';
import { setupAxiosInterceptors } from './src/api/axiosClient';
import CallLogService from './src/services/CallLogService';
import RecordingSyncService from './src/services/RecordingSyncService';
import { SocketProvider } from './src/context/SocketContext';

// Setup Interceptors
setupAxiosInterceptors(store);

// Register Headless JS Task for background call state events
AppRegistry.registerHeadlessTask('CallStateTask', () => require('./src/services/CallStateTask'));

// Configure global notification handler
// Safe check for Android Expo Go (SDK 53+ crash fix)
const isExpoGo = Constants.appOwnership === 'expo';
if (Platform.OS === 'android' && isExpoGo) {
    // Skip handler setup in Expo Go on Android to avoid crash
} else {
    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
    } catch (error) {
        console.warn('Notification Handler setup failed:', error);
    }
}

const AppContent = () => {
    const dispatch = useDispatch();
    const { appConfig, subscription, isLoading } = useSelector((state) => state.config || {}); // Access config state
    const { isAuthenticated } = useSelector((state) => state.auth || {});
    const currentVersion = Constants.expoConfig?.version || '1.0.0';

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchMetadata());
            // Request permissions on startup
            const requestPermissions = async () => {
                try {
                    await CallLogService.requestPermission();
                } catch (err) {
                    console.log("Permission request failed", err);
                }
            };
            requestPermissions();
        }
        dispatch(checkAppConfig());
    }, [dispatch, isAuthenticated]);

    // Global AppState listener for Call Log Sync
    useEffect(() => {
        if (!isAuthenticated) return;

        const handleAppStateChange = async (nextAppState) => {
            if (nextAppState === 'active') {
                console.log('[Global] App active - triggering call log sync...');
                try {
                    const logs = await CallLogService.getAllRecentLogs(50);
                    if (!logs || logs.length === 0) return;

                    // Get unique phone numbers from the recent logs
                    const phoneNumbers = [...new Set(logs.map(l => l.phoneNumber).filter(Boolean))];

                    // Ask backend which entity each number belongs to
                    const axiosClient = require('./src/api/axiosClient').default;
                    let entityMap = {};
                    try {
                        const res = await axiosClient.post('/leads/check-numbers', { phoneNumbers });
                        if (res.success) entityMap = res.data;
                    } catch (e) {
                        console.warn('[Global] check-numbers failed, falling back to unlinked sync:', e.message);
                    }

                    // Group logs by entity context
                    const leadLogsMap = {};    // lead_id -> [logs]
                    const enquiryLogsMap = {}; // enquiry_id -> [logs]
                    const campaignLogsMap = {}; // `${campaign_id}::${campaign_record_id}` -> { ids, logs }
                    const unlinkedLogs = [];

                    for (const log of logs) {
                        const entity = entityMap[log.phoneNumber];
                        if (!entity) { unlinkedLogs.push(log); continue; }

                        if (entity.type === 'lead' && entity.ownership === 'mine') {
                            const id = entity.lead_id;
                            leadLogsMap[id] = leadLogsMap[id] || { lead_id: id, phone: log.phoneNumber, logs: [] };
                            leadLogsMap[id].logs.push(log);
                        } else if (entity.type === 'enquiry' && entity.ownership === 'mine') {
                            const id = entity.enquiry_id;
                            enquiryLogsMap[id] = enquiryLogsMap[id] || { enquiry_id: id, phone: log.phoneNumber, logs: [] };
                            enquiryLogsMap[id].logs.push(log);
                        } else if (entity.type === 'campaign_record' && entity.ownership === 'mine') {
                            const key = `${entity.campaign_id}::${entity.campaign_record_id}`;
                            campaignLogsMap[key] = campaignLogsMap[key] || {
                                campaign_id: entity.campaign_id,
                                campaign_record_id: entity.campaign_record_id,
                                phone: log.phoneNumber, logs: []
                            };
                            campaignLogsMap[key].logs.push(log);
                        }
                        // skip 'other' ownership — not our logs
                    }

                    // Fire typed syncs in parallel
                    const syncPromises = [
                        ...Object.values(leadLogsMap).map(({ lead_id, phone }) =>
                            CallLogService.syncCallLogsForLead(lead_id, phone).catch(e =>
                                console.warn(`[Global] Lead sync failed for ${lead_id}:`, e.message)
                            )
                        ),
                        ...Object.values(enquiryLogsMap).map(({ enquiry_id, phone }) =>
                            CallLogService.syncCallLogsForEnquiry(enquiry_id, phone).catch(e =>
                                console.warn(`[Global] Enquiry sync failed for ${enquiry_id}:`, e.message)
                            )
                        ),
                        ...Object.values(campaignLogsMap).map(({ campaign_id, campaign_record_id, phone }) =>
                            CallLogService.syncCallLogsForCampaignRecord(campaign_id, campaign_record_id, phone).catch(e =>
                                console.warn(`[Global] Campaign record sync failed for ${campaign_record_id}:`, e.message)
                            )
                        ),
                    ];

                    const results = await Promise.all(syncPromises);
                    const totalSynced = results.reduce((acc, r) => acc + (r?.updated || 0), 0);
                    console.log(`[Global] Typed sync complete. ${totalSynced} logs synced across ${syncPromises.length} entities.`);

                    // Handle recording uploads for synced logs
                    const allSyncedTimestamps = results.flatMap(r => r?.syncedTimestamps || []);
                    if (allSyncedTimestamps.length > 0) {
                        const uri = await RecordingSyncService.getSavedFolderUri();
                        if (uri) {
                            console.log(`[Global] Triggering recording sync for ${allSyncedTimestamps.length} logs...`);
                            await RecordingSyncService.syncNewRecordings(uri, allSyncedTimestamps);
                        }
                    }
                } catch (error) {
                    console.error('[Global] Call log sync failed:', error);
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        // Trigger sync immediately on mount if active
        if (AppState.currentState === 'active') {
            handleAppStateChange('active');
        }

        return () => {
            subscription.remove();
        };
    }, [isAuthenticated]);

    // Check Maintenance Mode
    if (appConfig?.maintenanceMode) {
        return <MaintenanceScreen message={appConfig.message} />;
    }

    // Check Update Required
    // Simple version comparison (assumes semver or just simple string match for now)
    // A robust comparison would require a semver library or logic, ensuring 1.1.0 > 1.0.9
    // For now, let's do a simple string mismatch check or a basic split check if strictly needed.
    // If strict semver is needed, I'd add a helper. For now, assuming direct equality or simple > logic if possible.
    // Let's implement a quick helper inside or just assume simple check.
    // If minVersion > currentVersion
    const isUpdateRequired = () => {
        if (!appConfig?.minVersion) return false;

        const v1 = appConfig.minVersion.split('.').map(Number);
        const v2 = currentVersion.split('.').map(Number);

        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            const num1 = v1[i] || 0;
            const num2 = v2[i] || 0;
            if (num1 > num2) return true;
            if (num1 < num2) return false;
        }
        return false;
    };


    if (isUpdateRequired()) {
        const url = Platform.OS === 'ios' ? (appConfig.iosStoreUrl || appConfig.storeUrl) : (appConfig.androidStoreUrl || appConfig.storeUrl);
        return <UpdateRequiredScreen storeUrl={url} />;
    }

    // Check Subscription Expiration (Fail Closed) - DISABLED PER USER REQUEST
    // Only check if NOT loading AND Authenticated to avoid flash of expired screen or blocking login
    /*
    if (!isLoading && isAuthenticated) {
        if (!subscription) {
           // If loaded but no subscription found
           return <SubscriptionExpiredScreen />; 
        }

        if (subscription?.expirationDate) {
            const expiry = new Date(subscription.expirationDate);
            const now = new Date();
            if (now > expiry) {
                return <SubscriptionExpiredScreen />;
            }
        }
    }
    */

    return (
        <SafeAreaProvider>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
            <SocketProvider>
                <AppNavigator />
                <GlobalReminderPopup />
            </SocketProvider>
        </SafeAreaProvider>
    );
};

export default function App() {
    return (
        <Provider store={store}>
            <AppContent />
        </Provider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
});
