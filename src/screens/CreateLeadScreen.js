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
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

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
    const [leadSource, setLeadSource] = useState('');
    const [leadStatus, setLeadStatus] = useState('');
    const [originalStatus, setOriginalStatus] = useState(''); // Track original status
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

        if (!leadStatus) {
            Alert.alert('Error', 'Please select a lead status');
            return;
        }

        if (!leadSource) {
            Alert.alert('Error', 'Please select a lead source');
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
        <View style={styles.container}>
            <LinearGradient
                colors={[COLORS.royalBlue, COLORS.violet]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.headerGradient}
            >
                <SafeAreaView edges={['top']} style={styles.header}>
                    <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={26} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {isUpdateMode ? 'Update Lead' : 'Create Lead'}
                    </Text>
                    <View style={{ width: 40 }} /> {/* Placeholder to center title */}
                </SafeAreaView>
            </LinearGradient>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >

                    {/* SECTION 1 - BASIC INFORMATION CARD */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialIcons name="person-outline" size={22} color={COLORS.royalBlue} />
                            <Text style={styles.cardTitle}>Basic Information</Text>
                        </View>

                        <View style={[styles.inputContainer, { zIndex: 3 }]}>
                            <Text style={styles.label}>Name *</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcons name="person" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter lead name"
                                    placeholderTextColor="#9CA3AF"
                                    value={name}
                                    onChangeText={handleNameChange}
                                />
                            </View>
                            <SearchDropdown
                                results={nameSearchResults}
                                isSearching={isSearching && activeSearchField === 'name'}
                                onSelectLead={handleSelectLead}
                                field="name"
                            />
                        </View>

                        <View style={[styles.inputContainer, { zIndex: 2 }]}>
                            <Text style={styles.label}>Mobile Number *</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcons name="phone" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter mobile number"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={handlePhoneChange}
                                />
                            </View>
                            <SearchDropdown
                                results={phoneSearchResults}
                                isSearching={isSearching && activeSearchField === 'phone'}
                                onSelectLead={handleSelectLead}
                                field="phone"
                            />
                        </View>

                        <View style={[styles.inputContainer, { zIndex: 1 }]}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcons name="email" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter email address"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={handleEmailChange}
                                />
                            </View>
                            <SearchDropdown
                                results={emailSearchResults}
                                isSearching={isSearching && activeSearchField === 'email'}
                                onSelectLead={handleSelectLead}
                                field="email"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Secondary Mobile Number</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcons name="phone-android" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter secondary number (optional)"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="phone-pad"
                                    value={secondaryPhone}
                                    onChangeText={setSecondaryPhone}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>WhatsApp Number</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcons name="chat" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter WhatsApp number"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="phone-pad"
                                    value={whatsappNumber}
                                    onChangeText={setWhatsappNumber}
                                />
                            </View>
                        </View>

                        <View style={styles.rowInputs}>
                            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Occupation</Text>
                                <View style={styles.inputWrapper}>
                                    <MaterialIcons name="work-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Occupation"
                                        placeholderTextColor="#9CA3AF"
                                        value={occupation}
                                        onChangeText={setOccupation}
                                    />
                                </View>
                            </View>
                            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Company</Text>
                                <View style={styles.inputWrapper}>
                                    <MaterialIcons name="business" size={18} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Company"
                                        placeholderTextColor="#9CA3AF"
                                        value={companyName}
                                        onChangeText={setCompanyName}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* SECTION 2 - CONFIGURATION CARD */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialIcons name="settings-suggest" size={22} color={COLORS.royalBlue} />
                            <Text style={styles.cardTitle}>Source & Status</Text>
                        </View>

                        <View style={styles.rowInputs}>
                            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Lead Source</Text>
                                <TouchableOpacity
                                    style={styles.selector}
                                    onPress={() => setShowSourcePicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.selectorText, !leadSource && { color: '#9CA3AF' }]} numberOfLines={1}>
                                        {sourceOptions.find((o) => o.value === leadSource)?.label || 'Select Source'}
                                    </Text>
                                    <MaterialIcons name="unfold-more" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Current Status *</Text>
                                <TouchableOpacity
                                    style={styles.selector}
                                    onPress={() => setShowStatusPicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.selectorText, !leadStatus && { color: '#9CA3AF' }]} numberOfLines={1}>
                                        {statusOptions.find((o) => o.value === leadStatus)?.label || 'Select Status'}
                                    </Text>
                                    <MaterialIcons name="unfold-more" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* SECTION 3 - REQUIREMENT Details CARD */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialIcons name="assignment" size={22} color={COLORS.royalBlue} />
                            <Text style={styles.cardTitle}>Requirement Details</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Detailed Requirement</Text>
                            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Tell us what the lead is looking for..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    numberOfLines={4}
                                    value={requirement}
                                    onChangeText={setRequirement}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Budget (Optional)</Text>
                            <TouchableOpacity
                                style={styles.selector}
                                onPress={() => setShowBudgetPicker(true)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.selectorContent}>
                                    <MaterialIcons name="payments" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
                                    <Text style={[styles.selectorText, !budget && { color: '#9CA3AF' }]}>
                                        {budget || 'Select Budget Range'}
                                    </Text>
                                </View>
                                <MaterialIcons name="expand-more" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Preferred Location</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcons name="location-on" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter preferred location"
                                    placeholderTextColor="#9CA3AF"
                                    value={location}
                                    onChangeText={setLocation}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Purchase Timeline</Text>
                            <TouchableOpacity
                                style={styles.selector}
                                onPress={() => setShowTimelinePicker(true)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.selectorContent}>
                                    <MaterialIcons name="event-available" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
                                    <Text style={[styles.selectorText, !timeline && { color: '#9CA3AF' }]}>
                                        {timeline || 'Select Expected Timeline'}
                                    </Text>
                                </View>
                                <MaterialIcons name="expand-more" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.footerButton, styles.cancelButton]}
                        onPress={handleCancel}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={styles.saveAction}
                        onPress={handleSaveLead}
                        disabled={createLoading || !name || !phone || !leadStatus}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={(createLoading || !name || !phone || !leadStatus) ? ['#A0AEC0', '#718096'] : [COLORS.royalBlue, COLORS.violet]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.saveButtonGradient}
                        >
                            {createLoading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.saveButtonText}>
                                        {isUpdateMode ? 'Update Lead' : 'Save Lead'}
                                    </Text>
                                    <MaterialIcons name="check-circle" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                                </>
                            )}
                        </LinearGradient>
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.lightVioletBg || '#F5F3FF',
    },
    headerGradient: {
        paddingBottom: 4,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        ...SHADOWS.medium,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 8,
        paddingBottom: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitle: {
        fontFamily: 'SF Pro Display',
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
        flex: 1,
        textAlign: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingTop: 10,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        ...SHADOWS.medium,
        borderWidth: 1,
        borderColor: '#F3E8FF',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardTitle: {
        fontFamily: 'SF Pro Display',
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.deepPurple || '#5014B4',
        marginLeft: 10,
    },
    inputContainer: {
        marginBottom: 18,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        fontFamily: 'SF Pro Display',
    },
    textAreaWrapper: {
        alignItems: 'flex-start',
        paddingTop: 4,
    },
    textArea: {
        flex: 1,
        height: 100,
        fontSize: 16,
        color: '#111827',
        textAlignVertical: 'top',
        fontFamily: 'SF Pro Display',
    },
    rowInputs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    selectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    selectorText: {
        fontSize: 15,
        color: '#111827',
        fontWeight: '500',
        fontFamily: 'SF Pro Display',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 24 : 14,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        ...SHADOWS.large,
    },
    footerButton: {
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        marginRight: 12,
    },
    cancelButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '600',
    },
    saveAction: {
        flex: 2,
    },
    saveButtonGradient: {
        flex: 1,
        height: 54,
        borderRadius: 27,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
});

export default CreateLeadScreen;
