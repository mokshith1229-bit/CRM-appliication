import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/axiosClient';

// Thunk for fetching user statistics
export const fetchMyStats = createAsyncThunk(
    'stats/fetchMyStats',
    async (date = null, { rejectWithValue }) => {
        try {
            const params = date ? { date } : {};
            const response = await axiosClient.get('/stats/my-stats', { params });
            
            if (response.success) {
                return response.data;
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                return rejectWithValue(error.response.data.message);
            }
            return rejectWithValue(error.message || 'Failed to fetch statistics');
        }
    }
);

const statsSlice = createSlice({
    name: 'stats',
    initialState: {
        stats: {
            calls: {
                attempted: 0,
                connected: 0,
                notConnected: 0
            },
            leads: {
                inProgress: 0,
                converted: 0,
                lost: 0
            },
            whatsapp: 0,
            dailyCalls: []
        },
        isLoading: false,
        error: null,
    },
    reducers: {
        clearStatsError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMyStats.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchMyStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.stats = action.payload;
            })
            .addCase(fetchMyStats.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { clearStatsError } = statsSlice.actions;
export default statsSlice.reducer;
