import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBSCRIPTION_STORAGE_KEY = '@subscription_data';

const DEFAULT_SUBSCRIPTION = {
    expiryDate: null, // ISO string
    reminderDate: null, // ISO string
    notificationEnabled: false,
};

export const useSubscriptionStore = create((set, get) => ({
    subscription: DEFAULT_SUBSCRIPTION,
    isLoading: false,

    // Initialize subscription from storage
    initializeSubscription: async () => {
        try {
            set({ isLoading: true });
            const stored = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
            if (stored) {
                const subscription = JSON.parse(stored);
                set({ subscription, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Error loading subscription:', error);
            set({ isLoading: false });
        }
    },

    // Update subscription
    updateSubscription: async (updates) => {
        try {
            const { subscription } = get();
            const updatedSubscription = { ...subscription, ...updates };
            await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(updatedSubscription));
            set({ subscription: updatedSubscription });
            return true;
        } catch (error) {
            console.error('Error updating subscription:', error);
            return false;
        }
    },

    // Get days remaining
    getDaysRemaining: () => {
        const { subscription } = get();
        if (!subscription.expiryDate) return null;

        const now = new Date();
        const expiry = new Date(subscription.expiryDate);
        const diffTime = expiry - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    },

    // Check if expired
    isExpired: () => {
        const daysRemaining = get().getDaysRemaining();
        return daysRemaining !== null && daysRemaining < 0;
    },

    // Clear subscription (for logout)
    clearSubscription: async () => {
        try {
            await AsyncStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
            set({ subscription: DEFAULT_SUBSCRIPTION });
        } catch (error) {
            console.error('Error clearing subscription:', error);
        }
    },
}));
