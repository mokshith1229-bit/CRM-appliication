import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    
    Modal,
    Platform,
    StatusBar as NativeStatusBar,
    TouchableOpacity, // Ensure TouchableOpacity is imported
    Alert, // Import Alert
    TextInput, // Added for search input
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
// import { useContactStore } from '../store/contactStore'; // Replaced by Redux
// import { useCampaignStore } from '../store/campaignStore'; // Replaced by Redux
import { useDispatch, useSelector } from 'react-redux';
import { fetchLeads, fetchEnquiries, setActiveFilter, updateLeadStatus } from '../store/slices/leadSlice';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import ContactCard from '../components/ContactCard';
import FilterBar from '../components/FilterBar';
import SearchBar from '../components/SearchBar';
import QuickActionsSheet from '../components/QuickActionsSheet';
import ContactCardSkeleton from '../components/ContactCardSkeleton'; // Import Skeleton
import StatusOverlay from '../components/StatusOverlay';
import NotesModal from '../components/NotesModal';
import ContactDetailScreen from './ContactDetailScreen';
import ReminderModal from '../components/ReminderModal';
import DateRangeModal from '../components/DateRangeModal';
import { registerForPushNotificationsAsync } from '../utils/NotificationService';
import { useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons'; // Added for icons

import CallLogService from '../services/CallLogService';

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
    const [localCallLogs, setLocalCallLogs] = useState([]); // State for local call logs
    const [callLogsPage, setCallLogsPage] = useState(1); // Pagination for call logs
    const [hasMoreLogs, setHasMoreLogs] = useState(true); // Track if more logs available
    const [loadingMoreLogs, setLoadingMoreLogs] = useState(false); // Loading state for pagination

    // Redux
    const dispatch = useDispatch();
    const { leads, isLoading, activeFilter, pagination } = useSelector((state) => state.leads);
    const { user } = useSelector((state) => state.auth);

    // Fetch logs when filter is 'all'
    useEffect(() => {
        if (activeFilter === 'all') {
            const loadLogs = async () => {
                try {
                    setCallLogsPage(1);
                    const logsPerPage = 50;
                    const logs = await CallLogService.getAllRecentLogs(logsPerPage);
                    console.log("logs fetched:", logs);
                    setLocalCallLogs(logs);
                    setHasMoreLogs(logs.length === logsPerPage);
                    
                    // Auto-sync call logs to server (only for numbers in leads collection)
                    if (logs.length > 0) {
                        CallLogService.syncCallLogsToServer(logs).then(result => {
                            if (result.success) {
                                console.log(`Synced ${result.data?.updated || 0} call logs to server`);
                            }
                        }).catch(err => {
                            console.warn('Failed to sync call logs:', err);
                        });
                    }
                } catch (error) {
                    console.error("Error loading logs:", error);
                    setLocalCallLogs([]);
                    setHasMoreLogs(false);
                }
            };
            loadLogs();
        } else {
            // Reset call logs when switching away from 'all' filter
            setLocalCallLogs([]);
            setCallLogsPage(1);
            setHasMoreLogs(true);
        }
    }, [activeFilter, refreshing]);

    // Filter leads on frontend for display logic if needed or rely on backend.
    // Backend `fetchLeads` returns generic list.
    // We map them to match expected 'contact' shape for UI.
    
    // Map leads from store directly for display
    // We rely on backend filtering now.
    const displayedContacts = React.useMemo(() => {
        const mapLead = (lead) => ({
            id: lead._id, // Map _id to id
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            status: lead.status, 
            leadSource: lead.lead_source || lead.source,
            assignedTo: lead.assigned_to?.name || 'Unknown',
            assigned_by: lead.assigned_by, // Pass full user object (or string for legacy)
            transferredBy: lead.transfer_history && lead.transfer_history.length > 0 
                ? lead.transfer_history[lead.transfer_history.length - 1].transferred_by 
                : null, // Extract most recent transfer
            photo: lead.photo, // Map photo
            callLogs: lead.call_logs || [], // Map call_logs
            notes: lead.notes || [], // Map notes
            lastCallTime: lead.last_call_at || lead.updatedAt || lead.received_at, 
            callStatus: lead.attributes?.callStatus || 'none', 
            callSchedule: lead.attributes?.callSchedule,
            isNewLead: lead.status === 'New' || lead.status === 'Unprocessed',
            attributes: lead.attributes || {},
            campaignId: lead.campaign_id, // Ensure campaignId is mapped
            campaignName: lead.attributes?.campaignName, // Ensure campaignName is mapped
            site_visit_done: lead.site_visit_done, 
            lastCallRecord: lead.call_logs && lead.call_logs.length > 0 
                ? lead.call_logs[lead.call_logs.length - 1] 
                : null
        });

        if (activeFilter === 'all') {
            const uniqueContacts = new Map();

            // 1. Add all Leads first
            leads.forEach(lead => {
                 const mapped = mapLead(lead);
                 const normalizedPhone = mapped.phone?.replace(/[^0-9]/g, '');
                 if(normalizedPhone) {
                     uniqueContacts.set(normalizedPhone, { ...mapped, _source: 'lead' });
                 }
            });

            // 2. Merge Logs
            localCallLogs.forEach(log => {
                 const normalizedPhone = log.phoneNumber?.replace(/[^0-9]/g, '');
                 if (!normalizedPhone) return;

                 const existing = uniqueContacts.get(normalizedPhone);
                 // Using timestamp from call log lib (usually ms or string)
                 const logTimeStr = log.timestamp; 
                 // Ensure logTime is valid date object
                 const logDate = new Date(parseInt(logTimeStr));
                 const logIso = logDate.toISOString();

                 if (existing) {
                     // Update existing if log is newer
                     const existingTime = new Date(existing.lastCallTime || 0).getTime();
                     if (logDate.getTime() > existingTime) {
                         existing.lastCallTime = logIso;
                         existing.callStatus = log.type === 'MISSED' ? 'missed' : 'connected';
                         existing.lastCallRecord = {
                            duration: log.duration + 's',
                            date: logIso
                         };
                     }
                     uniqueContacts.set(normalizedPhone, existing);
                 } else {
                     // Create transient contact from log
                     // Check specific types from react-native-call-log: 1=INCOMING, 2=OUTGOING, 3=MISSED
                     let callStatus = 'none';
                     if (log.type === 'MISSED' || log.type === '3') callStatus = 'missed';
                     else callStatus = 'connected'; // Assume connected for others roughly

                     uniqueContacts.set(normalizedPhone, {
                         id: `log-${log.timestamp}-${normalizedPhone}`,
                         name: log.name || log.phoneNumber,
                         phone: log.phoneNumber,
                         status: 'Unsaved',
                         leadSource: 'Device Log',
                         callStatus: callStatus,
                         lastCallTime: logIso,
                         lastCallRecord: {
                             duration: log.duration + 's',
                             date: logIso
                         },
                         isNewLead: false,
                         _source: 'log',
                         photo: null
                     });
                 }
            });

            return Array.from(uniqueContacts.values()).sort((a, b) => 
                new Date(b.lastCallTime || 0) - new Date(a.lastCallTime || 0)
            );

        } else {
            // Standard mapping for other filters
            return leads.map(mapLead);
        }
    }, [leads, localCallLogs, activeFilter]);


    // Unified Fetch Logic
    const fetchWithFilters = React.useCallback((pageOrReset = 1) => {
        const filters = { page: pageOrReset };
        
        // Add Active Filter (Status/Source)
        if (activeFilter !== 'all' && activeFilter !== 'new_leads' && activeFilter !== 'contacts') {
             // Map activeFilter to backend keys if needed
             if (activeFilter === 'hot' || activeFilter === 'warm' || activeFilter === 'cold') {
                 filters.status = activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1);
             } else {
                 // Fallback or specific mapping
                 filters.status = activeFilter;
             }
        }
        
        // For 'contacts' filter, we just fetch all leads standardly
        // For 'all' filter, we ALSO fetch leads to merge them
        // So no special exclusion needed for 'all' or 'contacts' regarding status

        // Add Search
        if (searchQuery) {
            filters.search = searchQuery;
        }

        // Add Date Filters
        if (dateFilter) {
            filters.startDate = dateFilter.toISOString();
            filters.endDate = dateFilter.toISOString();
        } else if (dateRange) {
            filters.startDate = dateRange.start.toISOString();
            filters.endDate = dateRange.end.toISOString();
        }

        if (activeFilter === 'new_leads') {
           dispatch(fetchEnquiries(filters)); 
        } else {
           // Fetch leads for 'all', 'contacts', and status filters
           dispatch(fetchLeads(filters));
           
           if (activeFilter === 'all') {
               // Trigger log refresh explicitly if needed, though useEffect handles it on filter change
               // Here purely for pagination if we wanted to fetch more logs? (Logs usually fixed size for now)
           }
        }
    }, [activeFilter, searchQuery, dateFilter, dateRange, dispatch]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
             fetchWithFilters(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, activeFilter, dateFilter, dateRange, fetchWithFilters]);

    // Register Notifications
    useEffect(() => {
        registerForPushNotificationsAsync();
    }, []);

    // Check for due reminders every 10 seconds (Checking merged list would duplicate if we not careful, 
    // but effectively we should check all. For now checking `contacts` is existing behavior, 
    // let's expand to mergedContacts if we want global reminders.)
    useEffect(() => {
        const checkReminders = () => {
            // Find first contact with a past due schedule
            const now = new Date();
            // TODO: Ensure 'callSchedule' is populated from backend lead attributes or dedicated field
            const dueContact = displayedContacts.find(c =>
                c.attributes?.callSchedule && new Date(c.attributes.callSchedule) <= now
            );

            // Only show if there's a due contact and no reminder is currently showing
            if (dueContact && !reminderContact) {
                setReminderContact(dueContact);
            }
        };

        const intervalId = setInterval(checkReminders, 10000); // Check every 10s
        checkReminders(); // Check immediately on mount/update

        return () => clearInterval(intervalId);
    }, [displayedContacts, reminderContact]);

    // Handle deep linking from InAppCallScreen
    useEffect(() => {
        if (route.params?.openContactDetail) {
            const contactId = route.params.openContactDetail;
            const contact = displayedContacts.find(c => c.id === contactId);
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
    }, [route.params, displayedContacts]);



    // REMOVED Client-Side Filtering blocks (filteredContacts, searchFilteredContacts)
    // We now use displayedContacts which is directly mapped from Redux 'leads' state
    // which is populated by server-side filtered results.

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
            // Replaced legacy store logic with Redux
            await dispatch(updateLeadStatus({ id: selectedContact.id, status }));
            
            // Auto-remove logic handled by backend or re-fetch if needed
            // For immediate UI update, Redux slice handles the state update
            await dispatch(fetchLeads());
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        fetchWithFilters(1);
        setRefreshing(false);
    };

    const handleCallAction = async (contact) => {
        setShowQuickActions(false);
        // Don't auto-remove from New Enquiries on call
        // Contact will only be removed when user changes status from "New" to something else
        navigation.navigate('InAppCall', { contact });
    };

    const loadMoreCallLogs = async () => {
        if (!hasMoreLogs || loadingMoreLogs || activeFilter !== 'all') return;
        
        setLoadingMoreLogs(true);
        try {
            const logsPerPage = 50;
            const nextPage = callLogsPage + 1;
            const previousCount = localCallLogs.length;
            
            // react-native-call-log doesn't support offset, so we fetch more total logs
            const totalToFetch = nextPage * logsPerPage;
            const allLogs = await CallLogService.getAllRecentLogs(totalToFetch);
            
            console.log(`Loaded ${allLogs.length} total call logs (page ${nextPage})`);
            setLocalCallLogs(allLogs);
            setCallLogsPage(nextPage);
            setHasMoreLogs(allLogs.length === totalToFetch);
            
            // Auto-sync call logs to server (only for numbers in leads collection)
            if (allLogs.length > 0) {
                CallLogService.syncCallLogsToServer(allLogs).then(result => {
                    if (result.success && result.data?.updated > 0) {
                        console.log(`Synced ${result.data?.updated || 0} call logs to server`);
                    }
                }).catch(err => {
                    console.warn('Failed to sync call logs:', err);
                });
            }
        } catch (error) {
            console.error("Error loading more logs:", error);
            setHasMoreLogs(false);
        } finally {
            setLoadingMoreLogs(false);
        }
    };

    const renderContactCard = ({ item }) => {
        
        return <ContactCard
            contact={item}
            onPress={handleContactPress}
            onLongPress={handleContactLongPress}
            onAvatarPress={handleAvatarPress}
            onCallPress={handleCallAction}
        />
    };

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

    // Skeleton Loading View
    const renderSkeletons = () => {
        return (
            <View style={styles.listContent}>
                {[1, 2, 3, 4, 5, 6].map((key) => (
                    <ContactCardSkeleton key={key} />
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={onOpenDrawer} style={{ padding: 4 }}>
                        <MaterialIcons name="menu" size={28} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { marginLeft: 16 }]}>Contacts</Text>
                    <TouchableOpacity onPress={handleCalendarPress}>
                        <View>
                            <MaterialIcons name="date-range" size={24} color={COLORS.text} />
                            {(dateFilter || dateRange) && <View style={{ position: 'absolute', right: -2, top: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />}
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <MaterialIcons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search leads..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                {/* Filter Bar */}
                 <FilterBar
                    activeFilter={activeFilter}
                    onFilterChange={(filter) => dispatch(setActiveFilter(filter))} // Corrected prop name
                />
            </View>

            {/* Content Area */}
            {isLoading && pagination.page === 1 ? (
                 renderSkeletons()
            ) : (
                <FlatList
                    data={displayedContacts}
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
                    onEndReached={() => {
                         // For 'all' filter, fetch both leads and call logs
                         if (activeFilter === 'all') {
                             // Fetch more leads from API
                             if (!isLoading && pagination.page < pagination.pages) {
                                 dispatch(fetchLeads({ 
                                     page: pagination.page + 1,
                                     search: searchQuery,
                                     startDate: dateFilter ? dateFilter.toISOString() : (dateRange ? dateRange.start.toISOString() : undefined),
                                     endDate: dateFilter ? dateFilter.toISOString() : (dateRange ? dateRange.end.toISOString() : undefined),
                                 }));
                             }
                             // Fetch more call logs from device
                             if (hasMoreLogs && !loadingMoreLogs) {
                                 loadMoreCallLogs();
                             }
                         }
                         // For other filters, just fetch leads
                         else if (activeFilter !== 'new_leads' && !isLoading && pagination.page < pagination.pages) {
                             dispatch(fetchLeads({ 
                                 page: pagination.page + 1,
                                 search: searchQuery,
                                 startDate: dateFilter ? dateFilter.toISOString() : (dateRange ? dateRange.start.toISOString() : undefined),
                                 endDate: dateFilter ? dateFilter.toISOString() : (dateRange ? dateRange.end.toISOString() : undefined),
                                 status: (activeFilter !== 'all' && activeFilter !== 'new_leads') ? (activeFilter === 'hot' || activeFilter === 'warm' || activeFilter === 'cold' ? activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1) : activeFilter) : undefined
                             }));
                         }
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        activeFilter === 'all' ? (
                            // Footer for 'all' filter - show both leads and call logs loading
                            <View>
                                {isLoading && pagination.page > 1 && (
                                    <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                                        <ActivityIndicator size="small" color={COLORS.primary} />
                                        <Text style={{ textAlign: 'center', marginTop: 8, color: COLORS.textSecondary }}>
                                            Loading more leads...
                                        </Text>
                                    </View>
                                )}
                                {loadingMoreLogs && (
                                    <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                                        <ActivityIndicator size="small" color={COLORS.primary} />
                                        <Text style={{ textAlign: 'center', marginTop: 8, color: COLORS.textSecondary }}>
                                            Loading more calls...
                                        </Text>
                                    </View>
                                )}
                                {!loadingMoreLogs && hasMoreLogs && (
                                    <TouchableOpacity 
                                        style={{ paddingHorizontal: 16, paddingVertical: 15, alignItems: 'center' }}
                                        onPress={loadMoreCallLogs}
                                    >
                                        <Text style={{ color: COLORS.primary, fontWeight: '600' }}>
                                            Load More Calls
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            // Regular leads footer
                            isLoading && pagination.page > 1 ? (
                                <View style={{ paddingHorizontal: 16 }}>
                                    <ContactCardSkeleton />
                                </View>
                            ) : null
                        )
                    }
                />
            )}

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
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12, // More rounded
        paddingHorizontal: 12,
        height: 44, // Slightly taller
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        height: '100%',
    },
});

export default HomeScreen;
