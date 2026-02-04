import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { createLead, searchLeads, clearSearchResults, updateLead } from '../store/slices/leadSlice';
import StatusPicker from '../components/StatusPicker';
import SearchDropdown from '../components/SearchDropdown';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const CreateLeadScreen = ({ navigation, route, onOpenDrawer }) => {
    const { initialPhone, initialName } = route.params || {};
    const dispatch = useDispatch();
    const { searchResults, isSearching, createLoading, error, tenantConfig } = useSelector(state => state.leads);

    // Update mode state
    const [isUpdateMode, setIsUpdateMode] = useState(false);
    const [selectedLeadId, setSelectedLeadId] = useState(null);

    // Field-specific search results
    const [nameSearchResults, setNameSearchResults] = useState([]);
    const [emailSearchResults, setEmailSearchResults] = useState([]);
    const [phoneSearchResults, setPhoneSearchResults] = useState([]);
    const [activeSearchField, setActiveSearchField] = useState(null);

    const [name, setName] = useState(initialName || '');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState(initialPhone || '');
    const [secondaryPhone, setSecondaryPhone] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState(initialPhone || '');
    const [occupation, setOccupation] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [leadSource, setLeadSource] = useState('self');
    const [leadStatus, setLeadStatus] = useState('New');
    const [requirement, setRequirement] = useState('');
    const [customFields, setCustomFields] = useState([]);
    const [showAddField, setShowAddField] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldValue, setNewFieldValue] = useState('');

    // Picker Visibility States
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);

    // Debounce timers
    const nameDebounceTimer = useRef(null);
    const emailDebounceTimer = useRef(null);
    const phoneDebounceTimer = useRef(null);

    // Fetch tenant config on mount
    useEffect(() => {
        if (!tenantConfig) {
            const { fetchTenantConfig } = require('../store/slices/leadSlice');
            dispatch(fetchTenantConfig());
        }
    }, []);

    // Derived options from tenantConfig
    const sourceOptions = tenantConfig?.lead_sources?.map(s => ({
        label: s.label,
        value: s.key
    })) || [];

    const statusOptions = tenantConfig?.lead_statuses?.map(s => ({
        label: s.label,
        value: s.label // Use label to avoid 'status_' prefix
    })) || [];

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

    // Update search results based on field
    useEffect(() => {
        if (activeSearchField === 'name') {
            setNameSearchResults(searchResults);
        } else if (activeSearchField === 'email') {
            setEmailSearchResults(searchResults);
        } else if (activeSearchField === 'phone') {
            setPhoneSearchResults(searchResults);
        }
    }, [searchResults, activeSearchField]);

    // Auto-fill form with selected lead data
    const handleSelectLead = (lead) => {
        setIsUpdateMode(true);
        setSelectedLeadId(lead._id);
        
        // Fill all fields
        setName(lead.name || '');
        setEmail(lead.email || '');
        setPhone(lead.phone || ''); 
        setSecondaryPhone(lead.secondary_mobile || '');
        setWhatsappNumber(lead.whatsapp_number || lead.phone || '');
        setOccupation(lead.occupation || '');
        setCompanyName(lead.company_name || '');
        setLeadSource(lead.lead_source || '');
        setLeadStatus(lead.status || 'New');
        setRequirement(lead.requirement || '');
        
        // Handle custom fields if they exist
        if (lead.custom_fields && typeof lead.custom_fields === 'object') {
            const customFieldsArray = Object.entries(lead.custom_fields).map(([key, value]) => ({
                id: Date.now() + Math.random(),
                name: key,
                value: String(value)
            }));
            setCustomFields(customFieldsArray);
        } else {
            setCustomFields([]);
        }

        // Clear all search results
        setNameSearchResults([]);
        setEmailSearchResults([]);
        setPhoneSearchResults([]);
        setActiveSearchField(null);
        dispatch(clearSearchResults());
    };

    // Debounced search function
    const debouncedSearch = useCallback((query, field, timer) => {
        if (timer.current) {
            clearTimeout(timer.current);
        }

        if (query && query.length >= 2) {
            setActiveSearchField(field);
            timer.current = setTimeout(() => {
                dispatch(searchLeads({ query, field }));
            }, 500); // 500ms debounce
        } else {
            // Clear field-specific results
            if (field === 'name') setNameSearchResults([]);
            if (field === 'email') setEmailSearchResults([]);
            if (field === 'phone') setPhoneSearchResults([]);
            setActiveSearchField(null);
            dispatch(clearSearchResults());
        }
    }, [dispatch]);

    // Handle name change with search
    const handleNameChange = (text) => {
        setName(text);
        debouncedSearch(text, 'name', nameDebounceTimer);
    };

    // Handle email change with search
    const handleEmailChange = (text) => {
        setEmail(text);
        debouncedSearch(text, 'email', emailDebounceTimer);
    };

    // Handle phone change with search
    const handlePhoneChange = (text) => {
        setPhone(text);
        // Auto-fill WhatsApp number if it's empty
        if (!whatsappNumber) {
            setWhatsappNumber(text);
        }
        debouncedSearch(text, 'phone', phoneDebounceTimer);
    };

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (nameDebounceTimer.current) clearTimeout(nameDebounceTimer.current);
            if (emailDebounceTimer.current) clearTimeout(emailDebounceTimer.current);
            if (phoneDebounceTimer.current) clearTimeout(phoneDebounceTimer.current);
        };
    }, []);

    const handleSaveLead = async () => {
        if (!phone.trim()) {
            Alert.alert('Error', 'Mobile number is required');
            return;
        }

        const leadData = {
            name: name.trim() || '',
            phone: phone.trim(),
            secondary_mobile: secondaryPhone.trim() || '',
            whatsapp_number: whatsappNumber.trim() || phone.trim(),
            email: email.trim() || '',
            occupation: occupation.trim() || '',
            company_name: companyName.trim() || '',
            lead_source: leadSource,
            status: leadStatus,
            requirement: requirement.trim() || '',
            custom_fields: customFields.reduce((acc, field) => {
                acc[field.name] = field.value;
                return acc;
            }, {}),
        };

        try {
            if (isUpdateMode && selectedLeadId) {
                // Update existing lead
                await dispatch(updateLead({ id: selectedLeadId, data: leadData })).unwrap();
                Alert.alert('Success', 'Lead updated successfully', [
                    { 
                        text: 'OK', 
                        onPress: () => { 
                            navigation.navigate('Home'); 
                            if (onOpenDrawer) onOpenDrawer(); 
                        } 
                    },
                ]);
            } else {
                // Create new lead
                await dispatch(createLead(leadData)).unwrap();
                Alert.alert('Success', 'Lead created successfully', [
                    { 
                        text: 'OK', 
                        onPress: () => { 
                            navigation.navigate('Home'); 
                            if (onOpenDrawer) onOpenDrawer(); 
                        } 
                    },
                ]);
            }
        } catch (err) {
            Alert.alert('Error', err || `Failed to ${isUpdateMode ? 'update' : 'create'} lead`);
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
                        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
                            <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{isUpdateMode ? 'Update Lead' : 'Create Lead'}</Text>
                        <View style={{ width: 44 }} />
                    </View>
                    <View style={styles.form}>
                        {/* Name */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Name</Text>
                            <View style={{ position: 'relative', zIndex: 3 }}>
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={handleNameChange}
                                    placeholder="Enter name"
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                                <SearchDropdown
                                    results={nameSearchResults}
                                    isSearching={isSearching && activeSearchField === 'name'}
                                    onSelectLead={handleSelectLead}
                                    field="name"
                                />
                            </View>
                        </View>

                        {/* Email */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Email</Text>
                            <View style={{ position: 'relative', zIndex: 2 }}>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={handleEmailChange}
                                    placeholder="Enter email"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                                <SearchDropdown
                                    results={emailSearchResults}
                                    isSearching={isSearching && activeSearchField === 'email'}
                                    onSelectLead={handleSelectLead}
                                    field="email"
                                />
                            </View>
                        </View>

                        {/* Mobile Number */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Mobile Number *</Text>
                            <View style={{ position: 'relative', zIndex: 1 }}>
                                <TextInput
                                    style={styles.input}
                                    value={phone}
                                    onChangeText={handlePhoneChange}
                                    placeholder="Enter mobile number"
                                    keyboardType="phone-pad"
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                                <SearchDropdown
                                    results={phoneSearchResults}
                                    isSearching={isSearching && activeSearchField === 'phone'}
                                    onSelectLead={handleSelectLead}
                                    field="phone"
                                />
                            </View>
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
                        disabled={createLoading}
                    >
                        {createLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                {isUpdateMode ? 'Update Lead' : 'Save Lead'}
                            </Text>
                        )}
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.cardBackground,
    },
    headerButton: {
        padding: 8,
        width: 44,
        alignItems: 'center',
    },
    headerTitle: {
        ...TYPOGRAPHY.title,
        fontSize: 20,
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
        color: COLORS.text,
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
