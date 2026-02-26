import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/axiosClient';
import { Alert } from 'react-native';

const handleWhatsAppError = (error) => {
    if (error.response && error.response.status === 500) {
        const errorMessage = error.response.data?.message || error.response.data?.error;
        if (errorMessage && typeof errorMessage === 'string' && errorMessage.includes('https://business.facebook.com')) {
            Alert.alert('Restrictions', errorMessage);
        }
    }
};


// Example thunk to fetch messages for a specific chat
export const fetchWhatsAppMessages = createAsyncThunk(
    'whatsapp/fetchMessages',
    async (contactId, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`/whatsapp/chats/${contactId}/messages`);
            return { contactId, messages: response.data || [] };
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const sendMessage = createAsyncThunk(
    'whatsapp/sendMessage',
    async ({ to, message }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post('/whatsapp/messages', { to, message });
            return response.data.data;
        } catch (error) {
            handleWhatsAppError(error);
            return rejectWithValue(error.response?.data?.message || 'Failed to send message');
        }
    }
);

export const fetchChats = createAsyncThunk(
    'whatsapp/fetchChats',
    async ({ tenantId, page = 1, limit = 20 } = {}, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get('/whatsapp/chats', { params: { tenantId, page, limit } });
            
            return {
                ...response.data.data, // { conversations: [], total, page, totalPages }
                isPagination: page > 1
            };
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch chats');
        }
    }
);

export const fetchConversationMessages = createAsyncThunk(
    'whatsapp/fetchConversationMessages',
    async ({ conversationId, limit = 50, offset = 0 }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`/whatsapp/chats/${conversationId}/messages`, {
                params: { limit, offset }
            });
            return response.data.data;
        } catch (error) {
              handleWhatsAppError(error);
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch messages');
        }
    }
);

export const sendConversationMessage = createAsyncThunk(
    'whatsapp/sendConversationMessage',
    async ({ conversationId, message }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post(`/whatsapp/chats/${conversationId}/messages`, { message });
            return response.data.data;
        } catch (error) {
            handleWhatsAppError(error);
            return rejectWithValue(error.response?.data?.message || 'Failed to send message');
        }
    }
);

export const createConversation = createAsyncThunk(
    'whatsapp/createConversation',
    async ({ phone, name }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post('/whatsapp/chats/search-create', { phone, name });
            console.log(response.data);
            
            return response.data;
        } catch (error) {
            handleWhatsAppError(error);
            return rejectWithValue(error.response?.data?.message || 'Failed to create conversation');
        }
    }
);

export const uploadMedia = createAsyncThunk(
    'whatsapp/uploadMedia',
    async (file, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await axiosClient.post('/whatsapp/media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data.data; // { id: '...' }
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to upload media');
        }
    }
);

export const searchChats = createAsyncThunk(
    'whatsapp/searchChats',
    async (query, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get('/whatsapp/search', { params: { query } });
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to search chats');
        }
    }
);

// --- Groups Thunks ---
export const fetchGroups = createAsyncThunk('whatsapp/fetchGroups', async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try { 
        const res = await axiosClient.get('/whatsapp/groups', { params: { page, limit } }); 
        return res.data.data; // Expecting { groups: [], total, page, totalPages }
    }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to fetch groups'); }
});

export const addGroupMembers = createAsyncThunk('whatsapp/addGroupMembers', async ({ id, members }, { rejectWithValue }) => {
    try { const res = await axiosClient.post(`/whatsapp/groups/${id}/members`, { members }); return res.data.data; }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to add members'); }
});

export const fetchContacts = createAsyncThunk('whatsapp/fetchContacts', async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try { 
        const res = await axiosClient.get('/whatsapp/contacts', { params: { page, limit } }); 
        return res.data.data; // Expecting { contacts: [], total, page, totalPages }
    }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to fetch contacts'); }
});
export const createContact = createAsyncThunk('whatsapp/createContact', async (data, { rejectWithValue }) => {
    try { const res = await axiosClient.post('/whatsapp/contacts', data); return res.data.data; }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to create contact'); }
});
export const updateContact = createAsyncThunk('whatsapp/updateContact', async ({ id, data }, { rejectWithValue }) => {
    try { const res = await axiosClient.put(`/whatsapp/contacts/${id}`, data); return res.data.data; }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to update contact'); }
});

// --- Automations Thunks ---
export const fetchAutomations = createAsyncThunk('whatsapp/fetchAutomations', async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try { 
        const res = await axiosClient.get('/whatsapp/automations', { params: { page, limit } }); 
        return res.data.data; 
    }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to fetch automations'); }
});

// --- Quick Replies Thunks ---
export const fetchQuickReplies = createAsyncThunk('whatsapp/fetchQuickReplies', async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try { 
        const res = await axiosClient.get('/whatsapp/quick-replies', { params: { page, limit } }); 
        return res.data.data; 
    }
    catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to fetch quick replies'); }
});

export const syncTemplates = createAsyncThunk('whatsapp/syncTemplates', async (_, { rejectWithValue }) => {
    try {
        const res = await axiosClient.post('/whatsapp/templates/sync');
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to sync templates');
    }
});

const whatsappSlice = createSlice({
    name: 'whatsapp',
    initialState: {
        chats: [],
        messages: {}, // mapping of conversationId -> messages Array
        contacts: [],
        groups: [],
        automations: [],
        quickReplies: [],
        isLoading: false,
        error: null,
        unreadCount: 0,
        pagination: {
            chats: { page: 1, total: 0 },
            contacts: { page: 1, total: 0 },
            groups: { page: 1, total: 0 }
        }
    },
    reducers: {
        receiveMessage: (state, action) => {
            const message = action.payload; 
            // the backend socket payload should be structured to include contactId, text/content, timestamp
            const contactId = message.contactId || message.phone || message.from; 

            if (!contactId) return;

            // Append to messages dictionary if it's already loaded
            if (state.messages[contactId]) {
                state.messages[contactId].push(message);
            } else {
                state.messages[contactId] = [message];
            }

            // Update chats list context (last message, time, unread count)
            const chatIndex = state.chats.findIndex(chat => chat.id === contactId || chat.phone === contactId);
            if (chatIndex >= 0) {
                state.chats[chatIndex].lastMessage = message.text || message.message_text || (message.type === 'media' ? 'Media' : 'Message');
                state.chats[chatIndex].time = message.timestamp || message.createdAt || new Date().toISOString();
                
                // Only increment unread if the message is from the user (inbound)
                if (message.direction === 'inbound') {
                    state.chats[chatIndex].unread = (state.chats[chatIndex].unread || 0) + 1;
                    state.unreadCount += 1;
                }
            } else {
                // If it's a new chat, unshift it to the top
                state.chats.unshift({
                    id: contactId,
                    phone: contactId,
                    name: message.senderName || message.contactName || contactId,
                    lastMessage: message.text || message.message_text || 'Message',
                    time: message.timestamp || message.createdAt || new Date().toISOString(),
                    unread: message.direction === 'inbound' ? 1 : 0,
                    isHot: false
                });
                
                if (message.direction === 'inbound') {
                    state.unreadCount += 1;
                }
            }
        },
        clearUnread: (state, action) => {
            const contactId = action.payload;
            const chatIndex = state.chats.findIndex(chat => chat.id === contactId || chat.phone === contactId);
            if (chatIndex >= 0) {
                const unreadAmount = state.chats[chatIndex].unread || 0;
                state.unreadCount = Math.max(0, state.unreadCount - unreadAmount);
                state.chats[chatIndex].unread = 0;
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Chats
            .addCase(fetchChats.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchChats.fulfilled, (state, action) => {
                state.isLoading = false;
                if (action.payload.isPagination) {
                    state.chats = [...state.chats, ...(action.payload.conversations || [])];
                } else {
                    state.chats = action.payload.conversations || [];
                }
            })
            .addCase(fetchChats.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fetch Conversation Messages
            .addCase(fetchConversationMessages.fulfilled, (state, action) => {
                const conversationId = action.meta.arg.conversationId;
                const messages = action.payload.messages || action.payload || [];
                state.messages[conversationId] = messages;
            })
            // Fetch Groups
            .addCase(fetchGroups.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchGroups.fulfilled, (state, action) => {
                state.isLoading = false;
                state.groups = action.payload.groups || action.payload || [];
                if (action.payload.total) state.pagination.groups.total = action.payload.total;
            })
            .addCase(fetchGroups.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fetch Contacts
            .addCase(fetchContacts.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchContacts.fulfilled, (state, action) => {
                state.isLoading = false;
                state.contacts = action.payload.contacts || action.payload || [];
                if (action.payload.total) state.pagination.contacts.total = action.payload.total;
            })
            // Fetch Automations
            .addCase(fetchAutomations.fulfilled, (state, action) => {
                state.automations = action.payload.automations || action.payload || [];
            })
            // Fetch Quick Replies
            .addCase(fetchQuickReplies.fulfilled, (state, action) => {
                state.quickReplies = action.payload.quickReplies || action.payload || [];
            });
    },
});

export const { receiveMessage, clearUnread } = whatsappSlice.actions;
export default whatsappSlice.reducer;
