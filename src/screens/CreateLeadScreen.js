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

const BUDGET_OPTIONS = [
    { label: '5 Lakhs to 50 Lakhs', value: '5 Lakhs to 50 Lakhs' },
    { label: '50 Lakhs to 1 Cr', value: '50 Lakhs to 1 Cr' },
    { label: '1 Cr to 3 Cr', value: '1 Cr to 3 Cr' },
    { label: '3 Cr to 5 Cr', value: '3 Cr to 5 Cr' },
    { label: '5 Cr to 7 Cr', value: '5 Cr to 7 Cr' },
    { label: '7 Cr to 9 Cr', value: '7 Cr to 9 Cr' },
    { label: '10 Cr +', value: '10 Cr +' }
];

const TIMELINE_OPTIONS = [
    { label: '1 Month', value: '1 Month' },
    { label: '3 Months', value: '3 Months' },
    { label: '6 Months', value: '6 Months' },
    { label: '1 Year', value: '1 Year' },
    { label: 'More than 1 year', value: 'More than 1 year' }
];

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
    const [originalStatus, setOriginalStatus] = useState('New'); // Track original status
    const [requirement, setRequirement] = useState('');
    const [budget, setBudget] = useState('');
    const [location, setLocation] = useState('');
    const [timeline, setTimeline] = useState('');

    // Picker Visibility States
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [showBudgetPicker, setShowBudgetPicker] = useState(false);
    const [showTimelinePicker, setShowTimelinePicker] = useState(false);

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
        setOriginalStatus(lead.status || 'New');
        setRequirement(lead.attributes?.requirement || lead.requirement || '');

        // Clear all search results
        setNameSearchResults([]);
        setEmailSearchResults([]);
        setPhoneSearchResults([]);
        setActiveSearchField(null);
        dispatch(clearSearchResults());
    };

    // Initialize from navigation params (initialLeadData)
    useEffect(() => {
        if (route.params?.initialLeadData) {
            const data = route.params.initialLeadData;
            setName(data.name || '');
            setPhone(data.phone || '');
            setEmail(data.email || '');
            setOccupation(data.occupation || '');
            setCompanyName(data.company_name || '');
            setLeadSource(data.lead_source || 'self');
            setLeadStatus(data.status || 'New');
            setOriginalStatus(data.status || 'New');
            setRequirement(data.attributes?.requirement || data.requirement || '');
            setBudget(data.attributes?.budget || data.budget || '');
            setLocation(data.attributes?.location || data.location || '');
            setTimeline(data.attributes?.timeline || data.timeline || '');

            // If it's a conversion, we might want to set a specific source if not provided
            if (data._source === 'log_conversion' && !data.lead_source) {
                setLeadSource('Device Log');
            }
        }
    }, [route.params]);

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
            // status: leadStatus, // Removed unconditional status
            // Only include status if creating new or if updating and status changed
            ...((!isUpdateMode || leadStatus !== originalStatus) && { status: leadStatus }),
            attributes: {
                requirement: requirement.trim() || '',
                budget: budget.trim() || '',
                location: location.trim() || '',
                timeline: timeline.trim() || '',
            }
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
            <View style={styles.header}>
                <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={28} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {isUpdateMode ? 'Update Lead' : 'Create Lead'}
                </Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* SECTION 1 - BASIC INFORMATION CARD */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Basic Information</Text>

                        <View style={[styles.inputContainer, { zIndex: 3 }]}>
                            <Text style={styles.label}>Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter name"
                                value={name}
                                onChangeText={handleNameChange}
                            />
                            <SearchDropdown
                                results={nameSearchResults}
                                isSearching={isSearching && activeSearchField === 'name'}
                                onSelectLead={handleSelectLead}
                                field="name"
                            />
                        </View>

                        <View style={[styles.inputContainer, { zIndex: 2 }]}>
                            <Text style={styles.label}>Mobile Number *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter mobile number"
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={handlePhoneChange}
                            />
                            <SearchDropdown
                                results={phoneSearchResults}
                                isSearching={isSearching && activeSearchField === 'phone'}
                                onSelectLead={handleSelectLead}
                                field="phone"
                            />
                        </View>

                        <View style={[styles.inputContainer, { zIndex: 1 }]}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={handleEmailChange}
                            />
                            <SearchDropdown
                                results={emailSearchResults}
                                isSearching={isSearching && activeSearchField === 'email'}
                                onSelectLead={handleSelectLead}
                                field="email"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Secondary Mobile Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter secondary mobile number"
                                keyboardType="phone-pad"
                                value={secondaryPhone}
                                onChangeText={setSecondaryPhone}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>WhatsApp Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter WhatsApp number"
                                keyboardType="phone-pad"
                                value={whatsappNumber}
                                onChangeText={setWhatsappNumber}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Occupation</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter occupation"
                                value={occupation}
                                onChangeText={setOccupation}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Company Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter company name"
                                value={companyName}
                                onChangeText={setCompanyName}
                            />
                        </View>

                    </View>

                    {/* SECTION 2 - LEAD STATUS CARD */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Lead Status</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Current Status</Text>
                            <TouchableOpacity
                                style={styles.disabledInput}
                                onPress={() => setShowStatusPicker(true)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.disabledText}>
                                    {statusOptions.find((o) => o.value === leadStatus)?.label || 'Select Status'}
                                </Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* SECTION 3 - LEAD SOURCE CARD */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Lead Source</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Source</Text>
                            <TouchableOpacity
                                style={styles.disabledInput}
                                onPress={() => setShowSourcePicker(true)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.disabledText}>
                                    {sourceOptions.find((o) => o.value === leadSource)?.label || 'Select Source'}
                                </Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* SECTION 4 - REQUIREMENT CARD */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Requirement Details</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Requirement</Text>
                            <TextInput
                                style={[styles.input, styles.multilineInput]}
                                placeholder="Looking for 3BHK villa in gated community"
                                placeholderTextColor="#D1D5DB"
                                multiline
                                numberOfLines={4}
                                value={requirement}
                                onChangeText={setRequirement}
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Budget (Optional)</Text>
                            <TouchableOpacity
                                style={styles.pickerSelector}
                                onPress={() => setShowBudgetPicker(true)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.pickerSelectorText, !budget && { color: '#9CA3AF' }]}>
                                    {budget || 'Select Budget'}
                                </Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Preferred Location (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="E.g. Whitefield, Bengaluru"
                                placeholderTextColor="#9CA3AF"
                                value={location}
                                onChangeText={setLocation}
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Timeline (Optional)</Text>
                            <TouchableOpacity
                                style={styles.pickerSelector}
                                onPress={() => setShowTimelinePicker(true)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.pickerSelectorText, !timeline && { color: '#9CA3AF' }]}>
                                    {timeline || 'Select Timeline'}
                                </Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* STATUS & SOURCE PICKERS */}
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

            <StatusPicker
                visible={showBudgetPicker}
                onClose={() => setShowBudgetPicker(false)}
                options={BUDGET_OPTIONS}
                selectedValue={budget}
                onSelect={setBudget}
                title="Select Budget"
            />

            <StatusPicker
                visible={showTimelinePicker}
                onClose={() => setShowTimelinePicker(false)}
                options={TIMELINE_OPTIONS}
                selectedValue={timeline}
                onSelect={setTimeline}
                title="Select Timeline"
            />

            {/* FIXED BOTTOM BUTTON */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveLead} disabled={createLoading}>
                    {createLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>{isUpdateMode ? 'Update Lead' : 'Save Lead'}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 12,
        paddingBottom: 16,
        backgroundColor: 'transparent',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontFamily: 'SF Pro Display',
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#8a79d6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    cardTitle: {
        fontFamily: 'SF Pro Display',
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F0FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addButtonText: {
        color: COLORS.primaryPurple,
        fontWeight: '600',
        marginLeft: 4,
        fontSize: 14,
    },
    inputContainer: {
        marginBottom: 16,
        position: 'relative',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    multilineInput: {
        height: 100,
        paddingTop: 12,
        textAlignVertical: 'top',
    },
    inputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 4,
    },
    disabledInput: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    disabledText: {
        fontSize: 16,
        color: '#6B7280',
    },
    pickerSelector: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pickerSelectorText: {
        fontSize: 16,
        color: '#111827',
        fontFamily: 'SF Pro Display',
    },
    customFieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    customInputKey: {
        flex: 1,
        marginRight: 8,
    },
    customInputValue: {
        flex: 2,
        marginRight: 8,
    },
    removeButton: {
        padding: 4,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
        flexDirection: 'row',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    cancelButtonText: {
        color: '#4B5563',
        fontSize: 18,
        fontWeight: '600',
        fontFamily: 'SF Pro Display',
    },
    saveButton: {
        backgroundColor: COLORS.primaryPurple || '#6C4DFF',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 2,
        shadowColor: COLORS.primaryPurple || '#6C4DFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        fontFamily: 'SF Pro Display',
    },
});

export default CreateLeadScreen;
