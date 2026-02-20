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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveFilter, createEnquiry, fetchTenantConfig } from '../store/slices/leadSlice';
import StatusPicker from '../components/StatusPicker';
import { LinearGradient } from 'expo-linear-gradient';

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
            requirement: requirement.trim(),
            budget: budget.trim(),
            location: location.trim(),
            timeline: timeline.trim(),
            assignedTo: currentUser?.name || 'Self',
            assignedBy: currentUser?.name || 'System',
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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={28} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>New Enquiry</Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* SECTION 1 - BASIC INFORMATION CARD */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Basic Information</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Full Name *</Text>
                            <TextInput
                                style={[styles.input, errors.name && styles.inputError]}
                                placeholder="Enter full name"
                                value={name}
                                onChangeText={(text) => {
                                    setName(text);
                                    if (errors.name) setErrors({ ...errors, name: null });
                                }}
                            />
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Mobile Number *</Text>
                            <TextInput
                                style={[styles.input, errors.phone && styles.inputError]}
                                placeholder="Enter mobile number"
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={(text) => {
                                    setPhone(text);
                                    if (errors.phone) setErrors({ ...errors, phone: null });
                                }}
                            />
                            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter email address"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Occupation (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="E.g. Software Engineer"
                                value={occupation}
                                onChangeText={setOccupation}
                            />
                        </View>
                    </View>

                    {/* SECTION 2 - REQUIREMENT CARD */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Requirement Details</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Requirement</Text>
                            <TextInput
                                style={[styles.input, styles.multilineInput]}
                                placeholder="Looking for 3BHK villa in gated community"
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                value={requirement}
                                onChangeText={setRequirement}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Budget (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="E.g. 1.5 Cr to 2 Cr"
                                value={budget}
                                onChangeText={setBudget}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Preferred Location (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="E.g. Whitefield, Bengaluru"
                                value={location}
                                onChangeText={setLocation}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Timeline (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="E.g. Immediately, Within 3 months"
                                value={timeline}
                                onChangeText={setTimeline}
                            />
                        </View>
                    </View>

                    {/* SECTION 3 - ASSIGNMENT CARD */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Assignment Information</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Assigned To</Text>
                            <View style={styles.disabledInput}>
                                <Text style={styles.disabledText}>{currentUser?.name || 'Self'}</Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color="#9CA3AF" />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Assigned By</Text>
                            <View style={styles.disabledInput}>
                                <Text style={styles.disabledText}>{currentUser?.name || 'Self'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* SECTION 4 - SOURCE & STATUS CARD */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Source & Status</Text>
                        
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Lead Status *</Text>
                            <TouchableOpacity 
                                style={[styles.pickerButton, errors.status && styles.inputError]} 
                                onPress={() => setShowStatusPicker(true)}
                            >
                                <Text style={[styles.pickerButtonText, !leadStatus && { color: '#9CA3AF' }]}>
                                    {leadStatus || 'Select Status'}
                                </Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                            {errors.status && <Text style={styles.errorText}>{errors.status}</Text>}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Lead Source *</Text>
                            <TouchableOpacity 
                                style={[styles.pickerButton, errors.source && styles.inputError]} 
                                onPress={() => setShowSourcePicker(true)}
                            >
                                <Text style={[styles.pickerButtonText, !leadSource && { color: '#9CA3AF' }]}>
                                    {sourceOptions.find(o => o.value === leadSource)?.label || 'Select Source'}
                                </Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                            {errors.source && <Text style={styles.errorText}>{errors.source}</Text>}
                        </View>
                    </View>

                    {/* SECTION 5 - CUSTOM FIELDS */}
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardTitle}>Custom Fields</Text>
                            <TouchableOpacity onPress={handleAddCustomField} style={styles.addButton}>
                                <MaterialIcons name="add" size={20} color={COLORS.primaryPurple} />
                                <Text style={styles.addButtonText}>Add Field</Text>
                            </TouchableOpacity>
                        </View>

                        {customFields.map((field, index) => (
                            <View key={field.id} style={styles.customFieldRow}>
                                <TextInput
                                    style={[styles.input, styles.customInputKey]}
                                    placeholder="Field Name"
                                    value={field.key}
                                    onChangeText={(text) => handleUpdateCustomField(field.id, 'key', text)}
                                />
                                <TextInput
                                    style={[styles.input, styles.customInputValue]}
                                    placeholder="Value"
                                    value={field.value}
                                    onChangeText={(text) => handleUpdateCustomField(field.id, 'value', text)}
                                />
                                <TouchableOpacity
                                    onPress={() => handleRemoveCustomField(field.id)}
                                    style={styles.removeButton}
                                >
                                    <MaterialIcons name="remove-circle-outline" size={24} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    {/* Bottom Padding for floating button */}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* FIXED BOTTOM BUTTON */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Enquiry</Text>
                </TouchableOpacity>
            </View>
            {/* Status Picker */}
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

            {/* Source Picker */}
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
        paddingTop: Platform.OS === 'android' ? 12 : 0,
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
    pickerButton: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pickerButtonText: {
        fontSize: 16,
        color: '#111827',
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
    },
    saveButton: {
        backgroundColor: COLORS.primaryPurple,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primaryPurple,
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

export default CreateNewEnquiryScreen;
