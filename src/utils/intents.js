import { Linking, Alert, Platform } from 'react-native';

export const normalizePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters except +
    let clean = phoneNumber.replace(/[^\d+]/g, '');
    
    // Check for Indian number patterns
    // Case 1: 12 digits starting with 91 but no + (e.g., 91xxxxxxxxxx)
    if (clean.startsWith('91') && clean.length === 12 && !phoneNumber.startsWith('+')) {
        return '+' + clean;
    }
    
    // Case 2: 10 digits starting with mobile digits (6, 7, 8, 9)
    // We could auto-add +91 here, but let's stick to what the user explicitly mentioned for now.
    // The user said "no prefix at all" is also fine.
    
    return clean;
};

export const makeCall = async (phoneNumber) => {
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    const url = `tel:${normalizedNumber}`;
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
    // Normalize number
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    // WhatsApp URL should not have '+' for some versions, but usually it works. 
    // wa.me uses digits only with country code.
    const cleanNumber = normalizedNumber.replace(/\+/g, '');
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
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    const url = `sms:${normalizedNumber}?body=${encodeURIComponent(body)}`;

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
