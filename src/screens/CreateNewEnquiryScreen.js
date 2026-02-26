import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveFilter, createEnquiry, fetchTenantConfig } from '../store/slices/leadSlice';
import StatusPicker from '../components/StatusPicker';
import { LinearGradient } from 'expo-linear-gradient';

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

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

const CreateNewEnquiryScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const currentUser = useSelector(state => state.auth.user);

    // Section 1: Basic Info
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [occupation, setOccupation] = useState('');
    const [errors, setErrors] = useState({});

    // Section 2: Requirement
    const [requirement, setRequirement] = useState('');
    const [budget, setBudget] = useState('');
    const [location, setLocation] = useState('');
    const [timeline, setTimeline] = useState('');

    const [showBudgetPicker, setShowBudgetPicker] = useState(false);
    const [showTimelinePicker, setShowTimelinePicker] = useState(false);
    // Section 4: Source & Status
    const [leadSource, setLeadSource] = useState('');
    const [leadStatus, setLeadStatus] = useState('');
    const { tenantConfig } = useSelector(state => state.leads);

    // Section 5: Custom Fields
    const [customFields, setCustomFields] = useState([]);

    const handleAddCustomField = () => {
        setCustomFields([...customFields, { id: generateId(), key: '', value: '' }]);
    };

    const handleUpdateCustomField = (id, field, text) => {
        setCustomFields(customFields.map(f => f.id === id ? { ...f, [field]: text } : f));
    };

    const handleRemoveCustomField = (id) => {
        setCustomFields(customFields.filter(f => f.id !== id));
    };

    const validate = () => {
        const newErrors = {};
        if (!name.trim()) newErrors.name = 'Full Name is required';
        if (!phone.trim()) newErrors.phone = 'Mobile Number is required';
        if (!leadStatus) newErrors.status = 'Status is required';
        if (!leadSource) newErrors.source = 'Source is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Picker Visibility States
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);

    // Fetch tenant config on mount
    React.useEffect(() => {
        if (!tenantConfig) {
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

    const handleSave = async () => {
        if (!validate()) {
            Alert.alert('Validation Error', 'Please fill all required fields properly.');
            return;
        }

        const newEnquiry = {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            occupation: occupation.trim(),
            assignedTo: currentUser?.name || 'Self',
            assignedBy: currentUser?.name || 'System',
            attributes: {
                requirement: requirement.trim(),
                budget: budget.trim(),
                location: location.trim(),
                timeline: timeline.trim(),
            },
            leadSource: leadSource,
            status: leadStatus,
            customFields,
        };

        try {
            // Save to backend via Redux Thunk
            await dispatch(createEnquiry(newEnquiry)).unwrap();

            // Show success and navigate
            Alert.alert('Success', 'Enquiry created successfully!', [
                {
                    text: 'OK',
                    onPress: () => {
                        dispatch(setActiveFilter('new_leads'));
                        navigation.navigate('Home');
                    }
                }
            ]);
        } catch (error) {
            console.error('Failed to save enquiry:', error);
            Alert.alert('Error', error || 'Failed to create enquiry on the server.');
        }
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
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={26} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>New Enquiry</Text>
                    <View style={{ width: 40 }} />
                </SafeAreaView>
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Full Name *</Text>
                            <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                                <MaterialIcons name="person" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter full name"
                                    placeholderTextColor="#9CA3AF"
                                    value={name}
                                    onChangeText={(text) => {
                                        setName(text);
                                        if (errors.name) setErrors({ ...errors, name: null });
                                    }}
                                />
                            </View>
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Mobile Number *</Text>
                            <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
                                <MaterialIcons name="phone" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter mobile number"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={(text) => {
                                        setPhone(text);
                                        if (errors.phone) setErrors({ ...errors, phone: null });
                                    }}
                                />
                            </View>
                            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address (Optional)</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcons name="email" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter email address"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Occupation (Optional)</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcons name="work-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="E.g. Software Engineer"
                                    placeholderTextColor="#9CA3AF"
                                    value={occupation}
                                    onChangeText={setOccupation}
                                />
                            </View>
                        </View>
                    </View>

                    

                    {/* SECTION 2 - SOURCE & STATUS CARD */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialIcons name="settings" size={22} color={COLORS.royalBlue} />
                            <Text style={styles.cardTitle}>Source</Text>
                        </View>

                        <View style={styles.rowInputs}>
                            {/* <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Lead Status *</Text>
                                <TouchableOpacity
                                    style={[styles.selector, errors.status && styles.inputError]}
                                    onPress={() => setShowStatusPicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.selectorContent}>
                                        <MaterialIcons name="flag" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
                                        <Text style={[styles.selectorText, !leadStatus && { color: '#9CA3AF' }]} numberOfLines={1}>
                                            {leadStatus || 'Select Status'}
                                        </Text>
                                    </View>
                                    <MaterialIcons name="expand-more" size={24} color="#9CA3AF" />
                                </TouchableOpacity>
                                {errors.status && <Text style={styles.errorText}>{errors.status}</Text>}
                            </View> */}

                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.label}>Lead Source *</Text>
                                <TouchableOpacity
                                    style={[styles.selector, errors.source && styles.inputError]}
                                    onPress={() => setShowSourcePicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.selectorContent}>
                                        <MaterialIcons name="share" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
                                        <Text style={[styles.selectorText, !leadSource && { color: '#9CA3AF' }]} numberOfLines={1}>
                                            {sourceOptions.find(o => o.value === leadSource)?.label || 'Select Source'}
                                        </Text>
                                    </View>
                                    <MaterialIcons name="expand-more" size={24} color="#9CA3AF" />
                                </TouchableOpacity>
                                {errors.source && <Text style={styles.errorText}>{errors.source}</Text>}
                            </View>
                        </View>
                    </View>
{/* SECTION  - REQUIREMENT CARD */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialIcons name="assignment" size={22} color={COLORS.royalBlue} />
                            <Text style={styles.cardTitle}>Requirement Details</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Requirement</Text>
                            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                                <MaterialIcons name="description" size={20} color="#9CA3AF" style={[styles.inputIcon, { marginTop: 12 }]} />
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Looking for 3BHK villa in gated community"
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    numberOfLines={3}
                                    value={requirement}
                                    onChangeText={setRequirement}
                                />
                            </View>
                        </View>

                        <View style={styles.rowInputs}>
                            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Budget (Optional)</Text>
                                <TouchableOpacity
                                    style={styles.selector}
                                    onPress={() => setShowBudgetPicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.selectorContent}>
                                        <MaterialIcons name="payments" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
                                        <Text style={[styles.selectorText, !budget && { color: '#9CA3AF' }]} numberOfLines={1}>
                                            {budget || 'Select Budget'}
                                        </Text>
                                    </View>
                                    <MaterialIcons name="expand-more" size={24} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.label}>Timeline (Optional)</Text>
                                <TouchableOpacity
                                    style={styles.selector}
                                    onPress={() => setShowTimelinePicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.selectorContent}>
                                        <MaterialIcons name="event-available" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
                                        <Text style={[styles.selectorText, !timeline && { color: '#9CA3AF' }]} numberOfLines={1}>
                                            {timeline || 'Select Timeline'}
                                        </Text>
                                    </View>
                                    <MaterialIcons name="expand-more" size={24} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Preferred Location (Optional)</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcons name="location-on" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="E.g. Whitefield, Bengaluru"
                                    placeholderTextColor="#9CA3AF"
                                    value={location}
                                    onChangeText={setLocation}
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
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={styles.saveAction}
                        onPress={handleSave}
                        disabled={!name || !phone}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={(!name || !phone) ? ['#A0AEC0', '#718096'] : [COLORS.royalBlue, COLORS.violet]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.saveButtonGradient}
                        >
                            <Text style={styles.saveButtonText}>Save Enquiry</Text>
                            <MaterialIcons name="check-circle" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* STATUS & SOURCE PICKERS */}
            <StatusPicker
                visible={showStatusPicker}
                onClose={() => setShowStatusPicker(false)}
                title="Select Status"
                options={statusOptions}
                selectedValue={leadStatus}
                onSelect={(value) => {
                    setLeadStatus(value);
                    if (errors.status) setErrors({ ...errors, status: null });
                    setShowStatusPicker(false);
                }}
            />

            <StatusPicker
                visible={showSourcePicker}
                onClose={() => setShowSourcePicker(false)}
                title="Select Source"
                options={sourceOptions}
                selectedValue={leadSource}
                onSelect={(value) => {
                    setLeadSource(value);
                    if (errors.source) setErrors({ ...errors, source: null });
                    setShowSourcePicker(false);
                }}
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
    inputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 4,
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

export default CreateNewEnquiryScreen;
