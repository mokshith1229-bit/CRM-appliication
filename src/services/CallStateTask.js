import * as Notifications from 'expo-notifications';
import RecordingSyncService from './RecordingSyncService';
import CallLogService from './CallLogService';
import NotificationService from './NotificationService';

const SYNC_NOTIF_ID = 'crm_sync_active';

module.exports = async (taskData) => {
    console.log('[Headless JS] CallStateTask executed with data:', taskData);
    
    // We only want to trigger the sync when the phone state becomes IDLE (call ends)
    if (taskData.state === 'IDLE') {
        // Show "syncing" notification with infinite progress bar
        await NotificationService.startSyncProgress(
            '📡 TeleCRM — Syncing',
            'Syncing data to server…'
        );

        try {
            console.log('[Headless JS] Syncing call logs first before checking recordings...');
            const logs = await CallLogService.getAllRecentLogs(10);
            let syncedTimestamps = [];
            let totalSynced = 0;

            if (logs && logs.length > 0) {
                const result = await CallLogService.syncCallLogsToServer(logs);
                console.log('[Headless JS] syncCallLogsToServer result:', JSON.stringify(result));

                // axiosClient unwraps response.data, so result is the server JSON:
                // { success: true, data: { updated: N, syncedTimestamps: ['...'] } }
                if (result && result.success && result.data) {
                    syncedTimestamps = result.data.syncedTimestamps || [];
                    totalSynced = result.data.updated || syncedTimestamps.length;
                }
                console.log(`[Headless JS] syncedTimestamps: ${JSON.stringify(syncedTimestamps)}`);
            }

            const uri = await RecordingSyncService.getSavedFolderUri();

            // Step 1: Upload recordings for freshly-synced CRM calls (normal post-call flow)
            if (syncedTimestamps.length > 0) {
                if (uri) {
                    // Update notification to show recording upload progress
                    await NotificationService.showSyncNotification(
                        '📡 TeleCRM — Syncing',
                        `Uploading recording for ${syncedTimestamps.length} call(s)…`,
                        true
                    );
                    console.log(`[Headless JS] Triggering recording sync for ${syncedTimestamps.length} valid call logs...`);
                    await RecordingSyncService.syncNewRecordings(uri, syncedTimestamps);
                } else {
                    console.log('[Headless JS] No saved folder URI for recording sync. User must select a folder in Profile.');
                }
            } else {
                console.log('[Headless JS] No valid CRM call logs were synced. Skipping fresh recording upload.');
            }

            // Step 2: Retroactively upload recordings for any server logs missing recording_gcs_path
            if (uri) {
                console.log('[Headless JS] Checking for server call logs missing recordings...');
                await RecordingSyncService.syncMissingRecordings();
            }

            // ✅ Success notification — replaces the "syncing" one
            NotificationService.stopSyncProgress();
            const successMsg = totalSynced > 0
                ? `✅ ${totalSynced} call log${totalSynced > 1 ? 's' : ''} synced to CRM`
                : '✅ Call log sync complete';

            await NotificationService.showSyncNotification(
                'TeleCRM',
                successMsg,
                false // no longer ongoing — user can dismiss
            );

            // Auto-dismiss after 5 seconds
            await NotificationService.dismissSyncNotification(5000);

        } catch (error) {
            console.error('[Headless JS] Error during recording sync:', error);
            NotificationService.stopSyncProgress();

            // ⚠️ Error notification
            await NotificationService.showSyncNotification(
                'TeleCRM — Sync Issue',
                '⚠️ Could not sync call log. Will retry next call.',
                false
            );
            await NotificationService.dismissSyncNotification(8000);
        }
    }
};
