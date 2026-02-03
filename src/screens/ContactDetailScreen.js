import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    SafeAreaView,
    Image,
    Alert,
    Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useContactStore } from '../store/contactStore';
import { useCampaignStore } from '../store/campaignStore';
import EditableField from '../components/EditableField';
import CustomFieldModal from '../components/CustomFieldModal';
import StatusPicker from '../components/StatusPicker';
import ActivityLogItem from '../components/ActivityLogItem';
import defaultAvatar from '../assets/default_avatar.jpg';
import { registerForPushNotificationsAsync, schedulePushNotification } from '../utils/NotificationService';

const ContactDetailScreen = ({ visible, contact, onClose, navigation, campaignId, campaignName }) => {
    const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [callScheduleDate, setCallScheduleDate] = useState(new Date());
    const [showLeadSourcePicker, setShowLeadSourcePicker] = useState(false);
    const [showLeadStatusPicker, setShowLeadStatusPicker] = useState(false);
    const [showCallLogs, setShowCallLogs] = useState(true);

    // Batch editing state
    const [editedContact, setEditedContact] = useState(null);
    const [isDirty, setIsDirty] = useState(false);

    // Store actions
    const updateContactName = useContactStore((state) => state.updateContactName);
    const updateContactPhone = useContactStore((state) => state.updateContactPhone);
    const updateContactWhatsApp = useContactStore((state) => state.updateContactWhatsApp);
    const updateContactEmail = useContactStore((state) => state.updateContactEmail);
    const addCustomField = useContactStore((state) => state.addCustomField);
    const removeCustomField = useContactStore((state) => state.removeCustomField);
    const updateCallStatus = useContactStore((state) => state.updateCallStatus);
    const updateLeadSource = useContactStore((state) => state.updateLeadSource);
    const updateCallNote = useContactStore((state) => state.updateCallNote);
    const updateCallSchedule = useContactStore((state) => state.updateCallSchedule);
    const updateCallScheduleNote = useContactStore((state) => state.updateCallScheduleNote);
    const getContactById = useContactStore((state) => state.getContactById);

    // Campaign Store actions
    const updateLeadName = useCampaignStore((state) => state.updateLeadName);
    const updateLeadPhone = useCampaignStore((state) => state.updateLeadPhone);
    const updateLeadWhatsApp = useCampaignStore((state) => state.updateLeadWhatsApp);
    const updateLeadEmail = useCampaignStore((state) => state.updateLeadEmail);
    const updateLeadStatus = useCampaignStore((state) => state.updateLeadStatus);
    const updateLeadCallSchedule = useCampaignStore((state) => state.updateCallSchedule);
    const addLeadCustomField = useCampaignStore((state) => state.addLeadCustomField);
    const removeLeadCustomField = useCampaignStore((state) => state.removeLeadCustomField);
    const updateLeadCallNote = useCampaignStore((state) => state.updateLeadCallNote);

    // Initialize/Sync editedContact
    React.useEffect(() => {
        if (contact) {
            setEditedContact({ ...contact });
            setCallScheduleDate(contact.callSchedule ? new Date(contact.callSchedule) : new Date());
            setIsDirty(false);
        }
    }, [contact, visible]);

    // Request notification permissions on mount
    React.useEffect(() => {
        registerForPushNotificationsAsync();
    }, []);

    const handleSaveAll = async () => {
        if (!isDirty || !editedContact) {
            onClose();
            return;
        }

        try {
            if (campaignId) {
                // Campaign Batch Updates
                if (editedContact.name !== contact.name) updateLeadName(campaignId, contact.id, editedContact.name);
                if (editedContact.phone !== contact.phone) updateLeadPhone(campaignId, contact.id, editedContact.phone);
                if (editedContact.email !== contact.email) updateLeadEmail(campaignId, contact.id, editedContact.email);
                if (editedContact.whatsapp !== contact.whatsapp) updateLeadWhatsApp(campaignId, contact.id, editedContact.whatsapp);
                if (editedContact.status !== contact.status) {
                    console.log('💾 Saving status change for campaign lead');
                    await updateLeadStatus(campaignId, contact.id, editedContact.status);
                }
                // if (editedContact.source !== contact.source) // campaign lead source is fixed to campaignName

                if (editedContact.callSchedule !== contact.callSchedule) {
                    updateLeadCallSchedule(campaignId, contact.id, editedContact.callSchedule);
                    if (editedContact.callSchedule) {
                        await schedulePushNotification(
                            `Call Reminder: ${editedContact.name}`,
                            editedContact.callScheduleNote || `It's time to call ${editedContact.name}`,
                            new Date(editedContact.callSchedule)
                        );
                    }
                }
            } else {
                // Batch individual updates
                if (editedContact.name !== contact.name) updateContactName(contact.id, editedContact.name);
                if (editedContact.phone !== contact.phone) updateContactPhone(contact.id, editedContact.phone);
                if (editedContact.email !== contact.email) updateContactEmail(contact.id, editedContact.email);
                if (editedContact.whatsapp !== contact.whatsapp) updateContactWhatsApp(contact.id, editedContact.whatsapp);
                if (editedContact.status !== contact.status) {
                    console.log('💾 Saving status change for contact');
                    await updateCallStatus(contact.id, editedContact.status);
                }
                if (editedContact.source !== contact.source) updateLeadSource(contact.id, editedContact.source);

                if (editedContact.callSchedule !== contact.callSchedule) {
                    updateCallSchedule(contact.id, editedContact.callSchedule);
                    // Reschedule notification if date changed
                    if (editedContact.callSchedule) {
                        await schedulePushNotification(
                            `Call Reminder: ${editedContact.name}`,
                            editedContact.callScheduleNote || `It's time to call ${editedContact.name}`,
                            new Date(editedContact.callSchedule)
                        );
                    }
                }

                if (editedContact.callScheduleNote !== contact.callScheduleNote) {
                    updateCallScheduleNote(contact.id, editedContact.callScheduleNote);
                }
            }

            // Refresh contact data from store to get updated activities
            // Wait a bit for store to update
            setTimeout(() => {
                if (!campaignId) {
                    const refreshedContact = getContactById(contact.id);
                    if (refreshedContact) {
                        console.log('🔄 Refreshed contact from store:', refreshedContact);
                        console.log('📊 Activities in refreshed contact:', refreshedContact.activities?.length || 0);
                        setEditedContact({ ...refreshedContact });
                    } else {
                        console.log('❌ Could not find refreshed contact');
                    }
                } else {
                    // For campaign leads, we need to get from campaign store
                    const getLeadsByCampaign = useCampaignStore.getState().getLeadsByCampaign;
                    const campaignLeads = getLeadsByCampaign(campaignId);
                    const refreshedLead = campaignLeads.find(l => l.id === contact.id);
                    if (refreshedLead) {
                        console.log('🔄 Refreshed campaign lead from store:', refreshedLead);
                        console.log('📊 Activities in refreshed lead:', refreshedLead.activities?.length || 0);
                        setEditedContact({ ...refreshedLead });
                    }
                }
            }, 100);

            setIsDirty(false);

            // Don't close immediately - let user see the updated activities
            // onClose();
            // if (navigation) {
            //     if (campaignId) {
            //         navigation.navigate('CampaignLeads', { campaignId, campaignName });
            //     } else {
            //         navigation.navigate('Home');
            //     }
            // }
        } catch (error) {
            Alert.alert('Error', 'Failed to save changes. Please try again.');
        }
    };

    if (!contact || !editedContact) return null;

    const handleAvatarPress = async () => {
        Alert.alert(
            'Change Photo',
            'Choose an option',
            [
                {
                    text: 'Camera',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status === 'granted') {
                            const result = await ImagePicker.launchCameraAsync({
                                allowsEditing: true,
                                aspect: [1, 1],
                                quality: 0.8,
                            });
                            if (!result.canceled && result.assets && result.assets[0]) {
                                if (campaignId) {
                                    const updatePhoto = useCampaignStore.getState().updateLeadPhoto;
                                    updatePhoto(campaignId, contact?.id, result.assets[0].uri);
                                } else {
                                    const updatePhoto = useContactStore.getState().updateContactPhoto;
                                    updatePhoto(contact?.id, result.assets[0].uri);
                                }
                            }
                        }
                    },
                },
                {
                    text: 'Gallery',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status === 'granted') {
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsEditing: true,
                                aspect: [1, 1],
                                quality: 0.8,
                            });
                            if (!result.canceled && result.assets && result.assets[0]) {
                                if (campaignId) {
                                    const updatePhoto = useCampaignStore.getState().updateLeadPhoto;
                                    updatePhoto(campaignId, contact?.id, result.assets[0].uri);
                                } else {
                                    const updatePhoto = useContactStore.getState().updateContactPhoto;
                                    updatePhoto(contact?.id, result.assets[0].uri);
                                }
                            }
                        }
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleUpdateLocal = (field, value) => {
        setEditedContact(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleScheduleChange = (event, selectedDate) => {
        const currentDate = selectedDate || callScheduleDate;
        if (Platform.OS === 'ios') setShowDatePicker(false);
        if (event.type === 'set' || Platform.OS === 'ios') {
            setCallScheduleDate(currentDate);
            handleUpdateLocal('callSchedule', currentDate.toISOString());
        }
    };

    const openDatePicker = () => {
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                value: callScheduleDate,
                onChange: (event, date) => {
                    if (event.type === 'set' && date) {
                        setCallScheduleDate(date);
                        DateTimePickerAndroid.open({
                            value: date,
                            onChange: (timeEvent, timeDate) => {
                                if (timeEvent.type === 'set' && timeDate) {
                                    handleUpdateLocal('callSchedule', timeDate.toISOString());
                                }
                            },
                            mode: 'time',
                            is24Hour: false
                        });
                    }
                },
                mode: 'date',
                is24Hour: false
            });
        } else {
            setShowDatePicker(true);
        }
    };

    const formatScheduleDate = (dateString) => {
        if (!dateString) return 'Not scheduled';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
            ' | ' +
            date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Contact Details</Text>
                    <TouchableOpacity onPress={handleSaveAll} style={styles.saveButton}>
                        <Text style={[styles.saveText, !isDirty && { color: '#8E8E93' }]}>
                            {isDirty ? 'Save' : 'Done'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        <TouchableOpacity onPress={handleAvatarPress}>
                            <Image
                                source={editedContact.photo ? { uri: editedContact.photo } : defaultAvatar}
                                style={styles.avatarLarge}
                            />
                            <View style={styles.cameraIcon}>
                                <Text style={styles.cameraIconText}>📷</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Contact Info Cards */}
                    <View style={styles.infoCard}>
                        <Text style={styles.fieldLabel}>Contact Name</Text>
                        <EditableField
                            value={editedContact.name}
                            onSave={(val) => handleUpdateLocal('name', val)}
                            placeholder="Contact Name"
                            showButtons={false}
                        />
                    </View>

                    <View style={styles.infoCard}>
                        <Text style={styles.fieldLabel}>Mobile</Text>
                        <EditableField
                            value={editedContact.phone}
                            onSave={(val) => handleUpdateLocal('phone', val)}
                            placeholder="Phone number"
                            showButtons={false}
                        />
                    </View>

                    <View style={styles.infoCard}>
                        <Text style={styles.fieldLabel}>WhatsApp</Text>
                        <EditableField
                            value={editedContact.whatsapp || editedContact.phone}
                            onSave={(val) => handleUpdateLocal('whatsapp', val)}
                            placeholder="WhatsApp number"
                            showButtons={false}
                        />
                    </View>

                    <View style={styles.infoCard}>
                        <Text style={styles.fieldLabel}>Email</Text>
                        <EditableField
                            value={editedContact.email || ''}
                            onSave={(val) => handleUpdateLocal('email', val)}
                            placeholder="Email address"
                            showButtons={false}
                        />
                    </View>

                    {/* Custom Fields */}
                    {(editedContact.customFields || []).map((field) => (
                        <View key={field.id} style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    {field.type.charAt(0).toUpperCase() + field.type.slice(1)} : {field.value}
                                </Text>
                                <TouchableOpacity onPress={() => {
                                    handleUpdateLocal('customFields', editedContact.customFields.filter(f => f.id !== field.id));
                                    if (campaignId && contact) {
                                        removeLeadCustomField(campaignId, contact.id, field.id);
                                    } else if (contact) {
                                        removeCustomField(contact.id, field.id);
                                    }
                                }}>
                                    <Text style={styles.removeIcon}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity
                        style={styles.addFieldButton}
                        onPress={() => setShowCustomFieldModal(true)}
                    >
                        <Text style={styles.addFieldText}>Add Field</Text>
                    </TouchableOpacity>

                    {/* Reminder & Status */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>
                                Call Reminder : {formatScheduleDate(editedContact.callSchedule)}
                            </Text>
                            <TouchableOpacity onPress={openDatePicker}>
                                <Text style={styles.calendarIcon}>🔔</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.dividerLine} />
                        <EditableField
                            value={editedContact.callScheduleNote}
                            onSave={(val) => handleUpdateLocal('callScheduleNote', val)}
                            placeholder="Why this call? (e.g. Discuss pricing)"
                            showButtons={false}
                        />
                    </View>

                    <View style={styles.infoCard}>
                        <TouchableOpacity style={styles.infoRow} onPress={() => setShowLeadStatusPicker(true)}>
                            <Text style={styles.infoLabel}>
                                Lead Status : {editedContact.status ? (editedContact.status.charAt(0).toUpperCase() + editedContact.status.slice(1).replace('_', ' ')) : 'None'}
                            </Text>
                            <Text style={styles.dropdownIcon}>▼</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoCard}>
                        <TouchableOpacity style={styles.infoRow} onPress={() => setShowLeadSourcePicker(true)}>
                            <Text style={styles.infoLabel}>
                                Lead Source : {editedContact.source ? (editedContact.source.charAt(0).toUpperCase() + editedContact.source.slice(1).replace('_', ' ')) : 'Not Set'}
                            </Text>
                            <Text style={styles.dropdownIcon}>▼</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Recent Activity Toggle */}
                    <TouchableOpacity
                        style={[styles.sectionHeader, { backgroundColor: showCallLogs ? '#F0F0F2' : '#F5F5F7' }]}
                        onPress={() => setShowCallLogs(!showCallLogs)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.infoRow}>
                            <Text style={styles.sectionTitle}>Recent Activity</Text>
                            <Text style={styles.dropdownIcon}>{showCallLogs ? '▲' : '▼'}</Text>
                        </View>
                    </TouchableOpacity>

                    {showCallLogs && (
                        <View>
                            {(() => {
                                // Merge activities and callLogs for backward compatibility
                                const activities = editedContact.activities || [];
                                const callLogs = editedContact.callLogs || [];

                                console.log('🎯 Rendering activities:', {
                                    activitiesCount: activities.length,
                                    callLogsCount: callLogs.length,
                                    activities: activities,
                                    contactId: contact?.id
                                });

                                // Convert old callLogs to activity format if not already in activities
                                const callActivities = callLogs.map(call => ({
                                    id: `activity_call_${call.id}`,
                                    type: 'call',
                                    timestamp: call.date,
                                    data: call
                                }));

                                // Combine and deduplicate (prefer activities over converted callLogs)
                                const activityIds = new Set(activities.map(a => a.id));
                                const uniqueCallActivities = callActivities.filter(ca => !activityIds.has(ca.id));
                                const allActivities = [...activities, ...uniqueCallActivities];

                                console.log('📋 All activities after merge:', allActivities.length);

                                // Sort by timestamp (newest first)
                                allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                                // Show default message if no activities
                                if (allActivities.length === 0) {
                                    return (
                                        <View style={{ padding: 16, alignItems: 'center' }}>
                                            <Text style={{ color: '#999', fontSize: 14 }}>No activity yet</Text>
                                        </View>
                                    );
                                }

                                return allActivities.map((activity) => (
                                    <ActivityLogItem
                                        key={activity.id}
                                        activity={activity}
                                        onUpdateNote={(callId, note) => {
                                            if (campaignId) {
                                                updateLeadCallNote(campaignId, contact.id, callId, note);
                                            } else {
                                                updateCallNote(contact.id, callId, note);
                                            }
                                        }}
                                    />
                                ));
                            })()}
                        </View>
                    )}
                </ScrollView>

                {/* Modals & Pickers */}
                <CustomFieldModal
                    visible={showCustomFieldModal}
                    onClose={() => setShowCustomFieldModal(false)}
                    onAdd={(field) => {
                        if (campaignId) {
                            addLeadCustomField(campaignId, contact.id, field);
                        } else {
                            addCustomField(contact.id, field);
                        }
                        handleUpdateLocal('customFields', [...(editedContact.customFields || []), field]);
                    }}
                />

                {Platform.OS === 'ios' && showDatePicker && (
                    <DateTimePicker
                        value={callScheduleDate}
                        mode="datetime"
                        display="default"
                        onChange={handleScheduleChange}
                    />
                )}

                <StatusPicker
                    visible={showLeadSourcePicker}
                    onClose={() => setShowLeadSourcePicker(false)}
                    options={[
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
                    ]}
                    selectedValue={editedContact.source || 'self'}
                    onSelect={(value) => {
                        handleUpdateLocal('source', value);
                        setShowLeadSourcePicker(false);
                    }}
                    title="Select Lead Source"
                />

                <StatusPicker
                    visible={showLeadStatusPicker}
                    onClose={() => setShowLeadStatusPicker(false)}
                    options={[
                        { label: 'Hot Call', value: 'hot' },
                        { label: 'Warm Call', value: 'warm' },
                        { label: 'Cold Call', value: 'cold' },
                        { label: 'Call Back', value: 'callback' },
                    ]}
                    selectedValue={editedContact.status || 'none'}
                    onSelect={(value) => {
                        handleUpdateLocal('status', value);
                        setShowLeadStatusPicker(false);
                    }}
                    title="Select Lead Status"
                />
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F7',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        padding: SPACING.sm,
    },
    backText: {
        fontSize: 24,
        color: COLORS.text,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    saveButton: {
        padding: SPACING.sm,
    },
    saveText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
    },
    content: {
        flex: 1,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: SPACING.lg,
    },
    avatarLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#000000',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#F5F5F7',
    },
    cameraIconText: {
        fontSize: 14,
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 1,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 15,
        color: COLORS.text,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    dividerLine: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 8,
    },
    removeIcon: {
        fontSize: 18,
        color: '#EF4444',
    },
    calendarIcon: {
        fontSize: 18,
    },
    dropdownIcon: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    addFieldButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    addFieldText: {
        fontSize: 15,
        color: COLORS.primary,
        fontWeight: '600',
    },
    sectionHeader: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
});

export default ContactDetailScreen;
