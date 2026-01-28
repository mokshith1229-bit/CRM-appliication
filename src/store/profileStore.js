import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_STORAGE_KEY = '@profile_data';

const DEFAULT_PROFILE = {
    name: '',
    email: '',
    role: '',
};

export const useProfileStore = create((set, get) => ({
    profile: DEFAULT_PROFILE,
    isLoading: false,

    // Initialize profile from storage
    initializeProfile: async () => {
        try {
            set({ isLoading: true });
            const stored = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
            if (stored) {
                const profile = JSON.parse(stored);
                set({ profile, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            set({ isLoading: false });
        }
    },

    // Update profile
    updateProfile: async (updates) => {
        try {
            const { profile } = get();
            const updatedProfile = { ...profile, ...updates };
            await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
            set({ profile: updatedProfile });
            return true;
        } catch (error) {
            console.error('Error updating profile:', error);
            return false;
        }
    },

    // Get profile
    getProfile: () => {
        return get().profile;
    },

    // Clear profile (for logout)
    clearProfile: async () => {
        try {
            await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
            set({ profile: DEFAULT_PROFILE });
        } catch (error) {
            console.error('Error clearing profile:', error);
        }
    },
}));
