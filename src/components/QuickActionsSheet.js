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
    FlatList,
    ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { openWhatsApp, sendSMS, sendEmail } from '../utils/intents';
import { useDispatch, useSelector } from 'react-redux';
import { updateLead, removeLead, fetchLeadDetails, clearLeadDetails, ensureLead } from '../store/slices/leadSlice';
import { fetchTeamMembers } from '../store/slices/teamSlice';
import axiosClient from '../api/axiosClient';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { schedulePushNotification } from '../utils/NotificationService';
import * as Notifications from 'expo-notifications';
import TransferLeadModal from './TransferLeadModal';
import StatusPicker from './StatusPicker';
import CallLogService from '../services/CallLogService';

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

const QuickActionsSheet = ({ visible, contact, onClose, onCall, campaignId, campaignName }) => {
    // console.log('🟢 QuickActionsSheet render - visible:', visible, 'contact:', contact?.name || contact?.phone);
    
    const dispatch = useDispatch();
    
    // Get fresh contact data from Redux list
    const leads = useSelector(state => state.leads.leads);
    // Also get detailed info (history)
    const detailedContact = useSelector(state => state.leads.currentLeadDetails);
    
    // Merge contact info: detailed takes precedence, then list item, then prop
    const listContact = contact ? leads.find(l => (l._id || l.id) === (contact._id || contact.id)) : null;
    const freshContact = detailedContact || listContact || contact;

    const { sources, statuses } = useSelector(state => state.config);
    const allTeamMembers = useSelector(state => state.team.members);
    
    const { user } = useSelector(state => state.auth);
    
    const teamMembers = allTeamMembers.filter(member => {
        const isNotAdmin = member.role !== 'admin';
        
        // Resolve IDs to ensure we compare correctly even if one has _id and other has id
        const memberId = member._id || member.id;
        const userId = user ? (user._id || user.id) : null;
        
        const isNotSelf = userId ? (memberId !== userId) : true;
        
        return isNotAdmin && isNotSelf;
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
        remark: '',
    });

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
            setLocalLeadInfo({
                requirement: freshContact.requirement || '',
                remark: freshContact.remark || '',
            });
        }
    }, [visible, freshContact]);

    const handleAddNote = async () => {
        if (newNote.trim() && freshContact) {
            try {
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
                    data: { requirement: localLeadInfo.requirement } 
                })).unwrap();
                setIsEditingLead(false);
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

        // Call Logs
        if (freshContact.call_logs) {
            freshContact.call_logs.forEach(item => {
                items.push({
                    type: 'call',
                    date: new Date(item.date || item.timestamp), // Handle both formats
                    title: `${item.type || 'Call'} - ${item.status}`,
                    subtitle: `Duration: ${item.duration}`,
                    note: item.notes,
                    icon: 'phone',
                    color: item.status === 'Missed' ? '#F44336' : '#4CAF50'
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


    // Rendering Helper for History
    const renderHistoryItem = ({ item }) => {
        // Robust user name resolution
        const getUserName = (u) => u ? (u.name || u.email || u.role || 'Unknown') : 'Unknown';
        
        const isTransfer = item.type === 'transfer';
        const isStatus = item.type === 'status';

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
                    {item.note && (
                        <View style={styles.historyNoteContainer}>
                            {isTransfer && <Text style={{fontSize:12, fontWeight:'600', color: '#555'}}>Reason:</Text>}
                            <Text style={styles.historyNoteText}>{item.note}</Text>
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
                                    onPress={() => freshContact?.phone && openWhatsApp(freshContact.phone)}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                                        <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
                                    </View>
                                    <Text style={styles.actionLabel}>WhatsApp</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => freshContact?.phone && sendSMS(freshContact.phone)}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                                        <MaterialCommunityIcons name="message-text" size={24} color="#007AFF" />
                                    </View>
                                    <Text style={styles.actionLabel}>Message</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => sendEmail(freshContact?.email || '')}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
                                        <MaterialCommunityIcons name="email" size={24} color="#F44336" />
                                    </View>
                                    <Text style={styles.actionLabel}>Mail</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => setIsTransferModalVisible(true)}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                                        <MaterialCommunityIcons name="account-arrow-right" size={24} color="#FF9800" />
                                    </View>
                                    <Text style={styles.actionLabel}>Transfer</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleRemindPress}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                                        <MaterialCommunityIcons name="bell-outline" size={24} color="#9C27B0" />
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
                                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
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
                                     <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
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

                            {/* Lead Requirement Section */}
                            <View style={styles.leadSection}>
                                <View style={styles.leadHeader}>
                                    <Text style={styles.sectionTitle}>Lead Requirement</Text>
                                    <TouchableOpacity onPress={() => setIsEditingLead(!isEditingLead)}>
                                        <Text style={styles.editButton}>{isEditingLead ? 'Cancel' : 'Edit'}</Text>
                                    </TouchableOpacity>
                                </View>

                                {isEditingLead ? (
                                    <View>
                                        <TextInput
                                            style={styles.textInput}
                                            multiline
                                            numberOfLines={3}
                                            value={localLeadInfo.requirement}
                                            onChangeText={(text) => setLocalLeadInfo({ ...localLeadInfo, requirement: text })}
                                            placeholder="Add lead description..."
                                        />
                                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveLead}>
                                            <Text style={styles.saveButtonText}>Save</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <Text style={styles.leadDescText}>
                                        {localLeadInfo.requirement || 'No lead description added yet. Tap Edit to add.'}
                                    </Text>
                                )}
                            </View>

                            {/* Site Visit Information */}
                            {freshContact?.site_visit_done_by && (
                                <View style={styles.siteVisitInfoSection}>
                                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12}}>
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
                                                <Text style={{color: COLORS.primary, textAlign: 'center', marginTop: 8}}>View All Notes in History</Text>
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
                                    style={[styles.addNoteButton, !newNote.trim() && styles.addNoteButtonDisabled]}
                                    onPress={handleAddNote}
                                    disabled={!newNote.trim()}
                                >
                                    <Text style={styles.addNoteButtonText}>Add Note</Text>
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
                                        <Text style={styles.dateButtonText}>{callScheduleDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
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
                                style={[styles.actionButtonOutline, {flex:1}]} 
                                onPress={() => setShowReminderSetupModal(false)}
                            >
                                <Text style={styles.actionButtonOutlineText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionButtonPrimary, {flex:1}]} 
                                onPress={() => scheduleReminder(callScheduleDate, reminderReason)}
                            >
                                <Text style={styles.actionButtonPrimaryText}>Set Reminder</Text>
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
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#999',
    },
    activeTabText: {
        color: COLORS.primary,
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
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
    },
    sheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '80%', // Fixed height to prevent jumping
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#DDD',
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
        // borderBottomWidth: 1, // Moved to header
        // borderBottomColor: '#EEE',
    },
    contactName: {
        fontSize: 22, // Slightly smaller to fit header
        fontWeight: 'bold',
        color: '#000',
    },
    contactPhone: {
        fontSize: 16,
        color: '#666',
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
        fontSize: 12,
        color: '#0288D1',
        fontWeight: '600',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
    },
    actionButton: {
        alignItems: 'center',
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
        fontSize: 12,
        color: '#666',
    },
    notesSection: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        // marginBottom: 12, // Handled in header rows
    },
    emptyNotes: {
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 20,
    },
    noteItem: {
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    noteText: {
        fontSize: 14,
        color: '#000',
        marginBottom: 4,
    },
    noteTime: {
        fontSize: 12,
        color: '#666',
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
    },
    addNoteButton: {
        backgroundColor: COLORS.primary,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12,
    },
    addNoteButtonDisabled: {
        backgroundColor: '#CCC',
    },
    addNoteButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // iosPickerContainer styles removed as they referenced React Native Picker which is not used
    // StatusPicker uses its own modal
    
    leadSection: {
        marginTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    leadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    editButton: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    leadInput: { // Removed separate input style, reusing textInput
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    textInput: {
         borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 12,
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
});

export default QuickActionsSheet;
