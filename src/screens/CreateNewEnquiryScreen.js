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
import { setActiveFilter, createLead } from '../store/slices/leadSlice';
import StatusPicker from '../components/StatusPicker';

const BUDGET_OPTIONS = [
    { label: '5 Lakhs to 50 Lakhs', value: '5 Lakhs to 50 Lakhs' },
    { label: '50 Lakhs to 1 Cr', value: '50 Lakhs to 1 Cr' },
    { label: '1 Cr to 3 Cr', value: '1 Cr to 3 Cr' },
    { label: '3 Cr to 5 Cr', value: '3 Cr to 5 Cr' },
    { label: '5 Cr to 7 Cr', value: '5 Cr to 7 Cr' },
    { label: '7 Cr to 9 Cr', value: '7 Cr to 9 Cr' },
    { label: '10 Cr +', value: '10 Cr +' }
]
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

    const validate = () => {
        const newErrors = {};
        if (!name.trim()) newErrors.name = 'Full Name is required';
        if (!phone.trim()) newErrors.phone = 'Mobile Number is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

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
            leadSource: 'Manual Enquiry',
            status: 'New',
            attributes: {
                requirement: requirement.trim(),
                budget: budget.trim(),
                location: location.trim(),
                timeline: timeline.trim(),
            }
        };

        try {
            // Save to backend via Redux Thunk
            await dispatch(createLead(newEnquiry)).unwrap();

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

                    {/* SECTION 3 - SOURCE CARD */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Source</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Lead Source</Text>
                            <View style={styles.disabledInput}>
                                <Text style={styles.disabledText}>Manual Enquiry</Text>
                            </View>
                        </View>
                    </View>

                    {/* Bottom Padding for floating button */}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* BUDGET & TIMELINE PICKERS */}
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
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Enquiry</Text>
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
