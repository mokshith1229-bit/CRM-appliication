import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let CallLogs;
if (!isExpoGo && Platform.OS === 'android') {
    try {
        const pkg = require('react-native-call-log');
        CallLogs = pkg.default || pkg;
    } catch (e) {
        console.warn('CallLogs module not found:', e);
    }
}

// Standalone functions to avoid self-reference issues
const requestPermission = async () => {
    if (Platform.OS !== 'android' || isExpoGo) return false;

    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
            {
                title: 'Call Log Permission',
                message: 'App needs access to your call logs to manage leads better.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
            }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
        console.warn(err);
        return false;
    }
};

const getLogsForNumber = async (phoneNumber, limit = 10) => {
    if (Platform.OS !== 'android' || isExpoGo) return [];

    const hasPermission = await requestPermission();
    if (!hasPermission) return [];

    if (!CallLogs) return [];

    try {
        const logs = await CallLogs.load(limit);
        const normalizedTarget = phoneNumber.replace(/[^0-9]/g, '');
        
        return logs.filter(log => {
            const logPhone = log.phoneNumber.replace(/[^0-9]/g, '');
            return logPhone.includes(normalizedTarget) || normalizedTarget.includes(logPhone);
        });

    } catch (error) {
        console.error('Failed to load call logs', error);
        return [];
    }
};

const getAllRecentLogs = async (limit = 50) => {
    
    if (Platform.OS !== 'android' || isExpoGo) return [];
    
    // Safety check if module failed to load
    if (!CallLogs) {
        console.warn('CallLogs native module is not available.');
        return [];
    }
    
    const hasPermission = await requestPermission();
    if (!hasPermission) return [];

    const data =  await CallLogs.load(limit);
    return data;
};

const getLastSyncTimestamp = async () => {
    try {
        const timestamp = await AsyncStorage.getItem('last_call_log_sync_timestamp');
        return timestamp ? parseInt(timestamp) : 0;
    } catch (error) {
        console.error('Error getting last sync timestamp:', error);
        return 0;
    }
};

const setLastSyncTimestamp = async (timestamp) => {
    try {
        await AsyncStorage.setItem('last_call_log_sync_timestamp', timestamp.toString());
    } catch (error) {
        console.error('Error setting last sync timestamp:', error);
    }
};

// Sync all historical logs for a phone number, with an optional entity context
// context: { type: 'lead', lead_id } | { type: 'enquiry', enquiry_id } | { type: 'campaign_record', campaign_id, campaign_record_id }
const syncAllLogsForNumber = async (phoneNumber, context = null) => {
    if (Platform.OS !== 'android' || isExpoGo) return { success: false, message: 'Not supported' };
    
    try {
        console.log(`Force syncing all logs for number: ${phoneNumber}...`, context ? `Context: ${JSON.stringify(context)}` : 'No context');
        
        // Use a much larger limit to catch older history for this specific number
        const allLogs = await getAllRecentLogs(500);
        if (!allLogs || allLogs.length === 0) return { success: true, updated: 0 };

        const normalizedTarget = phoneNumber.replace(/[^0-9]/g, '');
        
        // Filter logs specifically for this number
        const targetedLogs = allLogs.filter(log => {
            const logPhone = log.phoneNumber.replace(/[^0-9]/g, '');
            return logPhone.includes(normalizedTarget) || normalizedTarget.includes(logPhone);
        });

        if (targetedLogs.length === 0) {
            return { success: true, message: 'No logs found for this number', updated: 0 };
        }

        // Enrich each log with entity context if provided
        const enrichedLogs = context
            ? targetedLogs.map(log => ({ ...log, ...context }))
            : targetedLogs;

        console.log(`Syncing ${enrichedLogs.length} historical logs for ${phoneNumber} to server...`);

        const axiosClient = require('../api/axiosClient').default;
        const response = await axiosClient.post('/leads/sync-call-logs', { callLogs: enrichedLogs });
        
        return response.data;
    } catch (error) {
        console.error(`Error force syncing logs for ${phoneNumber}:`, error);
        return { success: false, message: error.message };
    }
};

// Sync call logs linked to a specific Lead
const syncCallLogsForLead = async (lead_id, phoneNumber) => {
    if (Platform.OS !== 'android' || isExpoGo) return { success: false, message: 'Not supported' };
    
    try {
        console.log(`[CallLogService] Syncing logs for lead ${lead_id}, phone: ${phoneNumber}`);
        const allLogs = await getAllRecentLogs(100);
        console.log(`[CallLogService] Total device logs fetched: ${allLogs?.length ?? 0}`);
        if (!allLogs || allLogs.length === 0) return { success: true, updated: 0 };

        const normalizedTarget = phoneNumber.replace(/[^0-9]/g, '');
        console.log(`[CallLogService] normalizedTarget: "${normalizedTarget}"`);

        // Sample the first 5 numbers so we can see the format differences
        console.log('[CallLogService] Sample log phoneNumbers (raw):',
            allLogs.slice(0, 5).map(l => l.phoneNumber));

        const targetedLogs = allLogs.filter(log => {
            const logPhone = log.phoneNumber?.replace(/[^0-9]/g, '') ?? '';
            const match = logPhone.includes(normalizedTarget) || normalizedTarget.includes(logPhone);
            return match;
        });

        console.log(`[CallLogService] Matched logs for this number: ${targetedLogs.length}`);
        if (targetedLogs.length === 0) return { success: true, updated: 0 };

        const enrichedLogs = targetedLogs.map(log => ({
            ...log,
            callType: log.type,   // preserve device call direction before overwriting type
            type: 'lead',         // entity type for backend routing
            lead_id,
        }));

        console.log(`[CallLogService] Sending ${enrichedLogs.length} lead-linked logs to server...`);
        const axiosClient = require('../api/axiosClient').default;
        const response = await axiosClient.post('/leads/sync-call-logs', { callLogs: enrichedLogs });
        console.log('[CallLogService] Sync response:', JSON.stringify(response.data ?? response));
        return response.data;
    } catch (error) {
        console.error('[CallLogService] Error syncing lead call logs:', error);
        return { success: false, message: error.message };
    }
};

// Sync call logs linked to a specific Enquiry
const syncCallLogsForEnquiry = async (enquiry_id, phoneNumber) => {
    if (Platform.OS !== 'android' || isExpoGo) return { success: false, message: 'Not supported' };
    
    try {
        console.log(`[CallLogService] Syncing logs for enquiry ${enquiry_id}, phone: ${phoneNumber}`);
        const allLogs = await getAllRecentLogs(100);
        if (!allLogs || allLogs.length === 0) return { success: true, updated: 0 };

        const normalizedTarget = phoneNumber.replace(/[^0-9]/g, '');
        const targetedLogs = allLogs.filter(log => {
            const logPhone = log.phoneNumber.replace(/[^0-9]/g, '');
            return logPhone.includes(normalizedTarget) || normalizedTarget.includes(logPhone);
        });

        if (targetedLogs.length === 0) return { success: true, updated: 0 };

        const enrichedLogs = targetedLogs.map(log => ({
            ...log,
            callType: log.type,   // preserve device call direction before overwriting type
            type: 'enquiry',      // entity type for backend routing
            enquiry_id,
        }));

        console.log(`[CallLogService] Sending ${enrichedLogs.length} enquiry-linked logs to server...`);
        const axiosClient = require('../api/axiosClient').default;
        const response = await axiosClient.post('/leads/sync-call-logs', { callLogs: enrichedLogs });
        return response.data;
    } catch (error) {
        console.error('[CallLogService] Error syncing enquiry call logs:', error);
        return { success: false, message: error.message };
    }
};

// Sync call logs linked to a specific Campaign Record
const syncCallLogsForCampaignRecord = async (campaign_id, campaign_record_id, phoneNumber) => {
    if (Platform.OS !== 'android' || isExpoGo) return { success: false, message: 'Not supported' };
    
    try {
        console.log(`[CallLogService] Syncing logs for campaign record ${campaign_record_id}, phone: ${phoneNumber}`);
        const allLogs = await getAllRecentLogs(100);
        if (!allLogs || allLogs.length === 0) return { success: true, updated: 0 };

        const normalizedTarget = phoneNumber.replace(/[^0-9]/g, '');
        const targetedLogs = allLogs.filter(log => {
            const logPhone = log.phoneNumber.replace(/[^0-9]/g, '');
            return logPhone.includes(normalizedTarget) || normalizedTarget.includes(logPhone);
        });

        if (targetedLogs.length === 0) return { success: true, updated: 0 };

        const enrichedLogs = targetedLogs.map(log => ({
            ...log,
            callType: log.type,      // preserve device call direction before overwriting type
            type: 'campaign_record', // entity type for backend routing
            campaign_id,
            campaign_record_id,
        }));

        console.log(`[CallLogService] Sending ${enrichedLogs.length} campaign-record-linked logs to server...`);
        const axiosClient = require('../api/axiosClient').default;
        const response = await axiosClient.post('/leads/sync-call-logs', { callLogs: enrichedLogs });
        return response.data;
    } catch (error) {
        console.error('[CallLogService] Error syncing campaign record call logs:', error);
        return { success: false, message: error.message };
    }
};

const syncCallLogsToServer = async (callLogs) => {
    if (Platform.OS !== 'android' || isExpoGo) return { success: false, message: 'Not supported' };
    
    try {
        const lastSync = await getLastSyncTimestamp();
        
        // Filter only logs that are newer than the last sync
        const newLogs = callLogs.filter(log => {
            const logTime = parseInt(log.timestamp);
            return logTime > lastSync;
        });

        if (newLogs.length === 0) {
            return { success: true, message: 'No new logs to sync', data: { updated: 0 } };
        }

        console.log(`Syncing ${newLogs.length} new call logs to server...`);

        const axiosClient = require('../api/axiosClient').default;
        const response = await axiosClient.post('/leads/sync-call-logs', { callLogs: newLogs });
        
        if (response.success) {
            // Find the latest timestamp in the newly synced logs
            const latestTimestamp = Math.max(...newLogs.map(log => parseInt(log.timestamp)));
            if (latestTimestamp > lastSync) {
                await setLastSyncTimestamp(latestTimestamp);
            }
        }

        return response.data;
    } catch (error) {
        console.error('Error syncing call logs to server:', error);
        return { success: false, message: error.message };
    }
};

const CallLogService = {
    requestPermission,
    getLogsForNumber,
    getAllRecentLogs,
    syncCallLogsToServer,
    syncAllLogsForNumber,
    syncCallLogsForLead,
    syncCallLogsForEnquiry,
    syncCallLogsForCampaignRecord,
    getLastSyncTimestamp,
    setLastSyncTimestamp,
};

export default CallLogService;
