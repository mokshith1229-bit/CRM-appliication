import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/axiosClient';

// Thunk to fetch leads
export const fetchLeads = createAsyncThunk(
    'leads/fetchLeads',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get('/leads', { params: filters });
        if (response.data) {
                const { leads, total, page, pages } = response.data;
                const mappedLeads = leads.map(lead => ({
                    ...lead,
                    status: lead.status // Normalize to status
                }));
                return {
                    leads: mappedLeads,
                    pagination: { page, pages, total }
                };
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch leads');
        }
    }
);

// Thunk to bulk delete leads
export const bulkDeleteLeads = createAsyncThunk(
    'leads/bulkDelete',
    async (leadIds, { rejectWithValue }) => {
        try {
            const response = await axiosClient.delete('/leads/bulk', { data: { leadIds } });
            if (response.success) {
                return leadIds; // Return deleted IDs
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to delete leads');
        }
    }
);

// Thunk to create a new lead
export const createLead = createAsyncThunk(
    'leads/createLead',
    async (leadData, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post('/leads', leadData);
            if (response.success) {
                return response.data; // Returns created lead
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                return rejectWithValue(error.response.data.message);
            }
            return rejectWithValue(error.message || 'Failed to create lead');
        }
    }
);

// Thunk to search leads by name, email, or mobile
export const searchLeads = createAsyncThunk(
    'leads/searchLeads',
    async ({ query, field }, { rejectWithValue }) => {
        try {
            if (!query || query.length < 2) {
                return []; // Don't search for very short queries
            }
            
            const response = await axiosClient.get('/leads/search', {
                params: { q: query, field }
            });
            
            if (response.success) {
                return response.data || [];
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to search leads');
        }
    }
);

// Thunk to update lead status
export const updateLeadStatus = createAsyncThunk(
    'leads/updateStatus',
    async ({ id, status }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.put(`/leads/${id}`, { status: status });
            if (response.data) {
                return response.data; // Returns updated lead
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to update status');
        }
    }
);

// Thunk to update generic lead details
export const updateLead = createAsyncThunk(
    'leads/updateLead',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            // First perform the update
            // Payload is sent as is, status key is already standard
            const payload = { ...data };
            await axiosClient.put(`/leads/${id}`, payload);
            
            // Now re-fetch the specific lead to get the updated data
            const getResponse = await axiosClient.get(`/leads/${id}`);

            if (getResponse.success || getResponse.data) {
                // Support both result and data keys based on apiResponse utility
                const updatedLead = getResponse.result || getResponse.data;
                return {
                    ...updatedLead,
                    status: updatedLead.status || updatedLead.status
                }; 
            } else {
                return rejectWithValue(getResponse.message || 'Failed to fetch updated lead');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to update lead');
        }
    }
);

// Thunk to fetch Enquiries (Normalized)
export const fetchEnquiries = createAsyncThunk(
    'leads/fetchEnquiries',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get('/enquiries', { params: filters });
            console.log('API FETCH ENQUIRIES RESPONSE:', response.data ? response.data.length : 'No Data'); 
            if (response.success || response.data) {
                return response.data || response.result; 
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch enquiries');
        }
    }
);

// Thunk to fetch Campaign Records (Normalized)
export const fetchCampaignRecords = createAsyncThunk(
    'leads/fetchCampaignRecords',
    async ({ campaignId, ...filters }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`/campaigns/${campaignId}/records`, { params: filters });
            console.log('API FETCH CAMPAIGN RECORDS RESPONSE:', response); 
            if (response.success || response.data) {
                return response.data || response.result;
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch campaign records');
        }
    }
);

// Thunk to fetch Campaigns List
export const fetchCampaigns = createAsyncThunk(
    'leads/fetchCampaigns',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get('/campaigns');
            if (response.success || response.data) {
                return response.data || response.result;
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch campaigns');
        }
    }
);

// Thunk to fetch detailed lead info (with full history)
export const fetchLeadDetails = createAsyncThunk(
    'leads/fetchLeadDetails',
    async (leadId, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get(`/leads/${leadId}`);
            if (response.success || response.data) {
                return response.data || response.result;
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch lead details');
        }
    }
);
// Thunk to sync call logs
import CallLogService from '../../services/CallLogService';

export const syncCallLogs = createAsyncThunk(
    'leads/syncCallLogs',
    async (leadId, { getState, dispatch, rejectWithValue }) => {
        try {
            const state = getState();
            const lead = state.leads.leads.find(l => l._id === leadId);
            if (!lead) return rejectWithValue('Lead not found');

            const phone = lead.phone;
            if (!phone) return rejectWithValue('No phone number for lead');

            const logs = await CallLogService.getLogsForNumber(phone, 20);
            
            if (logs.length > 0) {
                // Map to our schema
                const newLogs = logs.map(log => ({
                    id: log.timestamp, // Use timestamp as ID for uniqueness
                    date: new Date(parseInt(log.timestamp)).toISOString(),
                    status: log.type === 'MISSED' ? 'Missed' : (log.type === 'INCOMING' ? 'Received' : 'Dialed'),
                    duration: log.duration + 's',
                    notes: 'Auto-synced from device',
                    type: 'Call',
                    agentName: 'System'
                }));

                // Merge with existing logs
                const existingLogs = lead.call_logs || [];
                const existingIds = new Set(existingLogs.map(l => l.id));
                const uniqueNewLogs = newLogs.filter(l => !existingIds.has(String(l.id))); // Ensure ID string comparison

                if (uniqueNewLogs.length > 0) {
                     const updatedLogs = [...uniqueNewLogs, ...existingLogs];
                     // Update lead
                     await dispatch(updateLead({ 
                         id: leadId, 
                         data: { call_logs: updatedLogs } 
                     }));
                     return updatedLogs;
                }
            }
            return null;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Thunk to fetch Tenant Configuration
export const fetchTenantConfig = createAsyncThunk(
    'leads/fetchTenantConfig',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get('/config');
            if (response.success || response.data) {
                return response.data || response.result;
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch tenant config');
        }
    }
);

// Thunk to check if lead exists by phone
export const checkLeadByPhone = createAsyncThunk(
    'leads/checkLeadByPhone',
    async (phone, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get('/leads/check-phone', { params: { phone } });
            if (response.success) {
                return response.data; // { exists: boolean, lead: object | null }
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to check lead');
        }
    }
);

const leadSlice = createSlice({
    name: 'leads',
    initialState: {
        leads: [],
        currentLeadDetails: null, // Store detailed view of a lead
        campaigns: [], // Store campaigns list
        searchResults: [], // Store search results for auto-search
        tenantConfig: null, // Store tenant configuration (sources, statuses, etc.)
        isLoading: false,
        isSearching: false,
        createLoading: false,
        error: null,
        activeFilter: 'all', // 'all', 'new_leads', 'hot', 'warm', 'cold', 'connected', 'missed'
        pagination: {
            page: 1,
            pages: 1,
            total: 0
        },
        campaignLeads: [], // Dedicated array for campaign leads
        campaignPagination: {
            page: 1,
            pages: 1,
            total: 0
        }
    },
    reducers: {
        setActiveFilter: (state, action) => {
            state.activeFilter = action.payload;
            // Reset pagination when filter changes so skeleton shows correctly
            state.pagination = {
                page: 1,
                pages: 1,
                total: 0
            };
        },
        clearLeads: (state) => {
            state.leads = [];
            state.error = null;
            state.isLoading = true; // Show skeleton immediately
        },
        clearLeadDetails: (state) => {
            state.currentLeadDetails = null;
        },
        clearCampaignLeads: (state) => {
            state.campaignLeads = [];
            state.campaignPagination = { page: 1, pages: 1, total: 0 };
        },
        clearSearchResults: (state) => {
            state.searchResults = [];
            state.isSearching = false;
        },
        removeLead: (state, action) => {
            // Remove lead by id - useful after transfer
            state.leads = state.leads.filter(lead => 
                (lead._id || lead.id) !== action.payload
            );
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchLeads.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchLeads.fulfilled, (state, action) => {
                state.isLoading = false;
                const { leads, pagination } = action.payload;
                state.pagination = pagination;
                
                if (pagination.page == 1) {
                    state.leads = leads;
                } else {
                    // Check for duplicates before appending?
                    // Ideally backend pagination is clean, but for safety:
                    // Only add leads not already in state
                    const existingIds = new Set(state.leads.map(l => l._id));
                    const newLeads = leads.filter(l => !existingIds.has(l._id));
                    state.leads = [...state.leads, ...newLeads];
                }
            })
            .addCase(fetchLeads.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(updateLeadStatus.fulfilled, (state, action) => {
                // Update specific lead in the list
                const index = state.leads.findIndex(l => l._id === action.payload._id);
                if (index !== -1) {
                    state.leads[index] = action.payload;
                }
            })
            .addCase(updateLead.fulfilled, (state, action) => {
                const index = state.leads.findIndex(l => l._id === action.payload._id);
                if (index !== -1) {
                    state.leads[index] = action.payload;
                }
            })
            .addCase(fetchEnquiries.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchEnquiries.fulfilled, (state, action) => {
                 state.isLoading = false;
                 state.leads = action.payload; 
            })
            .addCase(fetchEnquiries.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchCampaignRecords.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchCampaignRecords.fulfilled, (state, action) => {
                 state.isLoading = false;
                 // Normalize response to ensure we have pagination data
                 const response = action.payload; // This is directly from return response.data || response.result
                 
                 // If the payload is the array of records directly (old behavior) or has pagination
                 if (Array.isArray(response)) {
                    state.campaignLeads = response.map(l => ({ 
                        ...l, 
                        id: l._id || l.id 
                    }));
                    state.campaignPagination = { page: 1, pages: 1, total: response.length };
                  } else if (response.records || response.leads) {
                    const records = (response.records || response.leads).map(l => ({
                        ...l,
                        id: l._id // Normalize to id for UI consistency
                    }));
                    const { page, pages, total } = response;
                    
                    if (page === 1) {
                        state.campaignLeads = records;
                    } else {
                        const existingIds = new Set(state.campaignLeads.map(l => l._id));
                        const newRecords = records.filter(l => !existingIds.has(l._id));
                        state.campaignLeads = [...state.campaignLeads, ...newRecords];
                    }
                    state.campaignPagination = { page, pages, total };
                 }
            })
            .addCase(fetchCampaignRecords.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchCampaigns.fulfilled, (state, action) => {
                state.campaigns = action.payload; // Update campaigns list
            })
            // Fetch Lead Details
            .addCase(fetchLeadDetails.pending, (state) => {
                // Keep previous details or clear? Better to keep or handle in component
            })
            .addCase(fetchLeadDetails.fulfilled, (state, action) => {
                state.currentLeadDetails = action.payload;
            })
            .addCase(fetchLeadDetails.rejected, (state) => {
                state.currentLeadDetails = null;
            })
            // Create Lead
            .addCase(createLead.pending, (state) => {
                state.createLoading = true;
                state.error = null;
            })
            .addCase(createLead.fulfilled, (state, action) => {
                state.createLoading = false;
                // Optionally add the new lead to the leads array
                state.leads.unshift(action.payload);
            })
            .addCase(createLead.rejected, (state, action) => {
                state.createLoading = false;
                state.error = action.payload;
            })
            // Search Leads
            .addCase(searchLeads.pending, (state) => {
                state.isSearching = true;
            })
            .addCase(searchLeads.fulfilled, (state, action) => {
                state.isSearching = false;
                state.searchResults = action.payload;
            })
            .addCase(searchLeads.rejected, (state, action) => {
                state.isSearching = false;
                state.searchResults = [];
            })
            // Fetch Tenant Config
            .addCase(fetchTenantConfig.fulfilled, (state, action) => {
                state.tenantConfig = action.payload;
            });
    },
});

export const { 
    setActiveFilter, 
    clearLeads, 
    clearLeadDetails, 
    clearSearchResults, 
    removeLead,
    clearCampaignLeads
} = leadSlice.actions;
export default leadSlice.reducer;
