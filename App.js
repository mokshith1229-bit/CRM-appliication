import 'react-native-gesture-handler';
import { StyleSheet, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

// Configure global notification handler
// Safe check for Android Expo Go (SDK 53+ crash fix)
const isExpoGo = Constants.appOwnership === 'expo';
if (Platform.OS === 'android' && isExpoGo) {
    // Skip handler setup in Expo Go on Android to avoid crash
} else {
    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
    } catch (error) {
        console.warn('Notification Handler setup failed:', error);
    }
}

export default function App() {
    return (
        <SafeAreaProvider>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
            <AppNavigator />
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
});
