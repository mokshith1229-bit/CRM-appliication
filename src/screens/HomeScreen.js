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
    Linking,
    AppState, // Import AppState
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
// import { useContactStore } from '../store/contactStore'; // Replaced by Redux
// import { useCampaignStore } from '../store/campaignStore'; // Replaced by Redux
import { useDispatch, useSelector } from 'react-redux';
import { fetchLeads, fetchEnquiries, fetchCombinedEnquiries, fetchAllCalls, setActiveFilter, updateLeadStatus, ensureLead, validateLogOwnership, fetchLeadDetails } from '../store/slices/leadSlice';
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
    const [logEntityMap, setLogEntityMap] = useState({}); // Entity context per phone from checkNumbers

    // Redux
    const dispatch = useDispatch();
    const { leads, isLoading, activeFilter, pagination } = useSelector((state) => state.leads);
    const { sources, statuses } = useSelector(state => state.config);
    const { user } = useSelector((state) => state.auth);
    const loadLogs = async () => {
        try {
            setCallLogsPage(1);
            const logsPerPage = 50;
            const logs = await CallLogService.getAllRecentLogs(logsPerPage);
            setLocalCallLogs(logs);
            setHasMoreLogs(logs.length === logsPerPage);

            // Background: resolve entity context (lead/enquiry/campaign) for source labels
            if (logs.length > 0) {
                const phoneNumbers = [...new Set(logs.map(l => l.phoneNumber).filter(Boolean))];
                dispatch(validateLogOwnership(phoneNumbers))
                    .unwrap()
                    .then(entityMap => setLogEntityMap(entityMap))
                    .catch(e => console.warn('[HomeScreen] Entity check failed:', e.message));
            }
        } catch (error) {
            console.error("Error loading logs:", error);
            setLocalCallLogs([]);
            setHasMoreLogs(false);
        }
    };
    // Helper to match phone numbers robustly (last 10 digits)
    const isPhoneMatch = (p1, p2) => {
        if (!p1 || !p2) return false;
        const n1 = p1.replace(/[^0-9]/g, '');
        const n2 = p2.replace(/[^0-9]/g, '');
        if (n1.length >= 10 && n2.length >= 10) {
            return n1.slice(-10) === n2.slice(-10);
        }
        return n1 === n2;
    };

    // Fetch logs - only on mount or refreshing
    // We persist them when switching filters to allow merging
    useEffect(() => {
        if (localCallLogs.length === 0 || refreshing) {
            loadLogs();
        }
    }, [refreshing]);

    // Filter leads on frontend for display logic if needed or rely on backend.
    // Backend `fetchLeads` returns generic list.
    // We map them to match expected 'contact' shape for UI.

    // Derive a display source label from a checkNumbers entity result
    const getLogSource = (entity) => {
        if (!entity) return { label: 'Device Log', type: 'device' };
        const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

        // Helper to resolve source label from ID if needed
        const resolveSourceLabel = (val) => {
            if (!sources || sources.length === 0 || !val) return val;
            const matchingSource = sources.find(s => {
                const keyWithoutPrefix = s.key?.startsWith('source_') ? s.key.replace('source_', '') : s.key;
                return keyWithoutPrefix === val || s.key === val || s.label === val;
            });
            return matchingSource ? matchingSource.label : val;
        };

        if (entity.type === 'lead') {
            const rawSource = entity.lead_source || entity.source;
            const resolved = resolveSourceLabel(rawSource);
            return { label: resolved ? `Lead · ${cap(resolved)}` : 'Lead', type: 'lead' };
        }
        if (entity.type === 'enquiry') {
            const rawSource = entity.source || entity.lead_source;
            const resolved = resolveSourceLabel(rawSource);
            return { label: resolved ? `Enquiry · ${resolved}` : 'Enquiry', type: 'enquiry' };
        }
        if (entity.type === 'campaign_record') {
            return { label: entity.campaign_name ? `Campaign · ${entity.campaign_name}` : 'Campaign', type: 'campaign' };
        }
        return { label: 'Device Log', type: 'device' };
    };

    // Resolve best display name for a device log: prefer CRM entity name > device contact name > phone
    const getLogName = (log) => {
        const entity = logEntityMap[log.phoneNumber];
        return entity?.name || log.name || log.phoneNumber;
    };

    // Map leads from store directly for display
    // We rely on backend filtering now.
    const displayedContacts = React.useMemo(() => {
        const mapLead = (item) => {
            // Detect if this is a CallLog object (has entity populations) or a Lead/Enquiry object
            let lead = item;
            let logInfo = null;

            if (item.lead_id || item.enquiry_id || item.campaign_record_id) {
                // This is a CallLog document from /allcalls
                lead = item.lead_id || item.enquiry_id || item.campaign_record_id;
                logInfo = {
                    duration: (item.duration || 0) + 's',
                    date: item.timestamp,
                    status: item.status
                };
                
                // For campaign records, data is inside .data
                if (item.campaign_record_id && item.campaign_record_id.data) {
                    lead = { 
                        ...item.campaign_record_id.data, 
                        _id: item.campaign_record_id._id,
                        campaign_name: item.campaign_record_id.batch_name 
                    };
                }
            }

            // Priority 1: Log info from the CallLog itself (if this was a log entry)
            // Priority 2: already normalized lastCallRecord in slice
            // Priority 3: last_call field 
            // Priority 4: Last item in call_logs array
            let lastCallRecord = logInfo || lead.lastCallRecord || null;
            if (!lastCallRecord) {
                if (lead.last_call) {
                    lastCallRecord = {
                        duration: (lead.last_call.duration || 0) + 's',
                        date: lead.last_call.timestamp,
                        status: lead.last_call.status
                    };
                } else if (lead.call_logs && lead.call_logs.length > 0) {
                    lastCallRecord = lead.call_logs[lead.call_logs.length - 1];
                }
            }

            return {
                id: lead._id || item._id, // Map _id to id
                name: lead.name || 'Unknown',
                phone: lead.phone,
                email: lead.email,
                status: lead.status || 'No Status',
                leadSource: lead.lead_source || lead.source || lead.campaign_name,
                assignedTo: lead.assigned_to?.name || 'Unknown',
                assigned_by: lead.assigned_by, 
                transferredBy: lead.transfer_history && lead.transfer_history.length > 0
                    ? lead.transfer_history[lead.transfer_history.length - 1].transferred_by
                    : null, 
                photo: lead.photo, 
                callLogs: lead.call_logs || [], 
                notes: lead.notes || [], 
                lastCallTime: logInfo?.date || lead.lastCallTime || lead.last_call?.timestamp || lead.last_call_at || lead.updatedAt || lead.received_at,
                callStatus: logInfo?.status || lead.attributes?.callStatus || 'none',
                callSchedule: lead.attributes?.callSchedule,
                isNewLead: lead.status === 'New' || lead.status === 'Unprocessed',
                attributes: lead.attributes || {},
                campaignId: lead.campaign_id || item.campaign_record_id?._id, 
                campaignName: lead.campaign_name || lead.attributes?.campaignName, 
                site_visit_done: lead.site_visit_done,
                lastCallRecord: lastCallRecord,
                _logId: logInfo ? item._id : null // Flag to distinguish log-based entries
            };
        };

        const uniqueContacts = new Map();

        // 1. Add all Leads from current state (filtered by backend)
        (leads || []).forEach(item => {
            const mapped = mapLead(item);
            const normalizedPhone = mapped.phone?.replace(/[^0-9]/g, '');
            if (normalizedPhone) {
                // If it's the "All Calls" tab, backend returns individual logs sorted DESC.
                // We keep the first one encountered (newest) to avoid duplicates in the list.
                // If it's "All Leads" or "New Enquiries", backend returns unique entities.
                if (!uniqueContacts.has(normalizedPhone)) {
                    uniqueContacts.set(normalizedPhone, { ...mapped, _source: 'lead' });
                }
            }
        });

        // 2. Merge Logs (Global device logs) - ONLY for "All Calls" tab
        if (activeFilter === 'all') {
            localCallLogs.forEach(log => {
                const normalizedPhone = log.phoneNumber?.replace(/[^0-9]/g, '');
                if (!normalizedPhone) return;

                // Try to find matching lead by phone
                let existing = uniqueContacts.get(normalizedPhone);
                if (!existing) {
                    // Fallback: search for match using robust 10-digit logic
                    for (const [phone, contact] of uniqueContacts.entries()) {
                        if (isPhoneMatch(phone, normalizedPhone)) {
                            existing = contact;
                            break;
                        }
                    }
                }

                const logTimeStr = log.timestamp;
                const logDate = new Date(parseInt(logTimeStr));
                const logIso = logDate.toISOString();

                if (existing) {
                    // Update existing if device log is newer than what we have from backend
                    const existingTime = new Date(existing.lastCallTime || 0).getTime();
                    if (logDate.getTime() > existingTime) {
                        existing.lastCallTime = logIso;
                        existing.callStatus = log.type === 'MISSED' ? 'missed' : 'connected';
                        existing.lastCallRecord = {
                            duration: log.duration + 's',
                            date: logIso
                        };
                    }
                    // Save back with the normalized phone used to find it
                    const key = existing.phone?.replace(/[^0-9]/g, '') || normalizedPhone;
                    uniqueContacts.set(key, existing);
                } else {
                    // Only create transient contact from log if we are in "All" view
                    // This prevents "Unsaved" logs from cluttering specific status filters
                    let callStatus = 'none';
                    if (log.type === 'MISSED' || log.type === '3') callStatus = 'missed';
                    else callStatus = 'connected';

                    uniqueContacts.set(normalizedPhone, {
                        id: `log-${log.timestamp}-${normalizedPhone}`,
                        name: getLogName(log),   // CRM name > device contact name > phone number
                        phone: log.phoneNumber,
                        status: 'Unsaved',
                        leadSource: 'Device Log',
                        logSource: getLogSource(logEntityMap[log.phoneNumber]),
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
        }

        return Array.from(uniqueContacts.values()).sort((a, b) =>
            new Date(b.lastCallTime || 0) - new Date(a.lastCallTime || 0)
        );
    }, [leads, localCallLogs, activeFilter, logEntityMap]);


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

        if (activeFilter === 'all') {
            dispatch(fetchAllCalls(filters));
        } else if (activeFilter === 'new_leads') {
            dispatch(fetchCombinedEnquiries(filters));
        } else {
            // Fetch leads for 'contacts' and specific status filters
            dispatch(fetchLeads(filters));
        }
    }, [activeFilter, searchQuery, dateFilter, dateRange, dispatch]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchWithFilters(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, activeFilter, dateFilter, dateRange, fetchWithFilters]);

    // Refresh logs when app comes to foreground (e.g. after a call)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (activeFilter === 'all' && nextAppState === 'active') {
                console.log('App returned to active - refreshing UI logs...');
                fetchWithFilters(1);
                loadLogs();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [activeFilter, fetchWithFilters]);


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

    const handleContactPress = async (contact) => {
        console.log('🔵 handleContactPress called with contact:', contact?.name || contact?.phone);
        
        // Check if it's a real lead and not a device log
        if (contact && contact.id && !String(contact.id).startsWith('log-')) {
            try {
                // Fetch full lead details
                const fullLead = await dispatch(fetchLeadDetails(contact.id)).unwrap();
                
                // Map the fetched details to our UI contact shape
                const mappedContact = {
                    ...contact, // keep existing formatting for things like lastCallTime
                    ...fullLead,
                    id: fullLead._id || fullLead.id,
                    leadSource: fullLead.lead_source || fullLead.source,
                    campaignId: fullLead.campaign_id,
                    campaignName: fullLead.attributes?.campaignName || contact.campaignName,
                    callLogs: fullLead.call_logs || contact.callLogs,
                    notes: fullLead.notes || contact.notes,
                    isNewLead: fullLead.status === 'New' || fullLead.status === 'Unprocessed',
                    attributes: fullLead.attributes || contact.attributes
                };
                
                setSelectedContact(mappedContact);
            } catch (error) {
                console.error("Failed to fetch full lead details:", error);
                // Fallback to local data if fetch fails
                setSelectedContact(contact);
            }
        } else {
             setSelectedContact(contact);
        }

        console.log('🔵 Setting showQuickActions to true');
        setShowQuickActions(true);
        console.log('🔵 State updates dispatched');
    };

    const handleAvatarPress = (contact) => {
        // If it's a campaign lead, we might want to stay here or go to standard detail
        // Detail screen should handle it if we pass proper data
        navigation.navigate('QuickContact', { contact });
    };

    const handleContactLongPress = async (contact) => {
         // Check if it's a real lead and not a device log
        if (contact && contact.id && !String(contact.id).startsWith('log-')) {
            try {
                // Fetch full lead details
                const fullLead = await dispatch(fetchLeadDetails(contact.id)).unwrap();
                
                // Map the fetched details to our UI contact shape
                const mappedContact = {
                    ...contact, 
                    ...fullLead,
                    id: fullLead._id || fullLead.id,
                    leadSource: fullLead.lead_source || fullLead.source,
                    campaignId: fullLead.campaign_id,
                    campaignName: fullLead.attributes?.campaignName || contact.campaignName,
                    callLogs: fullLead.call_logs || contact.callLogs,
                    notes: fullLead.notes || contact.notes,
                    isNewLead: fullLead.status === 'New' || fullLead.status === 'Unprocessed',
                    attributes: fullLead.attributes || contact.attributes
                };
                
                setSelectedContact(mappedContact);
            } catch (error) {
                console.error("Failed to fetch full lead details for long press:", error);
                // Fallback to local data
                setSelectedContact(contact);
            }
        } else {
             setSelectedContact(contact);
        }
        setShowStatusOverlay(true);
    };

    const handleWriteNotes = (contact) => {
        setSelectedContact(contact);
        setShowNotesModal(true);
    };

    const handleStatusSelect = async (status) => {
        if (selectedContact) {
            try {
                // Ensure lead exists (convert from log if needed) with the selected status
                const targetLead = await dispatch(ensureLead({
                    contact: selectedContact,
                    initialStatus: status
                })).unwrap();

                // Always update status to record who did it and ensure it's in DB
                // This covers both existing leads and newly converted logs
                await dispatch(updateLeadStatus({
                    id: targetLead._id || targetLead.id,
                    status
                })).unwrap();

                // Close modals
                setShowStatusOverlay(false);
                setShowQuickActions(false);

                // Refresh leads list
                await dispatch(fetchLeads());
            } catch (error) {

                const errorMessage = error.response?.data?.message  // The custom backend message
                    || error.response?.data           // Fallback to data object
                    || error.message                  // Fallback to "Request failed..."
                    || error || 'An unknown error occurred';
                Alert.alert("Error", errorMessage);
            }
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
        Linking.openURL(`tel:${contact.phone}`);
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

            <View style={[styles.header, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingTop: 10 }]}>
                {/* Floating Search Pill */}
                <View style={styles.searchPill}>
                    <TouchableOpacity onPress={onOpenDrawer} style={styles.iconButton}>
                        <MaterialIcons name="menu" size={26} color="#4B5563" />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.searchInputPill}
                        placeholder="Search contacts"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#9CA3AF"
                    />

                    <TouchableOpacity onPress={handleCalendarPress} style={styles.iconButton}>
                        <View>
                            <MaterialIcons name={'calendar-today'} size={22} color="#4B5563" />
                            {(dateFilter || dateRange) && <View style={styles.activeDot} />}
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Filter Bar */}
                <FilterBar
                    activeFilter={activeFilter}
                    onFilterChange={(filter) => dispatch(setActiveFilter(filter))}
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

            {/* Content Area */}
            {isLoading && pagination.page === 1 && displayedContacts.length === 0 ? (
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
                                dispatch(fetchAllCalls({
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
                        // For New Leads (Enquiries)
                        else if (activeFilter === 'new_leads' && !isLoading && pagination.page < pagination.pages) {
                            dispatch(fetchCombinedEnquiries({
                                page: pagination.page + 1,
                                search: searchQuery,
                                startDate: dateFilter ? dateFilter.toISOString() : (dateRange ? dateRange.start.toISOString() : undefined),
                                endDate: dateFilter ? dateFilter.toISOString() : (dateRange ? dateRange.end.toISOString() : undefined),
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
                navigation={navigation}
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
        paddingHorizontal: 0,
        paddingTop: 8,
        paddingBottom: 0,
    },
    searchPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        borderRadius: 30, // Pill shape
        height: 52,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
        justifyContent: 'space-between',
    },
    iconButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchInputPill: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        paddingHorizontal: 8,
        textAlign: 'center', // Center aligned like reference image
    },
    activeDot: {
        position: 'absolute',
        right: -2,
        top: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primaryPurple,
    },
    filterChipContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        backgroundColor: 'transparent',
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
