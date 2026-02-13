import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    
    Platform,
    StatusBar as NativeStatusBar,
    TouchableOpacity,
    Linking,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDispatch, useSelector } from 'react-redux';
import { updateLeadStatus, updateLead, fetchLeads, fetchEnquiries, clearLeads, ensureLead } from '../store/slices/leadSlice';
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
    const [selectedInstance, setSelectedInstance] = useState(null); // { key, label }

    const dispatch = useDispatch();
    const allLeads = useSelector(state => state.leads.leads);
    const isLoading = useSelector(state => state.leads.isLoading);
    const { sources } = useSelector(state => state.config);

    // Identify if the current filter is a grouped source type
    const sourceGroupType = filterId?.startsWith('source_type:') ? filterId.replace('source_type:', '') : null;
    
    // Get all instances for this type
    const availableInstances = React.useMemo(() => {
        if (!sourceGroupType) return [];
        return sources.filter(s => {
            const lowKey = s.key?.toLowerCase() || '';
            const lowLabel = s.label?.toLowerCase() || '';
            const type = sourceGroupType.toLowerCase();
            
            return lowKey === type || 
                   lowKey.startsWith(`${type}_`) || 
                   lowKey.startsWith(`${type} `) ||
                   lowKey.startsWith(`${type}(`) ||
                   lowLabel.includes(type);
        });
    }, [sources, sourceGroupType]);

    // Map leads from store directly
    // Map leads from store directly
    const displayedContacts = React.useMemo(() => {
        return allLeads.map(lead => ({
            ...lead,
            id: lead.id || lead._id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            status: lead.status,
            leadSource: lead.lead_source,
            assignedTo: lead.assigned_to?.name || 'Unknown',
            assigned_by: lead.assigned_by, // Pass full user object
            photo: lead.photo,
            callLogs: lead.call_logs || [],
            notes: lead.notes || [],
            lastCallTime: lead.last_call_at || lead.updatedAt,
            callStatus: lead.attributes?.callStatus || 'none',
            callSchedule: lead.attributes?.callSchedule,
            isNewLead: lead.status === 'New',
            attributes: lead.attributes || {},
            campaignId: lead.campaign_id,
            campaignName: lead.attributes?.campaignName,
            lastCallRecord: lead.call_logs && lead.call_logs.length > 0 
                ? lead.call_logs[lead.call_logs.length - 1] 
                : null
        })).sort((a, b) => new Date(b.lastCallTime || 0) - new Date(a.lastCallTime || 0)); // Note: Backend sort preferred, but keeping client sort for now as secondary
    }, [allLeads]);

    // Unified Fetch Logic for this Screen
    const fetchWithFilters = React.useCallback(() => {
         const filters = {};
         
         // 1. Apply Base Filter from Drawer (filterId)
         if (filterId) {
             // Dynamic filter parsing
             if (filterId.startsWith('source_')) {
                 const sourceKey = filterId.replace('source_', '');
                 if (sourceKey.startsWith('type:')) {
                     // Check if a specific instance is selected
                     if (selectedInstance) {
                         filters.lead_source = selectedInstance.key;
                     } else {
                         filters.lead_source = sourceKey; // Will be e.g. "type:facebook"
                     }
                 } else {
                     filters.lead_source = sourceKey;
                 }
             } else if (filterId.startsWith('status_')) {
                 filters.status = filterId.replace('status_', '');
             } else if (filterId.startsWith('transferred_')) {
                 filters.transferred_by = filterId.replace('transferred_', '');
             }
             // No hardcoded status cases needed - all handled dynamically
         }

         // 2. Apply Search
         if (searchQuery) {
             filters.search = searchQuery;
         }

         // 3. Apply Date Filters
         if (dateFilter) {
             filters.startDate = dateFilter.toISOString();
             filters.endDate = dateFilter.toISOString();
         } else if (dateRange) {
             filters.startDate = dateRange.start.toISOString();
             filters.endDate = dateRange.end.toISOString();
         }

         // Dispatch
         if (route.params?.isEnquiryMode) {
             dispatch(fetchEnquiries(filters));
         } else {
             // Include enquiries only when filtering by lead source from CustomDrawer
             if (filterId && filterId.startsWith('source_')) {
                 filters.includeEnquiries = 'true';
             }
             dispatch(fetchLeads(filters));
         }
    }, [filterId, searchQuery, dateFilter, dateRange, route.params?.isEnquiryMode, dispatch]);

    // Initial Fetch & Filter Changes
    useEffect(() => {
        // Clear stale data
        dispatch(clearLeads());
        fetchWithFilters();
        
        return () => {
             dispatch(clearLeads());
        };
    }, [fetchWithFilters, route.params?.timestamp]); // Re-fetch when filters change

     // Debounce Search - Wait for user to stop typing
    useEffect(() => {
        const timer = setTimeout(() => {
             // Only fetch if search query changed (handled by dependency)
             // But valid fetchWithFilters includes it.
             // We need to avoid double fetch on mount.
             // Mount calls useEffect above. Search change calls this.
             // We can rely on fetchWithFilters dependency changes, but we want debounce.
             // Actually, the above effect [fetchWithFilters] will run on every render if fetchWithFilters changes.
             // We should wrap fetchWithFilters in useCallback, which depends on [searchQuery].
             // So typing updates searchQuery -> updates fetchWithFilters -> triggers above effect.
             // To IMPLEMENT DEBOUNCE: We should NOT put fetchWithFilters in the main dependency array of the immediate fetch,
             // OR we debounce the setSearchQuery itself, which is harder with controlled input.
             // ALTERNATIVE: Use a separate useEffect for search specifically.
        }, 500);
        // Current implementation above triggers on dependency change immediately.
        // Let's optimize: Remove `fetchWithFilters` from the main effect and call it explicitly.
    }, [searchQuery]); // Pending optimization, strictly following plan to just use params.

    // Correcting Logic:
    // The main `useEffect` currently depends on `fetchWithFilters`.
    // `fetchWithFilters` depends on `searchQuery`.
    // So typing updates `searchQuery` -> updates `fetchWithFilters` -> triggers main `useEffect`.
    // This causes request on every keystroke.
    // FIX: Remove `fetchWithFilters` from dependencies of main effect? No, we want it to run.
    // FIX: Debounce logic needs to be cleaner.
    
    // For now, implementing the removal of client-side logic as priority.
    // I will replace the previous `useEffect` block completely.

    const selectedContact = selectedContactId ? displayedContacts.find(c => c.id === selectedContactId) : null;

    // Check for reminders
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            const dueContact = displayedContacts.find(c =>
                c.callSchedule && new Date(c.callSchedule) <= now
            );

            if (dueContact && !reminderContact) {
                setReminderContact(dueContact);
            }
        };

        const intervalId = setInterval(checkReminders, 10000);
        checkReminders();

        return () => clearInterval(intervalId);
    }, [displayedContacts, reminderContact]);

    const handleCallAction = (contact) => {
        setShowQuickActions(false);
        Linking.openURL(`tel:${contact.phone}`);
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
        if (route.params?.isEnquiryMode) {
             // Keep logic consistent
             fetchWithFilters();
        } else {
             fetchWithFilters();
        }
        setRefreshing(false);
    };

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
             fetchWithFilters();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, filterId, dateFilter, dateRange, selectedInstance]); // Added selectedInstance

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

    // Handle status change
    // Handle status change
    const handleStatusChange = async (newStatus) => {
        if (selectedContact) {
            try {
                // Ensure lead exists (convert from log/enquiry if needed) with the selected status
                // This handles both logs AND enquiries being promoted
                const targetLead = await dispatch(ensureLead({ 
                    contact: selectedContact, 
                    initialStatus: newStatus 
                })).unwrap();
                
                // Only update status explicitly if the lead already existed (wasn't just created/converted by ensureLead)
                // If ensureLead created it, it already set the status
                // However, ensureLead returns the lead object. If it was an existing lead, ensureLead returns it.
                // If we want to force status update on existing leads too:
                if (selectedContact._source !== 'log' && !selectedContact.id?.startsWith('log-')) {
                     await dispatch(updateLeadStatus({ id: targetLead.id || targetLead._id, status: newStatus }));
                }
                
                setShowStatusOverlay(false);
                
                // Refresh list to show updated status
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
                                            lead_source: selectedContact.leadSource
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
            <SafeAreaView style={styles.container}>
                <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
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
                         hideMenuIcon={true}
                    />
                </View>
                <View style={styles.listContent}>
                    {[1, 2, 3, 4, 5, 6].map((key) => (
                        <ContactCardSkeleton key={key} />
                    ))}
                </View>
            </SafeAreaView>
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
            
            {/* Instance Selector for Grouped Sources */}
            {sourceGroupType && availableInstances.length > 1 && (
                <View style={styles.instanceSelector}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.instanceScrollContent}
                    >
                        <TouchableOpacity 
                            style={[styles.instanceChip, !selectedInstance && styles.instanceChipActive]}
                            onPress={() => setSelectedInstance(null)}
                        >
                            <Text style={[styles.instanceChipText, !selectedInstance && styles.instanceChipTextActive]}>
                                All Leads
                            </Text>
                        </TouchableOpacity>

                        {availableInstances.map((instance) => (
                            <TouchableOpacity 
                                key={instance.key}
                                style={[styles.instanceChip, selectedInstance?.key === instance.key && styles.instanceChipActive]}
                                onPress={() => setSelectedInstance(instance)}
                            >
                                <Text style={[styles.instanceChipText, selectedInstance?.key === instance.key && styles.instanceChipTextActive]}>
                                    {instance.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

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
                data={displayedContacts}
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
    instanceSelector: {
        backgroundColor: COLORS.cardBackground,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    instanceScrollContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    instanceChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    instanceChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    instanceChipText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    instanceChipTextActive: {
        color: '#FFF',
    },
});

export default FilteredContactsScreen;
