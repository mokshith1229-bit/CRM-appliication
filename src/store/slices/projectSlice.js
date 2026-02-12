import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/axiosClient';

// Thunk to fetch projects
export const fetchProjects = createAsyncThunk(
    'projects/fetchProjects',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get('/projects', { params: filters });
            if (response) {
                const { projects, total, page, pages } = response.data;
                return {
                    projects,
                    pagination: { page, pages, total }
                };
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch projects');
        }
    }
);

const projectSlice = createSlice({
    name: 'projects',
    initialState: {
        projects: [],
        isLoading: false,
        error: null,
        pagination: {
            page: 1,
            pages: 1,
            total: 0
        }
    },
    reducers: {
        clearProjects: (state) => {
            state.projects = [];
            state.pagination = { page: 1, pages: 1, total: 0 };
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Projects
            .addCase(fetchProjects.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchProjects.fulfilled, (state, action) => {
                state.isLoading = false;
                state.projects = action.payload.projects;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchProjects.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || 'Failed to fetch projects';
            });
    }
});

export const { clearProjects } = projectSlice.actions;
export default projectSlice.reducer;
