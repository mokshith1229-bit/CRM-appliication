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
                ...data,
                sources, 
                statuses,
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
        console.log("decryptedString",decryptedString);
        return JSON.parse(decryptedString);
    } catch (e) {
        console.warn('Subscription decryption failed', e);
        return null;
    }
};

export const checkUpdate = createAsyncThunk(
    'config/checkUpdate',
    async (_, { rejectWithValue }) => {
        try {
            // Using raw axios for unauthenticated request
            const response = await axiosClient.get('/appconfig');
            return response.data || response; // { newUpdate: true, playstoreurl: "" }
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const initialState = {
    sources: [],
    statuses: [],
    isLoading: false,
    error: null,
    appConfig: null, // { maintenanceMode, minVersion, message }
    updateConfig: null, // { newUpdate, playstoreurl }
    subscription: null, // { maxLicenses, expirationDate, planName }
    whatsappSubscription: null,
    isWhatsAppIntegrated: false,
};

const configSlice = createSlice({
    name: 'config',
    initialState,
    reducers: {
        dismissUpdate: (state) => {
            if (state.updateConfig) {
                state.updateConfig.newUpdate = false;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMetadata.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchMetadata.fulfilled, (state, action) => {
                state.isLoading = false;
                state.sources = action.payload.sources;
                state.statuses = action.payload.statuses;

                const subs = action.payload.subscriptions || {};
                
                // TeleCRM Subscription
                if (subs.telecrm) {
                    state.subscription = decryptData(subs.telecrm);
                } else if (action.payload.encryptedSubscription) {
                    state.subscription = decryptData(action.payload.encryptedSubscription);
                }

                // WhatsApp Subscription
                if (subs.whatsapp) {
                    state.whatsappSubscription = decryptData(subs.whatsapp);
                } else if (action.payload.encryptedWhatsAppSubscription) {
                    state.whatsappSubscription = decryptData(action.payload.encryptedWhatsAppSubscription);
                }

                if (action.payload.isWhatsAppIntegrated !== undefined) {
                    state.isWhatsAppIntegrated = action.payload.isWhatsAppIntegrated;
                }
            })
            .addCase(fetchMetadata.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
                // Defaults could be set here if needed, but UI likely handles empty arrays
            })
            .addCase(checkAppConfig.fulfilled, (state, action) => {
                state.appConfig = action.payload;
            })
            .addCase(checkUpdate.fulfilled, (state, action) => {
                state.updateConfig = action.payload;
            });
    }
});

export const { dismissUpdate } = configSlice.actions;

export default configSlice.reducer;
