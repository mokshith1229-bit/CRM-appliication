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
import { createLead, searchLeads, clearSearchResults, updateLead, fetchTenantConfig } from '../store/slices/leadSlice';
import { fetchTeamMembers } from '../store/slices/teamSlice';
import { fetchProjects } from '../store/slices/projectSlice';
import StatusPicker from '../components/StatusPicker';
import SearchDropdown from '../components/SearchDropdown';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const BookSiteVisitScreen = ({ navigation, route, onOpenDrawer }) => {
    const { initialPhone, initialName } = route.params || {};
    const dispatch = useDispatch();
    const { searchResults, isSearching, createLoading, tenantConfig } = useSelector(state => state.leads);
    const { members } = useSelector(state => state.team);
    const { projects } = useSelector(state => state.projects);

    // Update mode state
    const [isUpdateMode, setIsUpdateMode] = useState(false);
    const [selectedLeadId, setSelectedLeadId] = useState(null);

    // Field-specific search results
    const [nameSearchResults, setNameSearchResults] = useState([]);
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
    const [leadStatus, setLeadStatus] = useState('New');
    const [requirement, setRequirement] = useState('');
    const [siteVisitDone] = useState(true); // Default true as per user request
    const [siteVisitReview, setSiteVisitReview] = useState('');
    const [siteVisitDoneBy, setSiteVisitDoneBy] = useState('');
    const [projectId, setProjectId] = useState('');

    // Picker Visibility States
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [showDoneByPicker, setShowDoneByPicker] = useState(false);
    const [showProjectPicker, setShowProjectPicker] = useState(false);

    // Debounce timers
    const nameDebounceTimer = useRef(null);
    const phoneDebounceTimer = useRef(null);

    // Fetch dependencies on mount
    useEffect(() => {
        if (!tenantConfig) dispatch(fetchTenantConfig());
        if (members.length === 0) dispatch(fetchTeamMembers());
        if (projects.length === 0) dispatch(fetchProjects());
    }, []);

    // Derived options
    const sourceOptions = tenantConfig?.lead_sources?.map(s => ({
        label: s.label,
        value: s.key
    })) || [];

    const statusOptions = tenantConfig?.lead_statuses?.map(s => ({
        label: s.label,
        value: s.label // Use label to avoid 'status_' prefix
    })) || [];

    const memberOptions = members.map(m => ({
        label: m.name || m.email,
        value: m._id
    }));

    const projectOptions = projects.map(p => ({
        label: p.name,
        value: p._id
    }));

    // Update search results
    useEffect(() => {
        if (activeSearchField === 'name') {
            setNameSearchResults(searchResults);
        } else if (activeSearchField === 'phone') {
            setPhoneSearchResults(searchResults);
        }
    }, [searchResults, activeSearchField]);

    const handleSelectLead = (lead) => {
        setIsUpdateMode(true);
        setSelectedLeadId(lead._id);
        
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
        
        setSiteVisitReview(lead.site_visit_review || '');
        // Handle potential populated objects or IDs
        setSiteVisitDoneBy(lead.site_visit_done_by?._id || lead.site_visit_done_by || '');
        setProjectId(lead.project_id?._id || lead.project_id || '');

        setNameSearchResults([]);
        setPhoneSearchResults([]);
        setActiveSearchField(null);
        dispatch(clearSearchResults());
    };

    const debouncedSearch = useCallback((query, field, timer) => {
        if (timer.current) clearTimeout(timer.current);
        if (query && query.length >= 2) {
            setActiveSearchField(field);
            timer.current = setTimeout(() => {
                dispatch(searchLeads({ query, field }));
            }, 500);
        } else {
            if (field === 'name') setNameSearchResults([]);
            if (field === 'phone') setPhoneSearchResults([]);
            setActiveSearchField(null);
            dispatch(clearSearchResults());
        }
    }, [dispatch]);

    const handleNameChange = (text) => {
        setName(text);
        debouncedSearch(text, 'name', nameDebounceTimer);
    };

    const handlePhoneChange = (text) => {
        setPhone(text);
        if (!whatsappNumber) setWhatsappNumber(text);
        debouncedSearch(text, 'phone', phoneDebounceTimer);
    };

    const handleSave = async () => {
        if (!phone.trim()) {
            Alert.alert('Error', 'Mobile number is required');
            return;
        }

        const leadData = {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            secondary_mobile: secondaryPhone.trim(),
            whatsapp_number: whatsappNumber.trim(),
            occupation: occupation.trim(),
            company_name: companyName.trim(),
            lead_source: leadSource,
            lead_source: leadSource,
            // Only include status if creating new or if updating and status changed
            ...((!isUpdateMode || leadStatus !== (route.params?.lead?.status || 'New')) && { status: leadStatus }),
            requirement: requirement.trim(),
            site_visit_done: true,
            site_visit_review: siteVisitReview.trim(),
            site_visit_done_by: siteVisitDoneBy || undefined,
            project_id: projectId || undefined,
        };

        try {
            if (isUpdateMode && selectedLeadId) {
                await dispatch(updateLead({ id: selectedLeadId, data: leadData })).unwrap();
                Alert.alert('Success', 'Site visit updated successfully', [
                    { text: 'OK', onPress: () => { navigation.navigate('Home'); if (onOpenDrawer) onOpenDrawer(); } }
                ]);
            } else {
                await dispatch(createLead(leadData)).unwrap();
                Alert.alert('Success', 'Site visit lead created successfully', [
                    { text: 'OK', onPress: () => { navigation.navigate('Home'); if (onOpenDrawer) onOpenDrawer(); } }
                ]);
            }
        } catch (err) {
            Alert.alert('Error', err || 'Failed to save site visit');
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
                        <Text style={styles.headerTitle}>Book Site Visit</Text>
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

                        {/* Phone */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Mobile Number *</Text>
                            <View style={{ position: 'relative', zIndex: 2 }}>
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

                        {/* project Picker */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Project</Text>
                            <TouchableOpacity
                                style={styles.selectButton}
                                onPress={() => setShowProjectPicker(true)}
                            >
                                <Text style={styles.selectButtonText}>
                                    {projectOptions.find(o => o.value === projectId)?.label || 'Select Project'}
                                </Text>
                                <MaterialIcons name="keyboard-arrow-down" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Done By Picker */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Site Visit Done By</Text>
                            <TouchableOpacity
                                style={styles.selectButton}
                                onPress={() => setShowDoneByPicker(true)}
                            >
                                <Text style={styles.selectButtonText}>
                                    {memberOptions.find(o => o.value === siteVisitDoneBy)?.label || 'Select Team Member'}
                                </Text>
                                <MaterialIcons name="keyboard-arrow-down" size={24} color={COLORS.textSecondary} />
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
                                <MaterialIcons name="keyboard-arrow-down" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Review/Requirement */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Site Visit Review / Requirement</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={siteVisitReview || requirement}
                                onChangeText={(text) => {
                                    setSiteVisitReview(text);
                                    setRequirement(text);
                                }}
                                placeholder="Enter review notes or requirements"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>

                        {/* Additional Info */}
                        <Text style={styles.sectionTitle}>Additional Information</Text>
                        
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

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Source</Text>
                            <TouchableOpacity
                                style={styles.selectButton}
                                onPress={() => setShowSourcePicker(true)}
                            >
                                <Text style={styles.selectButtonText}>
                                    {sourceOptions.find(o => o.value === leadSource)?.label || 'Select Source'}
                                </Text>
                                <MaterialIcons name="keyboard-arrow-down" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                    </View>
                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton, { flex: 1, marginRight: SPACING.sm }]}
                        onPress={handleCancel}
                    >
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton, { flex: 1 }]}
                        onPress={handleSave}
                        disabled={createLoading}
                    >
                        {createLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                {isUpdateMode ? 'Update' : 'Save'}
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
                    title="Select Source"
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
                    visible={showProjectPicker}
                    onClose={() => setShowProjectPicker(false)}
                    options={projectOptions}
                    selectedValue={projectId}
                    onSelect={setProjectId}
                    title="Select Project"
                />
                <StatusPicker
                    visible={showDoneByPicker}
                    onClose={() => setShowDoneByPicker(false)}
                    options={memberOptions}
                    selectedValue={siteVisitDoneBy}
                    onSelect={setSiteVisitDoneBy}
                    title="Done By"
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
    keyboardView: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 100 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.cardBackground,
    },
    headerButton: { width: 44, alignItems: 'center', padding: 8 },
    headerTitle: {
        ...TYPOGRAPHY.title,
        fontSize: 20,
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
        color: COLORS.text,
    },
    form: { padding: 16 },
    fieldContainer: { marginBottom: SPACING.md },
    label: {
        ...TYPOGRAPHY.subtitle,
        marginBottom: SPACING.xs,
        fontWeight: '600',
        color: COLORS.text,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: SPACING.md,
        fontSize: 16,
        backgroundColor: COLORS.cardBackground,
        color: COLORS.text,
    },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
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
    selectButtonText: { fontSize: 16, color: COLORS.text },
    sectionTitle: {
        ...TYPOGRAPHY.subtitle,
        fontSize: 18,
        fontWeight: '700',
        marginTop: 10,
        marginBottom: 15,
        color: COLORS.textSecondary,
    },
    footer: {
        flexDirection: 'row',
        padding: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.cardBackground,
    },
    button: { paddingVertical: SPACING.md, borderRadius: 8, alignItems: 'center' },
    primaryButton: { backgroundColor: COLORS.primary },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    secondaryButton: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: COLORS.border },
    secondaryButtonText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
});

export default BookSiteVisitScreen;
