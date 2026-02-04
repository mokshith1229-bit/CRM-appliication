import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../../api/axiosClient';

// Thunk for Login
export const login = createAsyncThunk(
    'auth/login',
    async ({ identifier, password }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post('/auth/login', { identifier, password });
            if (response.success) {
                await AsyncStorage.setItem('userToken', response.data.accessToken);
                await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
                return response.data;
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                return rejectWithValue(error.response.data.message);
            }
            return rejectWithValue(error.message || 'Login failed');
        }
    }
);

// Thunk for Logout
export const logout = createAsyncThunk('auth/logout', async () => {
    try {
        await axiosClient.post('/auth/logout');
    } catch (error) {
        console.warn('Logout server-side failed:', error);
    } finally {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('user');
    }
});

// Thunk for Check Auth (Load from Storage)
export const checkAuth = createAsyncThunk('auth/checkAuth', async () => {
    const token = await AsyncStorage.getItem('userToken');
    const user = await AsyncStorage.getItem('user');
    if (token && user) {
        return { token, user: JSON.parse(user) };
    }
    return null;
});

// Thunk for Update Profile
export const updateProfile = createAsyncThunk(
    'auth/updateProfile',
    async (updates, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            const userId = auth.user._id;
            
            const response = await axiosClient.patch(`/users/${userId}`, updates);
            
            if (response.success) {
                // Update stored user data
                await AsyncStorage.setItem('user', JSON.stringify(response.data));
                return response.data;
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                return rejectWithValue(error.response.data.message);
            }
            return rejectWithValue(error.message || 'Profile update failed');
        }
    }
);

// Thunk for Change Password
export const changePassword = createAsyncThunk(
    'auth/changePassword',
    async ({ oldPassword, newPassword }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post('/auth/change-password', {
                oldPassword,
                newPassword
            });
            
            if (response.success) {
                return response.message;
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                return rejectWithValue(error.response.data.message);
            }
            return rejectWithValue(error.message || 'Password change failed');
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true, // Start loading to check storage
        error: null,
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        // Login
        builder
            .addCase(login.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.token = action.payload.accessToken;
                state.user = action.payload.user;
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });

        // Logout
        builder.addCase(logout.fulfilled, (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
        });

        // Check Auth
        builder
            .addCase(checkAuth.pending, (state) => {
                 state.isLoading = true;
            })
            .addCase(checkAuth.fulfilled, (state, action) => {
                state.isLoading = false;
                if (action.payload) {
                    state.isAuthenticated = true;
                    state.token = action.payload.token;
                    state.user = action.payload.user;
                } else {
                    state.isAuthenticated = false;
                }
            })
            .addCase(checkAuth.rejected, (state) => {
                state.isLoading = false;
                state.isAuthenticated = false;
            });

        // Update Profile
        builder
            .addCase(updateProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
            })
            .addCase(updateProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });

        // Change Password
        builder
            .addCase(changePassword.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(changePassword.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(changePassword.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
