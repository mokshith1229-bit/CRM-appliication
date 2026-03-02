import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    BackHandler,
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
import StatusPicker from '../components/StatusPicker';
import { useDispatch, useSelector } from 'react-redux';
import { updateLead, fetchLeadDetails, clearLeadDetails, checkLeadByPhone, createLead } from '../store/slices/leadSlice';
import defaultAvatar from '../assets/default_avatar.jpg';
import { fetchTeamMembers } from '../store/slices/teamSlice';
import CallLogService from '../services/CallLogService';
import AudioPlayer from '../components/AudioPlayer';
import { openWhatsApp } from '../utils/intents';
import QuickContactSkeleton from '../components/QuickContactSkeleton';

const QuickContactScreen = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { contact: initialContact, campaignId, campaignName, conversationId } = route.params;
    const dispatch = useDispatch();
    const leads = useSelector(state => state.leads.leads);
    const currentLeadDetails = useSelector(state => state.leads.currentLeadDetails);
    const detailsLoading = useSelector(state => state.leads.detailsLoading);
    const allTeamMembers = useSelector(state => state.team.members);
    const { statuses, isWhatsAppIntegrated } = useSelector(state => state.config);

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
    const [expandWhatsAppMedia, setExpandWhatsAppMedia] = useState(false);
    const [localDeviceLogs, setLocalDeviceLogs] = useState([]);

    const whatsappMessages = useSelector(state => state.whatsapp.messages || {});
    const chatMessages = whatsappMessages[contact.id || contact._id] || [];
    
    const mediaMessages = React.useMemo(() => {
        // Source 1: From lead details (pre-fetched/historical by backend)
        const fromLead = contact.whatsapp_media || [];
        
        // Source 2: From active chat messages in state
        const fromChat = chatMessages.filter(m => 
            m.mediaUrl || 
            m.content?.mediaUrl || 
            m.content?.url || 
            m.url ||
            ['image', 'document', 'audio', 'video', 'ptt'].includes(m.type)
        );

        // Combine and unique by messageId/ID
        const combined = [...fromLead];
        fromChat.forEach(m => {
            const id = m.messageId || m._id || m.id;
            if (!combined.some(exist => (exist.messageId || exist._id || exist.id) === id)) {
                combined.push(m);
            }
        });

        // Sort by timestamp desc
        return combined.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
            const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        });
    }, [contact.whatsapp_media, chatMessages]);


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

        const backAction = () => {
            navigation.goBack();
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

        return () => {
            dispatch(clearLeadDetails());
            setLocalDeviceLogs([]);
            backHandler.remove();
        }
    }, [dispatch, initialContact, navigation]);
    const handleWhatsApp = () => {
        if (!contact) return;
        if (isWhatsAppIntegrated) {
            navigation.navigate('ChatDetail', { 
                chatId: contact.phone || contact.id || contact._id,
                chatName: contact.name || contact.phone,
                conversationId: conversationId || contact.conversationId
            });
        } else {
            openWhatsApp(contact.phone);
        }
    };

    const handleMessage = () => {
        if (!contact?.phone) return;
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

    const triggerAddLeadFlow = () => {
        if (!contact) return;
        
        // Navigate to the full Create Lead form and pass the pre-filled data
        navigation.navigate('CreateLead', {
            initialLeadData: {
                name: contact.name || 'New Lead',
                phone: contact.phone || '',
                lead_source: 'Offline', // Default source per user request
            }
        });
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

    if (detailsLoading) {
        return <QuickContactSkeleton />;
    }

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
                        onPress={triggerAddLeadFlow}
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
 {/* WhatsApp Media & Docs Collapsible */}
                {isWhatsAppIntegrated && (
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.collapsibleHeader}
                            onPress={() => setExpandWhatsAppMedia(!expandWhatsAppMedia)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialCommunityIcons name="folder-multiple-image" size={22} color="#075E54" />
                                <Text style={[styles.cardText, { marginLeft: 10, fontWeight: '500' }]}>WhatsApp Media & Docs</Text>
                            </View>
                            <MaterialIcons name={expandWhatsAppMedia ? "expand-less" : "expand-more"} size={24} color="#666" />
                        </TouchableOpacity>

                        {expandWhatsAppMedia && (
                            <View style={styles.historyList}>
                                {mediaMessages.length > 0 ? (
                                    mediaMessages.map((item, index) => {
                                        // Support multiple URL fields
                                        const mediaUrl = item.url || item.mediaUrl || item.content?.mediaUrl || item.content?.url;
                                        
                                        // Robust type checking
                                        const type = item.type?.toLowerCase();
                                        const isImage = type === 'image' || mediaUrl?.match(/\.(jpg|jpeg|png|gif|webp)/i);
                                        const isAudio = type === 'audio' || type === 'ptt' || mediaUrl?.match(/\.(mp3|wav|ogg|m4a|aac)/i);
                                        const isVideo = type === 'video' || mediaUrl?.match(/\.(mp4|mov|avi)/i);
                                        
                                        // Robust file title resolution
                                        const fileTitle = item.caption || item.fileName || item.filename || item.description || 
                                                       item.content?.filename || 
                                                       (isImage ? 'WhatsApp Image' : isAudio ? 'Audio Message' : isVideo ? 'Video Message' : 'Document');

                                        return (
                                            <TouchableOpacity 
                                                key={item.messageId || item._id || item.id || index} 
                                                style={styles.mediaListItem}
                                                onPress={() => {
                                                    if (mediaUrl) Linking.openURL(mediaUrl);
                                                }}
                                            >
                                                <View style={styles.mediaIconWrapper}>
                                                    <MaterialIcons 
                                                        name={isImage ? "image" : isAudio ? "audiotrack" : isVideo ? "videocam" : "insert-drive-file"} 
                                                        size={24} 
                                                        color={isImage ? "#FF9500" : isAudio ? "#AF52DE" : isVideo ? "#FF3B30" : "#5856D6"} 
                                                    />
                                                </View>
                                                <View style={styles.mediaInfo}>
                                                    <Text style={styles.mediaTitle} numberOfLines={1}>{fileTitle}</Text>
                                                    <Text style={styles.mediaSub}>{formatLogDate(item.timestamp || item.createdAt)}</Text>
                                                </View>
                                                <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <Text style={styles.emptyText}>No media or documents found</Text>
                                )}
                            </View>
                        )}
                    </View>
                )}
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

                                    {log.recording_url && parseFloat(log.duration || 0) > 0 && (
                                        <View style={{ marginTop: 4, marginHorizontal: -6 }}>
                                            <AudioPlayer
                                                recording={{
                                                    status: log.status === 'Missed' ? 'Missed' : 'Connected',
                                                    recording_url: log.recording_url,
                                                    duration: log.duration
                                                }}
                                            />
                                        </View>
                                    )}

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
    },
    mediaListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F0F0F0',
    },
    mediaIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    mediaInfo: {
        flex: 1,
    },
    mediaTitle: {
        fontSize: 14,
        color: '#1C1C1E',
        fontWeight: '500',
    },
    mediaSub: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 2,
    }
});

export default QuickContactScreen;
