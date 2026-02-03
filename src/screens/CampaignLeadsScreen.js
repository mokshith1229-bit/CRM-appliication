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

const CampaignLeadsScreen = ({ navigation, route, onOpenDrawer }) => {
    const { campaignId, campaignName } = route.params;
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [showStatusOverlay, setShowStatusOverlay] = useState(false);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [showDetailScreen, setShowDetailScreen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState(null); // Single date filter
    const [dateRange, setDateRange] = useState(null); // Range filter { start, end }
    const [showDateRangeModal, setShowDateRangeModal] = useState(false);
    const [reminderContact, setReminderContact] = useState(null);

    const getLeadsByCampaign = useCampaignStore((state) => state.getLeadsByCampaign);
    const fetchCampaigns = useCampaignStore((state) => state.fetchCampaigns);
    const isLoading = useCampaignStore((state) => state.isLoading);
    const updateLeadStatus = useCampaignStore((state) => state.updateLeadStatus);
    const updateCallSchedule = useCampaignStore((state) => state.updateCallSchedule);

    // Get all leads for this campaign
    const leads = getLeadsByCampaign(campaignId);

    // Derived selected lead
    const selectedContact = selectedContactId ? leads.find(l => l.id === selectedContactId) : null;

    // Check for reminders logic parity
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            const dueLead = leads.find(l =>
                l.callSchedule && new Date(l.callSchedule) <= now
            );

            if (dueLead && !reminderContact) {
                setReminderContact(dueLead);
            }
        };

        const intervalId = setInterval(checkReminders, 10000);
        checkReminders();

        return () => clearInterval(intervalId);
    }, [leads, reminderContact]);

    // Handle deep linking/params parity
    useEffect(() => {
        if (route.params?.openContactDetail) {
            const leadId = route.params.openContactDetail;
            const lead = leads.find(l => l.id === leadId);
            if (lead) {
                setSelectedContactId(lead.id);
                setShowDetailScreen(true);
                if (route.params?.openNotes) {
                    setShowNotesModal(true);
                }
            }
        }

        if (route.params?.closeModals) {
            setShowDetailScreen(false);
            setShowNotesModal(false);
            setReminderContact(null);
            navigation.setParams({ closeModals: undefined, openContactDetail: undefined });
        }
    }, [route.params, leads]);

    const filteredLeads = leads.filter(lead => {
        let matchesSearch = true;
        let matchesDate = true;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            matchesSearch = (
                lead.name?.toLowerCase().includes(query) ||
                lead.phone.toLowerCase().includes(query)
            );
        }

        // Date Filter (Single or Range)
        if (dateFilter) {
            if (!lead.lastCallTime) {
                matchesDate = false;
            } else {
                const leadDate = new Date(lead.lastCallTime).toDateString();
                const filterDate = dateFilter.toDateString();
                matchesDate = leadDate === filterDate;
            }
        } else if (dateRange) {
            if (!lead.lastCallTime) {
                matchesDate = false;
            } else {
                const leadTime = new Date(lead.lastCallTime).getTime();
                const startTime = dateRange.start.getTime();
                const endTime = dateRange.end.getTime();
                matchesDate = leadTime >= startTime && leadTime <= endTime;
            }
        }

        return matchesSearch && matchesDate;
    });

    const handleCallAction = (contact) => {
        setShowQuickActions(false);
        navigation.navigate('InAppCall', {
            contact: { ...contact, source: campaignName },
            leadSource: campaignName,
            campaignId: campaignId,
            campaignName: campaignName
        });
    };

    const handleAvatarPress = (contact) => {
        if (!contact) return;
        navigation.navigate('QuickContact', {
            contact: { ...contact, source: campaignName },
            campaignId: campaignId,
            campaignName: campaignName
        });
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchCampaigns();
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

    const renderContactCard = ({ item }) => (
        <ContactCard
            contact={{
                ...item,
                campaignName: campaignName,
                isCampaignLead: true
            }}
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
                <Text style={styles.loadingText}>Loading leads...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" backgroundColor="transparent" translucent={true} />

            {/* Custom Header with Calendar Support */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={28} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{campaignName}</Text>
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
                data={filteredLeads}
                renderItem={renderContactCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={() => (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No leads matched your filters</Text>
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
                campaignId={campaignId}
                campaignName={campaignName}
            />

            <StatusOverlay
                contact={selectedContact}
                visible={showStatusOverlay}
                onSelect={(status) => selectedContact && updateLeadStatus(campaignId, selectedContact.id, status)}
                onClose={() => setShowStatusOverlay(false)}
            />

            <NotesModal
                contact={selectedContact}
                visible={showNotesModal}
                onClose={() => setShowNotesModal(false)}
                campaignId={campaignId}
            />

            <ContactDetailScreen
                contact={selectedContact}
                visible={showDetailScreen}
                onClose={() => setShowDetailScreen(false)}
                navigation={navigation}
                campaignId={campaignId}
                campaignName={campaignName}
            />

            <ReminderModal
                visible={!!reminderContact}
                contact={reminderContact}
                onCall={() => {
                    const contact = reminderContact;
                    if (contact) {
                        updateCallSchedule(campaignId, contact.id, null);
                        setReminderContact(null);
                        setTimeout(() => {
                            handleCallAction(contact);
                        }, 100);
                    }
                }}
                onDismiss={() => {
                    if (reminderContact) {
                        updateCallSchedule(campaignId, reminderContact.id, null);
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
    menuButton: {
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

export default CampaignLeadsScreen;
