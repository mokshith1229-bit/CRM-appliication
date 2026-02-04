import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    
    Image,
    Alert,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useDispatch, useSelector } from 'react-redux';
import { updateLead, syncCallLogs } from '../store/slices/leadSlice';
import EditableField from '../components/EditableField';
import CustomFieldModal from '../components/CustomFieldModal';
import StatusPicker from '../components/StatusPicker';
import CallLogItem from '../components/CallLogItem';
import defaultAvatar from '../assets/default_avatar.jpg';
import { registerForPushNotificationsAsync, schedulePushNotification } from '../utils/NotificationService';

const ContactDetailScreen = ({ visible, contact, onClose, navigation, campaignId, campaignName }) => {
    const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [callScheduleDate, setCallScheduleDate] = useState(new Date());
    const [showLeadSourcePicker, setShowLeadSourcePicker] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [showCallLogs, setShowCallLogs] = useState(true);

    // Batch editing state
    const [editedContact, setEditedContact] = useState(null);
    const [isDirty, setIsDirty] = useState(false);

    // Redux Actions
    const dispatch = useDispatch();
    const { sources, statuses } = useSelector(state => state.config);
    // We don't need all these individual actions anymore, as updateLead handles generic updates.
    // Actually better to import at top. I will do that in separate edit.
    
    // We don't need all these individual actions anymore, as updateLead handles generic updates.
    // But we need to map the logic.

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

    // Sync call logs when screen opens
    React.useEffect(() => {
        if (visible && contact?.id) {
            dispatch(syncCallLogs(contact.id));
        }
    }, [visible, contact?.id]);

    const handleSaveAll = async () => {
        if (!isDirty || !editedContact) {
            onClose();
            return;
        }

        try {
            // Prepare update payload
            // For campaigns or regular leads, the backend is unified now (assuming campaignId is just a filter attribute or separate collection relation)
            // If the user is just editing the lead, we send the updated fields.
            
            // Map flat fields to backend schema
            const payload = {
                name: editedContact.name,
                phone: editedContact.phone, // Standard phone key
                email: editedContact.email,
                whatsapp_number: editedContact.whatsapp, // Map whatsapp -> whatsapp_number
                status: editedContact.status, // Standard status key
                lead_source: editedContact.lead_source || editedContact.source, // Prioritize lead_source
                photo: editedContact.photo, // Add photo
                call_logs: editedContact.callLogs, // Add call_logs
                attributes: {
                    ...editedContact.attributes,
                    callSchedule: editedContact.callSchedule, // Store schedule in attributes as per schema investigation or convention
                    callScheduleNote: editedContact.callScheduleNote,
                    customFields: editedContact.customFields // Store custom fields in attributes
                }
            };
            
            await dispatch(updateLead({ id: contact.id, data: payload })).unwrap();

            // Handling Notifications locally after successful save
             if (editedContact.callSchedule !== contact.callSchedule && editedContact.callSchedule) {
                 await schedulePushNotification(
                     `Call Reminder: ${editedContact.name}`,
                     editedContact.callScheduleNote || `It's time to call ${editedContact.name}`,
                     new Date(editedContact.callSchedule)
                 );
             }

            setIsDirty(false);
            onClose();
            if (navigation) {
                // Navigate if needed, or just stay since it's a modal closure usually
                // The original code navigated. I will preserve it but check stack.
                // navigation.navigate('Home'); 
                // Since it's a modal, usually we don't navigate away. The original code did navigate.
                // I will keep behavior but maybe optional.
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', error.message || 'Failed to save changes. Please try again.');
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
                                handleUpdateLocal('photo', result.assets[0].uri);
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
                                handleUpdateLocal('photo', result.assets[0].uri);
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
                                    handleUpdateLocal('customFields', (editedContact.customFields || []).filter(f => f.id !== field.id));
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
                        <TouchableOpacity style={styles.infoRow} onPress={() => setShowStatusPicker(true)}>
                            <Text style={styles.infoLabel}>
                                Lead Status : {editedContact.status ? (editedContact.status.charAt(0).toUpperCase() + editedContact.status.slice(1).replace('_', ' ')) : 'None'}
                            </Text>
                            <Text style={styles.dropdownIcon}>▼</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoCard}>
                        <TouchableOpacity style={styles.infoRow} onPress={() => setShowLeadSourcePicker(true)}>
                            <Text style={styles.infoLabel}>
                                Lead Source : {editedContact.lead_source || editedContact.source ? ((editedContact.lead_source || editedContact.source).charAt(0).toUpperCase() + (editedContact.lead_source || editedContact.source).slice(1).replace('_', ' ')) : 'Not Set'}
                            </Text>
                            <Text style={styles.dropdownIcon}>▼</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Call Description Toggle */}
                    <TouchableOpacity
                        style={[styles.sectionHeader, { backgroundColor: showCallLogs ? '#F0F0F2' : '#F5F5F7' }]}
                        onPress={() => setShowCallLogs(!showCallLogs)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.infoRow}>
                            <Text style={styles.sectionTitle}>Call Description</Text>
                            <Text style={styles.dropdownIcon}>{showCallLogs ? '▲' : '▼'}</Text>
                        </View>
                    </TouchableOpacity>

                    {showCallLogs && (
                        <View>
                            {(editedContact.callLogs || [
                                { id: 'c1', date: 'Dec 4, 14:05', status: 'Connected', duration: '8m 45sec', notes: 'Discussed property requirements', type: 'Outgoing' },
                                { id: 'c2', date: 'Dec 4, 10:15', status: 'Disconnected', duration: '0m 0sec', notes: '', type: 'Outgoing' },
                            ]).map((call) => (
                                <CallLogItem
                                    key={call.id}
                                    call={call}
                                    onUpdateNote={(callId, note) => {
                                        const updatedLogs = editedContact.callLogs?.map(c => 
                                            c.id === callId ? { ...c, notes: note } : c
                                        ) || [];
                                        handleUpdateLocal('callLogs', updatedLogs);
                                    }}
                                />
                            ))}
                        </View>
                    )}
                </ScrollView>

                {/* Modals & Pickers */}
                <CustomFieldModal
                    visible={showCustomFieldModal}
                    onClose={() => setShowCustomFieldModal(false)}
                    onAdd={(field) => {
                        // Update local state only; save happens in handleSaveAll
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
                    options={sources.map(s => ({ label: s.label, value: s.key }))}
                    selectedValue={editedContact.lead_source || editedContact.source || 'self'}
                    onSelect={(value) => {
                        handleUpdateLocal('lead_source', value); // Map to 'lead_source'
                        setShowLeadSourcePicker(false);
                    }}
                    title="Select Lead Source"
                />

                <StatusPicker
                    visible={showStatusPicker}
                    onClose={() => setShowStatusPicker(false)}
                    options={statuses.map(s => ({ label: s.label, value: s.key }))}
                    selectedValue={editedContact.status || 'none'}
                    onSelect={(value) => {
                        handleUpdateLocal('status', value);
                        setShowStatusPicker(false);
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
