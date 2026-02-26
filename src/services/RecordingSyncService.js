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
      // Show Prominent Disclosure before opening picker
      const ProminentDisclosure = require('../utils/ProminentDisclosure').default;
      const userAgreed = await ProminentDisclosure.showRecordingFolderDisclosure();
      
      if (!userAgreed) {
          console.log('[RecordingSyncService] User declined folder access disclosure.');
          return null;
      }

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
                
                // Expo SDK 54 File.info() returns modificationTime in SECONDS.
                // Device call log timestamps (from react-native-call-log) are in MILLISECONDS.
                // Normalise to ms so the comparison is apples-to-apples.
                const fileModMs = info.modificationTime < 1e11
                    ? info.modificationTime * 1000   // was in seconds — convert to ms
                    : info.modificationTime;          // already in ms

                // We no longer use a hardcoded 15-minute window if syncedTimestamps are provided.
                // The syncedTimestamps list FROM THE SERVER is our definitive "to-do" list.
                // We filter out any that are currently being uploaded by this instance.
                const pendingTimestamps = syncedTimestamps.filter(ts => !this.currentlyUploading.has(ts));
                
                if (pendingTimestamps.length > 0) {
                    let bestMatchTimestamp = null;
                    let minDiff = Infinity;
                    
                    for (const ts of pendingTimestamps) {
                        const startTimestamp = parseInt(ts);
                        if (isNaN(startTimestamp)) continue;

                        const diff = fileModMs - startTimestamp;
                        console.log(`[Sync] File ${item.name}: modMs=${fileModMs}, callStart=${startTimestamp}, diff=${diff}ms`);
                        
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
   * Fetches server call logs missing `recording_gcs_path` and uploads local recordings for them.
   * This method attempts to match local recordings to server-side call logs that are missing a recording.
   */
  async syncMissingRecordings() {
    if (this.isSyncing) {
      console.log("[Sync] Sync already in progress, skipping missing recordings check...");
      return;
    }

    const savedFolderUri = await this.getSavedFolderUri();
    if (!savedFolderUri) {
      console.warn("No folder URI saved. Cannot sync missing recordings.");
      return;
    }

    this.isSyncing = true;
    try {
      console.log("[Sync] Checking for missing recordings on server...");
      const missingLogs = await CallLogService.getMissingRecordingCallLogs();

      if (!missingLogs || missingLogs.length === 0) {
        console.log("[Sync] No call logs found on server missing recordings.");
        return;
      }

      // Filter out logs for which we are already attempting an upload
      let pendingMissingLogs = missingLogs.filter(log => !this.currentlyUploading.has(log.device_timestamp));

      if (pendingMissingLogs.length === 0) {
        console.log("[Sync] All missing logs are currently being processed or no new ones to process.");
        return;
      }

      console.log(`[Sync] Found ${pendingMissingLogs.length} server call logs missing recordings.`);

      const dir = new Directory(savedFolderUri);
      const files = await dir.list();

      for (const item of files) {
        if (item instanceof File && (item.name.endsWith('.m4a') || item.name.endsWith('.mp3') || item.name.endsWith('.amr') || item.name.endsWith('.wav'))) {
          const info = await item.info();

          if (pendingMissingLogs.length > 0) {
            let bestMatchTimestamp = null;
            let minDiff = Infinity;
            let matchedLogIndex = -1;

            for (let i = 0; i < pendingMissingLogs.length; i++) {
              const log = pendingMissingLogs[i];
              const startTimestamp = parseInt(log.device_timestamp);
              if (isNaN(startTimestamp)) continue;

              // Expo SDK 54 File.info() modificationTime is in SECONDS — normalise to ms
              const fileModMs = info.modificationTime < 1e11
                  ? info.modificationTime * 1000
                  : info.modificationTime;

              const diff = fileModMs - startTimestamp;

              // Match if file was modified after call start AND within a 4-hour window
              if (diff > 0 && diff < 14400000) {
                if (diff < minDiff) {
                  minDiff = diff;
                  bestMatchTimestamp = log.device_timestamp;
                  matchedLogIndex = i;
                }
              }
            }

            if (bestMatchTimestamp) {
              console.log(`[Sync] Matching local file ${item.name} to missing CRM call ${bestMatchTimestamp}`);
              this.currentlyUploading.add(bestMatchTimestamp);

              try {
                await this.uploadToCRM(item, bestMatchTimestamp);
              } finally {
                // After upload attempt, remove from both lists
                this.currentlyUploading.delete(bestMatchTimestamp);
                if (matchedLogIndex > -1) {
                  pendingMissingLogs.splice(matchedLogIndex, 1);
                }
              }
            }
          }
        }
      }
      console.log("[Sync] Finished checking for missing recordings.");
    } catch (error) {
      console.error("Error syncing missing recordings:", error);
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

        if (response.data.success) {
            console.log(`Successfully uploaded: ${fileHandle.name}`);
        } else {
            console.error(`Upload failed for ${fileHandle.name}: ${response.data.message || 'Unknown error'}`);
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
