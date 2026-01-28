import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
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
import { useContactStore } from '../store/contactStore';
import { useCampaignStore } from '../store/campaignStore';
import defaultAvatar from '../assets/default_avatar.jpg';

const QuickContactScreen = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { contact: initialContact, campaignId, campaignName } = route.params;
    const contact = campaignId
        ? useCampaignStore(state => (state.leads[campaignId] || []).find(c => c.id === initialContact?.id) || initialContact)
        : useContactStore(state => state.contacts.find(c => c.id === initialContact?.id) || initialContact);

    const [showTransferModal, setShowTransferModal] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteValue, setEditingNoteValue] = useState('');
    const [showHint, setShowHint] = useState(true);

    const updateCallNote = useContactStore(state => state.updateCallNote);
    const updateLeadCallNote = useCampaignStore(state => state.updateLeadCallNote);

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

    const handleActualTransfer = (member) => {
        setShowTransferModal(false);
        Alert.alert("Success", `Lead transferred to ${member.name}`);
    };

    const handleStartEditingNote = (log) => {
        setEditingNoteId(log.id);
        setEditingNoteValue(log.notes || '');
    };

    const handleSaveNote = async () => {
        if (editingNoteId && contact) {
            if (campaignId) {
                await updateLeadCallNote(campaignId, contact.id, editingNoteId, editingNoteValue);
            } else {
                await updateCallNote(contact.id, editingNoteId, editingNoteValue);
            }
            setEditingNoteId(null);
            setEditingNoteValue('');
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

    const formatLogDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
                        onPress={() => {
                            if (!contact) return;
                            if (campaignId) {
                                navigation.navigate('CampaignLeads', { campaignId, campaignName, openContactDetail: contact.id });
                            } else {
                                navigation.navigate('Home', { openContactDetail: contact.id });
                            }
                        }}
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
                <View style={styles.card}>
                    {contact.callLogs && contact.callLogs.length > 0 ? (
                        contact.callLogs.slice(0, 3).map((log, idx) => (
                            <View key={log.id} style={[styles.logItemContainer, idx > 0 && styles.logBorder]}>
                                <View style={styles.logMainRow}>
                                    <MaterialIcons
                                        name={log.direction === 'outgoing' ? 'call-made' : 'call-received'}
                                        size={20}
                                        color="#666"
                                    />
                                    <View style={styles.logInfo}>
                                        <Text style={styles.logTitle}>{log.direction === 'outgoing' ? 'Outgoing call' : 'Incoming call'}</Text>
                                        <Text style={styles.logSub}>{log.phoneNumber || contact.phone}</Text>
                                    </View>
                                    <Text style={styles.logDate}>{formatLogDate(log.date)}</Text>
                                </View>

                                {/* Notes Section */}
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
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyActivity}>
                            <Text style={styles.emptyText}>No recent activity</Text>
                        </View>
                    )}
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
        color: '#007AFF',
    },
    hintClose: {
        padding: 4,
    },
});

export default QuickContactScreen;
