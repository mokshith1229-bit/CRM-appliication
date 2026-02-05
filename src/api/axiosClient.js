import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants/api';

// Store reference to be injected
let store;

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
    (response) => response.data, // Start returning user data directly if standardized
    async (error) => {
        const originalRequest = error.config;
        
        // Handle 401 Unauthorized (Token Expired) - simple logout for now
        // Advanced: Implement Refresh Token logic here if needed
        if (error.response && error.response.status === 401) {
             // Dispatch logout action via Redux store if available
             if (store) {
                 const { logout } = require('../store/slices/authSlice'); // Lazy load to avoid cycle in imports if needed, 
                 // actually standard import might still cycle if at top level, but here inside function it is safer?
                 // Wait, require inside function is better for cycles.
                 store.dispatch(logout());
             }
        }
        
        return Promise.reject(error);
    }
);

export default axiosClient;
