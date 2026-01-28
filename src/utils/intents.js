import { Linking, Alert, Platform } from 'react-native';

export const makeCall = async (phoneNumber) => {
    const url = `tel:${phoneNumber}`;
    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', 'Phone calling is not supported on this device');
        }
    } catch (error) {
        console.error('Error making call:', error);
        Alert.alert('Error', 'Failed to initiate call');
    }
};

export const openWhatsApp = async (phoneNumber) => {
    // Remove spaces and special characters, keep only digits and +
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    const url = `whatsapp://send?phone=${cleanNumber}`;

    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', 'WhatsApp is not installed on this device');
        }
    } catch (error) {
        console.error('Error opening WhatsApp:', error);
        Alert.alert('Error', 'Failed to open WhatsApp');
    }
};

export const sendSMS = async (phoneNumber) => {
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${phoneNumber}${separator}body=`;

    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', 'SMS is not supported on this device');
        }
    } catch (error) {
        console.error('Error sending SMS:', error);
        Alert.alert('Error', 'Failed to open SMS');
    }
};

export const sendEmail = async (email = '') => {
    const url = `mailto:${email}`;

    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', 'Email is not supported on this device');
        }
    } catch (error) {
        console.error('Error sending email:', error);
        Alert.alert('Error', 'Failed to open email client');
    }
};
