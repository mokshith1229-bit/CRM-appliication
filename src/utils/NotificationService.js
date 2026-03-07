import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const isExpoGo = Constants.appOwnership === 'expo';

export async function registerForPushNotificationsAsync() {
    // Android Expo Go crashes on Push Permission/Token requests in SDK 53+
    // We strictly use In-App Modal for this environment.
    if (Platform.OS === 'android' && isExpoGo) {
        console.warn('Skipping Notification Setup in Android Expo Go to avoid crash');
        return;
    }

    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (true) { // Device check removed or assumed true for now as Device import was missing
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            alert('Failed to get push token for push notification!');
            return;
        }
        try {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
            
            // 1. Get Expo Push Token (for Expo notifications service)
            token = (await Notifications.getExpoPushTokenAsync({
                projectId,
            })).data;
            console.log('[NotificationService] Expo Push Token:', token);

            // 2. Get Native Device Token (FCM for Android, APNs for iOS)
            // This is often what custom backends (like the one mentioned) want.
            const deviceToken = (await Notifications.getDevicePushTokenAsync()).data;
            console.log('[NotificationService] Native Device Token:', deviceToken);
            
            // Return an object containing both or just the one requested
            // For this specific task, we'll return the native token as 'token' if it's FCM
            // or just provide both in a structured way.
            // Let's return the device token if we want FCM specifically.
            return deviceToken || token;

        } catch (e) {
            console.warn('[NotificationService] Failed to get push token:', e);
        }
    } else {
        alert('Must use physical device for Push Notifications');
    }

    return token;
}

export async function schedulePushNotification(title, body, date, extraData = {}) {
    // Android Expo Go safety check
    if (Platform.OS === 'android' && isExpoGo) {
        console.log('Skipping system notification in Expo Go (Android)');
        return null; // In Expo Go, we rely on standard in-app handling or bypass
    }

    const trigger = date; // Date object serves as timestamp trigger

    // Make sure date is in the future
    if (trigger <= new Date()) {
        console.warn('Cannot schedule notification in the past');
        return;
    }

    const id = await Notifications.scheduleNotificationAsync({
        content: {
            title: title,
            body: body,
            data: { type: 'call_reminder', ...extraData }, // Merge extraData (which contains type, reason, createdBy)
            sound: true,
        },
        trigger,
    });

    return id;
}

export async function cancelNotification(id) {
    await Notifications.cancelScheduledNotificationAsync(id);
}
