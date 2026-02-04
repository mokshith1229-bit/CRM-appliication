import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StyleSheet, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { store } from './src/store/store';
import { fetchMetadata } from './src/store/slices/configSlice';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import GlobalReminderPopup from './src/components/GlobalReminderPopup';

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

const AppContent = () => {
    const dispatch = useDispatch();
    
    useEffect(() => {
        dispatch(fetchMetadata());
    }, [dispatch]);

    return (
        <SafeAreaProvider>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
            <AppNavigator />
            <GlobalReminderPopup />
        </SafeAreaProvider>
    );
};

export default function App() {
    return (
        <Provider store={store}>
            <AppContent />
        </Provider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
});
