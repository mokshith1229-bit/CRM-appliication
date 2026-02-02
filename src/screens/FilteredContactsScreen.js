import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    SafeAreaView,
    Platform,
    StatusBar as NativeStatusBar,
    TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useContactStore } from '../store/contactStore';
import { useCampaignStore } from '../store/campaignStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import ContactCard from '../components/ContactCard';
import SearchBar from '../components/SearchBar';
import QuickActionsSheet from '../components/QuickActionsSheet';
import StatusOverlay from '../components/StatusOverlay';
import NotesModal from '../components/NotesModal';
import ContactDetailScreen from './ContactDetailScreen';
import ReminderModal from '../components/ReminderModal';
import DateRangeModal from '../components/DateRangeModal';
import { MaterialIcons } from '@expo/vector-icons';

const FilteredContactsScreen = ({ navigation, route, onOpenDrawer }) => {
    const { filterId, filterLabel } = route.params || {};
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [showStatusOverlay, setShowStatusOverlay] = useState(false);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [showDetailScreen, setShowDetailScreen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState(null);
    const [dateRange, setDateRange] = useState(null);
    const [showDateRangeModal, setShowDateRangeModal] = useState(false);
    const [reminderContact, setReminderContact] = useState(null);

    // Contact Store
    const contacts = useContactStore((state) => state.contacts);
    const isLoading = useContactStore((state) => state.isLoading);
    const fetchContacts = useContactStore((state) => state.fetchContacts);
    const updateContactCallSchedule = useContactStore((state) => state.updateCallSchedule);

    // Campaign Store
    const campaignLeads = useCampaignStore((state) => state.campaignLeads);
    const campaigns = useCampaignStore((state) => state.campaigns);
    const updateCampaignCallSchedule = useCampaignStore((state) => state.updateCallSchedule);

    // Merge contacts and campaign leads (Synced with HomeScreen.js)
    const mergedContacts = React.useMemo(() => {
        const leadSources = ['Google', 'Facebook', 'Instagram', 'LinkedIn', 'Website', 'Referral', 'TikTok', 'Email', 'Walk-in'];
        const assigners = ['Admin', 'Manager', 'System', 'Sales Team', 'Reception', 'Lead Bot'];

        // 1. Process Campaign Leads
        const flattenedLeads = Object.entries(campaignLeads || {}).flatMap(([cId, leads]) => {
            const campaign = campaigns.find(c => c.id === cId);
            return leads.map((lead, index) => ({
                ...lead,
                campaignId: cId,
                campaignName: campaign?.name,
                isCampaignLead: true,
                // Normalize callStatus for unified filtering
                callStatus: (lead.lastCallRecord?.systemCallResult || lead.status || 'none').toLowerCase(),
                status: (lead.lastCallRecord?.systemCallResult || lead.status || 'none').toLowerCase(),
                // Mock Logic: heavily populate New Enquiries
                isNewLead: (lead.isNewLead !== undefined ? lead.isNewLead : true) && (!lead.status || lead.status === 'none'),
                // Mix of transferred and assigned leads
                ...(index % 4 === 0 ? (
                    index % 2 === 0 ? {
                        // Transferred lead
                        leadSource: leadSources[index % leadSources.length],
                        transferredBy: assigners[index % assigners.length],
                    } : {
                        // Assigned lead
                        assignedBy: assigners[index % assigners.length],
                    }
                ) : {
                    // Even regular leads get variety now
                    leadSource: leadSources[(index + 1) % leadSources.length],
                }),
            }));
        });

        // 2. Add mock data to Personal Contacts
        const contactsWithMockData = contacts.map((contact, index) => ({
            ...contact,
            callStatus: contact.status || contact.callStatus || 'none',
            status: contact.status || contact.callStatus || 'none',
            // Mock Logic: heavily populate New Enquiries
            isNewLead: (contact.isNewLead !== undefined ? contact.isNewLead : true) && (!contact.status || contact.status === 'none'),
            // Mix of transferred and assigned leads
            ...(index % 3 === 0 ? (
                index % 2 === 0 ? {
                    // Transferred lead
                    leadSource: contact.leadSource || leadSources[index % leadSources.length],
                    transferredBy: contact.transferredBy || assigners[index % assigners.length],
                } : {
                    // Assigned lead
                    assignedBy: contact.assignedBy || assigners[index % assigners.length],
                }
            ) : {
                // Even regular leads get variety now
                leadSource: leadSources[(index + 1) % leadSources.length],
            }),
        }));

        return [...contactsWithMockData, ...flattenedLeads].sort((a, b) => {
            const tA = new Date(a.lastCallTime || a.timestamp || 0).getTime();
            const tB = new Date(b.lastCallTime || b.timestamp || 0).getTime();
            return tB - tA;
        });
    }, [contacts, campaignLeads, campaigns]);

    // Filter contacts based on filterId
    const filterContacts = (contactList) => {
        return contactList.filter(contact => {
            // "All Calls" rule: Exclude New Leads from these filters
            if (contact.isNewLead) return false;

            // Handle Lead Source filters
            if (filterId.startsWith('source_')) {
                const source = filterId.replace('source_', '');
                return contact.leadSource === source; // Exact match for now
            }

            // Handle Transferred By filters
            if (filterId.startsWith('transferred_')) {
                const transferredBy = filterId.replace('transferred_', '');
                return contact.transferredBy === transferredBy; // Exact match
            }

            const status = contact.callStatus || 'none';
            switch (filterId) {
                case 'hot':
                    return status === 'hot';
                case 'warm':
                    return status === 'warm';
                case 'cold':
                    return status === 'cold';
                case 'callback':
                    return status === 'callback';
                case 'interested':
                    return status === 'interested';
                case 'not_interested':
                    return status === 'not_interested';
                case 'site_visit_done':
                    return !!(contact.siteVisitDoneBy || contact.siteVisitReview);
                default:
                    return true;
            }
        });
    };

    const filteredByStatus = filterContacts(mergedContacts);

    // Apply search and date filters
    const filteredContacts = filteredByStatus.filter(contact => {
        let matchesSearch = true;
        let matchesDate = true;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            matchesSearch = (
                contact.name?.toLowerCase().includes(query) ||
                contact.phone.toLowerCase().includes(query)
            );
        }

        if (dateFilter) {
            if (!contact.lastCallTime) {
                matchesDate = false;
            } else {
                const contactDate = new Date(contact.lastCallTime).toDateString();
                const filterDate = dateFilter.toDateString();
                matchesDate = contactDate === filterDate;
            }
        } else if (dateRange) {
            if (!contact.lastCallTime) {
                matchesDate = false;
            } else {
                const contactTime = new Date(contact.lastCallTime).getTime();
                const startTime = dateRange.start.getTime();
                const endTime = dateRange.end.getTime();
                matchesDate = contactTime >= startTime && contactTime <= endTime;
            }
        }

        return matchesSearch && matchesDate;
    });

    const selectedContact = selectedContactId ? filteredContacts.find(c => c.id === selectedContactId) : null;

    // Check for reminders
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            const dueContact = filteredContacts.find(c =>
                c.callSchedule && new Date(c.callSchedule) <= now
            );

            if (dueContact && !reminderContact) {
                setReminderContact(dueContact);
            }
        };

        const intervalId = setInterval(checkReminders, 10000);
        checkReminders();

        return () => clearInterval(intervalId);
    }, [filteredContacts, reminderContact]);

    const handleCallAction = (contact) => {
        setShowQuickActions(false);
        navigation.navigate('InAppCall', {
            contact: { ...contact, source: contact.campaignName || 'Manual' },
            leadSource: contact.campaignName || 'Manual',
            campaignId: contact.campaignId,
            campaignName: contact.campaignName
        });
    };

    const handleAvatarPress = (contact) => {
        if (!contact) return;
        navigation.navigate('QuickContact', {
            contact: { ...contact, source: contact.campaignName || 'Manual' },
            campaignId: contact.campaignId,
            campaignName: contact.campaignName
        });
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchContacts();
        setRefreshing(false);
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

    // Contact Store - Add status update functions (matching HomeScreen)
    const updateContactStatus = useContactStore((state) => state.updateContactStatus);
    const updateLeadStatus = useCampaignStore((state) => state.updateLeadStatus);

    // Handle status change with auto-refresh (matching HomeScreen)
    const handleStatusChange = async (newStatus) => {
        if (selectedContact) {
            if (selectedContact.isCampaignLead && selectedContact.campaignId) {
                await updateLeadStatus(selectedContact.campaignId, selectedContact.id, newStatus);
            } else {
                await updateContactStatus(selectedContact.id, newStatus);
            }
            // Close the overlay
            setShowStatusOverlay(false);
            // Contact will automatically disappear from list if status no longer matches filter
        }
    };

    const renderContactCard = ({ item }) => (
        <ContactCard
            contact={item}
            onPress={(contact) => {
                setSelectedContactId(contact.id);
                setShowQuickActions(true);
            }}
            onLongPress={(contact) => {
                setSelectedContactId(contact.id);
                setShowStatusOverlay(true);
            }}
            onAvatarPress={handleAvatarPress}
            onCallPress={handleCallAction}
        />
    );

    if (isLoading && !refreshing) {
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

            {/* Custom Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={28} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{filterLabel}</Text>
                    <View style={{ width: 40 }} />
                </View>
                <SearchBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onCalendarPress={() => setShowDateRangeModal(true)}
                    isDateFiltered={!!dateFilter || !!dateRange}
                    hideMenuIcon={true}
                />
            </View>

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

            <FlatList
                data={filteredContacts}
                renderItem={renderContactCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={() => (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No contacts found for {filterLabel}</Text>
                    </View>
                )}
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
                onWriteNotes={() => setShowNotesModal(true)}
                onCall={handleCallAction}
                campaignId={selectedContact?.campaignId}
                campaignName={selectedContact?.campaignName}
            />

            <StatusOverlay
                contact={selectedContact}
                visible={showStatusOverlay}
                onSelect={handleStatusChange}
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
                campaignId={selectedContact?.campaignId}
                campaignName={selectedContact?.campaignName}
            />

            <ReminderModal
                visible={!!reminderContact}
                contact={reminderContact}
                onCall={() => {
                    const contact = reminderContact;
                    if (contact) {
                        if (contact.campaignId) {
                            updateCampaignCallSchedule(contact.campaignId, contact.id, null);
                        } else {
                            updateContactCallSchedule(contact.id, null);
                        }
                        setReminderContact(null);
                        setTimeout(() => {
                            handleCallAction(contact);
                        }, 100);
                    }
                }}
                onDismiss={() => {
                    if (reminderContact) {
                        if (reminderContact.campaignId) {
                            updateCampaignCallSchedule(reminderContact.campaignId, reminderContact.id, null);
                        } else {
                            updateContactCallSchedule(reminderContact.id, null);
                        }
                    }
                    setReminderContact(null);
                }}
            />

            <DateRangeModal
                visible={showDateRangeModal}
                onClose={() => setShowDateRangeModal(false)}
                onApply={handleDateRangeApply}
            />
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
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
        marginHorizontal: 12,
    },
    backButton: {
        padding: 4,
    },
    filterChipContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
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
        paddingBottom: 100,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyText: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
    },
});

export default FilteredContactsScreen;
