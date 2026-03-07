import SyncService from './SyncService';

const SYNC_NOTIF_ID = 'crm_sync_active';

module.exports = async (taskData) => {
    console.log('[Headless JS] CallStateTask executed with data:', taskData);
    
    // Trigger sync when call ends (IDLE) or via daily alarm
    if (taskData.state === 'IDLE' || taskData.state === 'DAILY_SYNC') {
        try {
            const source = taskData.state === 'DAILY_SYNC' ? 'daily_alarm' : 'headless';
            await SyncService.performSync(source);
        } catch (error) {
            console.error('[Headless JS] Error during background sync:', error);
        }
    }
};
