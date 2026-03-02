import axios from 'axios';
import { Buffer } from 'buffer';
import NodeRSA from 'node-rsa';
import { APP_CONFIG_PUBLIC_KEY } from '../constants/keys';
import { BASE_URL } from '../constants/api';

// Polyfill Buffer for React Native if needed explicitly, 
// though importing it usually suffices for modules that check for `Buffer`.
global.Buffer = global.Buffer || Buffer;

const fetchAppConfig = async () => {
  try {
    // Note: This endpoint is public, so no token needed
    const response = await axios.get(`${BASE_URL}/app-config`);
    
    if (response.data && response.data.success && response.data.data) {
      const encryptedData = response.data.data.encryptedData;
      
      if (!encryptedData) {
        // console.warn('AppConfigService: No encrypted data received');
        return null;
      }

      // console.log('AppConfigService: Encrypted Data Length:', encryptedData?.length);
      // console.log('AppConfigService: Using Public Key:', APP_CONFIG_PUBLIC_KEY.substring(0, 50) + '...');
      
      const key = new NodeRSA(APP_CONFIG_PUBLIC_KEY, 'public', {
          encryptionScheme: 'pkcs1'
      });
      // console.log('AppConfigService: NodeRSA key loaded');
      const decryptedString = key.decryptPublic(encryptedData, 'utf8');
      // console.log('AppConfigService: Decryption successful');
      
      try {
          const config = JSON.parse(decryptedString);
          return config;
      } catch (parseError) {
          console.error('AppConfigService: JSON parse error', parseError);
          return null;
      }
    }
    return null;
  } catch (error) {
    console.error('AppConfigService: Error fetching config', error);
    // In case of error (network issue), we might default to allow access 
    // or block if we want strict security. For now, we return null (ignore).
    return null;
  }
};

export default {
  fetchAppConfig
};
