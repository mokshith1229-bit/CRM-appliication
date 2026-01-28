import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    SafeAreaView,
    Modal,
    Platform,
    StatusBar as NativeStatusBar,
    TouchableOpacity, // Ensure TouchableOpacity is imported
    Alert, // Import Alert
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { useContactStore } from '../store/contactStore';
import { useCampaignStore } from '../store/campaignStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import ContactCard from '../components/ContactCard';
import FilterBar from '../components/FilterBar';
import SearchBar from '../components/SearchBar';
import QuickActionsSheet from '../components/QuickActionsSheet';
import StatusOverlay from '../components/StatusOverlay';
import NotesModal from '../components/NotesModal';
import ContactDetailScreen from './ContactDetailScreen';
import ReminderModal from '../components/ReminderModal';
import DateRangeModal from '../components/DateRangeModal';
import { registerForPushNotificationsAsync } from '../utils/NotificationService';
import { useRoute } from '@react-navigation/native';

const HomeScreen = ({ navigation, route, onOpenDrawer }) => {
    // State for selected contact (direct object for immediate access)
    const [selectedContact, setSelectedContact] = useState(null);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [showStatusOverlay, setShowStatusOverlay] = useState(false);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [showDetailScreen, setShowDetailScreen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState(null); // Single date filter
    const [dateRange, setDateRange] = useState(null); // Range filter { start, end }
    const [showDateRangeModal, setShowDateRangeModal] = useState(false);
    const [reminderContact, setReminderContact] = useState(null); // Contact for active reminder modal
    const [showTestModal, setShowTestModal] = useState(false); // DEBUG: Test modal

    // Contact Store
    const contacts = useContactStore((state) => state.contacts);
    const activeFilter = useContactStore((state) => state.activeFilter);
    const isLoading = useContactStore((state) => state.isLoading);
    const initializeContacts = useContactStore((state) => state.initializeContacts);
    const setActiveFilter = useContactStore((state) => state.setActiveFilter);
    const updateContactStatus = useContactStore((state) => state.updateContactStatus);
    const updateCallSchedule = useContactStore((state) => state.updateCallSchedule);
    const updateNewLeadStatus = useContactStore((state) => state.updateNewLeadStatus);

    // Campaign Store
    const campaignLeads = useCampaignStore((state) => state.leads);
    const campaigns = useCampaignStore((state) => state.campaigns);
    const initializeCampaigns = useCampaignStore((state) => state.initializeCampaigns);
    const updateLeadStatus = useCampaignStore((state) => state.updateLeadStatus);

    // Flatten and normalize campaign leads for display
    const mergedContacts = React.useMemo(() => {
        const leadSources = ['Google', 'Facebook', 'Instagram', 'LinkedIn', 'Website', 'Referral'];
        const assigners = ['Admin', 'Manager', 'System', 'Sales Team'];

        // 1. Process Campaign Leads
        const flattenedLeads = Object.entries(campaignLeads).flatMap(([cId, leads]) => {
            const campaign = campaigns.find(c => c.id === cId);
            return leads.map((lead, index) => ({
                ...lead,
                campaignId: cId,
                campaignName: campaign?.name,
                isCampaignLead: true,
                // Normalize callStatus for unified filtering
                callStatus: (lead.lastCallRecord?.systemCallResult || 'none').toLowerCase(),
                // Mock Logic: ALL unprocessed contacts are New Enquiries
                isNewLead: (lead.isNewLead !== undefined ? lead.isNewLead : true) && (!lead.status || lead.status === 'none'),
                // Assign mock source/transfer info to EVERYONE to ensure data quality
                ...(index % 2 === 0 ? {
                    // Transferred lead
                    leadSource: leadSources[index % leadSources.length],
                    transferredBy: assigners[index % assigners.length],
                } : {
                    // Assigned lead
                    assignedBy: assigners[index % assigners.length],
                }),
            }));
        });

        // 2. Add mock data to Personal Contacts
        const contactsWithMockData = contacts.map((contact, index) => ({
            ...contact,
            // Mock Logic: ALL unprocessed contacts are New Enquiries
            isNewLead: (contact.isNewLead !== undefined ? contact.isNewLead : true) && (!contact.status || contact.status === 'none'),
            // Assign mock source/transfer info to EVERYONE
            ...(index % 2 === 0 ? {
                // Transferred lead
                leadSource: contact.leadSource || leadSources[index % leadSources.length],
                transferredBy: contact.transferredBy || assigners[index % assigners.length],
            } : {
                // Assigned lead
                assignedBy: contact.assignedBy || assigners[index % assigners.length],
            }),
        }));

        // 3. Combine and sort by latest activity/time
        return [...contactsWithMockData, ...flattenedLeads].sort((a, b) => {
            const tA = new Date(a.lastCallTime || a.timestamp || 0).getTime();
            const tB = new Date(b.lastCallTime || b.timestamp || 0).getTime();
            return tB - tA; // Newest first
        });
    }, [contacts, campaignLeads, campaigns]);



    useEffect(() => {
        initializeContacts();
        initializeCampaigns(); // Ensure campaigns are loaded too
        registerForPushNotificationsAsync();
    }, [initializeContacts, initializeCampaigns]);

    // Check for due reminders every 10 seconds (Checking merged list would duplicate if we not careful, 
    // but effectively we should check all. For now checking `contacts` is existing behavior, 
    // let's expand to mergedContacts if we want global reminders.)
    useEffect(() => {
        const checkReminders = () => {
            // Find first contact with a past due schedule
            const now = new Date();
            const dueContact = mergedContacts.find(c =>
                c.callSchedule && new Date(c.callSchedule) <= now
            );

            // Only show if there's a due contact and no reminder is currently showing
            if (dueContact && !reminderContact) {
                setReminderContact(dueContact);
            }
        };

        const intervalId = setInterval(checkReminders, 10000); // Check every 10s
        checkReminders(); // Check immediately on mount/update

        return () => clearInterval(intervalId);
    }, [mergedContacts, reminderContact]);

    // Handle deep linking from InAppCallScreen
    useEffect(() => {
        if (route.params?.openContactDetail) {
            const contactId = route.params.openContactDetail;
            const contact = mergedContacts.find(c => c.id === contactId);
            if (contact) {
                setSelectedContact(contact);
                setShowDetailScreen(true);
                if (route.params?.openNotes) {
                    setShowNotesModal(true);
                }
                // Clear params to avoid loops
                navigation.setParams({ openContactDetail: undefined, openNotes: undefined });
            }
        }

        if (route.params?.closeModals) {
            setShowDetailScreen(false);
            setShowNotesModal(false);
            setReminderContact(null);
            navigation.setParams({ closeModals: undefined, openContactDetail: undefined });
        }
    }, [route.params, mergedContacts]);



    // Unified Filtering Logic
    const filteredContacts = React.useMemo(() => {
        // All Calls: Exclude New Enquiries (isNewLead = true)
        if (activeFilter === 'all') {
            return mergedContacts.filter(contact => !contact.isNewLead);
        }

        // New Leads filter - show only contacts with isNewLead = true
        if (activeFilter === 'new_leads') {
            return mergedContacts.filter(contact => contact.isNewLead === true);
        }

        return mergedContacts.filter(contact => {
            // Normalize status values for comparison
            // Personal contacts use 'connected', 'missed' in callStatus. campaigns might use 'Connected' (case diff)
            const cStatus = (contact.callStatus || '').toLowerCase();
            const lStatus = (contact.status || '').toLowerCase();

            if (activeFilter === 'connected') return cStatus === 'connected';
            if (activeFilter === 'missed') return cStatus === 'disconnected' || cStatus === 'missed'; // Broaden match

            // For lead statuses (hot, warm, etc)
            // contactStore uses lowercase (hot, warm)
            // campaignStore usually lowercase too
            return lStatus === activeFilter.toLowerCase();
        });
    }, [mergedContacts, activeFilter]);


    // Apply search and date filter
    const searchFilteredContacts = filteredContacts.filter(contact => {
        let matchesSearch = true;
        let matchesDate = true;

        // Search Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            matchesSearch = (
                (contact.name || '').toLowerCase().includes(query) ||
                (contact.phone || '').toLowerCase().includes(query)
            );
        }

        // Date Filter (Single or Range)
        if (dateFilter) {
            // Single Date
            if (!contact.lastCallTime) {
                matchesDate = false;
            } else {
                const contactDate = new Date(contact.lastCallTime).toDateString();
                const filterDate = dateFilter.toDateString();
                matchesDate = contactDate === filterDate;
            }
        } else if (dateRange) {
            // Date Range
            if (!contact.lastCallTime) {
                matchesDate = false;
            } else {
                const contactTime = new Date(contact.lastCallTime).getTime();
                const startTime = dateRange.start.getTime();
                const endTime = dateRange.end.getTime();
                // Check if within range (inclusive)
                matchesDate = contactTime >= startTime && contactTime <= endTime;
            }
        }

        return matchesSearch && matchesDate;
    });

    const handleCalendarPress = () => {
        setShowDateRangeModal(true);
    };

    const handleDateRangeApply = (result) => {
        if (result.type === 'single') {
            setDateFilter(result.date);
            setDateRange(null);
        } else if (result.type === 'range') {
            setDateRange({ start: result.start, end: result.end });
            setDateFilter(null);
        }
    };

    const clearDateFilter = () => {
        setDateFilter(null);
        setDateRange(null);
    };

    const handleContactPress = (contact) => {
        console.log('🔵 handleContactPress called with contact:', contact?.name || contact?.phone);
        console.log('🔵 Setting selectedContact and showQuickActions to true');
        setSelectedContact(contact);
        setShowQuickActions(true);
        console.log('🔵 State updates dispatched');
    };

    const handleAvatarPress = (contact) => {
        // If it's a campaign lead, we might want to stay here or go to standard detail
        // Detail screen should handle it if we pass proper data
        navigation.navigate('QuickContact', { contact });
    };

    const handleContactLongPress = (contact) => {
        setSelectedContact(contact);
        setShowStatusOverlay(true);
    };

    const handleWriteNotes = (contact) => {
        setSelectedContact(contact);
        setShowNotesModal(true);
    };

    const handleStatusSelect = async (status) => {
        if (selectedContact) {
            if (selectedContact.isCampaignLead && selectedContact.campaignId) {
                await updateLeadStatus(selectedContact.campaignId, selectedContact.id, status);
            } else {
                await updateContactStatus(selectedContact.id, status);
                // Auto-remove from New Enquiries only when:
                // 1. Contact is currently a new lead (isNewLead = true)
                // 2. User is changing status from default (which would be 'none' or undefined)
                // This means contact stays in New Enquiries until BOTH call is made AND status is changed
                if (selectedContact.isNewLead && status !== 'none') {
                    await updateNewLeadStatus(selectedContact.id, false);
                }
            }
            // No local state update needed as store update triggers re-render via useMemo
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([initializeContacts(), initializeCampaigns()]);
        setRefreshing(false);
    };

    const handleCallAction = async (contact) => {
        setShowQuickActions(false);
        // Don't auto-remove from New Enquiries on call
        // Contact will only be removed when user changes status from "New" to something else
        navigation.navigate('InAppCall', { contact });
    };

    const renderContactCard = ({ item }) => (
        <ContactCard
            contact={item}
            onPress={handleContactPress}
            onLongPress={handleContactLongPress}
            onAvatarPress={handleAvatarPress}
            onCallPress={handleCallAction}
        />
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No contacts found</Text>
            <Text style={styles.emptySubtext}>
                {activeFilter === 'all'
                    ? 'Add some contacts to get started'
                    : 'Try selecting a different filter'}
            </Text>
        </View>
    );

    if (isLoading && (!contacts.length && !Object.keys(campaignLeads).length)) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
        );
    }



    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" backgroundColor="transparent" translucent={true} />

            <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onMenuPress={onOpenDrawer}
                onCalendarPress={handleCalendarPress}
                isDateFiltered={!!dateFilter || !!dateRange}
            />

            {(dateFilter || dateRange) && (
                <View style={styles.filterChipContainer}>
                    <TouchableOpacity onPress={clearDateFilter} style={styles.filterChip}>
                        <Text style={styles.filterChipText}>
                            {dateFilter
                                ? `📅 ${dateFilter.toLocaleDateString()} ✕`
                                : `📅 ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()} ✕`
                            }
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <FilterBar
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
            />

            <FlatList
                data={searchFilteredContacts}
                renderItem={renderContactCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[COLORS.primary]}
                    />
                }
            />

            <QuickActionsSheet
                contact={selectedContact}
                visible={showQuickActions}
                onClose={() => setShowQuickActions(false)}
                onWriteNotes={handleWriteNotes}
                onCall={handleCallAction}
                campaignId={selectedContact?.campaignId}
                campaignName={selectedContact?.campaignName}
            />

            <StatusOverlay
                contact={selectedContact}
                visible={showStatusOverlay}
                onSelect={handleStatusSelect}
                onClose={() => setShowStatusOverlay(false)}
            />

            <NotesModal
                contact={selectedContact}
                visible={showNotesModal}
                onClose={() => setShowNotesModal(false)}
                campaignId={selectedContact?.campaignId}
            />

            <ContactDetailScreen
                contact={selectedContact}
                visible={showDetailScreen}
                onClose={() => setShowDetailScreen(false)}
                navigation={navigation}
            />
            {reminderContact && (
                <ReminderModal
                    visible={!!reminderContact}
                    contact={reminderContact}
                    onCall={() => {
                        const contact = reminderContact;
                        if (contact.isCampaignLead && contact.campaignId) {
                            useCampaignStore.getState().updateCallSchedule(contact.campaignId, contact.id, null);
                        } else {
                            updateCallSchedule(contact.id, null);
                        }
                        setReminderContact(null);
                        setTimeout(() => {
                            navigation.navigate('InAppCall', { contact });
                        }, 100);
                    }}
                    onDismiss={() => {
                        if (reminderContact) {
                            if (reminderContact.isCampaignLead && reminderContact.campaignId) {
                                useCampaignStore.getState().updateCallSchedule(reminderContact.campaignId, reminderContact.id, null);
                            } else {
                                updateCallSchedule(reminderContact.id, null);
                            }
                        }
                        setReminderContact(null);
                    }}
                />
            )}

            <DateRangeModal
                visible={showDateRangeModal}
                onClose={() => setShowDateRangeModal(false)}
                onApply={handleDateRangeApply}
            />

            {/* DEBUG: Simple test modal */}
            <Modal
                visible={showTestModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTestModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <View style={{
                        backgroundColor: '#FF0000',
                        padding: 50,
                        borderRadius: 20,
                        width: '80%',
                    }}>
                        <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>
                            TEST MODAL WORKS!
                        </Text>
                        <Text style={{ color: '#FFF', fontSize: 16, marginTop: 20, textAlign: 'center' }}>
                            Contact: {selectedContact?.name || selectedContact?.phone || 'None'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowTestModal(false)}
                            style={{
                                backgroundColor: '#FFF',
                                padding: 15,
                                borderRadius: 10,
                                marginTop: 20,
                            }}
                        >
                            <Text style={{ color: '#FF0000', fontWeight: 'bold', textAlign: 'center' }}>
                                CLOSE
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        ...TYPOGRAPHY.body,
        marginTop: SPACING.md,
        color: COLORS.textSecondary,
    },
    header: {
        backgroundColor: COLORS.cardBackground,
        paddingHorizontal: 16, // Standardized 16px
        paddingTop: 16,
        paddingBottom: 8, // Reduced to allow 12px spacing below
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.text,
    },
    headerSubtitle: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    filterChipContainer: {
        paddingHorizontal: 16,
        paddingTop: 12, // 12px top padding below header
        paddingBottom: 12, // 12px bottom padding before list
        backgroundColor: COLORS.background,
    },
    filterChip: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.primary + '20',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    filterChipText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100, // Enough space for BottomTabs
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl * 3,
    },
    emptyText: {
        ...TYPOGRAPHY.title,
        color: COLORS.textSecondary,
    },
    emptySubtext: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        marginTop: SPACING.sm,
    },
});

export default HomeScreen;
