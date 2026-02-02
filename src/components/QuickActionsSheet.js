import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { openWhatsApp, sendSMS, sendEmail } from '../utils/intents';
import { useContactStore } from '../store/contactStore';
import { useCampaignStore } from '../store/campaignStore';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { schedulePushNotification } from '../utils/NotificationService';
import TransferLeadModal from './TransferLeadModal';

const QuickActionsSheet = ({ visible, contact, onClose, onCall, campaignId, campaignName }) => {
    console.log('🟢 QuickActionsSheet render - visible:', visible, 'contact:', contact?.name || contact?.phone);
    console.log('🔵 Site Visit Check - contact.siteVisitDoneBy:', contact?.siteVisitDoneBy);
    console.log('🔵 Full contact object:', JSON.stringify(contact, null, 2));

    const [newNote, setNewNote] = useState('');
    const [leadDesc, setLeadDesc] = useState(contact?.leadDescription || '');
    const [isEditingLead, setIsEditingLead] = useState(false);
    const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [callScheduleDate, setCallScheduleDate] = useState(new Date());

    // Contact Store Hooks
    const addContactNote = useContactStore((state) => state.addNote);
    const updateLeadDescription = useContactStore((state) => state.updateLeadDescription);
    const updateContactAssignedTo = useContactStore((state) => state.updateContactAssignedTo);
    const updateContactCallSchedule = useContactStore((state) => state.updateCallSchedule);
    const contacts = useContactStore((state) => state.contacts);

    // Campaign Store Hooks
    const addCampaignNote = useCampaignStore((state) => state.addNote);
    const updateCampaignDescription = useCampaignStore((state) => state.updateLeadDescription);
    const updateCampaignCallSchedule = useCampaignStore((state) => state.updateCallSchedule);
    const campaigns = useCampaignStore((state) => state.campaigns);

    // Get the latest contact data from store
    const [currentContact, setCurrentContact] = useState(contact);

    useEffect(() => {
        if (contact?.id) {
            if (campaignId) {
                // Get contact from campaign
                const campaign = campaigns.find(c => c.id === campaignId);
                const updatedContact = campaign?.leads?.find(l => l.id === contact.id);
                if (updatedContact) {
                    setCurrentContact(updatedContact);
                    setLeadDesc(updatedContact.leadDescription || '');
                    console.log('🟡 Updated currentContact from campaign:', updatedContact.name, 'siteVisitDoneBy:', updatedContact.siteVisitDoneBy);
                }
            } else {
                // Get contact from contacts store
                const updatedContact = contacts.find(c => c.id === contact.id);
                if (updatedContact) {
                    setCurrentContact(updatedContact);
                    setLeadDesc(updatedContact.leadDescription || '');
                    console.log('🟡 Updated currentContact from store:', updatedContact.name || updatedContact.phone, 'siteVisitDoneBy:', updatedContact.siteVisitDoneBy);
                }
            }
        }
    }, [contact?.id, contacts, campaigns, campaignId]);

    const handleAddNote = () => {
        if (newNote.trim() && contact) {
            console.log('🟢 Adding note for contact:', contact.id);
            console.log('🟢 Current notes before:', currentContact?.notes);

            // Create the new note object
            const newNoteObj = {
                id: Date.now().toString(),
                text: newNote.trim(),
                timestamp: new Date().toISOString(),
            };

            console.log('🟢 New note object:', newNoteObj);

            // Immediately update currentContact to show the note instantly
            setCurrentContact(prev => {
                const updatedContact = {
                    ...prev,
                    notes: [...(prev?.notes || []), newNoteObj]
                };
                console.log('🟢 Updated contact with new note:', updatedContact.notes);
                return updatedContact;
            });

            // Clear the input
            setNewNote('');

            // Update the store in the background
            if (campaignId) {
                console.log('🟢 Updating campaign note');
                addCampaignNote(campaignId, contact.id, newNoteObj.text);
            } else {
                console.log('🟢 Updating contact note');
                addContactNote(contact.id, newNoteObj.text);
            }

            // Sync with store after a short delay to ensure consistency
            setTimeout(() => {
                if (campaignId) {
                    const campaign = campaigns.find(c => c.id === campaignId);
                    const updatedContact = campaign?.leads?.find(l => l.id === contact.id);
                    if (updatedContact) {
                        console.log('🟢 Synced campaign contact notes:', updatedContact.notes);
                        setCurrentContact(updatedContact);
                    }
                } else {
                    const updatedContact = contacts.find(c => c.id === contact.id);
                    if (updatedContact) {
                        console.log('🟢 Synced contact notes:', updatedContact.notes);
                        setCurrentContact(updatedContact);
                    }
                }
            }, 100);
        }
    };

    const handleSaveLeadDesc = () => {
        if (contact) {
            if (campaignId) {
                updateCampaignDescription(campaignId, contact.id, leadDesc);
            } else {
                updateLeadDescription(contact.id, leadDesc);
            }
            setIsEditingLead(false);
        }
    };

    const handleTransfer = (teamMember) => {
        if (contact && !campaignId) {
            updateContactAssignedTo(contact.id, teamMember.name);
            setIsTransferModalVisible(false);
            onClose();
            Alert.alert('Success', `Lead transferred to ${teamMember.name}`);
        }
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
        if (contact) {
            // Update store
            if (campaignId) {
                updateCampaignCallSchedule(campaignId, contact.id, date.toISOString());
            } else {
                updateContactCallSchedule(contact.id, date.toISOString());
            }

            // Schedule push notification
            await schedulePushNotification(
                `Call Reminder: ${contact.name || contact.phone}`,
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
        }
    };

    const handleRemindPress = () => {
        openDatePicker();
    };

    const notes = currentContact?.notes || [];

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

                    <ScrollView style={styles.content}>
                        {/* Contact Info */}
                        <View style={styles.contactInfo}>
                            <View style={styles.contactNameRow}>
                                <Text style={styles.contactName}>{contact?.name || contact?.phone || 'Unknown'}</Text>
                                {currentContact?.siteVisitDoneBy && (
                                    <View style={styles.siteVisitBadge}>
                                        <MaterialCommunityIcons name="home-city" size={14} color="#0288D1" />
                                        <Text style={styles.siteVisitBadgeText}>Site Visit Done</Text>
                                    </View>
                                )}
                            </View>
                            {contact?.name && <Text style={styles.contactPhone}>{contact?.phone}</Text>}
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => contact?.phone && openWhatsApp(contact.phone)}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                                    <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
                                </View>
                                <Text style={styles.actionLabel}>WhatsApp</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => contact?.phone && sendSMS(contact.phone)}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                                    <MaterialCommunityIcons name="message-text" size={24} color="#007AFF" />
                                </View>
                                <Text style={styles.actionLabel}>Message</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => sendEmail(contact?.email || '')}
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

                        {/* Site Visit Information - Only show if contact has site visit */}
                        {currentContact?.siteVisitDoneBy && (
                            <View style={styles.siteVisitInfoSection}>
                                <Text style={styles.sectionTitle}>Site Visit Information</Text>
                                <View style={styles.siteVisitInfoCard}>
                                    {currentContact.leadOwner && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Lead Owner:</Text>
                                            <Text style={styles.infoValue}>
                                                {currentContact.leadOwner.charAt(0).toUpperCase() + currentContact.leadOwner.slice(1).replace('_', ' ')}
                                            </Text>
                                        </View>
                                    )}
                                    {currentContact.project && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Project:</Text>
                                            <Text style={styles.infoValue}>
                                                {currentContact.project.charAt(0).toUpperCase() + currentContact.project.slice(1).replace('_', ' ')}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Site Visit Done By:</Text>
                                        <Text style={styles.infoValue}>
                                            {currentContact.siteVisitDoneBy.charAt(0).toUpperCase() + currentContact.siteVisitDoneBy.slice(1).replace('_', ' ')}
                                        </Text>
                                    </View>
                                    {currentContact.siteVisitReview && (
                                        <View style={styles.reviewRow}>
                                            <Text style={styles.reviewLabel}>Review:</Text>
                                            <Text style={styles.reviewText}>{currentContact.siteVisitReview}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Notes Section */}
                        <View style={styles.notesSection}>
                            <Text style={styles.sectionTitle}>Notes</Text>
                            {notes.length === 0 ? (
                                <Text style={styles.emptyNotes}>No notes yet.</Text>
                            ) : (
                                <ScrollView
                                    style={styles.notesScrollView}
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {notes.map((note) => (
                                        <View key={note.id} style={styles.noteItem}>
                                            <Text style={styles.noteText}>{note.text}</Text>
                                            <Text style={styles.noteTime}>
                                                {new Date(note.timestamp).toLocaleString()}
                                            </Text>
                                        </View>
                                    ))}
                                </ScrollView>
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
                </View>
            </View>

            {/* iOS Date Picker */}
            {Platform.OS === 'ios' && showDatePicker && (
                <DateTimePicker
                    value={callScheduleDate}
                    mode="datetime"
                    display="default"
                    onChange={handleScheduleChange}
                    minimumDate={new Date()}
                />
            )}

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
        maxHeight: '80%',
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
        paddingHorizontal: 20,
    },
    contactInfo: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    contactName: {
        fontSize: 24,
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
        marginBottom: 12,
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
    iosPickerContainer: {
        backgroundColor: '#F5F5F5',
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 16,
    },
    pickerDoneBtn: {
        backgroundColor: COLORS.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12,
    },
    pickerDoneText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
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
    leadInput: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    leadText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
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
    notesSection: {
        marginTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
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
