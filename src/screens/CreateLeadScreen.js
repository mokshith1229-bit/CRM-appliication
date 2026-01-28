import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { useContactStore } from '../store/contactStore';
import StatusPicker from '../components/StatusPicker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const CreateLeadScreen = ({ navigation, route, onOpenDrawer }) => {
    const { initialPhone, initialName } = route.params || {};

    const [name, setName] = useState(initialName || '');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState(initialPhone || '');
    const [secondaryPhone, setSecondaryPhone] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState(initialPhone || '');
    const [occupation, setOccupation] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [leadSource, setLeadSource] = useState('self');
    const [leadStatus, setLeadStatus] = useState('none');
    const [requirement, setRequirement] = useState('');
    const [customFields, setCustomFields] = useState([]);
    const [showAddField, setShowAddField] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldValue, setNewFieldValue] = useState('');

    // Picker Visibility States
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);

    const addContact = useContactStore((state) => state.addContact);

    const sourceOptions = [
        { label: 'Facebook', value: 'facebook' },
        { label: 'Google', value: 'google' },
        { label: 'Manager', value: 'manager' },
        { label: 'Self', value: 'self' },
        { label: 'Walk in', value: 'walk_in' },
        { label: 'WhatsApp', value: 'whatsapp' },
    ];

    const statusOptions = [
        { label: 'None', value: 'none' },
        { label: 'Hot', value: 'hot' },
        { label: 'Warm', value: 'warm' },
        { label: 'Cold', value: 'cold' },
        { label: 'Not Interested', value: 'not_interested' },
    ];

    const handleAddCustomField = () => {
        if (newFieldName.trim() && newFieldValue.trim()) {
            setCustomFields([
                ...customFields,
                { id: Date.now().toString(), name: newFieldName, value: newFieldValue },
            ]);
            setNewFieldName('');
            setNewFieldValue('');
            setShowAddField(false);
        }
    };

    const handleRemoveCustomField = (id) => {
        setCustomFields(customFields.filter((field) => field.id !== id));
    };

    const handleSaveLead = async () => {
        if (!phone.trim()) {
            Alert.alert('Error', 'Mobile number is required');
            return;
        }

        const newLead = {
            id: Date.now().toString(),
            name: name.trim() || '',
            phone: phone.trim(),
            secondaryPhone: secondaryPhone.trim() || '',
            whatsappNumber: whatsappNumber.trim() || phone.trim(),
            email: email.trim() || '',
            occupation: occupation.trim() || '',
            companyName: companyName.trim() || '',
            source: leadSource,
            status: leadStatus,
            requirement: requirement.trim() || '',
            customFields,
            assignedTo: '',
            callStatus: 'disconnected',
            callDirection: 'outgoing',
            lastCallTime: new Date().toISOString(),
            leadDescription: requirement.trim() || '',
            notes: [],
        };

        const success = await addContact(newLead);
        if (success) {
            Alert.alert('Success', 'Lead created successfully', [
                { text: 'OK', onPress: () => { navigation.navigate('Home'); if (onOpenDrawer) onOpenDrawer(); } },
            ]);
        } else {
            Alert.alert('Error', 'Failed to create lead');
        }
    };

    const handleCancel = () => {
        navigation.goBack();
        if (onOpenDrawer) onOpenDrawer();
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
                            <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Create New Lead</Text>
                    </View>

                    <View style={styles.form}>
                        {/* Name */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter name"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>

                        {/* Email */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>

                        {/* Mobile Number */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Mobile Number *</Text>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={(text) => {
                                    setPhone(text);
                                    // Auto-fill WhatsApp number if it's empty
                                    if (!whatsappNumber) {
                                        setWhatsappNumber(text);
                                    }
                                }}
                                placeholder="Enter mobile number"
                                keyboardType="phone-pad"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>

                        {/* Secondary Mobile Number */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Secondary Mobile Number</Text>
                            <TextInput
                                style={styles.input}
                                value={secondaryPhone}
                                onChangeText={setSecondaryPhone}
                                placeholder="Enter secondary mobile number (optional)"
                                keyboardType="phone-pad"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>

                        {/* WhatsApp Number */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>WhatsApp Number</Text>
                            <TextInput
                                style={styles.input}
                                value={whatsappNumber}
                                onChangeText={setWhatsappNumber}
                                placeholder="Enter WhatsApp number"
                                keyboardType="phone-pad"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>

                        {/* Occupation */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Occupation</Text>
                            <TextInput
                                style={styles.input}
                                value={occupation}
                                onChangeText={setOccupation}
                                placeholder="Enter occupation"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>

                        {/* Company Name */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Company Name</Text>
                            <TextInput
                                style={styles.input}
                                value={companyName}
                                onChangeText={setCompanyName}
                                placeholder="Enter company name"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>

                        {/* Lead Source */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Lead Source</Text>
                            <TouchableOpacity
                                style={styles.selectButton}
                                onPress={() => setShowSourcePicker(true)}
                            >
                                <Text style={styles.selectButtonText}>
                                    {sourceOptions.find((o) => o.value === leadSource)?.label || 'Select Source'}
                                </Text>
                                <Text style={styles.selectArrow}>▼</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Lead Status */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Lead Status</Text>
                            <TouchableOpacity
                                style={styles.selectButton}
                                onPress={() => setShowStatusPicker(true)}
                            >
                                <Text style={styles.selectButtonText}>
                                    {statusOptions.find((o) => o.value === leadStatus)?.label || 'Select Status'}
                                </Text>
                                <Text style={styles.selectArrow}>▼</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Requirement */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Requirement</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={requirement}
                                onChangeText={setRequirement}
                                placeholder="Enter requirement details"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>

                        {/* Custom Fields */}
                        {customFields.map((field) => (
                            <View key={field.id} style={styles.customFieldContainer}>
                                <View style={styles.customFieldHeader}>
                                    <Text style={styles.label}>{field.name}</Text>
                                    <TouchableOpacity onPress={() => handleRemoveCustomField(field.id)}>
                                        <Text style={styles.removeButton}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.customFieldValue}>{field.value}</Text>
                            </View>
                        ))}

                        {/* Add New Field */}

                    </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton, { flex: 1, marginRight: SPACING.sm }]}
                        onPress={handleCancel}
                    >
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton, { flex: 1 }]}
                        onPress={handleSaveLead}
                    >
                        <Text style={styles.primaryButtonText}>Save Lead</Text>
                    </TouchableOpacity>
                </View>
                {/* Pickers */}
                <StatusPicker
                    visible={showSourcePicker}
                    onClose={() => setShowSourcePicker(false)}
                    options={sourceOptions}
                    selectedValue={leadSource}
                    onSelect={setLeadSource}
                    title="Select Lead Source"
                />

                <StatusPicker
                    visible={showStatusPicker}
                    onClose={() => setShowStatusPicker(false)}
                    options={statusOptions}
                    selectedValue={leadStatus}
                    onSelect={setLeadStatus}
                    title="Select Lead Status"
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        marginBottom: SPACING.sm,
    },
    backButtonText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        ...TYPOGRAPHY.title,
        fontSize: 24,
        fontWeight: '700',
    },
    form: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
    },
    fieldContainer: {
        marginBottom: SPACING.md,
    },
    label: {
        ...TYPOGRAPHY.subtitle,
        marginBottom: SPACING.xs,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: SPACING.md,
        fontSize: 16,
        backgroundColor: COLORS.cardBackground,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    selectButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: SPACING.md,
        backgroundColor: COLORS.cardBackground,
    },
    selectButtonText: {
        fontSize: 16,
        color: COLORS.text,
    },
    selectArrow: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    customFieldContainer: {
        marginBottom: SPACING.md,
        padding: SPACING.md,
        backgroundColor: '#F9F9F9',
        borderRadius: 8,
    },
    customFieldHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    customFieldValue: {
        ...TYPOGRAPHY.body,
        color: COLORS.text,
    },
    removeButton: {
        fontSize: 20,
        color: '#EF4444',
        fontWeight: '600',
    },
    addFieldForm: {
        marginTop: SPACING.md,
        padding: SPACING.md,
        backgroundColor: '#F0F9FF',
        borderRadius: 8,
    },
    addFieldButtons: {
        flexDirection: 'row',
        marginTop: SPACING.md,
        gap: SPACING.sm,
    },
    addFieldButton: {
        marginTop: SPACING.md,
        padding: SPACING.md,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderRadius: 8,
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    addFieldButtonText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        padding: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.cardBackground,
    },
    button: {
        paddingVertical: SPACING.md,
        borderRadius: 8,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    secondaryButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CreateLeadScreen;
