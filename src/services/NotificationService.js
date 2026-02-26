import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const SYNC_CHANNEL_ID = 'crm_sync_channel';
const SYNC_NOTIF_ID   = 'crm_sync_active';   // reused so we update in-place

/**
 * Call once during app boot (in App.js) to register the notification channel
 * and configure how foreground notifications are presented.
 */
const setupNotificationChannel = async () => {
    // Configure what happens when a notification arrives while the app is open
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: false,  // don't interrupt the UI for sync updates
            shouldPlaySound: false,
            shouldSetBadge: false,
        }),
    });

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(SYNC_CHANNEL_ID, {
            name: 'CRM Sync',
            importance: Notifications.AndroidImportance.LOW, // silent — no sound/vibration
            description: 'Background call log and recording sync status',
            showBadge: false,
            enableVibrate: false,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
    }
};

/**
 * Request notification permission from the user (called once on app start).
 * Returns true if granted.
 */
const requestPermission = async () => {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
};

/**
 * Show (or update) the CRM sync notification.
 * Uses a fixed identifier so subsequent calls update the same notification.
 *
 * @param {string} title  - Notification title, e.g. "📡 Syncing call data…"
 * @param {string} body   - Notification body, e.g. "Uploading recordings in background"
 * @param {boolean} [ongoing=true] - Whether the notification should be non-dismissable
 */
const showSyncNotification = async (title, body, ongoing = true) => {
    try {
        await Notifications.scheduleNotificationAsync({
            identifier: SYNC_NOTIF_ID,
            content: {
                title,
                body,
                android: {
                    channelId: SYNC_CHANNEL_ID,
                    ongoing,              // sticky when true — user can't swipe away
                    onlyAlertOnce: true, // don't make sound on updates
                    smallIcon: 'ic_stat_notify_sync', // falls back to app icon if missing
                    color: '#2850DC',
                    priority: 'low',
                },
            },
            trigger: null, // deliver immediately
        });
    } catch (err) {
        console.warn('[NotificationService] Failed to show sync notification:', err);
    }
};

/**
 * Dismiss the sync notification after an optional delay (ms).
 */
const dismissSyncNotification = async (delayMs = 0) => {
    try {
        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        await Notifications.dismissNotificationAsync(SYNC_NOTIF_ID);
    } catch (err) {
        console.warn('[NotificationService] Failed to dismiss sync notification:', err);
    }
};

const NotificationService = {
    setupNotificationChannel,
    requestPermission,
    showSyncNotification,
    dismissSyncNotification,
};

export default NotificationService;
