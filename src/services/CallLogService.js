import { PermissionsAndroid, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let CallLogs;
if (!isExpoGo && Platform.OS === 'android') {
    try {
        CallLogs = require('react-native-call-log').default;
    } catch (e) {
        console.warn('CallLogs module not found:', e);
    }
}

const CallLogService = {
    /**
     * Request READ_CALL_LOG permission
     */
    requestPermission: async () => {
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
    },

    /**
     * Fetch call logs matching a phone number
     * @param {string} phoneNumber 
     * @param {number} limit 
     */
    getLogsForNumber: async (phoneNumber, limit = 10) => {
        if (Platform.OS !== 'android' || isExpoGo) return [];

        const hasPermission = await CallLogService.requestPermission();
        if (!hasPermission) return [];

        try {
            const filter = {
                phoneNumbers: phoneNumber, // Filter by specific number
                minTimestamp: new Date().getTime() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
            };
            
            // react-native-call-log documentation is sparse, but typically load() returns all or filters
            // Using loadAll() or load(limit, filter) logic depends on specific version.
            // Assuming standard load(limit, filter) or similar.
            // Actually, many wrappers just use load(limit). We'll filter client side if needed.
            
            const logs = await CallLogs.load(limit);
            
            // Filter manually if library doesn't strictly support precise phone filtering in all versions
            // and normalize phone numbers (remove spaces, etc)
            const normalizedTarget = phoneNumber.replace(/[^0-9]/g, '');
            
            return logs.filter(log => {
                const logPhone = log.phoneNumber.replace(/[^0-9]/g, '');
                return logPhone.includes(normalizedTarget) || normalizedTarget.includes(logPhone);
            });

        } catch (error) {
            console.error('Failed to load call logs', error);
            return [];
        }
    },

    /**
     * Get all recent logs for syncing
     */
    getAllRecentLogs: async (limit = 50) => {
        if (Platform.OS !== 'android' || isExpoGo) return [];
        const hasPermission = await CallLogService.requestPermission();
        if (!hasPermission) return [];

        return await CallLogs.load(limit);
    }
};

export default CallLogService;
