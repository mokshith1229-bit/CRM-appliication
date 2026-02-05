import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/axiosClient';
import AppConfigService from '../../services/AppConfigService';
import NodeRSA from 'node-rsa';
import { APP_CONFIG_PUBLIC_KEY } from '../../constants/keys';

// Thunks
export const fetchMetadata = createAsyncThunk(
    'config/fetchMetadata',
    async (_, { rejectWithValue }) => {
        try {
            // Fetch full config in one go
            const response = await axiosClient.get('/config');
            // axiosClient interceptor returns response.data already.
            // API returns { success: true, data: {...} }
            const data = response.data; 

            const sources = (data.lead_sources || []).map(s => 
                typeof s === 'string' ? { key: s, label: s, color: '#64748b' } : s
            );
            
            const statuses = (data.lead_statuses || []).map(s => 
                typeof s === 'string' ? { key: s, label: s } : s
            );

            return { 
                sources, 
                statuses,
                encryptedSubscription: data.encryptedSubscription 
            };
        } catch (error) {
             // Fallback
             console.warn('Metadata fetch failed, using defaults', error);
             return rejectWithValue(error.message);
        }
    }
);

export const checkAppConfig = createAsyncThunk(
    'config/checkAppConfig',
    async (_, { rejectWithValue }) => {
        try {
            const config = await AppConfigService.fetchAppConfig();
            return config;
        } catch (error) {
            console.warn('App Config check failed', error);
            return null; // Don't block app on network error, allow access
        }
    }
);

// Helper to decrypt
const decryptData = (encryptedData) => {
    try {
        if (!encryptedData) return null;
        const key = new NodeRSA(APP_CONFIG_PUBLIC_KEY); // Reusing public key from constants
        const decryptedString = key.decryptPublic(encryptedData, 'utf8');
        return JSON.parse(decryptedString);
    } catch (e) {
        console.warn('Subscription decryption failed', e);
        return null;
    }
};

const initialState = {
    sources: [],
    statuses: [],
    isLoading: false,
    error: null,
    appConfig: null, // { maintenanceMode, minVersion, message }
    subscription: null, // { maxLicenses, expirationDate, planName }
};

const configSlice = createSlice({
    name: 'config',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchMetadata.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchMetadata.fulfilled, (state, action) => {
                state.isLoading = false;
                state.sources = action.payload.sources;
                state.statuses = action.payload.statuses;

                // Process subscription if present
                /*
                   Note: fetchMetadata response structure in configController.js (getFullConfig) is:
                   { lead_sources, lead_statuses, roles, fieldConfigs, customAttributes, encryptedSubscription }
                   But the thunk above currently maps:
                   sources = action.payload.sources
                   statuses = action.payload.statuses

                   Wait, the thunk parallel fetches /config/sources and /config/statuses separately in current implementation.
                   The controller modification was in `getFullConfig`, but the thunk calls `getSources` and `getStatuses`.

                   I need to update the thunk to call `getFullConfig` OR update `getSources/Status` OR fetch subscription separately.
                   Given `getFullConfig` returns everything, switching to that is more efficient but requires deeper refactor.
                   Alternatively, I can just add a separate fetch or update the thunk to use `getFullConfig` if that route is available.
                   `router.get('/', configController.getFullConfig);` is available at `/api/config`.

                   Let's Refactor the Thunk to use getFullConfig for efficiency and to get the subscription.
                */

                if (action.payload.encryptedSubscription) {
                    state.subscription = decryptData(action.payload.encryptedSubscription);
                }
            })
            .addCase(fetchMetadata.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
                // Defaults could be set here if needed, but UI likely handles empty arrays
            })
            .addCase(checkAppConfig.fulfilled, (state, action) => {
                state.appConfig = action.payload;
            });
    }
});

export default configSlice.reducer;
