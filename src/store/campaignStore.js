import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CAMPAIGNS_STORAGE_KEY = '@campaigns_data';
const LEADS_STORAGE_KEY = '@campaign_leads_data';

const MOCK_CAMPAIGNS = [
    { id: 'c1', name: 'Project A', assignedUserId: 'u1' },
    { id: 'c2', name: 'January Sales', assignedUserId: 'u1' },
    { id: 'c3', name: 'Villa Buyers', assignedUserId: 'u1' },
];

const MOCK_LEADS = {
    'c1': [
        { id: 'cl1', name: 'Ramesh Kumar', phone: '9876543210', source: 'Project A', callLogs: [], customFields: [], notes: [] },
        { id: 'cl2', name: 'Suresh Raina', phone: '9876543211', source: 'Project A', callLogs: [], customFields: [], notes: [] },
    ],
    'c2': [
        { id: 'cl3', name: 'Anjali Sharma', phone: '9876543212', source: 'January Sales', callLogs: [], customFields: [], notes: [] },
        { id: 'cl4', name: 'Vikram Singh', phone: '9876543213', source: 'January Sales', callLogs: [], customFields: [], notes: [] },
    ],
    'c3': [
        { id: 'cl5', name: 'Priya Gadhavi', phone: '9876543214', source: 'Villa Buyers', callLogs: [], customFields: [], notes: [] },
        { id: 'cl6', name: 'Amit Shah', phone: '9876543215', source: 'Villa Buyers', callLogs: [], customFields: [], notes: [] },
    ]
};

export const useCampaignStore = create((set, get) => ({
    campaigns: [],
    leads: {}, // Map of campaignId -> leads
    activeFilter: 'all',
    isLoading: false,

    initializeCampaigns: async () => {
        set({ isLoading: true });
        try {
            const storedCampaigns = await AsyncStorage.getItem(CAMPAIGNS_STORAGE_KEY);
            const storedLeads = await AsyncStorage.getItem(LEADS_STORAGE_KEY);

            if (storedCampaigns) {
                set({ campaigns: JSON.parse(storedCampaigns) });
            } else {
                set({ campaigns: MOCK_CAMPAIGNS });
                await AsyncStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(MOCK_CAMPAIGNS));
            }

            if (storedLeads) {
                const parsedLeads = JSON.parse(storedLeads);
                // Ensure all leads have required array fields
                Object.keys(parsedLeads).forEach(campaignId => {
                    parsedLeads[campaignId] = parsedLeads[campaignId].map(lead => ({
                        ...lead,
                        callLogs: lead.callLogs || [],
                        customFields: lead.customFields || [],
                        notes: lead.notes || []
                    }));
                });
                set({ leads: parsedLeads });
            } else {
                set({ leads: MOCK_LEADS });
                await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(MOCK_LEADS));
            }
        } catch (error) {
            console.error('Failed to initialize campaigns:', error);
            set({ campaigns: MOCK_CAMPAIGNS, leads: MOCK_LEADS });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchCampaigns: async () => {
        set({ isLoading: true });
        try {
            // Simulated absolute API call
            // const response = await fetch('...');
            // const data = await response.json();

            // For now, use mock
            set({ campaigns: MOCK_CAMPAIGNS });
            await AsyncStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(MOCK_CAMPAIGNS));
        } finally {
            set({ isLoading: false });
        }
    },

    getLeadsByCampaign: (campaignId) => {
        const { leads } = get();
        return leads[campaignId] || [];
    },

    setActiveFilter: (filter) => set({ activeFilter: filter }),

    getFilteredLeads: (campaignId) => {
        const { leads, activeFilter } = get();
        const campaignLeads = leads[campaignId] || [];

        if (activeFilter === 'all') return campaignLeads;

        return campaignLeads.filter(lead => {
            if (activeFilter === 'connected') return lead.lastCallRecord?.systemCallResult === 'Connected';
            if (activeFilter === 'missed') return lead.lastCallRecord?.systemCallResult === 'Disconnected';
            if (activeFilter === 'hot') return lead.status === 'hot';
            if (activeFilter === 'warm') return lead.status === 'warm';
            if (activeFilter === 'cold') return lead.status === 'cold';
            if (activeFilter === 'callback') return lead.status === 'callback';
            if (activeFilter === 'interested') return lead.status === 'interested';
            if (activeFilter === 'not_interested') return lead.status === 'not_interested';
            return true;
        });
    },

    addCallLogForLead: async (campaignId, leadId, callData) => {
        const { leads } = get();
        const campaignLeads = leads[campaignId] || [];
        const leadIndex = campaignLeads.findIndex(l => l.id === leadId);
        if (leadIndex === -1) return;

        const lead = campaignLeads[leadIndex];
        const lastCallRecord = {
            id: callData.id,
            contactId: leadId,
            phoneNumber: lead.phone,
            callStatus: callData.status,
            systemCallResult: callData.systemCallResult || 'Disconnected',
            duration: callData.duration || '0s',
            timestamp: callData.date,
            leadSource: callData.leadSource || lead.source || 'Manual'
        };

        const updatedLead = {
            ...lead,
            callLogs: [callData, ...(lead.callLogs || [])],
            lastCallRecord: lastCallRecord,
            lastCallTime: callData.date
        };

        const updatedLeads = campaignLeads.map(l => l.id === leadId ? updatedLead : l);
        const newLeads = { ...leads, [campaignId]: updatedLeads };

        set({ leads: newLeads });
        await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(newLeads));
    },

    updateLeadStatus: async (campaignId, leadId, newStatus) => {
        const { leads } = get();
        const campaignLeads = leads[campaignId] || [];
        const updatedLeads = campaignLeads.map(l =>
            l.id === leadId ? { ...l, status: newStatus } : l
        );
        const newLeads = { ...leads, [campaignId]: updatedLeads };
        set({ leads: newLeads });
        await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(newLeads));
    },

    updateCallSchedule: async (campaignId, leadId, datetime) => {
        const { leads } = get();
        const campaignLeads = leads[campaignId] || [];
        const updatedLeads = campaignLeads.map(l =>
            l.id === leadId ? { ...l, callSchedule: datetime } : l
        );
        const newLeads = { ...leads, [campaignId]: updatedLeads };
        set({ leads: newLeads });
        await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(newLeads));
    },

    updateLeadName: async (campaignId, leadId, name) => {
        const { leads } = get();
        const campaignLeads = leads[campaignId] || [];
        const updatedLeads = campaignLeads.map(l =>
            l.id === leadId ? { ...l, name } : l
        );
        const newLeads = { ...leads, [campaignId]: updatedLeads };
        set({ leads: newLeads });
        await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(newLeads));
    },

    updateLeadPhone: async (campaignId, leadId, phone) => {
        const { leads } = get();
        const campaignLeads = leads[campaignId] || [];
        const updatedLeads = campaignLeads.map(l =>
            l.id === leadId ? { ...l, phone } : l
        );
        const newLeads = { ...leads, [campaignId]: updatedLeads };
        set({ leads: newLeads });
        await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(newLeads));
    },

    updateLeadWhatsApp: async (campaignId, leadId, whatsapp) => {
        const { leads } = get();
        const campaignLeads = leads[campaignId] || [];
        const updatedLeads = campaignLeads.map(l =>
            l.id === leadId ? { ...l, whatsapp } : l
        );
        const newLeads = { ...leads, [campaignId]: updatedLeads };
        set({ leads: newLeads });
        await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(newLeads));
    },

    updateLeadEmail: async (campaignId, leadId, email) => {
        const { leads } = get();
        const campaignLeads = leads[campaignId] || [];
        const updatedLeads = campaignLeads.map(l =>
            l.id === leadId ? { ...l, email } : l
        );
        const newLeads = { ...leads, [campaignId]: updatedLeads };
        set({ leads: newLeads });
        await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(newLeads));
    },

    addLeadCustomField: async (campaignId, leadId, field) => {
        const { leads } = get();
        const campaignLeads = leads[campaignId] || [];
        const updatedLeads = campaignLeads.map(l => {
            if (l.id === leadId) {
                const customFields = l.customFields || [];
                return { ...l, customFields: [...customFields, field] };
            }
            return l;
        });
        const newLeads = { ...leads, [campaignId]: updatedLeads };
        set({ leads: newLeads });
        await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(newLeads));
    },

    removeLeadCustomField: async (campaignId, leadId, fieldId) => {
        const { leads } = get();
        const campaignLeads = leads[campaignId] || [];
        const updatedLeads = campaignLeads.map(l => {
            if (l.id === leadId && l.customFields) {
                const customFields = l.customFields.filter(f => f.id !== fieldId);
                return { ...l, customFields };
            }
            return l;
        });
        const newLeads = { ...leads, [campaignId]: updatedLeads };
        set({ leads: newLeads });
        await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(newLeads));
    },

    updateLeadCallNote: async (campaignId, leadId, callId, note) => {
        const { leads } = get();
        const campaignLeads = leads[campaignId] || [];
        const updatedLeads = campaignLeads.map(l => {
            if (l.id === leadId && l.callLogs) {
                const updatedLogs = l.callLogs.map(log =>
                    log.id === callId ? { ...log, notes: note } : log
                );
                return { ...l, callLogs: updatedLogs };
            }
            return l;
        });
        const newLeads = { ...leads, [campaignId]: updatedLeads };
        set({ leads: newLeads });
        await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(newLeads));
    },

    updateLeadPhoto: async (campaignId, leadId, photoUri) => {
        const { leads } = get();
        const campaignLeads = leads[campaignId] || [];
        const updatedLeads = campaignLeads.map(l =>
            l.id === leadId ? { ...l, photo: photoUri } : l
        );
        const newLeads = { ...leads, [campaignId]: updatedLeads };
        set({ leads: newLeads });
        await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(newLeads));
    },

    addNote: async (campaignId, leadId, noteText) => {
        const { leads } = get();
        const campaignLeads = leads[campaignId] || [];
        const updatedLeads = campaignLeads.map(lead => {
            if (lead.id === leadId) {
                const newNote = {
                    id: Date.now().toString(),
                    text: noteText,
                    timestamp: new Date().toISOString(),
                };
                const notes = lead.notes || [];
                return { ...lead, notes: [newNote, ...notes] };
            }
            return lead;
        });
        const newLeads = { ...leads, [campaignId]: updatedLeads };
        set({ leads: newLeads });
        await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(newLeads));
    },

    updateLeadDescription: async (campaignId, leadId, leadDescription) => {
        const { leads } = get();
        const campaignLeads = leads[campaignId] || [];
        const updatedLeads = campaignLeads.map(lead =>
            lead.id === leadId ? { ...lead, leadDescription } : lead
        );
        const newLeads = { ...leads, [campaignId]: updatedLeads };
        set({ leads: newLeads });
        await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(newLeads));
    }
}));
