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
import { saveContacts } from '../utils/storage';
import StatusPicker from '../components/StatusPicker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const BookSiteVisitScreen = ({ navigation, route, onOpenDrawer }) => {
    const { initialPhone, initialName } = route.params || {};

    const [name, setName] = useState(initialName || '');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState(initialPhone || '');
    const [secondaryPhone, setSecondaryPhone] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState(initialPhone || '');
    const [occupation, setOccupation] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [leadOwner, setLeadOwner] = useState('');
    const [requirement, setRequirement] = useState('');
    const [siteVisitDoneBy, setSiteVisitDoneBy] = useState('');
    const [siteVisitReview, setSiteVisitReview] = useState('');
    const [project, setProject] = useState('');
    const [customFields, setCustomFields] = useState([]);

    // Contact search states
    const [showContactSuggestions, setShowContactSuggestions] = useState(false);
    const [contactSuggestions, setContactSuggestions] = useState([]);

    // Picker Visibility States
    const [showOwnerPicker, setShowOwnerPicker] = useState(false);
    const [showSiteVisitPicker, setShowSiteVisitPicker] = useState(false);
    const [showProjectPicker, setShowProjectPicker] = useState(false);

    const addContact = useContactStore((state) => state.addContact);
    const contacts = useContactStore((state) => state.contacts);

    // Search contacts as user types phone number
    React.useEffect(() => {
        if (phone.length >= 3) {
            const normalizePhone = (phoneNum) => {
                return phoneNum.replace(/[\s\-+]/g, '').replace(/^91/, '');
            };

            const normalizedInput = normalizePhone(phone);

            const filtered = contacts.filter(c => {
                const normalizedContactPhone = normalizePhone(c.phone || '');
                return normalizedContactPhone.includes(normalizedInput);
            }).slice(0, 5); // Show max 5 suggestions

            setContactSuggestions(filtered);
            setShowContactSuggestions(filtered.length > 0);
        } else {
            setContactSuggestions([]);
            setShowContactSuggestions(false);
        }
    }, [phone, contacts]);

    // Auto-fill contact details when suggestion is selected
    const handleSelectContact = (contact) => {
        setPhone(contact.phone);
        setName(contact.name || '');
        setEmail(contact.email || '');
        setWhatsappNumber(contact.whatsappNumber || contact.whatsapp || contact.phone);
        setSecondaryPhone(contact.secondaryPhone || '');
        setOccupation(contact.occupation || '');
        setCompanyName(contact.companyName || '');
        setRequirement(contact.requirement || contact.leadDescription || '');
        setSiteVisitReview(contact.siteVisitReview || '');
        setProject(contact.project || '');
        setShowContactSuggestions(false);
    };

    const leadOwnerOptions = [
        { label: 'Manager', value: 'manager' },
        { label: 'Admin', value: 'admin' },
        { label: 'Sales Team', value: 'sales_team' },
        { label: 'Self', value: 'self' },
        { label: 'System', value: 'system' },
    ];

    const siteVisitDoneByOptions = [
        { label: 'Manager', value: 'manager' },
        { label: 'Admin', value: 'admin' },
        { label: 'Sales Team', value: 'sales_team' },
        { label: 'Self', value: 'self' },
        { label: 'System', value: 'system' },
    ];

    const projectOptions = [
        { label: 'Project A', value: 'project_a' },
        { label: 'Project B', value: 'project_b' },
        { label: 'Project C', value: 'project_c' },
        { label: 'Project D', value: 'project_d' },
        { label: 'Other', value: 'other' },
    ];

    const handleSaveLead = async () => {
        if (!phone.trim()) {
            Alert.alert('Error', 'Mobile number is required');
            return;
        }

        if (!siteVisitDoneBy) {
            Alert.alert('Error', 'Please select who performed the site visit');
            return;
        }

        console.log('🔵 Saving site visit with siteVisitDoneBy:', siteVisitDoneBy);

        // Normalize phone number for comparison (remove spaces, dashes, and +91)
        const normalizePhone = (phoneNum) => {
            return phoneNum.replace(/[\s\-+]/g, '').replace(/^91/, '');
        };

        const normalizedInputPhone = normalizePhone(phone.trim());

        // Check if contact with this phone number already exists
        const contacts = useContactStore.getState().contacts;
        const existingContact = contacts.find(c => {
            const normalizedContactPhone = normalizePhone(c.phone || '');
            return normalizedContactPhone === normalizedInputPhone;
        });

        console.log('🔍 Looking for contact with phone:', phone.trim());
        console.log('🔍 Normalized input phone:', normalizedInputPhone);
        console.log('🔍 Found existing contact:', existingContact ? (existingContact.name || existingContact.phone) : 'NONE');

        if (existingContact) {
            console.log('🟢 Updating existing contact:', existingContact.name || existingContact.phone);
            // Update existing contact with site visit information
            const updatedContact = {
                ...existingContact,
                name: name.trim() || existingContact.name,
                email: email.trim() || existingContact.email,
                secondaryPhone: secondaryPhone.trim() || existingContact.secondaryPhone,
                whatsappNumber: whatsappNumber.trim() || existingContact.whatsappNumber,
                occupation: occupation.trim() || existingContact.occupation,
                companyName: companyName.trim() || existingContact.companyName,
                leadOwner: leadOwner || existingContact.leadOwner,
                requirement: requirement.trim() || existingContact.requirement,
                siteVisitDoneBy: siteVisitDoneBy, // Add/update site visit info
                siteVisitReview: siteVisitReview.trim() || existingContact.siteVisitReview || '',
                project: project || existingContact.project || '',
                leadDescription: requirement.trim() || existingContact.leadDescription,
            };

            console.log('🔵 Updated contact object:', JSON.stringify(updatedContact, null, 2));

            // Update the contact in store
            const updateContact = useContactStore.getState().updateContact;
            if (updateContact) {
                await updateContact(existingContact.id, updatedContact);
            } else {
                // Fallback: manually update
                const allContacts = useContactStore.getState().contacts;
                const updatedContacts = allContacts.map(c =>
                    c.id === existingContact.id ? updatedContact : c
                );
                useContactStore.setState({ contacts: updatedContacts });
                await saveContacts(updatedContacts);
            }

            Alert.alert('Success', 'Site visit information updated successfully', [
                { text: 'OK', onPress: () => { navigation.navigate('Home'); if (onOpenDrawer) onOpenDrawer(); } },
            ]);
        } else {
            // Create new contact
            const newLead = {
                id: Date.now().toString(),
                name: name.trim() || '',
                phone: phone.trim(),
                secondaryPhone: secondaryPhone.trim() || '',
                whatsappNumber: whatsappNumber.trim() || phone.trim(),
                email: email.trim() || '',
                occupation: occupation.trim() || '',
                companyName: companyName.trim() || '',
                leadOwner: leadOwner,
                requirement: requirement.trim() || '',
                siteVisitDoneBy: siteVisitDoneBy,
                siteVisitReview: siteVisitReview.trim() || '',
                project: project || '',
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
                Alert.alert('Success', 'Site visit lead created successfully', [
                    { text: 'OK', onPress: () => { navigation.navigate('Home'); if (onOpenDrawer) onOpenDrawer(); } },
                ]);
            } else {
                Alert.alert('Error', 'Failed to create site visit lead');
            }
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
                        <Text style={styles.title}>Site Visit</Text>
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

                            {/* Contact Suggestions */}
                            {showContactSuggestions && contactSuggestions.length > 0 && (
                                <View style={styles.suggestionsContainer}>
                                    <Text style={styles.suggestionsTitle}>Matching Contacts:</Text>
                                    {contactSuggestions.map((contact) => (
                                        <TouchableOpacity
                                            key={contact.id}
                                            style={styles.suggestionItem}
                                            onPress={() => handleSelectContact(contact)}
                                        >
                                            <View style={styles.suggestionAvatar}>
                                                <Text style={styles.suggestionAvatarText}>
                                                    {(contact.name || 'U').charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={styles.suggestionInfo}>
                                                <Text style={styles.suggestionName}>{contact.name || 'Unknown'}</Text>
                                                <Text style={styles.suggestionPhone}>{contact.phone}</Text>
                                            </View>
                                            <MaterialIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
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

                        {/* Lead Owner */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Lead Owner</Text>
                            <TouchableOpacity
                                style={styles.selectButton}
                                onPress={() => setShowOwnerPicker(true)}
                            >
                                <Text style={styles.selectButtonText}>
                                    {leadOwnerOptions.find((o) => o.value === leadOwner)?.label || 'Select Owner'}
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

                        {/* Site Visit Done By */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Site Visit Done By</Text>
                            <TouchableOpacity
                                style={styles.selectButton}
                                onPress={() => setShowSiteVisitPicker(true)}
                            >
                                <Text style={styles.selectButtonText}>
                                    {siteVisitDoneByOptions.find((o) => o.value === siteVisitDoneBy)?.label || 'Select Person'}
                                </Text>
                                <Text style={styles.selectArrow}>▼</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Project */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Project</Text>
                            <TouchableOpacity
                                style={styles.selectButton}
                                onPress={() => setShowProjectPicker(true)}
                            >
                                <Text style={styles.selectButtonText}>
                                    {projectOptions.find((o) => o.value === project)?.label || 'Select Project'}
                                </Text>
                                <Text style={styles.selectArrow}>▼</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Site Visit Review */}
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Site Visit Review</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={siteVisitReview}
                                onChangeText={setSiteVisitReview}
                                placeholder="Enter site visit review notes..."
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>
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
                    visible={showOwnerPicker}
                    onClose={() => setShowOwnerPicker(false)}
                    options={leadOwnerOptions}
                    selectedValue={leadOwner}
                    onSelect={setLeadOwner}
                    title="Select Lead Owner"
                />

                <StatusPicker
                    visible={showSiteVisitPicker}
                    onClose={() => setShowSiteVisitPicker(false)}
                    options={siteVisitDoneByOptions}
                    selectedValue={siteVisitDoneBy}
                    onSelect={setSiteVisitDoneBy}
                    title="Select Site Visit Done By"
                />

                <StatusPicker
                    visible={showProjectPicker}
                    onClose={() => setShowProjectPicker(false)}
                    options={projectOptions}
                    selectedValue={project}
                    onSelect={setProject}
                    title="Select Project"
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
        color: COLORS.text,
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
    suggestionsContainer: {
        marginTop: 8,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    suggestionsTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        backgroundColor: COLORS.cardBackground,
        borderRadius: 6,
        marginBottom: 6,
    },
    suggestionAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    suggestionAvatarText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    suggestionInfo: {
        flex: 1,
    },
    suggestionName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 2,
    },
    suggestionPhone: {
        fontSize: 14,
        color: COLORS.textSecondary,
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

export default BookSiteVisitScreen;
