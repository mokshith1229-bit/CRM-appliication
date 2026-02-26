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
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../constants/theme';

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
    const [leadStatus, setLeadStatus] = useState('');
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

        if (!leadStatus) {
            Alert.alert('Error', 'Please select a lead status');
            return;
        }

        if (!leadSource) {
            Alert.alert('Error', 'Please select a lead source');
            return;
        }

        if (!projectId) {
            Alert.alert('Error', 'Please select a project');
            return;
        }

        if (!siteVisitDoneBy) {
            Alert.alert('Error', 'Please select who did the site visit');
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
        <View style={styles.container}>
            <LinearGradient
                colors={[COLORS.royalBlue, COLORS.violet]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.headerGradient}
            >
                <SafeAreaView edges={['top']} style={styles.header}>
                    <TouchableOpacity 
                        onPress={handleCancel} 
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        Book Site Visit
                    </Text>
                    <View style={{ width: 40 }} />
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
                    {/* SECTION 1 - LEAD INFORMATION */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialIcons name="person-outline" size={22} color={COLORS.royalBlue} />
                            <Text style={styles.cardTitle}>Lead Information</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={{ position: 'relative', zIndex: 10 }}>
                                <View style={styles.inputWrapper}>
                                    <MaterialIcons name="person" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={name}
                                        onChangeText={handleNameChange}
                                        placeholder="Enter name"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>
                                <SearchDropdown
                                    results={nameSearchResults}
                                    isSearching={isSearching && activeSearchField === 'name'}
                                    onSelectLead={handleSelectLead}
                                    field="name"
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Mobile Number *</Text>
                            <View style={{ position: 'relative', zIndex: 5 }}>
                                <View style={styles.inputWrapper}>
                                    <MaterialIcons name="phone" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={phone}
                                        onChangeText={handlePhoneChange}
                                        placeholder="Enter mobile number"
                                        keyboardType="phone-pad"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>
                                <SearchDropdown
                                    results={phoneSearchResults}
                                    isSearching={isSearching && activeSearchField === 'phone'}
                                    onSelectLead={handleSelectLead}
                                    field="phone"
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address (Optional)</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcons name="email" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Enter email"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>
                    </View>

                    {/* SECTION 2 - SOURCE & STATUS */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialIcons name="settings" size={22} color={COLORS.royalBlue} />
                            <Text style={styles.cardTitle}>Source & Status</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Lead Source *</Text>
                            <TouchableOpacity
                                style={styles.selector}
                                onPress={() => setShowSourcePicker(true)}
                            >
                                <View style={styles.selectorContent}>
                                    <MaterialIcons name="share" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
                                    <Text style={[styles.selectorText, !leadSource && { color: '#9CA3AF' }]}>
                                        {sourceOptions.find(o => o.value === leadSource)?.label || 'Select Source'}
                                    </Text>
                                </View>
                                <MaterialIcons name="keyboard-arrow-down" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Lead Status *</Text>
                            <TouchableOpacity
                                style={styles.selector}
                                onPress={() => setShowStatusPicker(true)}
                            >
                                <View style={styles.selectorContent}>
                                    <MaterialIcons name="flag" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
                                    <Text style={[styles.selectorText, !leadStatus && { color: '#9CA3AF' }]}>
                                        {statusOptions.find((o) => o.value === leadStatus)?.label || 'Select Status'}
                                    </Text>
                                </View>
                                <MaterialIcons name="keyboard-arrow-down" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* SECTION 3 - REQUIREMENTS */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialIcons name="assignment" size={22} color={COLORS.royalBlue} />
                            <Text style={styles.cardTitle}>Requirement Details</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Requirement</Text>
                            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                                <TextInput
                                    style={styles.textArea}
                                    value={requirement}
                                    onChangeText={setRequirement}
                                    placeholder="Enter customer requirements"
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>
                    </View>

                    {/* SECTION 4 - VISIT INFO */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialIcons name="event-available" size={22} color={COLORS.royalBlue} />
                            <Text style={styles.cardTitle}>Visit Information</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Project *</Text>
                            <TouchableOpacity
                                style={styles.selector}
                                onPress={() => setShowProjectPicker(true)}
                            >
                                <View style={styles.selectorContent}>
                                    <MaterialIcons name="business" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
                                    <Text style={[styles.selectorText, !projectId && { color: '#9CA3AF' }]}>
                                        {projectOptions.find(o => o.value === projectId)?.label || 'Select Project'}
                                    </Text>
                                </View>
                                <MaterialIcons name="keyboard-arrow-down" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Site Visit Done By *</Text>
                            <TouchableOpacity
                                style={styles.selector}
                                onPress={() => setShowDoneByPicker(true)}
                            >
                                <View style={styles.selectorContent}>
                                    <MaterialIcons name="badge" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
                                    <Text style={[styles.selectorText, !siteVisitDoneBy && { color: '#9CA3AF' }]}>
                                        {memberOptions.find(o => o.value === siteVisitDoneBy)?.label || 'Select Team Member'}
                                    </Text>
                                </View>
                                <MaterialIcons name="keyboard-arrow-down" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Site Visit Review</Text>
                            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                                <TextInput
                                    style={styles.textArea}
                                    value={siteVisitReview}
                                    onChangeText={setSiteVisitReview}
                                    placeholder="Enter review notes from the visit"
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.footerButton, styles.cancelButton]}
                        onPress={handleCancel}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.saveAction}
                        onPress={handleSave}
                        disabled={!name.trim() || !phone.trim() || !leadStatus || !siteVisitDoneBy  || createLoading}
                    >
                        <LinearGradient
                            colors={(!name.trim() || !phone.trim() || !leadStatus || !siteVisitDoneBy  || createLoading)
                                ? ['#CBD5E0', '#A0AEC0']
                                : [COLORS.royalBlue, COLORS.violet]
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.saveButtonGradient}
                        >
                            {createLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Text style={styles.saveButtonText}>
                                        {isUpdateMode ? 'Update' : 'Save'}
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
    footerSize: {
        height: 100,
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
    sectionTitle: {
        fontFamily: 'SF Pro Display',
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 10,
        marginBottom: 15,
        marginLeft: 4,
    },
});

export default BookSiteVisitScreen;
