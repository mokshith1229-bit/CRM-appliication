import RecordingSyncService from './RecordingSyncService';
import CallLogService from './CallLogService';

module.exports = async (taskData) => {
    console.log('[Headless JS] CallStateTask executed with data:', taskData);
    
    // We only want to trigger the sync when the phone state becomes IDLE (call ends)
    if (taskData.state === 'IDLE') {
        try {
            console.log('[Headless JS] Syncing call logs first before checking recordings...');
            const logs = await CallLogService.getAllRecentLogs(10);
            let syncedTimestamps = [];

            if (logs && logs.length > 0) {
                const result = await CallLogService.syncCallLogsToServer(logs);
                if (result && result.success && result.data && result.data.syncedTimestamps) {
                    syncedTimestamps = result.data.syncedTimestamps;
                }
            }

            // Only attempt recording upload if the backend confirmed at least one log was a valid CRM call
            if (syncedTimestamps.length > 0) {
                const uri = await RecordingSyncService.getSavedFolderUri();
                if (uri) {
                    console.log(`[Headless JS] Triggering recording sync for ${syncedTimestamps.length} valid call logs...`);
                    await RecordingSyncService.syncNewRecordings(uri, syncedTimestamps);
                } else {
                    console.log('[Headless JS] No saved folder URI for recording sync. User must select a folder in Profile.');
                }
            } else {
                console.log('[Headless JS] No valid CRM call logs were synced. Skipping recording upload.');
            }
        } catch (error) {
            console.error('[Headless JS] Error during recording sync:', error);
        }
    }
};
