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

// Thunk to create a new enquiry
export const createEnquiry = createAsyncThunk(
    'leads/createEnquiry',
    async (enquiryData, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post('/enquiries', enquiryData);
            if (response.success || response.data) {
                return response.data || response.result; // Returns created enquiry
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                return rejectWithValue(error.response.data.message);
            }
            return rejectWithValue(error.message || 'Failed to create enquiry');
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
            // 1. Extract the most specific message possible
            const errorMessage = error.response?.data?.message  // The custom backend message
                || error.response?.data           // Fallback to data object
                || error.message                  // Fallback to "Request failed..."
                || 'An unknown error occurred';

            // 2. Log it for your own debugging
            // 3. Return it to your Redux state / UI
            return rejectWithValue(errorMessage);
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
            const response = await axiosClient.put(`/leads/${id}`, payload);

            if (response.success || response.data) {
                // Support both result and data keys based on apiResponse utility
                const updatedLead = response.result || response.data;
                return {
                    ...updatedLead,
                    ...data,
                    attributes: {
                        ...(updatedLead.attributes || {}),
                        ...(data.attributes || {})
                    },
                    status: updatedLead.status || data.status // Normalize
                };
            } else {
                return rejectWithValue(response.message || 'Failed to update lead');
            }
        } catch (error) {
            // 1. Extract the most specific message possible
            const errorMessage = error.response?.data?.message  // The custom backend message
                || error.response?.data           // Fallback to data object
                || error.message                  // Fallback to "Request failed..."
                || 'An unknown error occurred';


            // 3. Return it to your Redux state / UI
            return rejectWithValue(errorMessage);
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
                // Return full response to handle pagination in reducer
                return response;
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
            const page = filters.page || 1;
            const response = await axiosClient.get(`/campaigns/${campaignId}/records`, { params: filters });
            console.log('API FETCH CAMPAIGN RECORDS RESPONSE:', response);
            if (response.success || response.data) {
                const data = response.data || response.result;
                const records = Array.isArray(data) ? data : (data.records || data.leads || []);
                const pagination = data.pagination || {
                    page: data.page || filters.page || 1,
                    pages: data.pages || data.totalPages || 1,
                    total: data.total || records.length
                };
                return { records, pagination, meta_page: page };
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
    async (leadId, { getState, rejectWithValue }) => {
        try {
            const state = getState();
            const lead = state.leads.leads.find(l => l._id === leadId);
            if (!lead) return rejectWithValue('Lead not found');

            const phone = lead.phone;
            if (!phone) return rejectWithValue('No phone number for lead');

            // Use the typed sync helper so logs are linked to this lead in the backend
            const result = await CallLogService.syncCallLogsForLead(lead._id, phone);
            console.log('[syncCallLogs] Result:', result);
            return result;
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

// Helper Thunk: Ensure a lead exists (convert from log if needed)
export const ensureLead = createAsyncThunk(
    'leads/ensureLead',
    async (payload, { dispatch, getState, rejectWithValue }) => {
        try {
            // Handle both calling patterns:
            // 1. ensureLead(contact) - direct contact object
            // 2. ensureLead({ contact, initialStatus }) - destructured object
            const contact = payload?.contact || payload;
            const initialStatus = payload?.initialStatus;

            // Validate contact exists
            if (!contact) {
                return rejectWithValue('Contact is required');
            }

            // Check if it's a device log or temporary contact
            if (contact._source === 'log' || (typeof contact.id === 'string' && contact.id.startsWith('log-'))) {
                // VALIDATION: Ignore service numbers / IVR
                if (!contact.phone || contact.phone.length < 10) {
                    return rejectWithValue('Cannot convert service numbers (IVR) to leads.');
                }

                // Get current user info
                const state = getState();
                const currentUser = state.auth?.user;
                const agentName = currentUser ? currentUser.name : 'System';

                // Create payload for new lead
                const leadPayload = {
                    name: contact.name || contact.phone,
                    phone: contact.phone,
                    lead_source: contact.lead_source || 'Offline',
                    status: initialStatus || '', // No default to 'New'
                    // Add other fields if available
                    email: contact.email,
                    whatsapp_number: contact.whatsapp || contact.phone
                };

                // VALIDATION: Ensure status and source are provided
                if (!leadPayload.status) {
                    return rejectWithValue('Please select lead status before performing this action.');
                }

                console.log('ensureLead: Creating lead...', leadPayload);
                // Dispatch createLead
                const result = await dispatch(createLead(leadPayload)).unwrap();

                // CRITICAL: After conversion, trigger a full historical sync for this number
                // linked to the newly created lead so all old logs are properly attributed.
                if (result && (result._id || result.id)) {
                    const newLeadId = result._id || result.id;
                    // Fire and forget — do not block the UI transition
                    CallLogService.syncCallLogsForLead(newLeadId, leadPayload.phone).catch(err =>
                        console.error('ensureLead: Historical lead sync failed', err)
                    );
                }

                return result; // This is the new lead with _id
            }

            // Already a lead
            return contact;
        } catch (error) {
            // 1. Extract the most specific message possible
            const errorMessage = error.response?.data?.message  // The custom backend message
                || error.response?.data           // Fallback to data object
                || error.message                  // Fallback to "Request failed..."
                || error || 'An unknown error occurred';

            return rejectWithValue(errorMessage || 'Failed to ensure lead existence');
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

// Thunk to validate call log ownership (check if numbers belong to others)
export const validateLogOwnership = createAsyncThunk(
    'leads/validateLogOwnership',
    async (phoneNumbers, { rejectWithValue }) => {
        try {
            if (!phoneNumbers || phoneNumbers.length === 0) return {};
            const response = await axiosClient.post('/leads/check-numbers', { phoneNumbers });
            if (response.success) {
                // Returns: { [phone]: { type, lead_id|enquiry_id|campaign_record_id, campaign_id?, ownership: 'mine'|'other' } | null }
                return response.data;
            } else {
                return rejectWithValue(response.message);
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to validate logs');
        }
    }
);


// Thunk to fetch Combined Enquiries (Enquiries + Campaign Records)
export const fetchCombinedEnquiries = createAsyncThunk(
    'leads/fetchCombinedEnquiries',
    async (filters = {}, { dispatch, rejectWithValue }) => {
        try {
            // 1. Fetch Enquiries
            const enquiriesResponse = await axiosClient.get('/enquiries', { params: filters });
            let combinedData = [];

            if (enquiriesResponse.success || enquiriesResponse.data) {
                const results = enquiriesResponse.data?.records || enquiriesResponse.data || enquiriesResponse.result || [];
                const normalizedEnquiries = results.map(l => {
                    const normalized = { ...l };
                    if (l.last_call) {
                        normalized.lastCallRecord = {
                            duration: (l.last_call.duration || 0) + 's',
                            date: l.last_call.timestamp,
                            status: l.last_call.status
                        };
                        normalized.lastCallTime = l.last_call.timestamp;
                    }
                    return normalized;
                });
                combinedData = [...normalizedEnquiries];
            }

            // // 2. Fetch Campaigns
            // const campaignsResponse = await axiosClient.get('/campaigns');
            // const campaigns = campaignsResponse.data || campaignsResponse.result || [];

            // // 3. Fetch Records for each Campaign (Parallel)
            // // Note: We are fetching PAGE 1 only for now to avoid massive data load
            // const campaignPromises = campaigns.map(campaign =>
            //     axiosClient.get(`/campaigns/${campaign._id || campaign.id}/records`, { params: { ...filters, page: 1, limit: 1000 } })
            //         .then(res => {
            //             const data = res.data || res.result;
            //             let records = [];
            //             if (Array.isArray(data)) records = data;
            //             else if (data && (data.records || data.leads)) records = data.records || data.leads;

            //             // Inject Campaign Info
            //             return records.map(r => {
            //                 const normalized = {
            //                     ...r,
            //                     campaignId: campaign._id || campaign.id,
            //                     campaignName: campaign.name,
            //                     source: campaign.name, // Ensure source is also set for Fallback
            //                     isCampaignLead: true,
            //                     attributes: {
            //                         ...r.attributes,
            //                         campaignName: campaign.name
            //                     }
            //                 };

            //                 // Normalization for last_call if available
            //                 if (r.last_call) {
            //                     normalized.lastCallRecord = {
            //                         duration: (r.last_call.duration || 0) + 's',
            //                         date: r.last_call.timestamp,
            //                         status: r.last_call.status
            //                     };
            //                     normalized.lastCallTime = r.last_call.timestamp;
            //                 }
            //                 return normalized;
            //             });
            //         })
            //         .catch(err => []) // Ignore errors for individual campaigns
            // );

            // const allCampaignRecords = await Promise.all(campaignPromises);

            // // 4. Flatten and Merge
            // allCampaignRecords.forEach(records => {
            //     // Normalize IDs and add to combined
            //     const normalizedRecords = records.map(r => ({ ...r, id: r._id || r.id }));
            //     combinedData = [...combinedData, ...normalizedRecords];
            // });

            // 5. Remove duplicates (by _id or id) just in case
            const uniqueData = Array.from(new Map(combinedData.map(item => [item._id || item.id, item])).values());

            // Sort by date (createdAt desc)
            uniqueData.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));

            return uniqueData;

        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch combined enquiries');
        }
    }
);

// Thunk to fetch All Calls (Unified Leads/Enquiries/Campaigns with logs)
export const fetchAllCalls = createAsyncThunk(
    'leads/fetchAllCalls',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get('/calls/allcalls', { params: filters });
            // Normalize: endpoint could return array directly, or wrapped in data/result
            if (Array.isArray(response)) return response;
            if (response.success || response.data || response.result) {
                return response.data || response.result || [];
            } else {
                return rejectWithValue(response.message || 'Invalid response format');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch all calls history');
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
            state.leads = []; // Clear current leads to show skeleton
            state.isLoading = true; // Set loading to true immediately
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
            .addCase(fetchLeads.pending, (state, action) => {
                const page = action.meta.arg.page || 1;
                if (page === 1 && state.leads.length === 0) {
                    state.isLoading = true;
                }
                state.error = null;
            })
            .addCase(fetchLeads.fulfilled, (state, action) => {
                state.isLoading = false;
                const { leads, pagination } = action.payload;
                state.pagination = pagination;

                const normalizedLeads = leads.map(l => {
                    const normalized = { ...l };
                    if (l.last_call) {
                        normalized.lastCallRecord = {
                            duration: (l.last_call.duration || 0) + 's',
                            date: l.last_call.timestamp,
                            status: l.last_call.status
                        };
                        normalized.lastCallTime = l.last_call.timestamp;
                    }
                    return normalized;
                });

                if (pagination.page == 1) {
                    state.leads = normalizedLeads;
                } else {
                    // Check for duplicates before appending
                    const existingIds = new Set(state.leads.map(l => l._id));
                    const newLeads = normalizedLeads.filter(l => !existingIds.has(l._id));
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
                const originalId = action.meta.arg.id;
                const newLead = action.payload;

                // If ID changed (Conversion occurred)
                if (originalId !== newLead._id) {
                    // 1. Remove from leads/enquiries
                    state.leads = state.leads.filter(l => l._id !== originalId);
                    // 2. Remove from campaign records if it was there
                    state.campaignLeads = state.campaignLeads.filter(l => l._id !== originalId);

                    // 3. Add to leads if not already there (shouldn't be, but safe)
                    const existingIndex = state.leads.findIndex(l => l._id === newLead._id);
                    if (existingIndex === -1) {
                        state.leads.unshift(newLead); // Add new lead to top
                    } else {
                        state.leads[existingIndex] = newLead;
                    }
                } else {
                    // Normal update
                    const index = state.leads.findIndex(l => l._id === newLead._id);
                    if (index !== -1) {
                        state.leads[index] = newLead;
                    }

                    // Also update currentLeadDetails if it matches
                    if (state.currentLeadDetails && (state.currentLeadDetails._id === newLead._id || state.currentLeadDetails.id === newLead._id)) {
                        state.currentLeadDetails = newLead;
                    }
                }
            })
            .addCase(fetchEnquiries.pending, (state, action) => {
                const page = action.meta.arg.page || 1;
                if (page === 1 && state.enquiries.length === 0) {
                    state.isLoading = true;
                }
                state.error = null;
            })
            .addCase(fetchEnquiries.fulfilled, (state, action) => {
                state.isLoading = false;
                const response = action.payload;

                // Handle new paginated structure
                if (response.data && response.data.records) {
                    const { records, page, total, limit } = response.data;
                    const pages = Math.ceil(total / limit);

                    const normalizedRecords = records.map(l => {
                        const normalized = { ...l };
                        if (l.last_call) {
                            normalized.lastCallRecord = {
                                duration: (l.last_call.duration || 0) + 's',
                                date: l.last_call.timestamp,
                                status: l.last_call.status
                            };
                            normalized.lastCallTime = l.last_call.timestamp;
                        }
                        return normalized;
                    });

                    if (page === 1) {
                        state.leads = normalizedRecords;
                    } else {
                        // Check for duplicates
                        const existingIds = new Set(state.leads.map(l => l._id));
                        const newRecords = normalizedRecords.filter(l => !existingIds.has(l._id));
                        state.leads = [...state.leads, ...newRecords];
                    }
                    state.pagination = { page, pages, total };
                } else {
                    // Fallback for old structure or non-paginated response
                    const data = response.data || response.result || [];
                    state.leads = data.map(l => {
                        const normalized = { ...l };
                        if (l.last_call) {
                            normalized.lastCallRecord = {
                                duration: (l.last_call.duration || 0) + 's',
                                date: l.last_call.timestamp,
                                status: l.last_call.status
                            };
                            normalized.lastCallTime = l.last_call.timestamp;
                        }
                        return normalized;
                    });
                }
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
                const { records, pagination, meta_page } = action.payload || {};

                if (records) {
                    const normalizedRecords = records.map(l => {
                        const normalized = {
                            ...l,
                            id: l._id || l.id
                        };
                        if (l.last_call) {
                            normalized.lastCallRecord = {
                                duration: (l.last_call.duration || 0) + 's',
                                date: l.last_call.timestamp,
                                status: l.last_call.status
                            };
                            normalized.lastCallTime = l.last_call.timestamp;
                        }
                        return normalized;
                    });

                    const page = pagination?.page || meta_page || 1;
                    const pages = pagination?.pages || 1;
                    const total = pagination?.total || normalizedRecords.length;

                    if (page === 1) {
                        state.campaignLeads = normalizedRecords;
                    } else {
                        const existingIds = new Set(state.campaignLeads.map(l => String(l.id || l._id)));
                        const newRecords = normalizedRecords.filter(l => !existingIds.has(String(l.id || l._id)));
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
            // Create Enquiry
            .addCase(createEnquiry.pending, (state) => {
                state.createLoading = true;
                state.error = null;
            })
            .addCase(createEnquiry.fulfilled, (state, action) => {
                state.createLoading = false;
                state.leads.unshift(action.payload);
            })
            .addCase(createEnquiry.rejected, (state, action) => {
                state.createLoading = false;
                state.error = action.payload;
            })
            // Search Leads
            .addCase(searchLeads.pending, (state) => {
                state.isSearching = true;
            })
            .addCase(searchLeads.fulfilled, (state, action) => {
                state.isSearching = false;
                const leads = action.payload || [];
                state.searchResults = leads.map(l => {
                    const normalized = { ...l };
                    if (l.last_call) {
                        normalized.lastCallRecord = {
                            duration: (l.last_call.duration || 0) + 's',
                            date: l.last_call.timestamp,
                            status: l.last_call.status
                        };
                        normalized.lastCallTime = l.last_call.timestamp;
                    }
                    return normalized;
                });
            })
            .addCase(searchLeads.rejected, (state, action) => {
                state.isSearching = false;
                state.searchResults = [];
            })
            // Fetch Tenant Config
            .addCase(fetchTenantConfig.fulfilled, (state, action) => {
                state.tenantConfig = action.payload;
            })
            // Combined Enquiries
            .addCase(fetchCombinedEnquiries.pending, (state, action) => {
                const page = action.meta.arg.page || 1;
                if (page === 1 && state.leads.length === 0) {
                    state.isLoading = true;
                }
                state.error = null;
            })
            .addCase(fetchCombinedEnquiries.fulfilled, (state, action) => {
                state.isLoading = false;
                state.leads = action.payload;
                state.pagination = { page: 1, pages: 1, total: action.payload.length };
            })
            .addCase(fetchCombinedEnquiries.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // All Calls
            .addCase(fetchAllCalls.pending, (state, action) => {
                const page = action.meta.arg.page || 1;
                if (page === 1 && state.leads.length === 0) {
                    state.isLoading = true;
                }
                state.error = null;
            })
            .addCase(fetchAllCalls.fulfilled, (state, action) => {
                state.isLoading = false;
                if (Array.isArray(action.payload)) {
                    state.leads = action.payload;
                    state.pagination = { page: 1, pages: 1, total: action.payload.length };
                } else {
                    state.leads = action.payload.records || [];
                    state.pagination = action.payload.pagination || { page: 1, pages: 1, total: (action.payload.records || []).length };
                }
            })
            .addCase(fetchAllCalls.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
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
