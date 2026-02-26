import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import leadReducer from './slices/leadSlice';
import configReducer from './slices/configSlice';
import teamReducer from './slices/teamSlice';
import projectReducer from './slices/projectSlice';
import statsReducer from './slices/statsSlice';
import whatsappReducer from './slices/whatsappSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        leads: leadReducer,
        config: configReducer,
        team: teamReducer,
        projects: projectReducer,
        stats: statsReducer,
        whatsapp: whatsappReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});
