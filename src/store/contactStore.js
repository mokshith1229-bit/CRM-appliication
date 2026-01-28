import { create } from 'zustand';
import { MOCK_CONTACTS } from '../data/mockContacts';
import { loadContacts, saveContacts } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useContactStore = create((set, get) => ({
    contacts: [],
    recentDials: [],
    activeFilter: 'all',
    isLoading: true,

    // Initialize store with persisted data or mock data
    initializeContacts: async () => {
        set({ isLoading: true });
        try {
            const savedContacts = await loadContacts();
            const savedRecents = await AsyncStorage.getItem('@caller_recents');

            if (savedContacts && savedContacts.length > 0) {
                set({ contacts: savedContacts });
            } else {
                set({ contacts: MOCK_CONTACTS });
                await saveContacts(MOCK_CONTACTS);
            }

            if (savedRecents) {
                set({ recentDials: JSON.parse(savedRecents) });
            }

            set({ isLoading: false });
        } catch (error) {
            console.error('Failed to load contacts:', error);
            set({ contacts: MOCK_CONTACTS, isLoading: false });
        }
    },

    // Add recent dial
    addRecentDial: async (number) => {
        const { recentDials } = get();
        // Keep unique numbers, limit to 10
        const updated = [number, ...recentDials.filter(n => n !== number)].slice(0, 10);
        set({ recentDials: updated });
        await AsyncStorage.setItem('@caller_recents', JSON.stringify(updated));
    },

    // Add new contact
    addContact: async (newContact) => {
        const { contacts } = get();
        // Ensure new contact is at the top
        const contactWithDefaults = {
            ...newContact,
            status: newContact.status || 'none'
        };
        const updatedContacts = [contactWithDefaults, ...contacts];
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
        return true;
    },

    // Set active filter
    setActiveFilter: (filter) => {
        set({ activeFilter: filter });
    },

    // Get filtered contacts
    getFilteredContacts: () => {
        const { contacts, activeFilter } = get();
        if (activeFilter === 'all') {
            return contacts;
        }
        // Filter by call status (connected, disconnected, missed)
        if (['connected', 'disconnected', 'missed'].includes(activeFilter)) {
            return contacts.filter(contact => contact.callStatus === activeFilter);
        }
        // Filter by lead status (hot, warm, cold, not_interested)
        return contacts.filter(contact => contact.status === activeFilter);
    },

    // Get contact by ID
    getContactById: (id) => {
        const { contacts } = get();
        return contacts.find(contact => contact.id === id);
    },

    // Update contact status
    updateContactStatus: async (contactId, newStatus) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, status: newStatus }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Add note to contact
    addNote: async (contactId, noteText) => {
        const { contacts } = get();
        const newNote = {
            id: `n${Date.now()}`,
            text: noteText,
            timestamp: new Date().toISOString(),
            edited: false,
        };

        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, notes: [...contact.notes, newNote] }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Edit existing note
    editNote: async (contactId, noteId, newText) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact => {
            if (contact.id === contactId) {
                const updatedNotes = contact.notes.map(note =>
                    note.id === noteId
                        ? { ...note, text: newText, edited: true }
                        : note
                );
                return { ...contact, notes: updatedNotes };
            }
            return contact;
        });
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Delete note
    deleteNote: async (contactId, noteId) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact => {
            if (contact.id === contactId) {
                const updatedNotes = contact.notes.filter(note => note.id !== noteId);
                return { ...contact, notes: updatedNotes };
            }
            return contact;
        });
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update contact photo
    updateContactPhoto: async (contactId, photoUri) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, photo: photoUri }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update contact name
    updateContactName: async (contactId, name) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, name }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update contact phone
    updateContactPhone: async (contactId, phone) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, phone }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update contact WhatsApp
    updateContactWhatsApp: async (contactId, whatsapp) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, whatsapp }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update contact email
    updateContactEmail: async (contactId, email) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, email }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update lead source
    updateLeadSource: async (contactId, source) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, source }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Add phone number
    addPhoneNumber: async (contactId, phoneNumber) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact => {
            if (contact.id === contactId) {
                const phones = contact.phones || [contact.phone];
                return { ...contact, phones: [...phones, phoneNumber] };
            }
            return contact;
        });
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Remove phone number
    removePhoneNumber: async (contactId, index) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact => {
            if (contact.id === contactId && contact.phones) {
                const phones = contact.phones.filter((_, i) => i !== index);
                return { ...contact, phones };
            }
            return contact;
        });
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Add custom field
    addCustomField: async (contactId, field) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact => {
            if (contact.id === contactId) {
                const customFields = contact.customFields || [];
                return { ...contact, customFields: [...customFields, field] };
            }
            return contact;
        });
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Remove custom field
    removeCustomField: async (contactId, fieldId) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact => {
            if (contact.id === contactId && contact.customFields) {
                const customFields = contact.customFields.filter(f => f.id !== fieldId);
                return { ...contact, customFields };
            }
            return contact;
        });
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update call schedule
    updateCallSchedule: async (contactId, datetime) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, callSchedule: datetime }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update call schedule note
    updateCallScheduleNote: async (contactId, note) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, callScheduleNote: note }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update call status
    updateCallStatus: async (contactId, callStatus) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, callStatus }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update lead status
    updateLeadStatus: async (contactId, leadStatus) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, leadStatus }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Add call log
    addCallLog: async (contactId, callData) => {
        const { contacts } = get();
        const contactIndex = contacts.findIndex(c => c.id === contactId);
        if (contactIndex === -1) return;

        const contact = contacts[contactIndex];
        const callLogs = contact.callLogs || [];

        const lastCallRecord = {
            id: callData.id,
            contactId: contactId,
            phoneNumber: contact.phone,
            callStatus: callData.status,
            systemCallResult: callData.systemCallResult || 'Disconnected',
            duration: callData.duration || '0s',
            timestamp: callData.date,
            agentName: callData.agentName || '',
            leadSource: callData.leadSource || 'Manual'
        };

        const updatedContact = {
            ...contact,
            callLogs: [callData, ...callLogs],
            lastCallRecord: lastCallRecord,
            lastCallTime: callData.date,
            source: callData.leadSource || contact.source || 'Manual' // Update contact source too
        };

        // Move updated contact to top
        const otherContacts = contacts.filter(c => c.id !== contactId);
        const updatedContacts = [updatedContact, ...otherContacts];

        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update call note
    updateCallNote: async (contactId, callId, note) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact => {
            if (contact.id === contactId && contact.callLogs) {
                const callLogs = contact.callLogs.map(call =>
                    call.id === callId ? { ...call, notes: note } : call
                );
                return { ...contact, callLogs };
            }
            return contact;
        });
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update lead description
    updateLeadDescription: async (contactId, leadDescription) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, leadDescription }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Add note to contact
    addNote: async (contactId, noteText) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact => {
            if (contact.id === contactId) {
                const newNote = {
                    id: Date.now().toString(),
                    text: noteText,
                    timestamp: new Date().toISOString(),
                };
                const notes = contact.notes || [];
                return { ...contact, notes: [newNote, ...notes] };
            }
            return contact;
        });
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update assigned to
    updateContactAssignedTo: async (contactId, assignedTo) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, assignedTo }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Update New Lead status (for New Leads feature)
    updateNewLeadStatus: async (contactId, isNewLead) => {
        const { contacts } = get();
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId
                ? { ...contact, isNewLead }
                : contact
        );
        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },

    // Reset to mock data (for testing)
    resetToMockData: async () => {
        set({ contacts: MOCK_CONTACTS });
        await saveContacts(MOCK_CONTACTS);
    },

    // Refresh with dummy data but preserve Mokshith
    refreshWithDummyData: async () => {
        const { contacts } = get();
        const currentMokshith = contacts.find(c => c.name === 'Mokshith' || c.id === '1');

        // Map over mock contacts and replace the mock version of Mokshith with the current one if it exists
        const updatedContacts = MOCK_CONTACTS.map(mockContact => {
            if ((mockContact.name === 'Mokshith' || mockContact.id === '1') && currentMokshith) {
                return currentMokshith;
            }
            return mockContact;
        });

        set({ contacts: updatedContacts });
        await saveContacts(updatedContacts);
    },
}));
