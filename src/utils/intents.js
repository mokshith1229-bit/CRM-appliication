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

export const sendSMS = async (phoneNumber, body = '') => {
    const url = `sms:${phoneNumber}?body=${encodeURIComponent(body)}`;

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
        // Direct opening is often more reliable on Android due to package visibility rules
        await Linking.openURL(url);
    } catch (error) {
        console.warn('Error opening email client:', error);
        Alert.alert(
            'Email App Not Found', 
            'We couldn\'t find a default email app. Please ensure you have one installed (like Gmail or Outlook).'
        );
    }
};
