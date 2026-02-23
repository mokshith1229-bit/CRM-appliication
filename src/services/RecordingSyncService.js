import { Directory, File } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CallLogService from './CallLogService';
import axiosClient from '../api/axiosClient';

const RECORDING_FOLDER_URI_KEY = '@recording_folder_uri';

/**
 * Service to manage call recording folder access and synchronization using Expo SDK 54's Storage Access Framework API.
 */
class RecordingSyncService {
  constructor() {
    this.isSyncing = false;
    this.currentlyUploading = new Set(); // Track timestamps currently in flight
  }

  /**
   * Requests user permission to access a directory (e.g., the 'Recordings' folder).
   * Opens the system file picker.
   * @returns {Promise<string|null>} The persistent URI of the selected folder, or null if cancelled/failed.
   */
  async requestCallFolderAccess() {
    try {
      const directory = await Directory.pickDirectoryAsync();
      
      if (directory) {
        console.log("Selected Folder URI:", directory.uri);
        // Save this URI securely to use later across app restarts
        await AsyncStorage.setItem(RECORDING_FOLDER_URI_KEY, directory.uri);
        return directory.uri;
      }
      return null;
    } catch (err) {
      console.error("Folder selection failed", err);
      return null;
    }
  }

  /**
   * Retrieves the previously saved persistent folder URI.
   * @returns {Promise<string|null>} The folder URI or null if not set.
   */
  async getSavedFolderUri() {
    try {
        return await AsyncStorage.getItem(RECORDING_FOLDER_URI_KEY);
    } catch (e) {
        console.error("Failed to fetch saved folder URI", e);
        return null;
    }
  }

  /**
   * Scans the saved directory for new call recordings and uploads them.
   * Note: This is designed to be triggered by the background phone state receiver when a call ends,
   * or when the app comes into the foreground.
   * @param {string} savedFolderUri - The persistent URI of the folder to scan.
   * @param {Array<string>} syncedTimestamps - Array of device timestamps for calls that were successfully registered to CRM records.
   */
  async syncNewRecordings(savedFolderUri, syncedTimestamps = []) {
    if (this.isSyncing) {
        console.log("[Sync] Sync already in progress, skipping...");
        return;
    }

    if (!savedFolderUri) {
        console.warn("No folder URI provided for sync.");
        return;
    }

    if (!syncedTimestamps || syncedTimestamps.length === 0) {
        console.log("No synced timestamps provided. Skipping recording sync.");
        return;
    }

    this.isSyncing = true;
    try {
        const dir = new Directory(savedFolderUri);

        const files = await dir.list(); // throws if permission was revoked — caught below

        for (const item of files) {
            // Check for common audio formats used for call recordings
            if (item instanceof File && (item.name.endsWith('.m4a') || item.name.endsWith('.mp3') || item.name.endsWith('.amr') || item.name.endsWith('.wav'))) {
                const info = await item.info();
                
                // We no longer use a hardcoded 15-minute window if syncedTimestamps are provided.
                // The syncedTimestamps list FROM THE SERVER is our definitive "to-do" list.
                // We filter out any that are currently being uploaded by this instance.
                const pendingTimestamps = syncedTimestamps.filter(ts => !this.currentlyUploading.has(ts));
                
                if (pendingTimestamps.length > 0) {
                    let bestMatchTimestamp = null;
                    let minDiff = Infinity;
                    
                    for (const ts of pendingTimestamps) {
                        const startTimestamp = parseInt(ts);
                        const diff = info.modificationTime - startTimestamp;
                        
                        // Match if file was modified after call start AND within a 4-hour window 
                        // (handles long calls + significant sync latency)
                        if (diff > 0 && diff < 14400000) { 
                            if (diff < minDiff) {
                                minDiff = diff;
                                bestMatchTimestamp = ts;
                            }
                        }
                    }

                    if (bestMatchTimestamp) {
                        console.log(`[Sync] Matching local file ${item.name} to CRM call ${bestMatchTimestamp}`);
                        this.currentlyUploading.add(bestMatchTimestamp);
                        
                        try {
                            await this.uploadToCRM(item, bestMatchTimestamp);
                        } finally {
                            // After upload attempt, remove from both lists
                            this.currentlyUploading.delete(bestMatchTimestamp);
                            const index = syncedTimestamps.indexOf(bestMatchTimestamp);
                            if (index > -1) syncedTimestamps.splice(index, 1);
                        }
                    }
                }
            }
        }
    } catch (error) {
         console.error("Error syncing new recordings:", error);
    } finally {
        this.isSyncing = false;
    }
  }

  /**
   * Uploads the given file handle to the CRM API.
   * @param {File} fileHandle - The Expo File System File object.
   * @param {string} deviceTimestamp - The device's timestamp of the call log.
   */
  async uploadToCRM(fileHandle, deviceTimestamp) {
    try {
        // SDK 54 supports expo/fetch for direct file streaming using File objects in FormData
        const formData = new FormData();
        formData.append('file', {
            uri: fileHandle.uri,
            name: fileHandle.name,
            type: this._getMimeType(fileHandle.name), // Dynamically determine mime type
        });
        
        formData.append('device_timestamp', deviceTimestamp);

        console.log(`Uploading ${fileHandle.name} to CRM API...`);
        
        const response = await axiosClient.post('/call-recordings/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (response.success) {
            console.log(`Successfully uploaded: ${fileHandle.name}`);
        } else {
            console.error(`Upload failed for ${fileHandle.name}: ${response.message || 'Unknown error'}`);
        }

    } catch (error) {
        console.error(`Error uploading ${fileHandle.name}:`, error);
    }
  }

  /**
   * Helper method to determine basic mime types from file extension.
   */
  _getMimeType(filename) {
      if (filename.endsWith('.m4a')) return 'audio/m4a';
      if (filename.endsWith('.mp3')) return 'audio/mp3';
      if (filename.endsWith('.amr')) return 'audio/amr';
      if (filename.endsWith('.wav')) return 'audio/wav';
      return 'application/octet-stream';
  }
}

export default new RecordingSyncService();
