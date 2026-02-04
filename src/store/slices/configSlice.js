import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/axiosClient';

// Thunks
export const fetchMetadata = createAsyncThunk(
    'config/fetchMetadata',
    async (_, { rejectWithValue }) => {
        try {
            // Parallel fetch for sources and statuses
            const [sourcesRes, statusesRes] = await Promise.all([
                axiosClient.get('/config/sources'),
                axiosClient.get('/config/statuses')
            ]);
            // Normalize
            const sources = (sourcesRes.data || []).map(s => 
                typeof s === 'string' ? { key: s, label: s, color: '#64748b' } : s
            );
            
            const statuses = (statusesRes.data || []).map(s => 
                typeof s === 'string' ? { key: s, label: s } : s
            );

            return { sources, statuses };
        } catch (error) {
             // Fallback
             console.warn('Metadata fetch failed, using defaults', error);
             return rejectWithValue(error.message);
        }
    }
);

const initialState = {
    sources: [],
    statuses: [],
    isLoading: false,
    error: null,
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
            })
            .addCase(fetchMetadata.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
                // Defaults could be set here if needed, but UI likely handles empty arrays
            });
    }
});

export default configSlice.reducer;
