import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/axiosClient';

// Fetch team members
export const fetchTeamMembers = createAsyncThunk(
    'team/fetchMembers',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get('/users');
            // Assuming response has users array
            return response.data || response.result || [];
        } catch (error) {
            console.error('Failed to fetch team members:', error);
            return rejectWithValue(error.message || 'Failed to fetch team members');
        }
    }
);

const initialState = {
    members: [],
    isLoading: false,
    error: null,
};

const teamSlice = createSlice({
    name: 'team',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchTeamMembers.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchTeamMembers.fulfilled, (state, action) => {
                state.isLoading = false;
                state.members = action.payload;
            })
            .addCase(fetchTeamMembers.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
                state.members = []; // Reset to empty on error
            });
    }
});

export default teamSlice.reducer;
