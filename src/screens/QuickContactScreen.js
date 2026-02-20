import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,

    Platform,
    Linking,
    Alert,
    Image,
    TextInput,
    StatusBar,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import TransferLeadModal from '../components/TransferLeadModal';
import { useDispatch, useSelector } from 'react-redux';
import { updateLead, fetchLeadDetails, clearLeadDetails, checkLeadByPhone, createLead } from '../store/slices/leadSlice';
import defaultAvatar from '../assets/default_avatar.jpg';
import { fetchTeamMembers } from '../store/slices/teamSlice';
import CallLogService from '../services/CallLogService';

const QuickContactScreen = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { contact: initialContact, campaignId, campaignName } = route.params;
    const dispatch = useDispatch();
    const leads = useSelector(state => state.leads.leads);
    const currentLeadDetails = useSelector(state => state.leads.currentLeadDetails);
    const allTeamMembers = useSelector(state => state.team.members);
    const { statuses } = useSelector(state => state.config);

    // Filter out admin users from team members
    const { user } = useSelector(state => state.auth);

    // Filter out admin users AND current user from team members
    const teamMembers = allTeamMembers.filter(member => {
        const isNotAdmin = member.role !== 'admin';
        const memberId = member._id || member.id;
        const userId = user ? (user._id || user.id) : null;
        return isNotAdmin && (userId ? memberId !== userId : true);
    });
    // Find contact in Redux store
    const listContact = campaignId
        ? leads.find(l => l.id === initialContact?.id && l.campaign_id === campaignId) || initialContact
        : leads.find(l => l.id === initialContact?.id) || initialContact;

    // Use detailed contact if available and matching ID, otherwise fallback to list contact
    const contact = (currentLeadDetails && (currentLeadDetails._id === listContact?.id || currentLeadDetails._id === listContact?._id))
        ? currentLeadDetails
        : listContact;

    const [showTransferModal, setShowTransferModal] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteValue, setEditingNoteValue] = useState('');
    const [showHint, setShowHint] = useState(true);

    // Collapsible states
    const [expandStatus, setExpandStatus] = useState(false);
    const [expandTransfers, setExpandTransfers] = useState(false);
    const [localDeviceLogs, setLocalDeviceLogs] = useState([]);


    useEffect(() => {
        dispatch(fetchTeamMembers());

        if (initialContact?._source === 'log' && initialContact?.phone) {
            // Fetch local logs for device log contact
            CallLogService.getLogsForNumber(initialContact.phone, 500)
                .then(logs => {
                    const mappedLogs = logs.map(log => ({
                        id: log.timestamp,
                        date: new Date(parseInt(log.timestamp)).toISOString(),
                        status: log.type === 'MISSED' || log.type === '3' ? 'Missed' : (log.type === 'INCOMING' || log.type === '1' ? 'Received' : 'Dialed'),
                        duration: log.duration + 's',
                        notes: 'Local Device Log',
                        type: 'Call',
                        agentName: 'System'
                    }));
                    setLocalDeviceLogs(mappedLogs);
                })
                .catch(err => console.error('QuickContactScreen: Failed to fetch local logs', err));
        } else if (initialContact?.id || initialContact?._id) {
            dispatch(fetchLeadDetails(initialContact.id || initialContact._id));
        }

        return () => {
            dispatch(clearLeadDetails());
            setLocalDeviceLogs([]);
        }
    }, [dispatch, initialContact]);
    const handleWhatsApp = () => {
        const url = `whatsapp://send?phone=${contact.phone}`;
        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert("Error", "WhatsApp is not installed");
            }
        });
    };

    const handleMessage = () => {
        const url = `sms:${contact.phone}`;
        Linking.openURL(url);
    };

    const handleEmail = () => {
        if (contact.email) {
            Linking.openURL(`mailto:${contact.email}`);
        } else {
            Alert.alert("Not Available", "No email address found for this contact");
        }
    };

    const handleTransferLead = () => {
        setShowTransferModal(true);
    };


    const handleActualTransfer = async (member, reason) => {
        try {
            // Check if member has ID
            if (member._id) {
                await dispatch(updateLead({
                    id: contact.id || contact._id,
                    data: {
                        assigned_to: member.id,
                        reason: reason // Pass reason to backend
                    }
                })).unwrap();
                setShowTransferModal(false);
                Alert.alert("Success", `Lead transferred to ${member.name}`);
                navigation.goBack(); // Go back after transfer?
            } else {
                Alert.alert("Error", "Invalid team member selected");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to transfer lead");
        }
    };

    const handleStartEditingNote = (log) => {
        setEditingNoteId(log.id);
        setEditingNoteValue(log.notes || '');
    };

    const handleSaveNote = async () => {
        if (editingNoteId && contact) {
            const existingLogs = contact.callLogs || contact.call_logs || [];
            const updatedLogs = existingLogs.map(log =>
                log.id === editingNoteId ? { ...log, notes: editingNoteValue } : log
            );

            try {
                await dispatch(updateLead({
                    id: contact.id || contact._id,
                    data: { call_logs: updatedLogs }
                })).unwrap();
                setEditingNoteId(null);
                setEditingNoteValue('');
            } catch (error) {
                Alert.alert("Error", "Failed to update note");
            }
        }
    };

    const handleAccessInfo = () => {
        Alert.alert(
            "Access Contacts",
            "This app would like to access your contacts and message logs to show relevant history.",
            [
                { text: "Don't Allow", style: "cancel" },
                {
                    text: "Allow", onPress: () => {
                        setShowHint(false);
                        Alert.alert("Permission Granted", "Syncing contact info...");
                    }
                }
            ]
        );
    };

    const handleAddLead = async () => {
        if (!contact) return;

        try {
            // 1. Check if lead exists by phone for this tenant
            const checkResult = await dispatch(checkLeadByPhone(contact.phone)).unwrap();

            if (checkResult.exists) {
                // If lead exists, navigate to the correct list and open it
                if (campaignId) {
                    navigation.navigate('CampaignLeads', {
                        campaignId,
                        campaignName,
                        openContactDetail: checkResult.lead.id
                    });
                } else {
                    navigation.navigate('Home', {
                        openContactDetail: checkResult.lead.id
                    });
                }
            } else {
                // 2. Create new lead if it doesn't exist
                const newLead = await dispatch(createLead({
                    name: contact.name || 'New Lead',
                    phone: contact.phone,
                    lead_source: campaignName || 'Quick Add',
                    status: 'New'
                })).unwrap();

                Alert.alert("Success", "Lead created successfully");

                // 3. Navigate after creation
                if (campaignId) {
                    navigation.navigate('CampaignLeads', {
                        campaignId,
                        campaignName,
                        openContactDetail: newLead.id
                    });
                } else {
                    navigation.navigate('Home', {
                        openContactDetail: newLead.id
                    });
                }
            }
        } catch (error) {
            Alert.alert("Error", typeof error === 'string' ? error : "Failed to add lead");
        }
    };


    const formatLogDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#444" />
                </TouchableOpacity>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={handleAddLead}
                    >
                        <MaterialIcons name="person-add-alt" size={24} color="#444" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: Math.max(insets.bottom, 20) }
                ]}
            >
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={contact.photo ? { uri: contact.photo } : defaultAvatar}
                            style={styles.avatar}
                        />
                    </View>
                    <Text style={styles.mainNumber}>{contact.phone}</Text>
                </View>

                {/* Actions Row */}
                <View style={styles.actionsRow}>
                    <View style={styles.actionItem}>
                        <TouchableOpacity style={styles.actionCircle} onPress={handleWhatsApp}>
                            <MaterialCommunityIcons name="whatsapp" size={24} color="#075E54" />
                        </TouchableOpacity>
                        <Text style={styles.actionLabel}>WhatsApp</Text>
                    </View>
                    <View style={styles.actionItem}>
                        <TouchableOpacity style={styles.actionCircle} onPress={handleMessage}>
                            <MaterialIcons name="chat-bubble-outline" size={24} color="#1C1C1E" />
                        </TouchableOpacity>
                        <Text style={styles.actionLabel}>Message</Text>
                    </View>
                    <View style={styles.actionItem}>
                        <TouchableOpacity style={styles.actionCircle} onPress={handleEmail}>
                            <MaterialCommunityIcons name="email-outline" size={24} color="#1C1C1E" />
                        </TouchableOpacity>
                        <Text style={styles.actionLabel}>Mail</Text>
                    </View>
                    <View style={styles.actionItem}>
                        <TouchableOpacity style={styles.actionCircle} onPress={handleTransferLead}>
                            <MaterialCommunityIcons name="account-arrow-right-outline" size={26} color="#1C1C1E" />
                        </TouchableOpacity>
                        <Text style={styles.actionLabel}>Transfer</Text>
                    </View>
                </View>

                {/* Phone Info Card */}
                <View style={styles.card}>
                    <View style={styles.cardRow}>
                        <MaterialCommunityIcons name="phone-outline" size={24} color="#444" />
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardText}>{contact.phone}</Text>
                        </View>
                        <View style={styles.cardRightIcons}>
                            <TouchableOpacity style={styles.cardIconBtn} onPress={handleMessage}>
                                <MaterialIcons name="chat-bubble-outline" size={22} color="#444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.sectionHeaderContainer}>
                    <Text style={styles.sectionTitle}>Recent activity</Text>
                </View>

                {/* Status History Collapsible */}
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.collapsibleHeader}
                        onPress={() => setExpandStatus(!expandStatus)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="progress-clock" size={22} color="#444" />
                            <Text style={[styles.cardText, { marginLeft: 10, fontWeight: '500' }]}>Status History</Text>
                        </View>
                        <MaterialIcons name={expandStatus ? "expand-less" : "expand-more"} size={24} color="#666" />
                    </TouchableOpacity>

                    {expandStatus && (
                        <View style={styles.historyList}>
                            {contact.status_history && contact.status_history.length > 0 ? (
                                contact.status_history.slice().reverse().map((item, index) => {
                                    // Robust matching against config statuses
                                    const statusKey = item.status?.toString();
                                    const matchingStatus = statuses.find(s => {
                                        // Handle potential 'status_' prefix in config keys or direct match
                                        const cleanKey = s?.label;
                                        return cleanKey?.toLowerCase() === statusKey?.toLowerCase() || s.label?.toLowerCase() === statusKey?.toLowerCase();
                                    });

                                    const displayStatus = matchingStatus ? matchingStatus.label : item.status;
                                    const displayColor = matchingStatus?.color || COLORS.primary;

                                    return (
                                        <View key={index} style={styles.historyItem}>
                                            <View style={styles.historyTimeline}>
                                                <View style={[styles.timelineDot, { backgroundColor: displayColor }]} />
                                                {index < contact.status_history.length - 1 && <View style={styles.timelineLine} />}
                                            </View>
                                            <View style={styles.historyContent}>
                                                <Text style={styles.historyTitle}>
                                                    Changed to <Text style={{ fontWeight: '700', color: displayColor }}>{displayStatus}</Text>
                                                </Text>
                                                <Text style={styles.historySub}>
                                                    {(() => {
                                                        const user = item.changed_by;
                                                        const name = user ? (user.name || user.email || user.role || 'Unknown') : '';
                                                        return name ? `by ${name}` : '';
                                                    })()} • {formatLogDate(item.changed_at)}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })
                            ) : (
                                <Text style={styles.emptyText}>No status changes recorded</Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Transfer History Collapsible */}
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.collapsibleHeader}
                        onPress={() => setExpandTransfers(!expandTransfers)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="account-switch-outline" size={22} color="#444" />
                            <Text style={[styles.cardText, { marginLeft: 10, fontWeight: '500' }]}>Transfer History</Text>
                        </View>
                        <MaterialIcons name={expandTransfers ? "expand-less" : "expand-more"} size={24} color="#666" />
                    </TouchableOpacity>

                    {expandTransfers && (
                        <View style={styles.historyList}>
                            {contact.transfer_history && contact.transfer_history.length > 0 ? (
                                contact.transfer_history.slice().reverse().map((item, index) => (
                                    <View key={index} style={styles.historyItem}>
                                        <View style={styles.historyTimeline}>
                                            <View style={[styles.timelineDot, { backgroundColor: '#FF9500' }]} />
                                            {index < contact.transfer_history.length - 1 && <View style={styles.timelineLine} />}
                                        </View>
                                        <View style={styles.historyContent}>
                                            <Text style={styles.historyTitle}>
                                                Transferred to <Text style={{ fontWeight: '700' }}>
                                                    {(() => {
                                                        const user = item.transferred_to;
                                                        return user ? (user.name || user.email || user.role || 'Unknown') : 'Unknown';
                                                    })()}
                                                </Text>
                                            </Text>
                                            <Text style={styles.historySub}>
                                                by {(() => {
                                                    const user = item.transferred_by;
                                                    return user ? (user.name || user.email || user.role || 'Unknown') : 'Unknown';
                                                })()} • {formatLogDate(item.transferred_at)}
                                            </Text>
                                            {item.reason ? (
                                                <Text style={styles.historyNote}>Reason: {item.reason}</Text>
                                            ) : null}
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No transfers recorded</Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Call Logs */}
                <View style={styles.card}>
                    <View style={styles.collapsibleHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="phone-log-outline" size={22} color="#444" />
                            <Text style={[styles.cardText, { marginLeft: 10, fontWeight: '500' }]}>Call Logs</Text>
                        </View>
                    </View>
                    <View style={styles.historyList}>
                        {((contact?._source === 'log' ? localDeviceLogs : (contact.call_logs || contact.callLogs)) || []).length > 0 ? (
                            (contact?._source === 'log' ? localDeviceLogs : (contact.call_logs || contact.callLogs)).slice().reverse().map((log, idx) => (
                                <View key={log.id || idx} style={[styles.logItemContainer, idx > 0 && styles.logBorder]}>
                                    <View style={styles.logMainRow}>
                                        <MaterialIcons
                                            name={log.type === 'Outbound' ? 'call-made' : (log.status === 'Missed' ? 'call-missed' : 'call-received')}
                                            size={20}
                                            color={log.status === 'Missed' ? '#FF3B30' : "#666"}
                                        />
                                        <View style={styles.logInfo}>
                                            <Text style={styles.logTitle}>{log.status === 'Missed' ? 'Missed Call' : (log.type || 'Call')}</Text>
                                            <Text style={styles.logSub}>{log.agentName || 'System'} • {log.duration}</Text>
                                        </View>
                                        <Text style={styles.logDate}>{formatLogDate(log.date || log.timestamp)}</Text>
                                    </View>

                                    {contact?._source !== 'log' && (
                                        <TouchableOpacity
                                            style={styles.notesSection}
                                            onPress={() => handleStartEditingNote(log)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.notesHeader}>
                                                <Text style={styles.notesLabel}>Notes:</Text>
                                                {editingNoteId === log.id && (
                                                    <TouchableOpacity onPress={handleSaveNote}>
                                                        <Text style={styles.saveBtnText}>Save</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            {editingNoteId === log.id ? (
                                                <TextInput
                                                    style={styles.notesInput}
                                                    value={editingNoteValue}
                                                    onChangeText={setEditingNoteValue}
                                                    placeholder="Write a note..."
                                                    multiline
                                                    autoFocus
                                                    onBlur={handleSaveNote}
                                                />
                                            ) : (
                                                <Text style={styles.notesText}>{log.notes || 'Tap to add notes...'}</Text>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyActivity}>
                                <Text style={styles.emptyText}>No call logs found</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Access Messages Hint */}
                {showHint && (
                    <View style={styles.hintBox}>
                        <Text style={styles.hintText}>
                            To view messages from your contacts, <Text onPress={handleAccessInfo} style={styles.linkText}>allow this app to access that info</Text>
                        </Text>
                        <TouchableOpacity style={styles.hintClose} onPress={() => setShowHint(false)}>
                            <MaterialIcons name="close" size={18} color="#444" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Modals */}
            <TransferLeadModal
                visible={showTransferModal}
                onClose={() => setShowTransferModal(false)}
                onTransfer={handleActualTransfer}
                teamMembers={teamMembers}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: COLORS.background,
    },
    headerRight: {
        flexDirection: 'row',
    },
    headerBtn: {
        padding: 8,
        marginLeft: 8,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 25,
        marginTop: 10,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: 'hidden',
        marginBottom: 15,
        backgroundColor: '#F0F0F0',
        ...SHADOWS.small,
    },
    avatar: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    mainNumber: {
        fontSize: 28,
        fontWeight: '600',
        color: '#1C1C1E',
        letterSpacing: 0.5,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 25,
    },
    actionItem: {
        alignItems: 'center',
    },
    actionCircle: {
        width: 65,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#DCE4F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionLabel: {
        fontSize: 12,
        color: '#1C1C1E',
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1,
        marginLeft: 15,
    },
    cardText: {
        fontSize: 16,
        color: '#1C1C1E',
    },
    cardRightIcons: {
        flexDirection: 'row',
    },
    cardIconBtn: {
        padding: 8,
        marginLeft: 10,
    },
    sectionHeaderContainer: {
        marginTop: 15,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    logItemContainer: {
        paddingVertical: 12,
    },
    logMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logBorder: {
        borderTopWidth: 0.5,
        borderTopColor: '#EEE',
    },
    logInfo: {
        flex: 1,
        marginLeft: 15,
    },
    logTitle: {
        fontSize: 15,
        color: '#1C1C1E',
        fontWeight: '500',
    },
    logSub: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    logDate: {
        fontSize: 12,
        color: '#8E8E93',
    },
    notesSection: {
        marginTop: 8,
        marginLeft: 35,
        backgroundColor: '#F9FAFB',
        padding: 10,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    notesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    notesLabel: {
        fontSize: 11,
        color: '#8E8E93',
        fontWeight: '600',
    },
    saveBtnText: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '700',
    },
    notesText: {
        fontSize: 12,
        color: '#444',
        fontStyle: 'italic',
        lineHeight: 16,
    },
    notesInput: {
        fontSize: 12,
        color: '#1C1C1E',
        padding: 0,
        textAlignVertical: 'top',
        minHeight: 20,
    },
    emptyActivity: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    emptyText: {
        color: '#8E8E93',
        fontSize: 14,
    },
    hintBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    hintText: {
        flex: 1,
        fontSize: 13,
        color: '#444',
        lineHeight: 18,
    },
    linkText: {
        color: COLORS.primaryPurple,
    },
    hintClose: {
        padding: 4,
    },
    collapsibleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5
    },
    historyList: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0'
    },
    historyItem: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    historyTimeline: {
        width: 20,
        alignItems: 'center',
        marginRight: 10,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
        marginTop: 5,
    },
    timelineLine: {
        width: 1,
        flex: 1,
        backgroundColor: '#E0E0E0',
        marginTop: 2,
    },
    historyContent: {
        flex: 1,
        backgroundColor: '#F9F9F9',
        padding: 10,
        borderRadius: 8,
    },
    historyTitle: {
        fontSize: 13,
        color: '#1C1C1E',
        marginBottom: 2,
    },
    historySub: {
        fontSize: 11,
        color: '#8E8E93',
        marginBottom: 4,
    },
    historyNote: {
        fontSize: 12,
        color: '#444',
        fontStyle: 'italic',
        marginTop: 5,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#EEE'
    }
});

export default QuickContactScreen;
