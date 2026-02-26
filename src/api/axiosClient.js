import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants/api';

import { Alert } from 'react-native';

// Store reference to be injected
let store;
let isForcedOutAlertActive = false;

export const setupAxiosInterceptors = (storeInstance) => {
    store = storeInstance;
};

const axiosClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Add Token
axiosClient.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors (401, etc.)
axiosClient.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const originalRequest = error.config;
        
        // Handle 401 Unauthorized (Token Expired / Concurrent Login)
        if (error.response && error.response.status === 401) {
            const message = error.response.data?.message;
            const isForcedOut = message === "Session expired or forced out";

            // 1. Show specific alert for concurrent login
            if (isForcedOut && !isForcedOutAlertActive) {
                isForcedOutAlertActive = true;
                Alert.alert(
                    "Session Closed",
                    "You have been logged in on another device. This session has been closed.",
                    [{ text: "OK", onPress: () => { isForcedOutAlertActive = false; } }],
                    { cancelable: false }
                );
            }

            // 2. Clear session and redirect to login
            if (store) {
                const { logout } = require('../store/slices/authSlice');
                const state = store.getState();
                
                // Only trigger logout if we consider ourselves authenticated
                // and we're not already trying to log out
                if (state.auth?.isAuthenticated && !originalRequest.url.includes('/auth/logout')) {
                    store.dispatch(logout());
                }
            }
        }
        
        return Promise.reject(error);
    }
);

export default axiosClient;
