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
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(SYNC_CHANNEL_ID, {
            name: 'CRM Sync',
            importance: Notifications.AndroidImportance.HIGH, 
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
    try {
        // Request basic notification permissions (for all platforms)
        const { status: existing } = await Notifications.getPermissionsAsync();
        if (existing === 'granted') return true;

        const { status } = await Notifications.requestPermissionsAsync();
        
        // On Android 13+ (API 33+), we might need an explicit request for POST_NOTIFICATIONS
        // if expo-notifications doesn't trigger it automatically in some environments.
        if (Platform.OS === 'android' && Platform.Version >= 33) {
            const { PermissionsAndroid } = require('react-native');
            const hasPostNotif = await PermissionsAndroid.check('android.permission.POST_NOTIFICATIONS');
            if (!hasPostNotif) {
                await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
            }
        }

        return status === 'granted';
    } catch (err) {
        console.warn('[NotificationService] Request permission failed:', err);
        return false;
    }
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
                    priority: 'max',
                    visibility: 'public',
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

let progressInterval = null;
const PROGRESS_FRAMES = [
    '▰▱▱▱▱▱▱▱▱▱',
    '▱▰▱▱▱▱▱▱▱▱',
    '▱▱▰▱▱▱▱▱▱▱',
    '▱▱▱▰▱▱▱▱▱▱',
    '▱▱▱▱▰▱▱▱▱▱',
    '▱▱▱▱▱▰▱▱▱▱',
    '▱▱▱▱▱▱▰▱▱▱',
    '▱▱▱▱▱▱▱▰▱▱',
    '▱▱▱▱▱▱▱▱▰▱',
    '▱▱▱▱▱▱▱▱▱▰'
];

/**
 * Starts an animated progress bar in the notification.
 */
const startSyncProgress = async (title = '📡 TeleCRM — Syncing', baseMessage = 'Syncing data to server…') => {
    if (progressInterval) clearInterval(progressInterval);
    
    let frame = 0;
    const update = async () => {
        const bar = PROGRESS_FRAMES[frame % PROGRESS_FRAMES.length];
        await showSyncNotification(title, `${baseMessage}\n${bar}`, true);
        frame++;
    };

    await update(); // Show first frame immediately
    progressInterval = setInterval(update, 500);
};

/**
 * Stops the progress animation.
 */
const stopSyncProgress = () => {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
};

const NotificationService = {
    setupNotificationChannel,
    requestPermission,
    showSyncNotification,
    dismissSyncNotification,
    startSyncProgress,
    stopSyncProgress
};

export default NotificationService;
