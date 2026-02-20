import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    TextInput,
    Platform,
    StatusBar as NativeStatusBar,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDispatch, useSelector } from 'react-redux';
import { updateLeadStatus, updateLead, setActiveFilter, fetchLeads, fetchCampaignRecords, clearLeads, clearCampaignLeads, ensureLead } from '../store/slices/leadSlice';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import ContactCard from '../components/ContactCard';
import ContactCardSkeleton from '../components/ContactCardSkeleton'; // Import Skeleton
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

    const dispatch = useDispatch();
    const leads = useSelector(state => state.leads.campaignLeads);
    const isLoading = useSelector(state => state.leads.isLoading);
    const pagination = useSelector(state => state.leads.campaignPagination);

    // Filter leads by campaignId
    // Data is now isolated in campaignLeads state
    // We use 'leads' variable directly as selected above

    // Active filter state
    const activeFilter = useSelector(state => state.leads.activeFilter);
    const setActiveFilterAction = (filter) => dispatch(setActiveFilter(filter));

    // We import { setActiveFilter } from leadSlice actions, so:
    // const setActiveFilterAction = (filter) => dispatch(setActiveFilter(filter));
    // Implementation below.

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

    // Display leads directly from store
    // Use mapped version if specific fields needed, but 'allLeads' usually has what we need
    // We map to ensure consistent structure if backend response varies
    const displayedLeads = leads; // Assuming leads are already in correct format from fetchLeads

    // Unified Fetch Logic
    const fetchWithFilters = (pageOrReset = 1) => {
        const filters = {
            campaignId,
            page: pageOrReset,
        };

        if (searchQuery) filters.search = searchQuery;

        // Date filters might not be supported on CampaignRecord yet in controller but passing anyway
        if (dateFilter) {
            filters.startDate = dateFilter.toISOString();
            filters.endDate = dateFilter.toISOString();
        } else if (dateRange) {
            filters.startDate = dateRange.start.toISOString();
            filters.endDate = dateRange.end.toISOString();
        }

        dispatch(fetchCampaignRecords(filters));
    };

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchWithFilters(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, dateFilter, dateRange]);

    // Initial Fetch
    useEffect(() => {
        dispatch(clearCampaignLeads());
        if (campaignId) {
            fetchWithFilters(1);
        }
        return () => { dispatch(clearCampaignLeads()); };
    }, [campaignId, dispatch]);

    const handleRefresh = async () => {
        setRefreshing(true);
        if (campaignId) {
            fetchWithFilters(1);
        }
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

    const handleStatusChange = async (newStatus) => {
        if (selectedContact) {
            try {
                // Ensure lead exists (convert from log/enquiry if needed) with the selected status
                const targetLead = await dispatch(ensureLead({
                    contact: selectedContact,
                    initialStatus: newStatus
                })).unwrap();

                // Only update status explicitly if the lead already existed
                if (selectedContact._source !== 'log' && !selectedContact.id?.startsWith('log-')) {
                    await dispatch(updateLeadStatus({ id: targetLead.id || targetLead._id, status: newStatus }));
                }

                setShowStatusOverlay(false);

                // Refresh list
                handleRefresh();

            } catch (error) {
                console.error('Status update failed:', error);

                // Check if it's a validation error (IVR/Service Number)
                if (error === 'Cannot convert service numbers (IVR) to leads.' ||
                    (typeof error === 'string' && error.includes('service numbers'))) {

                    Alert.alert(
                        'Validation Error',
                        'This number appears to be a service number or IVR. Would you like to create a lead manually?',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Create Manually',
                                onPress: () => {
                                    setShowStatusOverlay(false); // Close overlay first
                                    navigation.navigate('CreateLead', {
                                        initialLeadData: {
                                            name: selectedContact.name,
                                            phone: selectedContact.phone,
                                            // Add other available fields
                                            call_logs: selectedContact.call_logs || [],
                                            _source: 'log_conversion',
                                            lead_source: campaignName || selectedContact.leadSource || 'Campaign'
                                        }
                                    });
                                }
                            }
                        ]
                    );
                } else {
                    Alert.alert('Error', typeof error === 'string' ? error : 'Failed to update status');
                }
            }
        }
    };

    const handleCallAction = (contact) => {
        navigation.navigate('QuickContact', {
            contact,
            campaignId,
            campaignName
        });
    };

    const handleAvatarPress = (contact) => {
        setSelectedContactId(contact.id);
        setShowQuickActions(true);
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



    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" backgroundColor="transparent" translucent={true} />

            {/* Clean Native Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={28} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{campaignName || 'Campaign Details'}</Text>
            </View>

            {/* Floating Search Pill wrapping the Search input and Calendar */}
            <View style={styles.searchPillContainer}>
                <View style={styles.searchPill}>
                    <TextInput
                        style={styles.searchInputPill}
                        placeholder="Search leads..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#9CA3AF"
                    />

                    <TouchableOpacity onPress={() => setShowDateRangeModal(true)} style={styles.iconButton}>
                        <View>
                            <MaterialIcons name={'calendar-today'} size={24} color="#4B5563" />
                            {(dateFilter || dateRange) && <View style={styles.activeDot} />}
                        </View>
                    </TouchableOpacity>
                </View>
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

            {isLoading && !refreshing && displayedLeads.length === 0 ? (
                <View style={[styles.listContent, { paddingTop: 10 }]}>
                    {[1, 2, 3, 4, 5, 6].map((key) => (
                        <ContactCardSkeleton key={key} />
                    ))}
                </View>
            ) : (
                <>
                <FlatList
                data={displayedLeads}
                renderItem={renderContactCard}
                keyExtractor={(item) => item._id || item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={() => (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No leads found in this campaign</Text>
                    </View>
                )}
                ListFooterComponent={() => (
                    isLoading && displayedLeads.length > 0 ? (
                        <View style={styles.footerLoader}>
                            <ActivityIndicator size="small" color={COLORS.primaryPurple} />
                        </View>
                    ) : null
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[COLORS.primary]}
                    />
                }
                onEndReached={() => {
                    if (!isLoading && pagination && pagination.page < pagination.pages) {
                        // Load next page
                        const filters = {
                            page: pagination.page + 1,
                            campaignId: campaignId
                        };

                        if (searchQuery) filters.search = searchQuery;

                        if (dateFilter) {
                            filters.startDate = dateFilter.toISOString();
                            filters.endDate = dateFilter.toISOString();
                        } else if (dateRange) {
                            filters.startDate = dateRange.start.toISOString();
                            filters.endDate = dateRange.end.toISOString();
                        }

                        dispatch(fetchCampaignRecords(filters));
                    }
                }}
                onEndReachedThreshold={0.5}
            />
            </>
            )}

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
                onSelect={handleStatusChange}
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
                        dispatch(updateLead({ id: contact.id, data: { attributes: { ...contact.attributes, callSchedule: null } } }));
                        setReminderContact(null);
                        setTimeout(() => {
                            handleCallAction(contact);
                        }, 100);
                    }
                }}
                onDismiss={() => {
                    if (reminderContact) {
                        dispatch(updateLead({ id: reminderContact.id, data: { attributes: { ...reminderContact.attributes, callSchedule: null } } }));
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
        // paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 12 : 0,
        paddingBottom: 16,
        backgroundColor: 'transparent',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontFamily: 'SF Pro Display',
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        flex: 1,
    },
    searchPillContainer: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    searchPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        height: 56,
        borderRadius: 28,
        paddingLeft: 24,
        paddingRight: 8,
        shadowColor: '#8a79d6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    iconButton: {
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchInputPill: {
        flex: 1,
        fontFamily: 'SF Pro Display',
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    activeDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primaryPurple,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    filterChipContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
    },
    filterChip: {
        alignSelf: 'flex-start',
        backgroundColor: '#F3F0FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.primaryPurple,
    },
    filterChipText: {
        color: COLORS.primaryPurple,
        fontWeight: '600',
        fontSize: 14,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
        paddingTop: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyText: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default CampaignLeadsScreen;
