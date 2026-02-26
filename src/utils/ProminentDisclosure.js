import { Alert } from 'react-native';

/**
 * Utility to handle Prominent Disclosure alerts required by Google Play policy
 * for sensitive permissions (Call Log and Recording Folder Access).
 */
const ProminentDisclosure = {
  /**
   * Shows disclosure for Call Log permission.
   * @returns {Promise<boolean>} Resolves to true if user agreed, false otherwise.
   */
  showCallLogDisclosure: () => {
    return new Promise((resolve) => {
      Alert.alert(
        "Call Activity Syncing",
        "Vivtej TeleCRM collects and syncs your call history data (phone numbers, call duration, and timestamps). This information is used to automatically update lead history and allow your organization's administrator to monitor sales performance. This occurs even when the app is closed or not in use to ensure no business calls are missed.",
        [
          {
            text: "Not Now",
            onPress: () => resolve(false),
            style: "cancel"
          },
          {
            text: "Agree",
            onPress: () => resolve(true)
          }
        ],
        { cancelable: false }
      );
    });
  },

  /**
   * Shows disclosure for Audio Folder Monitoring.
   * @returns {Promise<boolean>} Resolves to true if user understands, false otherwise.
   */
  showRecordingFolderDisclosure: () => {
    return new Promise((resolve) => {
      Alert.alert(
        "Call Recording Monitoring",
        "To provide performance monitoring, Vivtej TeleCRM requires access to your device's call recording folder. The app will monitor this folder to identify and upload recordings associated with your leads. These audio files are shared with your organization's administrator. You can stop this sync at any time in Settings.",
        [
          {
            text: "Cancel",
            onPress: () => resolve(false),
            style: "cancel"
          },
          {
            text: "I Understand",
            onPress: () => resolve(true)
          }
        ],
        { cancelable: false }
      );
    });
  }
};

export default ProminentDisclosure;
