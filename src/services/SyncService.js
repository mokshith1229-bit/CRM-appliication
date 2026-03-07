import CallLogService from './CallLogService';
import RecordingSyncService from './RecordingSyncService';
import NotificationService from './NotificationService';
import axiosClient from '../api/axiosClient';

let isSyncing = false;

/**
 * Standardised sync logic to be used by Background tasks and Foreground AppState changes.
 * Consolidates notifications and prevents overlaps.
 */
const performSync = async (source = 'unknown') => {
    if (isSyncing) {
        console.log(`[SyncService] Sync already in progress (triggered by ${source}), skipping.`);
        return { success: true, message: 'Already syncing' };
    }

    isSyncing = true;
    console.log(`[SyncService] Starting sync triggered by: ${source}`);

    // Show persistent progress notification
    await NotificationService.startSyncProgress(
        '📡 TeleCRM — Syncing',
        'Syncing data to server…'
    );

    try {
        // 1. Fetch recent device logs
        const logs = await CallLogService.getAllRecentLogs(50);
        if (!logs || logs.length === 0) {
            console.log('[SyncService] No device logs found.');
            NotificationService.stopSyncProgress();
            await NotificationService.dismissSyncNotification(2000);
            isSyncing = false;
            return { success: true, updated: 0 };
        }

        // 2. Identify owners of these numbers
        const phoneNumbers = [...new Set(logs.map(l => l.phoneNumber).filter(Boolean))];
        let entityMap = {};
        try {
            const res = await axiosClient.post('/leads/check-numbers', { phoneNumbers });
            if (res.success) entityMap = res.data;
        } catch (e) {
            console.warn('[SyncService] check-numbers failed, falling back:', e.message);
        }

        // 3. Group logs by entity
        const leadLogsMap = {};
        const enquiryLogsMap = {};
        const campaignLogsMap = {};

        for (const log of logs) {
            const entity = entityMap[log.phoneNumber];
            if (!entity || entity.ownership !== 'mine') continue;

            if (entity.type === 'lead') {
                const id = entity.lead_id;
                leadLogsMap[id] = leadLogsMap[id] || { lead_id: id, phone: log.phoneNumber };
            } else if (entity.type === 'enquiry') {
                const id = entity.enquiry_id;
                enquiryLogsMap[id] = enquiryLogsMap[id] || { enquiry_id: id, phone: log.phoneNumber };
            } else if (entity.type === 'campaign_record') {
                const key = `${entity.campaign_id}::${entity.campaign_record_id}`;
                campaignLogsMap[key] = campaignLogsMap[key] || {
                    campaign_id: entity.campaign_id,
                    campaign_record_id: entity.campaign_record_id,
                    phone: log.phoneNumber
                };
            }
        }

        // 4. Perform typed syncs in parallel
        const syncPromises = [
            ...Object.values(leadLogsMap).map(({ lead_id, phone }) =>
                CallLogService.syncCallLogsForLead(lead_id, phone)
            ),
            ...Object.values(enquiryLogsMap).map(({ enquiry_id, phone }) =>
                CallLogService.syncCallLogsForEnquiry(enquiry_id, phone)
            ),
            ...Object.values(campaignLogsMap).map(({ campaign_id, campaign_record_id, phone }) =>
                CallLogService.syncCallLogsForCampaignRecord(campaign_id, campaign_record_id, phone)
            ),
        ];

        const results = await Promise.all(syncPromises);
        const totalSynced = results.reduce((acc, r) => acc + (r?.updated || 0), 0);
        const allSyncedTimestamps = results.flatMap(r => r?.syncedTimestamps || []);

        // 5. Sync recordings if needed
        if (allSyncedTimestamps.length > 0) {
            const uri = await RecordingSyncService.getSavedFolderUri();
            if (uri) {
                await NotificationService.showSyncNotification(
                    '📡 TeleCRM — Syncing',
                    `Uploading recordings for ${allSyncedTimestamps.length} call(s)…`,
                    true
                );
                await RecordingSyncService.syncNewRecordings(uri, allSyncedTimestamps);
            }
        }

        // 6. Retroactive check for missing recordings on server
        const uri = await RecordingSyncService.getSavedFolderUri();
        if (uri) {
            await RecordingSyncService.syncMissingRecordings();
        }

        // 7. Show success notification
        NotificationService.stopSyncProgress();
        const successMsg = totalSynced > 0
            ? `✅ ${totalSynced} call log${totalSynced > 1 ? 's' : ''} synced to CRM`
            : '✅ Call log sync complete';

        await NotificationService.showSyncNotification('TeleCRM', successMsg, false);
        await NotificationService.dismissSyncNotification(5000);

        return { success: true, updated: totalSynced };

    } catch (error) {
        console.error('[SyncService] Sync failure:', error);
        NotificationService.stopSyncProgress();
        await NotificationService.showSyncNotification(
            'TeleCRM — Sync Issue',
            '⚠️ Data sync failed. Will retry automatically.',
            false
        );
        await NotificationService.dismissSyncNotification(5000);
        return { success: false, error: error.message };
    } finally {
        isSyncing = false;
    }
};

export default {
    performSync,
};
