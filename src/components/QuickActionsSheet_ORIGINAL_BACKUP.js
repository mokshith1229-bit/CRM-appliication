import React, { useState, useRef, useEffect } from 'react';

import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Animated,
    PanResponder,
    Dimensions,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { COLORS, SPACING } from '../constants/theme';
import { makeCall, openWhatsApp, sendSMS, sendEmail } from '../utils/intents';
import { schedulePushNotification } from '../utils/NotificationService';

import { useContactStore } from '../store/contactStore';
import { useCampaignStore } from '../store/campaignStore';
import TransferLeadModal from './TransferLeadModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');


const QuickActionsSheet = ({ visible, contact, onClose, onCall, campaignId, campaignName }) => {
    console.log('🟢 QuickActionsSheet render - visible:', visible, 'contact:', contact?.name || contact?.phone);

    const [leadDesc, setLeadDesc] = useState('');
    const [newNote, setNewNote] = useState('');
    const [isEditingLead, setIsEditingLead] = useState(false);
    const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [reminderDate, setReminderDate] = useState(new Date());
    const noteInputRef = useRef(null);
    const scrollViewRef = useRef(null);

    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    // Contact Store Hooks
    const updateLeadDescription = useContactStore((state) => state.updateLeadDescription);
    const addContactNote = useContactStore((state) => state.addNote);
    const updateContactAssignedTo = useContactStore((state) => state.updateContactAssignedTo);
    const updateLeadSource = useContactStore((state) => state.updateLeadSource);
    const updateContactCallSchedule = useContactStore((state) => state.updateCallSchedule);

    // Campaign Store Hooks
    const updateCampaignDescription = useCampaignStore((state) => state.updateLeadDescription);
    const addCampaignNote = useCampaignStore((state) => state.addNote);
    // Note: Campaign leads don't have separate assignedTo yet in mock, but keeping placeholder logic if needed
    const updateCampaignLeadStatus = useCampaignStore((state) => state.updateLeadStatus);
    const updateCampaignCallSchedule = useCampaignStore((state) => state.updateCallSchedule);

    // Helper functions to dispatch actions to correct store
    const handleUpdateLeadDescription = (id, desc) => {
        if (campaignId) updateCampaignDescription(campaignId, id, desc);
        else updateLeadDescription(id, desc);
    };

    const handleAddNoteToStore = (id, note) => {
        if (campaignId) addCampaignNote(campaignId, id, note);
        else addContactNote(id, note);
    };

    const handleUpdateLeadSource = (id, source) => {
        // Only for personal contacts currently
        if (!campaignId) updateLeadSource(id, source);
    };

    const handleUpdateCallSchedule = (id, date) => {
        if (campaignId) updateCampaignCallSchedule(campaignId, id, date);
        else updateContactCallSchedule(id, date);
    };

    useEffect(() => {
        if (contact) {
            setLeadDesc(contact.leadDescription || '');
        }
    }, [contact]);

    useEffect(() => {
        console.log('🟢 QuickActionsSheet useEffect - visible:', visible, 'contact:', !!contact);
        if (visible) {
            console.log('🟢 Starting animation to show modal');
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }).start(() => {
                console.log('🟢 Animation completed - modal should be visible');
            });
        } else {
            console.log('🟢 Starting animation to hide modal');
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100) {
                    closeSheet();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    const closeSheet = () => {
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    const handleSaveLeadDesc = () => {
        if (contact) {
            handleUpdateLeadDescription(contact.id, leadDesc);
            setIsEditingLead(false);
        }
    };

    const handleAddNote = () => {
        if (newNote.trim() && contact) {
            handleAddNoteToStore(contact.id, newNote.trim());
            setNewNote('');
        }
    };

    const handleWriteNotes = () => {
        if (noteInputRef.current) {
            noteInputRef.current.focus();
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    };

    const handleTransfer = (teamMember) => {
        if (contact) {
            if (campaignId) {
                // For campaign leads, we don't have separate assignedTo logic yet
                // but we can just alert
                alert(`Lead transfer requested for ${teamMember.name}`);
            } else {
                updateContactAssignedTo(contact.id, teamMember.name);
            }
            setIsTransferModalVisible(false);
            onClose(); // Close existing sheet
            // Ideally trigger a toast or alert here, but for now simple close is fine
            alert(`Lead transferred to ${teamMember.name}`);
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
            return `${diffMins} min ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    };

    const handleRemindPress = () => {
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                value: reminderDate,
                onChange: (event, date) => {
                    if (event.type === 'set') {
                        // After date is set, open time picker
                        DateTimePickerAndroid.open({
                            value: date,
                            mode: 'time',
                            onChange: (timeEvent, finalDate) => {
                                if (timeEvent.type === 'set') {
                                    handleSaveReminder(finalDate);
                                }
                            }
                        });
                    }
                },
                mode: 'date',
                minimumDate: new Date(),
            });
        } else {
            setShowDatePicker(true);
        }
    };

    const handleSaveReminder = async (date) => {
        if (contact) {
            handleUpdateCallSchedule(contact.id, date.toISOString());

            await schedulePushNotification(
                `Call Reminder: ${contact.name || contact.phone}`,
                `It's time to follow up with this lead.`,
                date
            );
            Alert.alert('Reminder Set', `I'll remind you at ${date.toLocaleTimeString()}`);
        }
    };

    const onIosDateChange = (event, date) => {
        if (event.type === 'set' && date) {
            setReminderDate(date);
        }
    };

    const confirmIosReminder = () => {
        setShowDatePicker(false);
        handleSaveReminder(reminderDate);
    };

    const notes = contact?.notes || [];

    console.log('🟢 QuickActionsSheet render - Modal visible prop:', visible, 'contact exists:', !!contact);

    if (!contact && visible) {
        console.log('⚠️ WARNING: Modal is visible but contact is null!');
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={closeSheet}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={closeSheet}
                />

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [{ translateY }],
                        },
                    ]}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                        {/* Drag Handle */}
                        <View style={styles.dragHandle} {...panResponder.panHandlers} />

                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.sheetScroll}
                            showsVerticalScrollIndicator={true}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                        >
                            {/* Contact Info */}
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactName}>{contact?.name || contact?.phone || 'Unknown'}</Text>
                                {contact?.name && <Text style={styles.contactPhone}>{contact?.phone}</Text>}
                            </View>

                            {/* SECTION 1: Action Buttons */}
                            <View style={styles.actionsRow}>
                                <TouchableOpacity style={styles.actionButton} onPress={() => contact?.phone && openWhatsApp(contact.phone)}>
                                    <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                                        <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
                                    </View>
                                    <Text style={styles.actionLabel}>WhatsApp</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton} onPress={handleWriteNotes}>
                                    <View style={[styles.iconContainer, { backgroundColor: '#F0F4FF' }]}>
                                        <MaterialCommunityIcons name="note-plus-outline" size={24} color={COLORS.primary} />
                                    </View>
                                    <Text style={styles.actionLabel}>Note</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton} onPress={() => contact?.phone && sendSMS(contact.phone)}>
                                    <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                                        <MaterialCommunityIcons name="message-text" size={24} color="#007AFF" />
                                    </View>
                                    <Text style={styles.actionLabel}>Message</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton} onPress={() => setIsTransferModalVisible(true)}>
                                    <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                                        <MaterialCommunityIcons name="account-arrow-right" size={24} color="#FF9800" />
                                    </View>
                                    <Text style={styles.actionLabel}>Transfer</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton} onPress={handleRemindPress}>
                                    <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                                        <MaterialCommunityIcons name="bell-outline" size={24} color="#9C27B0" />
                                    </View>
                                    <Text style={styles.actionLabel}>Remind</Text>
                                </TouchableOpacity>
                            </View>

                            {showDatePicker && Platform.OS === 'ios' && (
                                <View style={styles.iosPickerContainer}>
                                    <DateTimePicker
                                        value={reminderDate}
                                        mode="datetime"
                                        display="spinner"
                                        onChange={onIosDateChange}
                                        minimumDate={new Date()}
                                    />
                                    <TouchableOpacity style={styles.pickerDoneBtn} onPress={confirmIosReminder}>
                                        <Text style={styles.pickerDoneText}>Set Reminder</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* SECTION 2: Lead Description */}
                            <View style={styles.leadSection}>
                                <View style={styles.leadHeader}>
                                    <Text style={styles.leadTitle}>Lead Requirement</Text>
                                    <TouchableOpacity onPress={() => setIsEditingLead(!isEditingLead)}>
                                        <Text style={styles.editButton}>{isEditingLead ? 'Cancel' : 'Edit'}</Text>
                                    </TouchableOpacity>
                                </View>

                                {isEditingLead ? (
                                    <View>
                                        <TextInput
                                            style={styles.leadInput}
                                            value={leadDesc}
                                            onChangeText={setLeadDesc}
                                            placeholder="E.g., Looking for 3BHK villa in gated community. Budget 80L–1Cr."
                                            multiline
                                            numberOfLines={3}
                                        />
                                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveLeadDesc}>
                                            <Text style={styles.saveButtonText}>Save</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <Text style={styles.leadText}>
                                        {leadDesc || 'No lead description added yet. Tap Edit to add.'}
                                    </Text>
                                )}
                            </View>

                            {/* SECTION 2.5: Lead Source - Hide if in Campaign context */}
                            {!campaignId && !campaignName ? (
                                <View style={styles.leadSourceSection}>
                                    <Text style={styles.leadSourceTitle}>Lead Source</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.leadSourceScroll}
                                    >
                                        {[
                                            { label: 'Manager', value: 'manager' },
                                            { label: 'Team Lead', value: 'team_lead' },
                                            { label: 'Sales Executive', value: 'sales_executive' },
                                            { label: 'Customer', value: 'customer' },
                                            { label: 'Old Customer', value: 'old_customer' },
                                            { label: 'Partner', value: 'partner' },
                                            { label: 'Dealer', value: 'dealer' },
                                            { label: 'Agent / Broker', value: 'agent_broker' },
                                            { label: 'Self Generated', value: 'self' },
                                            { label: 'Walk-in', value: 'walk_in' },
                                        ].map((source) => (
                                            <TouchableOpacity
                                                key={source.value}
                                                style={[
                                                    styles.sourceButton,
                                                    contact?.source === source.value && styles.sourceButtonActive
                                                ]}
                                                onPress={() => contact?.id && handleUpdateLeadSource(contact.id, source.value)}
                                            >
                                                <Text style={[
                                                    styles.sourceButtonText,
                                                    contact?.source === source.value && styles.sourceButtonTextActive
                                                ]}>
                                                    {source.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            ) : null}

                            {/* SECTION 3: Notes History */}
                            <View style={styles.notesSection}>
                                <Text style={styles.notesTitle}>Notes History</Text>
                                {notes.length === 0 ? (
                                    <Text style={styles.emptyNotes}>No notes yet.</Text>
                                ) : (
                                    notes.map((note) => (
                                        <View key={note.id} style={styles.noteItem}>
                                            <Text style={styles.noteText}>{note.text}</Text>
                                            <Text style={styles.noteTime}>{formatTimestamp(note.timestamp)}</Text>
                                        </View>
                                    ))
                                )}
                            </View>

                            {/* SECTION 4: Add New Note Input */}
                            <View style={styles.addNoteSection}>
                                <TextInput
                                    ref={noteInputRef}
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
                    </KeyboardAvoidingView>
                </Animated.View>
            </View>

            <TransferLeadModal
                visible={isTransferModalVisible}
                onClose={() => setIsTransferModalVisible(false)}
                onTransfer={handleTransfer}
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: SCREEN_HEIGHT * 0.85,
    },

    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#D1D1D6',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 16,
    },
    contactInfo: {
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.md,
    },
    contactName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
    },
    contactPhone: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    actionButton: {
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    actionLabel: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
    },
    iosPickerContainer: {
        backgroundColor: '#F9F9F9',
        padding: 10,
        borderRadius: 12,
        margin: 10,
    },
    pickerDoneBtn: {
        backgroundColor: COLORS.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    pickerDoneText: {
        color: '#FFF',
        fontWeight: '600',
    },
    leadSection: {
        padding: SPACING.md,
        backgroundColor: '#F9F9F9',
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        borderRadius: 12,
    },
    leadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    leadTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    editButton: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
    },
    leadText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    leadInput: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#D1D1D6',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 60,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    notesSection: {
        paddingHorizontal: SPACING.md,
        marginTop: SPACING.md,
    },
    notesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    notesScroll: {
        maxHeight: SCREEN_HEIGHT * 0.2,
    },
    emptyNotes: {
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 20,
    },
    noteItem: {
        backgroundColor: '#F9F9F9',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    noteText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 4,
    },
    noteTime: {
        fontSize: 12,
        color: '#999',
    },
    addNoteSection: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        marginTop: SPACING.md,
    },
    noteInput: {
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: '#D1D1D6',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 60,
        textAlignVertical: 'top',
        marginBottom: 8,
    },
    addNoteButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    addNoteButtonDisabled: {
        backgroundColor: '#D1D1D6',
    },
    addNoteButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    leadSourceSection: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    leadSourceTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 12,
    },
    leadSourceScroll: {
        flexDirection: 'row',
    },
    sourceButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    sourceButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    sourceButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    sourceButtonTextActive: {
        color: '#FFF',
        fontWeight: '600',
    },
});

export default QuickActionsSheet;
