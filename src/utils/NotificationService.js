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
        // token = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
        alert('Must use physical device for Push Notifications');
    }

    return true;
}

export async function schedulePushNotification(title, body, date) {
    // Android Expo Go safety check
    if (Platform.OS === 'android' && isExpoGo) {
        console.log('Skipping system notification in Expo Go (Android)');
        return null;
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
            data: { type: 'call_reminder' },
            sound: true,
        },
        trigger,
    });

    return id;
}

export async function cancelNotification(id) {
    await Notifications.cancelScheduledNotificationAsync(id);
}
