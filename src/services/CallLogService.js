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

    return await CallLogs.load(limit);
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

const syncAllLogsForNumber = async (phoneNumber) => {
    if (Platform.OS !== 'android' || isExpoGo) return { success: false, message: 'Not supported' };
    
    try {
        console.log(`Force syncing all logs for number: ${phoneNumber}...`);
        
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

        console.log(`Syncing ${targetedLogs.length} historical logs for ${phoneNumber} to server...`);

        const axiosClient = require('../api/axiosClient').default;
        const response = await axiosClient.post('/leads/sync-call-logs', { callLogs: targetedLogs });
        
        return response.data;
    } catch (error) {
        console.error(`Error force syncing logs for ${phoneNumber}:`, error);
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
    getLastSyncTimestamp,
    setLastSyncTimestamp,
};

export default CallLogService;
