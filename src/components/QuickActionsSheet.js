import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    StyleSheet,
    Platform,
    Alert,
    Linking,
    ActivityIndicator,
    FlatList,
    
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { openWhatsApp, sendSMS, sendEmail } from '../utils/intents';
import { useDispatch, useSelector } from 'react-redux';
import { updateLead, removeLead, fetchLeadDetails, clearLeadDetails, ensureLead, updateCallLog } from '../store/slices/leadSlice';
import { fetchTeamMembers } from '../store/slices/teamSlice';
import axiosClient from '../api/axiosClient';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { schedulePushNotification } from '../utils/NotificationService';
import * as Notifications from 'expo-notifications';
import TransferLeadModal from './TransferLeadModal';
import StatusPicker from './StatusPicker';
import CallLogService from '../services/CallLogService';
import { Picker } from '@react-native-picker/picker';
const BUDGET_OPTIONS = [
    { label: '5 Lakhs to 50 Lakhs', value: '5 Lakhs to 50 Lakhs' },
    { label: '50 Lakhs to 1 Cr', value: '50 Lakhs to 1 Cr' },
    { label: '1 Cr to 3 Cr', value: '1 Cr to 3 Cr' },
    { label: '3 Cr to 5 Cr', value: '3 Cr to 5 Cr' },
    { label: '5 Cr to 7 Cr', value: '5 Cr to 7 Cr' },
    { label: '7 Cr to 9 Cr', value: '7 Cr to 9 Cr' },
    { label: '10 Cr +', value: '10 Cr +' }
];

const TIMELINE_OPTIONS = [
    { label: '1 Month', value: '1 Month' },
    { label: '3 Months', value: '3 Months' },
    { label: '6 Months', value: '6 Months' },
    { label: '1 Year', value: '1 Year' },
    { label: 'More than 1 year', value: 'More than 1 year' }
];
import AudioPlayer from './AudioPlayer';
import { formatRequirementsFromFields } from '../utils/sourceHelper';

// Helper to format date relative or absolute
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
        return `${days}d ago`;
    } else {
        return date.toLocaleDateString();
    }
};

const QuickActionsSheet = ({ visible, contact, onClose, onCall, campaignId, campaignName, navigation }) => {
    // console.log('🟢 QuickActionsSheet render - visible:', visible, 'contact:', contact?.name || contact?.phone);

    const dispatch = useDispatch();

    // Get fresh contact data from Redux list
    const leads = useSelector(state => state.leads.leads);
    // Also get detailed info (history)
    const detailedContact = useSelector(state => state.leads.currentLeadDetails);

    // Merge contact info: detailed takes precedence, then list item, then prop
    const listContact = contact ? leads.find(l => (l._id || l.id) === (contact._id || contact.id)) : null;
    const freshContact = detailedContact || listContact || contact;

    const { sources, statuses, isWhatsAppIntegrated } = useSelector(state => state.config);
    const allTeamMembers = useSelector(state => state.team.members);

    const { user } = useSelector(state => state.auth);

    const teamMembers = allTeamMembers.filter(member => {
        // Resolve IDs to ensure we compare correctly even if one has _id and other has id
        const memberId = member._id || member.id;
        const userId = user ? (user._id || user.id) : null;

        const isNotSelf = userId ? (memberId !== userId) : true;

        // We allow transferring to any team member who isn't the current user.
        // If specific role filtering is needed later, it can be added here.
        return isNotSelf;
    });

    const [activeTab, setActiveTab] = useState('Details'); // 'Details' | 'History'

    const [callOutcome, setCallOutcome] = useState('');
    const [remark, setRemark] = useState('');
    const [newNote, setNewNote] = useState('');
    const [selectedTeamMember, setSelectedTeamMember] = useState(null);
    const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
    const [isEditingLead, setIsEditingLead] = useState(false);

    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [showSiteVisitModal, setShowSiteVisitModal] = useState(false);
    const [siteVisitNote, setSiteVisitNote] = useState('');
    const [siteVisitDone, setSiteVisitDone] = useState(false);
    // Status Change Note State
    const [pendingStatus, setPendingStatus] = useState(null);
    const [showStatusNoteModal, setShowStatusNoteModal] = useState(false);
    const [statusNote, setStatusNote] = useState('');

    // Reminder state
    const [callScheduleDate, setCallScheduleDate] = useState(new Date());
    const [reminderReason, setReminderReason] = useState('');
    const [showReminderSetupModal, setShowReminderSetupModal] = useState(false);

    // Legacy states kept if needed, but we essentially replace usage
    const [showCallDatePicker, setShowCallDatePicker] = useState(false);
    const [showCallTimePicker, setShowCallTimePicker] = useState(false);
    const [localDeviceLogs, setLocalDeviceLogs] = useState([]);

    // Local state for editing lead info
    const [localLeadInfo, setLocalLeadInfo] = useState({
        requirement: '',
        budget: '',
        location: '',
        timeline: '',
        remark: '',
    });

    const [showBudgetPicker, setShowBudgetPicker] = useState(false);
    const [showTimelinePicker, setShowTimelinePicker] = useState(false);
    const [editingCallLogId, setEditingCallLogId] = useState(null);
    const [editingCallLogNote, setEditingCallLogNote] = useState('');

    // Fetch team members and detailed lead info when sheet becomes visible
    useEffect(() => {
        if (visible) {
            dispatch(fetchTeamMembers());

            if (freshContact?._source === 'log' && freshContact?.phone) {
                // Fetch local logs for device log contact
                CallLogService.getLogsForNumber(freshContact.phone, 500)
                    .then(logs => setLocalDeviceLogs(logs))
                    .catch(err => console.error('QuickActionsSheet: Failed to fetch local logs', err));
            } else if (freshContact?._id || freshContact?.id) {
                dispatch(fetchLeadDetails(freshContact._id || freshContact.id));
            }
        } else {
            dispatch(clearLeadDetails());
            setLocalDeviceLogs([]);
            setActiveTab('Details');
        }
    }, [visible, dispatch, freshContact?._id, freshContact?.id, freshContact?._source, freshContact?.phone]);

    useEffect(() => {
        if (visible && freshContact) {
            
            const dynamicRequirement = formatRequirementsFromFields(freshContact?.requirement ||freshContact?.payload || {});
            setLocalLeadInfo({
                budget: freshContact.attributes?.budget || freshContact.budget || '',
                location: freshContact.attributes?.location || freshContact.location || '',
                timeline: freshContact.attributes?.timeline || freshContact.timeline || '',
                requirement: freshContact.attributes?.requirement || freshContact.requirement ||dynamicRequirement ||  '',
                remark: freshContact.remark || '',
            });
        }
    }, [visible, freshContact]);

    const handleAddNote = async () => {
        if (newNote.trim() && freshContact) {
            try {
                // VALIDATION: If log contact, must have status and source
                // if (freshContact._source === 'log') {
                //     if (!freshContact.status || (!freshContact.lead_source && !freshContact.leadSource)) {
                //         Alert.alert("Required Fields", "Please select Lead Status and Lead Source before adding a note.");
                //         return;
                //     }
                // }

                // Ensure lead exists first
                const targetLead = await dispatch(ensureLead(freshContact)).unwrap();

                const newNoteObj = {
                    id: Date.now().toString(),
                    text: newNote.trim(),
                    timestamp: new Date().toISOString(),
                };

                // Use updated list from targetLead if it was just created/fetched
                const currentNotes = targetLead.notes || [];
                const updatedNotes = [...currentNotes, newNoteObj];

                await dispatch(updateLead({
                    id: targetLead.id || targetLead._id,
                    data: { notes: updatedNotes }
                })).unwrap();
                setNewNote('');
            } catch (error) {
                console.error('Failed to add note:', error);
                // const errorMessage = typeof error === 'string' ? error : (error.message || "Failed to add note");
                const errorMessage = error.response?.data?.message  // The custom backend message
                    || error.response?.data           // Fallback to data object
                    || error.message                  // Fallback to "Request failed..."
                    || error || 'An unknown error occurred';
                Alert.alert("Error", errorMessage);
            }
        }
    };
    const handleSaveLead = async () => {
        if (freshContact) {
            try {
                const targetLead = await dispatch(ensureLead(freshContact)).unwrap();
                await dispatch(updateLead({
                    id: targetLead.id || targetLead._id,
                    data: {
                        attributes: {
                            ...targetLead.attributes,
                            requirement: localLeadInfo.requirement,
                            budget: localLeadInfo.budget,
                            location: localLeadInfo.location,
                            timeline: localLeadInfo.timeline
                        }
                    }
                })).unwrap();
                setIsEditingLead(false);
                Alert.alert('Success', 'Requirement details saved successfully');
            } catch (error) {
                // const errorMessage = typeof error === 'string' ? error : (error.message || "Failed to update requirement");
                const errorMessage = error.response?.data?.message  // The custom backend message
                    || error.response?.data           // Fallback to data object
                    || error.message                  // Fallback to "Request failed..."
                    || error || 'An unknown error occurred';
                Alert.alert("Error", errorMessage);
            }
        }
    };

    const handleTransfer = async (teamMember, reason) => {
        if (freshContact) {
            try {
                // VALIDATION: If log contact, must have status and source
                // if (freshContact._source === 'log') {
                //     if (!freshContact.status)   {
                //         Alert.alert("Required Fields", "Please select Lead Status before transferring.");
                //         return;
                //     }
                // }

                const targetLead = await dispatch(ensureLead(freshContact)).unwrap();

                // Use dedicated transfer endpoint
                await axiosClient.post(`/leads/${targetLead.id || targetLead._id}/transfer`, {
                    assigned_to: teamMember._id || teamMember.id,
                    reason: reason
                });

                // Remove lead from local state since it's no longer accessible
                dispatch(removeLead(targetLead.id || targetLead._id));

                setIsTransferModalVisible(false);
                onClose();
                Alert.alert('Success', `Lead transferred to ${teamMember.name}`);
            } catch (error) {
                console.error('Failed to transfer lead:', error);
                // const errorMessage = typeof error === 'string' ? error : (error.response?.data?.message || error.message || "Failed to transfer lead");
                const errorMessage = error.response?.data?.message  // The custom backend message
                    || error.response?.data           // Fallback to data object
                    || error.message                  // Fallback to "Request failed..."
                    || error || 'An unknown error occurred';
                Alert.alert("Error", errorMessage);
            }
        }
    };

    const handleRemindPress = () => {
        // Reset state and show custom modal
        setCallScheduleDate(new Date());
        setReminderReason('');
        setShowReminderSetupModal(true);
    };

    const scheduleReminder = async (date, reason) => {
        if (!freshContact) return;

        try {
            // VALIDATION: If log contact, must have status and source
            // if (freshContact._source === 'log') {
            //     if (!freshContact.status || (!freshContact.lead_source && !freshContact.leadSource)) {
            //         Alert.alert("Required Fields", "Please select Lead Status and Lead Source before setting a reminder.");
            //         return;
            //     }
            // }

            const targetLead = await dispatch(ensureLead(freshContact)).unwrap();

            // Schedule notification
            await schedulePushNotification(
                `Reminder: ${targetLead.name || targetLead.phone}`,
                reason || `Follow up with ${targetLead.name || 'Lead'}`,
                date,
                {
                    type: 'reminder',
                    leadId: targetLead.id || targetLead._id,
                    reason: reason,
                    createdBy: user ? {
                        id: user.id || user._id,
                        name: user.name,
                        role: user.role
                    } : null
                }
            );

            // Update lead with reminder timestamp and attributes
            await dispatch(updateLead({
                id: targetLead.id || targetLead._id,
                data: {
                    callbacks: {
                        scheduled_at: date.toISOString(),
                        reason: reason,
                        status: 'Pending',
                        created_by: user ? {
                            id: user.id || user._id,
                            name: user.name,
                            email: user.email,
                            role: user.role
                        } : null
                    }
                }
            })).unwrap();

            setShowReminderSetupModal(false);
            Alert.alert('Success', `Reminder set for ${date.toLocaleString()}`);
        } catch (error) {
            console.error('Failed to schedule reminder:', error);
            // const errorMessage = typeof error === 'string' ? error : (error.message || "Failed to schedule reminder");
            const errorMessage = error.response?.data?.message  // The custom backend message
                || error.response?.data           // Fallback to data object
                || error.message                  // Fallback to "Request failed..."
                || error || 'An unknown error occurred';
            Alert.alert('Error', errorMessage);
        }
    };

    const handleUpdateSource = async (newSource) => {
        if (freshContact) {
            try {
                const targetLead = await dispatch(ensureLead(freshContact)).unwrap();

                // Strip source_ prefix if present
                const cleanSource = newSource?.startsWith('source_')
                    ? newSource.replace('source_', '')
                    : newSource;

                await dispatch(updateLead({
                    id: targetLead.id || targetLead._id,
                    data: { lead_source: cleanSource }
                })).unwrap();
            } catch (error) {
                console.error('QuickActionsSheet: Failed to update lead source', error);
                // const errorMessage = typeof error === 'string' ? error : (error.message || "Failed to update lead source");
                const errorMessage = error.response?.data?.message  // The custom backend message
                    || error.response?.data           // Fallback to data object
                    || error.message                  // Fallback to "Request failed..."
                    || error || 'An unknown error occurred';

                Alert.alert("Error", errorMessage);
            }
        }
    };

    const handleStartEditingNote = (log) => {
        setEditingCallLogId(log.id); // Flattened item uses .id
        setEditingCallLogNote(log.note || '');
    };

    const handleStatusSelect = (statusValue) => {
        setPendingStatus(statusValue);
        setStatusNote('');
        setShowStatusNoteModal(true);
    };

    const handleConfirmStatus = async () => {
        if (freshContact && pendingStatus) {
            try {
                const targetLead = await dispatch(ensureLead(freshContact)).unwrap();

                await dispatch(updateLead({
                    id: targetLead.id || targetLead._id,
                    data: {
                        status: pendingStatus,  // Already a label, no need to strip prefix
                        status_note: statusNote
                    }
                })).unwrap();

                setShowStatusNoteModal(false);
                setPendingStatus(null);
                setStatusNote('');
            } catch (error) {
                // const errorMessage = typeof error === 'string' ? error : (error.message || "Failed to update status");
                const errorMessage = error.response?.data?.message  // The custom backend message
                    || error.response?.data           // Fallback to data object
                    || error.message                  // Fallback to "Request failed..."
                    || error || 'An unknown error occurred';
                Alert.alert("Error", errorMessage);
            }
        }
    };

    // Compile History Items
    const historyItems = useMemo(() => {
        if (!freshContact) return [];
        const items = [];

        // Status History
        if (freshContact.status_history) {
            freshContact.status_history.forEach(item => {
                // Format: Previous -> Current
                const prev = item.previous_status || 'New';
                const current = item.status;

                // Match status color
                const statusKey = current?.toLowerCase();
                const matchingStatus = statuses.find(s => {
                    const cleanKey = s.key?.startsWith('status_') ? s.key.replace('status_', '') : s.key;
                    return cleanKey?.toLowerCase() === statusKey || s.label?.toLowerCase() === statusKey;
                });
                const displayColor = matchingStatus?.color || COLORS.primary;

                items.push({
                    type: 'status',
                    date: new Date(item.changed_at),
                    title: `${prev} → ${current}`,
                    subtitle: `Status Change`,
                    user: item.changed_by, // Populated object
                    // No note for status changes per request
                    icon: 'swap-horizontal', // MaterialCommunityIcons "swap-horizontal" roughly matches swap_horiz
                    color: displayColor
                });
            });
        }

        // Transfer History
        if (freshContact.transfer_history) {
            freshContact.transfer_history.forEach(item => {
                const toUser = item.transferred_to;
                const fromUser = item.transferred_from;
                const byUser = item.transferred_by;

                const toName = toUser ? (toUser.name || toUser.email || toUser.role || 'Unknown') : 'Unknown';
                // const fromName = fromUser ? (fromUser.name || fromUser.email || fromUser.role || 'Unknown') : 'Unknown'; 
                // We mainly care about who transferred it and to whom

                items.push({
                    type: 'transfer',
                    date: new Date(item.transferred_at),
                    title: `Transferred to ${toName}`,
                    // Detailed attribution in subtitle logic later
                    user: byUser,
                    toUser: toUser, // explicit ref
                    note: item.reason,
                    icon: 'account-arrow-right',
                    color: '#FF9800'
                });
            });
        }

        // Call Logs (Both formats)
        const serverCallLogs = freshContact.call_logs || freshContact.callLogs || [];
        if (serverCallLogs.length > 0) {
            serverCallLogs.forEach(item => {
                items.push({
                    type: 'call',
                    id: item.calllogid || item._id || item.id, // Prefer explicit calllogid for PUT requests
                    date: new Date(item.date || item.timestamp), // Handle both formats
                    title: `${item.type || 'Call'} - ${item.status}`,
                    subtitle: `Duration: ${item.duration}`,
                    note: item.notes || item.note,
                    icon: 'phone',
                    color: item.status === 'Missed' ? '#F44336' : '#4CAF50',
                    duration: item.duration,
                    recording_url: item.recording_url
                });
            });
        }

        // Notes (if treated as history items)
        if (freshContact.notes) {
            freshContact.notes.forEach(item => {
                items.push({
                    type: 'note',
                    date: new Date(item.timestamp),
                    title: 'Note Added',
                    note: item.text,
                    icon: 'note-text',
                    color: '#607D8B'
                });
            });
        }

        // Device Local Logs (specifically for contacts with _source === 'log')
        
        if (freshContact._source === 'log' && localDeviceLogs && localDeviceLogs.length > 0) {
            localDeviceLogs.forEach(item => {
                // Check if this log is already accounted for (unlikely for unsaved, but good practice)
                const logTime = parseInt(item.timestamp);

                // Map device log types to readable status
                let callStatus = 'Connected';
                if (item.type === 'MISSED' || item.type === '3') callStatus = 'Missed';
                else if (item.type === 'INCOMING' || item.type === '1') callStatus = 'Received';
                else if (item.type === 'OUTGOING' || item.type === '2') callStatus = 'Dialed';

                items.push({
                    type: 'call',
                    date: new Date(logTime),
                    title: `${callStatus} Call`,
                    subtitle: `Duration: ${item.duration}s`,
                    icon: 'phone',
                    color: callStatus === 'Missed' ? '#F44336' : '#4CAF50',
                    isDeviceSource: true
                });
            });
        }

        return items.sort((a, b) => b.date - a.date);
    }, [freshContact, localDeviceLogs]);


    const handleSaveCallLogNote = async () => {
        if (!editingCallLogId) return;
        try {
            await dispatch(updateCallLog({ id: editingCallLogId, notes: editingCallLogNote })).unwrap();
            
            // Re-fetch lead details to update UI with latest from server
            if (freshContact?._id || freshContact?.id) {
                dispatch(fetchLeadDetails(freshContact._id || freshContact.id));
            }
            
            setEditingCallLogId(null);
            setEditingCallLogNote('');
            // Alert.alert('Success', 'Note updated successfully');
        } catch (error) {
            Alert.alert('Error', error?.message || 'Failed to update note');
        }
    };

    // Rendering Helper for History
    const renderHistoryItem = ({ item }) => {
        // Robust user name resolution
        const getUserName = (u) => u ? (u.name || u.email || u.role || 'Unknown') : 'Unknown';

        const isTransfer = item.type === 'transfer';
        const isStatus = item.type === 'status';
        const isCall = item.type === 'call';
        const isEditing = String(editingCallLogId) === String(item.id);

        // Custom formatting based on type
        let subText = '';
        if (isStatus) {
            subText = `By ${getUserName(item.user)}`;
        } else if (isTransfer) {
            subText = `By ${getUserName(item.user)}`;
        } else if (item.user) {
            subText = `By ${getUserName(item.user)}`;
        }

        return (
            <View style={styles.historyItem}>
                <View style={[styles.historyIconContainer, { backgroundColor: item.color + '20' }]}>
                    <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={styles.historyContent}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.historyTitle}>{item.title}</Text>
                        <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                    </View>

                    {/* Subtitle / User Info */}
                    {(item.subtitle || subText) && (
                        <Text style={styles.historySubtitle}>
                            {item.subtitle ? item.subtitle + ' • ' : ''}{subText}
                        </Text>
                    )}

                    {/* Transfer Reason or Call Note */}
                    {isCall && !item.isDeviceSource ? (
                        <TouchableOpacity 
                            style={styles.callNoteContainer}
                            onPress={() => {
                                if (!isEditing) handleStartEditingNote(item);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.notesHeader}>
                                <Text style={styles.notesLabel}>Notes:</Text>
                                <TouchableOpacity 
                                    onPress={() => {
                                        if (isEditing) {
                                            handleSaveCallLogNote();
                                        } else {
                                            handleStartEditingNote(item);
                                        }
                                    }}
                                    style={styles.editNoteBtn}
                                >
                                    <Text style={styles.editNoteBtnText}>
                                        {isEditing ? 'Save' : (item.note ? 'Edit' : 'Add Note')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {isEditing ? (
                                <TextInput
                                    style={styles.notesInput}
                                    value={editingCallLogNote}
                                    onChangeText={setEditingCallLogNote}
                                    placeholder="Add a note..."
                                    multiline
                                    autoFocus
                                />
                            ) : (
                                <Text style={styles.historyNoteText}>{item.note || 'Tap to add notes...'}</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        item.note && (
                            <View style={styles.historyNoteContainer}>
                                {isTransfer && <Text style={{ fontSize: 12, fontWeight: '600', color: '#555' }}>Reason:</Text>}
                                <Text style={styles.historyNoteText}>{item.note}</Text>
                            </View>
                        )
                    )}

                    {/* Audio Player for Calls - Hide if 0 duration or no recording URL */}
                    {isCall && item.recording_url && parseFloat(item.duration || 0) > 0 && (
                        <View style={{ marginTop: 4, marginHorizontal: -6 }}>
                            <AudioPlayer
                                recording={{
                                    status: item.title?.includes('Missed') ? 'Missed' : 'Connected',
                                    recording_url: item.recording_url,
                                    duration: item.duration
                                }}
                            />
                        </View>
                    )}
                </View>
            </View>
        );
    };

    // Reminder functionality - matches ContactDetailScreen exactly
    const openDatePicker = () => {
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                value: callScheduleDate,
                onChange: (event, date) => {
                    if (event.type === 'set' && date) {
                        setCallScheduleDate(date);
                        // After date is selected, open time picker
                        DateTimePickerAndroid.open({
                            value: date,
                            onChange: async (timeEvent, timeDate) => {
                                if (timeEvent.type === 'set' && timeDate) {
                                    await handleSaveReminder(timeDate);
                                }
                            },
                            mode: 'time',
                            is24Hour: false
                        });
                    }
                },
                mode: 'date',
                is24Hour: false,
                minimumDate: new Date(),
            });
        } else {
            setShowDatePicker(true);
        }
    };

    const handleScheduleChange = async (event, selectedDate) => {
        if (Platform.OS === 'ios') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setCallScheduleDate(selectedDate);
            if (event.type === 'set') {
                await handleSaveReminder(selectedDate);
            }
        }
    };

    const handleSaveReminder = async (date) => {
        if (freshContact) {
            try {
                await dispatch(updateLead({
                    id: freshContact.id || freshContact._id,
                    data: { attributes: { ...freshContact.attributes, callSchedule: date.toISOString() } }
                })).unwrap();

                // Schedule push notification
                await schedulePushNotification(
                    `Call Reminder: ${freshContact.name || freshContact.phone}`,
                    `It's time to follow up with this lead.`,
                    date
                );

                Alert.alert(
                    'Reminder Set',
                    `You'll be reminded at ${date.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    })}`
                );
            } catch (error) {
                Alert.alert("Error", "Failed to set reminder");
            }
        }
    };

const updateSiteVisit = async () => {
    if (freshContact) {
        try {
            const targetLeadId = freshContact.id || freshContact._id;
            const date = new Date();
            const isSiteVisitDone = String(siteVisitDone) === 'true';

            // 1. Call the new specific API
            await axiosClient.put(`/leads/${targetLeadId}/sitevisit`, {
                site_visit_note: siteVisitNote,
                site_visit_date: date.toISOString(),
                site_visit_done: isSiteVisitDone
            });

            // 2. Update Redux store so UI reflects changes immediately
            await dispatch(updateLead({
                id: targetLeadId,
                data: { 
                    site_visit_note: siteVisitNote,
                    site_visit_date: date.toISOString(),
                    site_visit_done: isSiteVisitDone
                 }
            })).unwrap();

            setShowSiteVisitModal(false);
            setSiteVisitNote('');
        } catch (error) {
            Alert.alert("Error", error?.response?.data?.message || "Failed to update site visit");
        }
    }
};
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={styles.sheet}>
                    <View style={styles.dragHandle} />

                    {/* Contact Header (Always Visible) */}
                    <View style={styles.headerContainer}>
                        <View style={styles.contactInfo}>
                            <View style={styles.contactNameRow}>
                                <Text style={styles.contactName}>{freshContact?.name || freshContact?.phone || 'Unknown'}</Text>
                                {freshContact?.site_visit_done && (
                                    <View style={styles.siteVisitBadge}>
                                        <MaterialCommunityIcons name="home-city" size={14} color="#0288D1" />
                                        <Text style={styles.siteVisitBadgeText}>Site Visit Done</Text>
                                    </View>
                                )}
                            </View>
                            {freshContact?.name && <Text style={styles.contactPhone}>{freshContact?.phone}</Text>}
                        </View>

                        {/* Tabs */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'Details' && styles.activeTab]}
                                onPress={() => setActiveTab('Details')}
                            >
                                <Text style={[styles.tabText, activeTab === 'Details' && styles.activeTabText]}>Details</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'History' && styles.activeTab]}
                                onPress={() => setActiveTab('History')}
                            >
                                <Text style={[styles.tabText, activeTab === 'History' && styles.activeTabText]}>History & Logs</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {activeTab === 'Details' ? (
                        <ScrollView style={styles.content}>
                            {/* Action Buttons */}
                            <View style={styles.actionsRow}>
                                <TouchableOpacity 
                                    style={styles.actionButton} 
                                    onPress={() => {
                                        if (freshContact) {
                                            if (isWhatsAppIntegrated) {
                                                onClose();
                                                navigation.navigate('ChatDetail', { 
                                                    chatId: freshContact.phone || freshContact._id || freshContact.id,
                                                    chatName: freshContact.name || freshContact.phone
                                                });
                                            } else {
                                                openWhatsApp(freshContact.phone);
                                            }
                                        }
                                    }}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: COLORS.lightPurpleTint }]}>
                                        <MaterialCommunityIcons name="whatsapp" size={24} color={COLORS.primaryPurple} />
                                    </View>
                                    <Text style={styles.actionLabel}>WhatsApp</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton} onPress={() => freshContact?.phone && sendSMS(freshContact.phone)}>
                                    <View style={[styles.iconContainer, { backgroundColor: COLORS.lightPurpleTint }]}>
                                        <MaterialCommunityIcons name="message-text" size={24} color={COLORS.primaryPurple} />
                                    </View>
                                    <Text style={styles.actionLabel}>Message</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton} onPress={() => sendEmail(freshContact?.email || '')}>
                                    <View style={[styles.iconContainer, { backgroundColor: COLORS.lightPurpleTint }]}>
                                        <MaterialCommunityIcons name="email" size={24} color={COLORS.primaryPurple} />
                                    </View>
                                    <Text style={styles.actionLabel}>Mail</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton} onPress={() => setIsTransferModalVisible(true)}>
                                    <View style={[styles.iconContainer, { backgroundColor: COLORS.lightPurpleTint }]}>
                                        <MaterialCommunityIcons name="account-multiple" size={24} color={COLORS.primaryPurple} />
                                    </View>
                                    <Text style={styles.actionLabel}>Transfer</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton} onPress={handleRemindPress}>
                                    <View style={[styles.iconContainer, { backgroundColor: COLORS.lightPurpleTint }]}>
                                        <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.primaryPurple} />
                                    </View>
                                    <Text style={styles.actionLabel}>Remind</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Lead Status Selector */}
                            <TouchableOpacity
                                style={styles.leadSection}
                                onPress={() => setShowStatusPicker(true)}
                            >
                                <View style={styles.leadHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <MaterialCommunityIcons name="list-status" size={20} color={COLORS.primary} />
                                        <Text style={styles.sectionTitle}>Lead Status</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.infoValue, { marginRight: 8, color: COLORS.primary }]}>
                                            {(() => {
                                                const statusValue = freshContact?.status;
                                                if (!statusValue) return 'Select';

                                                const matchingStatus = statuses.find(s => {
                                                    const keyWithoutPrefix = s.key?.startsWith('status_')
                                                        ? s.key.replace('status_', '')
                                                        : s.key;
                                                    return keyWithoutPrefix === statusValue;
                                                });
                                                return matchingStatus?.label || statusValue;
                                            })()}
                                        </Text>
                                        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
                                    </View>
                                </View>
                            </TouchableOpacity>


                            {/* Lead Source Selector */}
                            <TouchableOpacity
                                style={styles.leadSection}
                                onPress={() => setShowSourcePicker(true)}
                            >
                                <View style={styles.leadHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <MaterialCommunityIcons name="source-branch" size={20} color={COLORS.primary} />
                                        <Text style={styles.sectionTitle}>Lead Source</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.infoValue, { marginRight: 8, color: COLORS.primary }]}>
                                            {(() => {
                                                const sourceValue = freshContact?.leadSource || freshContact?.lead_source;
                                                if (!sourceValue) return 'Select';
                                                // Find matching source to display its label
                                                const matchingSource = sources.find(s => {
                                                    const keyWithoutPrefix = s.key?.startsWith('source_')
                                                        ? s.key.replace('source_', '')
                                                        : s.key;
                                                    return keyWithoutPrefix === sourceValue;
                                                });
                                                return matchingSource?.label || sourceValue;
                                            })()}
                                        </Text>
                                        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                            {/* Site Visit Selector */}
                            {freshContact?._id && (
                                <TouchableOpacity
                                    style={styles.leadSection}
                                    onPress={() => setShowSiteVisitModal(true)}
                                >
                                    <View style={styles.leadHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <MaterialCommunityIcons name="source-branch" size={20} color={COLORS.primary} />
                                            <Text style={styles.sectionTitle}>Site Visit</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={[styles.infoValue, { marginRight: 8, color: COLORS.primary }]}>
                                                {freshContact?.site_visit_done ? "YES" : "NO"}
                                            </Text>
                                            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}
                            {/* Lead Requirement Section */}
                            <View style={styles.leadSection}>
                                <View style={styles.leadHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={COLORS.primary} />
                                        <Text style={styles.sectionTitle}>Requirement Details</Text>
                                    </View>
                                </View>

                                <View>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>Requirement</Text>
                                        <TextInput
                                            style={[styles.input, styles.multilineInput]}
                                            multiline
                                            numberOfLines={4}
                                            value={localLeadInfo.requirement}
                                            onChangeText={(text) => setLocalLeadInfo({ ...localLeadInfo, requirement: text })}
                                            placeholder="Looking for 3BHK villa in gated community"
                                            placeholderTextColor="#D1D5DB"
                                        />
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>Budget (Optional)</Text>
                                        <TouchableOpacity
                                            style={styles.pickerSelector}
                                            onPress={() => setShowBudgetPicker(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.pickerSelectorText, !localLeadInfo.budget && { color: '#9CA3AF' }]}>
                                                {localLeadInfo.budget || 'Select Budget'}
                                            </Text>
                                            <MaterialIcons name="arrow-drop-down" size={24} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>Preferred Location (Optional)</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={localLeadInfo.location}
                                            onChangeText={(text) => setLocalLeadInfo({ ...localLeadInfo, location: text })}
                                            placeholder="E.g. Whitefield, Bengaluru"
                                            placeholderTextColor="#9CA3AF"
                                        />
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>Timeline (Optional)</Text>
                                        <TouchableOpacity
                                            style={styles.pickerSelector}
                                            onPress={() => setShowTimelinePicker(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.pickerSelectorText, !localLeadInfo.timeline && { color: '#9CA3AF' }]}>
                                                {localLeadInfo.timeline || 'Select Timeline'}
                                            </Text>
                                            <MaterialIcons name="arrow-drop-down" size={24} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Show save button only when fields have been modified to save space, or always. I'll show it always to be explicit. */}
                                    <TouchableOpacity style={[styles.saveButton, { marginTop: 8 }]} onPress={handleSaveLead}>
                                        <Text style={styles.saveButtonText}>Save Details</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Site Visit Information */}
                            {freshContact?.site_visit_done_by && (
                                <View style={styles.siteVisitInfoSection}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                        <MaterialCommunityIcons name="home-city" size={20} color={COLORS.primary} />
                                        <Text style={styles.sectionTitle}>Site Visit Information</Text>
                                    </View>
                                    <View style={styles.siteVisitInfoCard}>
                                        {freshContact.lead_owner && (
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoLabel}>Lead Owner:</Text>
                                                <Text style={styles.infoValue}>
                                                    {typeof freshContact.lead_owner === 'object' ? freshContact.lead_owner.name : freshContact.lead_owner}
                                                </Text>
                                            </View>
                                        )}
                                        {freshContact.project_id && (
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoLabel}>Project:</Text>
                                                <Text style={styles.infoValue}>
                                                  {typeof freshContact.project_id === 'object' ? freshContact.project_id.name : freshContact.project_id}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Site Visit Done By:</Text>
                                            <Text style={styles.infoValue}>
                                                {typeof freshContact.site_visit_done_by === 'object' ? freshContact.site_visit_done_by.name : freshContact.site_visit_done_by}
                                            </Text>
                                        </View>
                                        {freshContact.site_visit_review && (
                                            <View style={styles.reviewRow}>
                                                <Text style={styles.reviewLabel}>Review:</Text>
                                                <Text style={styles.reviewText}>{freshContact.site_visit_review}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Notes Section */}
                            <View style={styles.notesSection}>
                                <Text style={styles.sectionTitle}>Notes</Text>
                                {(!freshContact?.notes || freshContact.notes.length === 0) ? (
                                    <Text style={styles.emptyNotes}>No notes yet.</Text>
                                ) : (
                                    <View>
                                        {freshContact.notes.slice(0, 3).map((note) => (
                                            <View key={note.id || Math.random()} style={styles.noteItem}>
                                                <Text style={styles.noteText}>{note.text}</Text>
                                                <Text style={styles.noteTime}>
                                                    {new Date(note.timestamp).toLocaleString()}
                                                </Text>
                                            </View>
                                        ))}
                                        {freshContact.notes.length > 3 && (
                                            <TouchableOpacity onPress={() => setActiveTab('History')}>
                                                <Text style={{ color: COLORS.primary, textAlign: 'center', marginTop: 8 }}>View All Notes in History</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Add Note */}
                            <View style={styles.addNoteSection}>
                                <TextInput
                                    style={styles.noteInput}
                                    value={newNote}
                                    onChangeText={setNewNote}
                                    placeholder="Add a note..."
                                    multiline
                                    numberOfLines={2}
                                />
                                <TouchableOpacity
                                    style={styles.addNoteButtonContainer}
                                    onPress={handleAddNote}
                                    disabled={!newNote.trim()}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={!newNote.trim() ? ['#E5E7EB', '#D1D5DB'] : [COLORS.gradientStart, COLORS.gradientEnd]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.addNoteGradient}
                                    >
                                        <Text style={[styles.addNoteButtonText, !newNote.trim() && { color: '#9CA3AF' }]}>
                                            Add Note
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    ) : (
                        <View style={styles.content}>
                            {historyItems.length === 0 ? (
                                <View style={styles.emptyHistory}>
                                    <MaterialCommunityIcons name="history" size={48} color="#CCC" />
                                    <Text style={styles.emptyHistoryText}>No history available</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={historyItems}
                                    renderItem={renderHistoryItem}
                                    keyExtractor={(item, index) => index.toString()}
                                    contentContainerStyle={{ paddingVertical: 16 }}
                                />
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* Replacement Reminder Setup Modal */}
            <Modal
                visible={showReminderSetupModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowReminderSetupModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.dialog}>
                        <Text style={styles.dialogTitle}>Set Reminder</Text>

                        <View style={{ width: '100%', marginBottom: 16 }}>
                            <Text style={styles.inputLabel}>Date & Time</Text>
                            {Platform.OS === 'android' ? (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => {
                                            DateTimePickerAndroid.open({
                                                value: callScheduleDate,
                                                mode: 'date',
                                                minimumDate: new Date(),
                                                onChange: (_, date) => {
                                                    if (date) {
                                                        const newDate = new Date(callScheduleDate);
                                                        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                                        setCallScheduleDate(newDate);
                                                    }
                                                }
                                            });
                                        }}
                                    >
                                        <Text style={styles.dateButtonText}>{callScheduleDate.toLocaleDateString()}</Text>
                                        <MaterialCommunityIcons name="calendar-today" size={20} color={COLORS.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => {
                                            DateTimePickerAndroid.open({
                                                value: callScheduleDate,
                                                mode: 'time',
                                                is24Hour: false,
                                                onChange: (_, date) => {
                                                    if (date) {
                                                        const newDate = new Date(callScheduleDate);
                                                        newDate.setHours(date.getHours(), date.getMinutes());
                                                        setCallScheduleDate(newDate);
                                                    }
                                                }
                                            });
                                        }}
                                    >
                                        <Text style={styles.dateButtonText}>{callScheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                        <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <DateTimePicker
                                    value={callScheduleDate}
                                    mode="datetime"
                                    display="spinner"
                                    onChange={(event, date) => date && setCallScheduleDate(date)}
                                    minimumDate={new Date()}
                                    style={{ height: 120, width: '100%' }}
                                />
                            )}
                        </View>

                        <View style={{ width: '100%', marginBottom: 24 }}>
                            <Text style={styles.inputLabel}>Reason</Text>
                            <TextInput
                                style={[styles.textInput, { height: 80 }]}
                                placeholder="Why do you want to be reminded?"
                                value={reminderReason}
                                onChangeText={setReminderReason}
                                multiline
                            />
                        </View>

                        <View style={styles.dialogActions}>
                            <TouchableOpacity
                                style={[styles.actionButtonOutline, { flex: 1 }]}
                                onPress={() => setShowReminderSetupModal(false)}
                            >
                                <Text style={styles.actionButtonOutlineText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButtonPrimary, { flex: 1 }]}
                                onPress={() => scheduleReminder(callScheduleDate, reminderReason)}
                            >
                                <Text style={styles.actionButtonPrimaryText}>Set Reminder</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
   <Modal
                visible={showSiteVisitModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSiteVisitModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.dialog}>
                        <Text style={styles.dialogTitle}>Set Site Visit</Text>

                   <View style={{ width: '100%', marginBottom: 16 }}>
    <Text style={styles.inputLabel}>Date & Time</Text>
    <Text>
        {new Date().toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(',', ' -')}
    </Text>
</View>

                        <View style={{ width: '100%', marginBottom: 24 }}>
                            <Text style={styles.inputLabel}>Site Visit Done</Text>
                         <Picker
            selectedValue={siteVisitDone}
            onValueChange={(itemValue) => setSiteVisitDone(itemValue)}
        >
            <Picker.Item label="Select Option" value={null} />
            <Picker.Item label="Yes" value="true" />
            <Picker.Item label="No" value="false" />
        </Picker>
                        </View>

                        <View style={{ width: '100%', marginBottom: 24 }}>
                            <Text style={styles.inputLabel}>REVIEW NOTES</Text>
                            <TextInput
                                style={[styles.textInput, { height: 80 }]}
                                placeholder="What is the review notes?"
                                value={siteVisitNote}
                                onChangeText={setSiteVisitNote}
                                multiline
                            />
                        </View>

                        <View style={styles.dialogActions}>
                            <TouchableOpacity
                                style={[styles.actionButtonOutline, { flex: 1 }]}
                                onPress={() => setShowSiteVisitModal(false)}
                            >
                                <Text style={styles.actionButtonOutlineText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButtonPrimary, { flex: 1 }]}
                                onPress={updateSiteVisit}
                            >
                                <Text style={styles.actionButtonPrimaryText}>Update Site Visit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <TransferLeadModal
                visible={isTransferModalVisible}
                onClose={() => setIsTransferModalVisible(false)}
                onTransfer={handleTransfer}
                teamMembers={teamMembers}
            />

            {/* Source Picker */}
            <StatusPicker
                visible={showSourcePicker}
                onClose={() => setShowSourcePicker(false)}
                title="Select Lead Source"
                options={sources.map(s => ({
                    label: s.label,
                    value: s.key
                }))}
                selectedValue={(() => {
                    const sourceValue = freshContact?.leadSource || freshContact?.lead_source;
                    const matchingSource = sources.find(s => {
                        const keyWithoutPrefix = s.key?.startsWith('source_') ? s.key.replace('source_', '') : s.key;
                        return keyWithoutPrefix === sourceValue;
                    });
                    return matchingSource?.key;
                })()}
                onSelect={handleUpdateSource}
            />

            {/* Status Picker */}
            <StatusPicker
                visible={showStatusPicker}
                onClose={() => setShowStatusPicker(false)}
                title="Update Lead Status"
                options={statuses.map(s => ({
                    label: s.label,
                    value: s.label  // Use label as value, not key
                }))}
                selectedValue={(() => {
                    const statusValue = freshContact?.status;
                    const matchingStatus = statuses.find(s => {
                        const keyWithoutPrefix = s.key?.startsWith('status_') ? s.key.replace('status_', '') : s.key;
                        return keyWithoutPrefix === statusValue;
                    });
                    return matchingStatus?.key;
                })()}
                onSelect={handleStatusSelect}
            />

            {/* Status Note Modal */}
            <Modal
                visible={showStatusNoteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowStatusNoteModal(false)}
            >
                <View style={styles.statusModalOverlay}>
                    <View style={styles.statusModalContent}>
                        <Text style={styles.statusModalTitle}>Add Note (Optional)</Text>
                        <Text style={styles.statusModalSubtitle}>
                            Adding a note to this status change helps track the lead journey.
                        </Text>
                        <TextInput
                            style={styles.statusNoteInput}
                            multiline
                            numberOfLines={3}
                            placeholder="Reason for change or additional details..."
                            value={statusNote}
                            onChangeText={setStatusNote}
                        />
                        <View style={styles.statusModalButtons}>
                            <TouchableOpacity
                                style={styles.statusModalCancel}
                                onPress={() => setShowStatusNoteModal(false)}
                            >
                                <Text style={styles.statusModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.statusModalConfirm}
                                onPress={handleConfirmStatus}
                            >
                                <Text style={styles.statusModalConfirmText}>Update Status</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* BUDGET & TIMELINE PICKERS */}
            <StatusPicker
                visible={showBudgetPicker}
                onClose={() => setShowBudgetPicker(false)}
                options={BUDGET_OPTIONS}
                selectedValue={localLeadInfo.budget}
                onSelect={(val) => setLocalLeadInfo({ ...localLeadInfo, budget: val })}
                title="Select Budget"
            />

            <StatusPicker
                visible={showTimelinePicker}
                onClose={() => setShowTimelinePicker(false)}
                options={TIMELINE_OPTIONS}
                selectedValue={localLeadInfo.timeline}
                onSelect={(val) => setLocalLeadInfo({ ...localLeadInfo, timeline: val })}
                title="Select Timeline"
            />


        </Modal>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        paddingHorizontal: 20,
        marginBottom: 10
    },
    tabContainer: {
        flexDirection: 'row',
        marginTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: COLORS.primaryPurple,
    },
    tabText: {
        fontFamily: 'SF Pro Display',
        fontSize: 14,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    activeTabText: {
        color: COLORS.primaryPurple,
    },
    // History Styles
    historyItem: {
        flexDirection: 'row',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    historyIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historyContent: {
        flex: 1,
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 12,
        minHeight: 60, // Maintain uniform height
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    historyTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    historyDate: {
        fontSize: 11,
        color: '#999',
        marginLeft: 8,
    },
    historySubtitle: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    historyUser: {
        fontSize: 11,
        color: '#0288D1',
        marginBottom: 4,
    },
    historyNoteContainer: {
        marginTop: 6,
        padding: 8,
        backgroundColor: '#FFF',
        borderRadius: 8,
        borderLeftWidth: 2,
        borderLeftColor: '#DDD',
    },
    historyNoteText: {
        fontSize: 13,
        color: '#555',
        fontStyle: 'italic',
    },
    emptyHistory: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyHistoryText: {
        marginTop: 10,
        color: '#999',
        fontSize: 16,
    },
    // Status Modal Styles
    statusModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    statusModalContent: {
        backgroundColor: '#FFF',
        width: '100%',
        maxWidth: 340,
        borderRadius: 16,
        padding: 24,
    },
    statusModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        color: '#333',
        textAlign: 'center',
    },
    statusModalSubtitle: {
        fontSize: 13,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    statusNoteInput: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 16,
        minHeight: 100,
        textAlignVertical: 'top',
        fontSize: 15,
        marginBottom: 20,
    },
    statusModalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    statusModalCancel: {
        flex: 1,
        padding: 14,
        borderRadius: 10,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
    },
    statusModalConfirm: {
        flex: 1,
        padding: 14,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    statusModalCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#666',
    },
    statusModalConfirmText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },

    // Existing styles below (overlay, backdrop, etc already exist but we need to keep them or merge)
    // Existing styles below (overlay, backdrop, etc already exist but we need to keep them or merge)
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(247, 245, 255, 0.90)', // Soft purple tint #F7F5FF backdrop
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%', // Fixed height to prevent jumping
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        shadowColor: '#8a79d6',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    content: {
        flex: 1, // Fill available space
        paddingHorizontal: 20,
    },
    contactInfo: {
        paddingVertical: 10, // Reduced top padding
    },
    contactName: {
        fontFamily: 'SF Pro Display',
        fontSize: 22,
        fontWeight: '600',
        color: '#111827',
    },
    contactPhone: {
        fontFamily: 'SF Pro Display',
        fontSize: 15,
        fontWeight: '500',
        color: '#6B7280',
        marginTop: 4,
    },
    contactNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    siteVisitBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E1F5FE',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    siteVisitBadgeText: {
        fontFamily: 'SF Pro Display',
        fontSize: 12,
        color: '#0288D1',
        fontWeight: '600',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 20,
    },
    actionButton: {
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionLabel: {
        fontFamily: 'SF Pro Display',
        fontSize: 12,
        fontWeight: '500',
        color: '#4B5563',
    },
    notesSection: {
        marginTop: 4,
    },
    sectionTitle: {
        fontFamily: 'SF Pro Display',
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    emptyNotes: {
        fontFamily: 'SF Pro Display',
        fontSize: 14,
        color: '#9CA3AF',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 20,
    },
    noteItem: {
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 14,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primaryPurple,
        shadowColor: '#8a79d6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    noteText: {
        fontFamily: 'SF Pro Display',
        fontSize: 14,
        fontWeight: '400',
        color: '#111827',
        marginBottom: 4,
    },
    noteTime: {
        fontFamily: 'SF Pro Display',
        fontSize: 12,
        color: '#9CA3AF',
    },
    addNoteSection: {
        marginTop: 12,
        marginBottom: 20,
    },
    noteInput: {
        fontFamily: 'SF Pro Display',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        padding: 16,
        fontSize: 14,
        minHeight: 60,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    addNoteButtonContainer: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    addNoteGradient: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
    },
    addNoteButtonDisabled: {
        backgroundColor: '#CCC', // Overridden by gradient colors prop
    },
    addNoteButtonText: {
        fontFamily: 'SF Pro Display',
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // iosPickerContainer styles removed as they referenced React Native Picker which is not used
    // StatusPicker uses its own modal

    leadSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#8a79d6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    leadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    editButton: {
        fontFamily: 'SF Pro Display',
        color: COLORS.primaryPurple,
        fontSize: 14,
        fontWeight: '600',
    },
    leadInput: {
        fontFamily: 'SF Pro Display',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        padding: 16,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    textInput: {
        fontFamily: 'SF Pro Display',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        padding: 16,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    leadDescText: {
        fontFamily: 'SF Pro Display',
        fontSize: 14,
        fontWeight: '400',
        color: '#6B7280',
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontFamily: 'SF Pro Display',
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: '#111827',
        fontFamily: 'SF Pro Display',
    },
    pickerSelector: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pickerSelectorText: {
        fontSize: 14,
        color: '#111827',
        fontFamily: 'SF Pro Display',
    },
    multilineInput: {
        height: 100,
        paddingTop: 12,
        textAlignVertical: 'top',
    },

    // Dialog / Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        paddingHorizontal: SPACING.lg
    },
    dialog: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10
    },
    dialogTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 20
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
        alignSelf: 'flex-start'
    },
    dateButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EEE'
    },
    dateButtonText: {
        fontSize: 14,
        color: COLORS.text
    },
    dialogActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    actionButtonOutline: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DDD',
        alignItems: 'center',
        justifyContent: 'center'
    },
    actionButtonOutlineText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        fontWeight: '600'
    },
    actionButtonPrimary: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center'
    },
    actionButtonPrimaryText: {
        fontSize: 16,
        color: '#FFF',
        fontWeight: '600'
    },

    saveButton: {
        backgroundColor: COLORS.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    siteVisitInfoSection: {
        marginTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    siteVisitInfoCard: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#0288D1',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1C1C1E',
    },
    reviewRow: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    reviewLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 6,
    },
    reviewText: {
        fontSize: 14,
        color: '#1C1C1E',
        lineHeight: 20,
    },
    notesScrollView: {
        maxHeight: 200,
    },
    emptyNotes: {
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic',
    },
    noteItem: {
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    noteText: {
        fontSize: 14,
        color: '#1C1C1E',
        marginBottom: 4,
    },
    noteTime: {
        fontSize: 12,
        color: '#999',
    },
    addNoteSection: {
        marginTop: 20,
        marginBottom: 20,
    },
    noteInput: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 60,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    addNoteButton: {
        backgroundColor: COLORS.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    addNoteButtonDisabled: {
        backgroundColor: '#CCC',
    },
    addNoteButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Call Log Note Styles
    callNoteContainer: {
        marginTop: 8,
        backgroundColor: '#FAFBFC',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    notesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    notesLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
    },
    editNoteBtn: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: COLORS.primary + '15',
    },
    editNoteBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
    historyNoteText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    notesInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#111827',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    historyNoteContainer: {
        marginTop: 4,
        padding: 8,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
    },
});

export default QuickActionsSheet;
