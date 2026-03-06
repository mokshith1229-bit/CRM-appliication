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
            
            // response is already unwrapped by axiosClient interceptor
            const data = response.data || response.result || response;
            const conversations = data.conversations || (Array.isArray(data) ? data : []);

            return {
                conversations,
                total: data.total || conversations.length,
                page: data.page || page,
                totalPages: data.totalPages || 1,
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
            // Extract the actual payload. Some backends wrap in 'data', others return directly.
            return response.data; 
        } catch (error) {
              handleWhatsAppError(error);
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch messages');
        }
    }
);

export const sendConversationMessage = createAsyncThunk(
    'whatsapp/sendConversationMessage',
    async ({ conversationId, message, mediaId, type = 'text', fileName }, { rejectWithValue }) => {
        try {
            const payload = { message, type };
            if (mediaId) payload.mediaId = mediaId;
            if (fileName) payload.description = fileName;

            const response = await axiosClient.post(`/whatsapp/chats/${conversationId}/messages`, payload);
            return response.data; // Optimized to return the full created message object
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
    async (fileInput, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            
            if (typeof fileInput === 'string') {
                // It's a URI (e.g. from camera or audio)
                const filename = fileInput.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`; // Default to image if unknown
                
                formData.append('file', {
                    uri: fileInput,
                    name: filename,
                    type: type,
                });
            } else {
                // It's a file object (e.g. from document picker)
                formData.append('file', fileInput);
            }
            
            const response = await axiosClient.post('/whatsapp/media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data?.data || response.data || response; // { id: 'media_id' }
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to upload media');
        }
    }
);

export const markChatAsRead = createAsyncThunk(
    'whatsapp/markRead',
    async (conversationId, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post(`/whatsapp/chats/${conversationId}/read`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to mark as read');
        }
    }
);

export const searchGlobalMessages = createAsyncThunk(
    'whatsapp/searchGlobalMessages',
    async (query, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get('/whatsapp/messages/search', { params: { query } });
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to search messages');
        }
    }
);

export const searchConversationMessages = createAsyncThunk(
    'whatsapp/searchConversationMessages',
    async ({ conversationId, query }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`/whatsapp/chats/${conversationId}/messages/search`, { params: { query } });
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to search messages');
        }
    }
);

export const searchChats = createAsyncThunk(
    'whatsapp/searchChats',
    async (query, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get('/whatsapp/search', { params: { query } });
            return response.data.data || response.data;
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

export const fetchContacts = createAsyncThunk('whatsapp/fetchContacts', async ({ page = 1, limit = 20, search = '', wabaId, integrationId } = {}, { rejectWithValue }) => {
    try { 
        const res = await axiosClient.get('/whatsapp/contacts', { params: { page, limit, search, wabaId, integrationId } }); 
        return res.data.contacts; // Expecting { contacts: [], total, page, totalPages }
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
            const payload = action.payload;
            if (!payload) return;

            // Handle both flat and nested { conversation, message } structures
            const message = payload.message || payload;
            const conversation = payload.conversation;
            
            // Determine the user's phone involved in this message
            const direction = message.direction || 'inbound';
            const userPhone = direction === 'inbound' ? message.from : message.to;
            
            // Determine the Mongo/Conversation ID if available
            const messageConvId = message.conversationId || (conversation ? (conversation._id || conversation.id) : null);

            const clean = (p) => String(p || '').replace(/\+/g, '').replace(/[\s-]/g, '');
            const targetUserPhone = clean(userPhone);
            const targetContactPhone = clean(message.contactPhone);

            // Find the chat in our existing list using any available identifier
            const chatIndex = state.chats.findIndex(chat => {
                const idMatch = messageConvId && ((chat._id || chat.id) === messageConvId);
                const chatPhone = clean(chat.phone);
                const phoneMatch = chatPhone && (chatPhone === targetUserPhone || chatPhone === targetContactPhone);
                return idMatch || phoneMatch;
            });

            // Use Chat ID as the primary key for state.messages, fall back to phone
            let key = messageConvId || userPhone;
            if (chatIndex >= 0) {
                key = state.chats[chatIndex]._id || state.chats[chatIndex].id || key;
            }

            // Initialize message list for this key if it doesn't exist
            if (!state.messages[key]) {
                state.messages[key] = [];
            }

            // Append message if it's not a duplicate
            const msgId = message._id || message.id || message.messageId;
            const exists = state.messages[key].some(m => (m._id || m.id || m.messageId) === msgId);
            if (!exists) {
                // Robustly extract the text body for display consistency
                const body = message.text || message.message_text || message.message || message.body || message.content?.body || '';
                const enrichedMessage = { ...message, text: body }; // Normalize text field
                state.messages[key].push(enrichedMessage);
            }

            // Update the chat item in the list
            if (chatIndex >= 0) {
                const updatedConv = conversation || {};
                const currentChat = state.chats[chatIndex];
                
                state.chats[chatIndex] = {
                    ...currentChat,
                    ...updatedConv,
                    lastMessage: message.text || message.message_text || message.content?.body || (message.type === 'media' ? 'Media' : 'Message'),
                    lastMessageTime: message.timestamp || message.createdAt || new Date().toISOString(),
                };
                
                // Unread Count logic
                if (direction === 'inbound') {
                    if (updatedConv.unreadCount !== undefined) {
                        state.chats[chatIndex].unreadCount = updatedConv.unreadCount;
                    } else {
                        state.chats[chatIndex].unreadCount = (currentChat.unreadCount || 0) + 1;
                        state.unreadCount += 1;
                    }
                }
            } else if (conversation || direction === 'inbound') {
                // If it's a new chat, add it to the top
                const newChat = conversation ? {
                    ...conversation,
                    lastMessage: message.text || message.message_text || message.content?.body || 'Message',
                    lastMessageTime: message.timestamp || message.createdAt || new Date().toISOString(),
                } : {
                    _id: messageConvId,
                    phone: userPhone,
                    name: message.contactName || userPhone,
                    lastMessage: message.text || message.message_text || message.content?.body || 'Message',
                    lastMessageTime: message.timestamp || message.createdAt || new Date().toISOString(),
                    unreadCount: 1
                };
                
                state.chats.unshift(newChat);
                if (direction === 'inbound') {
                    state.unreadCount += (newChat.unreadCount || 1);
                }
            }
        },
        clearUnread: (state, action) => {
            const targetId = String(action.payload || '');
            const targetIdClean = targetId.replace(/\+/g, '').replace(/[\s-]/g, '');

            const chatIndex = state.chats.findIndex(chat => {
                const idMatch = (chat._id || chat.id) === targetId;
                const phoneClean = (chat.phone || '').replace(/\+/g, '').replace(/[\s-]/g, '');
                const phoneMatch = phoneClean && targetIdClean && phoneClean === targetIdClean;
                return idMatch || phoneMatch;
            });

            if (chatIndex >= 0) {
                const unreadAmount = state.chats[chatIndex].unreadCount || state.chats[chatIndex].unread || 0;
                state.unreadCount = Math.max(0, state.unreadCount - unreadAmount);
                state.chats[chatIndex].unread = 0;
                state.chats[chatIndex].unreadCount = 0;
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
                const data = action.payload;
                if (!data) return;

                // Handle both { messages: [] }, { data: [] }, { result: [] } and raw [] response
                let messagesList = [];
                if (Array.isArray(data)) {
                    messagesList = data;
                } else if (data.messages && Array.isArray(data.messages)) {
                    messagesList = data.messages;
                } else if (data.data && Array.isArray(data.data)) {
                    messagesList = data.data;
                } else if (data.result && Array.isArray(data.result)) {
                    messagesList = data.result;
                }

                state.messages[conversationId] = messagesList;
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
            // Send Conversation Message - Optimistic and final update
            .addCase(sendConversationMessage.pending, (state, action) => {
                const { conversationId, message, type, fileName } = action.meta.arg;
                if (!state.messages[conversationId]) state.messages[conversationId] = [];
                
                // Add an optimistic "sending" message
                state.messages[conversationId].push({
                    _id: `temp-${Date.now()}`,
                    direction: 'outbound',
                    text: message || (type === 'media' ? `Sending ${fileName || 'file'}...` : ''),
                    status: 'sending',
                    type: type || 'text',
                    createdAt: new Date().toISOString()
                });
            })
            .addCase(sendConversationMessage.fulfilled, (state, action) => {
                const { conversationId } = action.meta.arg;
                const newMessage = action.payload?.data || action.payload;
                
                if (state.messages[conversationId]) {
                    // Remove the temporary message and add the real one
                    state.messages[conversationId] = state.messages[conversationId].filter(m => m.status !== 'sending');
                    state.messages[conversationId].push(newMessage);
                }
            })
            .addCase(sendConversationMessage.rejected, (state, action) => {
                const { conversationId } = action.meta.arg;
                if (state.messages[conversationId]) {
                    state.messages[conversationId] = state.messages[conversationId].map(m => 
                        m.status === 'sending' ? { ...m, status: 'error' } : m
                    );
                }
            })
            // Fetch Quick Replies
            .addCase(fetchQuickReplies.fulfilled, (state, action) => {
                state.quickReplies = action.payload.quickReplies || action.payload || [];
            });
    },
});

export const { receiveMessage, clearUnread } = whatsappSlice.actions;
export default whatsappSlice.reducer;
