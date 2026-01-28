import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@caller_contacts';

export const loadContacts = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
        console.error('Error loading contacts from storage:', error);
        return null;
    }
};

export const saveContacts = async (contacts) => {
    try {
        const jsonValue = JSON.stringify(contacts);
        await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
        return true;
    } catch (error) {
        console.error('Error saving contacts to storage:', error);
        return false;
    }
};

export const clearStorage = async () => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Error clearing storage:', error);
        return false;
    }
};
