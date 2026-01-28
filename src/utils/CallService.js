import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { CallModule } = NativeModules;

class CallService {
    /**
     * Request phone call permission
     */
    static async requestCallPermission() {
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CALL_PHONE,
                {
                    title: 'Phone Call Permission',
                    message: 'This app needs access to make phone calls',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn('Permission request error:', err);
            return false;
        }
    }

    /**
     * Check if call permission is granted
     */
    static async checkCallPermission() {
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            return await CallModule.checkCallPermission();
        } catch (error) {
            console.error('Error checking call permission:', error);
            return false;
        }
    }

    /**
     * Make a phone call using SIM
     * @param {string} phoneNumber - Phone number to call
     * @returns {Promise<boolean>} - Success status
     */
    static async makeCall(phoneNumber) {
        if (!phoneNumber) {
            throw new Error('Phone number is required');
        }

        // Clean phone number (remove spaces, dashes, etc.)
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');

        try {
            // Check permission first
            const hasPermission = await this.checkCallPermission();

            if (!hasPermission) {
                // Request permission
                const granted = await this.requestCallPermission();
                if (!granted) {
                    throw new Error('Call permission denied');
                }
            }

            // Make the call
            await CallModule.makeCall(cleanNumber);
            return true;
        } catch (error) {
            console.error('Error making call:', error);
            throw error;
        }
    }

    /**
     * Open phone dialer with number pre-filled (doesn't auto-call)
     * @param {string} phoneNumber - Phone number to dial
     */
    static async openDialer(phoneNumber) {
        if (!phoneNumber) {
            throw new Error('Phone number is required');
        }

        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');

        try {
            await CallModule.openDialer(cleanNumber);
            return true;
        } catch (error) {
            console.error('Error opening dialer:', error);
            throw error;
        }
    }

    /**
     * End active call (limited functionality on modern Android)
     */
    static async endCall() {
        try {
            await CallModule.endCall();
            return true;
        } catch (error) {
            console.error('Error ending call:', error);
            throw error;
        }
    }
}

export default CallService;
