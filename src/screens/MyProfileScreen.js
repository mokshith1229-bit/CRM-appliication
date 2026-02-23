import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Platform,
    
    Image,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile } from '../store/slices/authSlice';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import defaultAvatar from '../assets/default_avatar.jpg';
import ProfileSkeleton from '../components/ProfileSkeleton';
import ChangePasswordModal from '../components/ChangePasswordModal';
import RecordingSyncService from '../services/RecordingSyncService';

const MyProfileScreen = ({ navigation, onOpenDrawer }) => {
    const dispatch = useDispatch();
    const { user, isLoading } = useSelector(state => state.auth);

    // Local state for editing
    const [editedProfile, setEditedProfile] = useState({});
    const [isDirty, setIsDirty] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    
    // Call recording folder state
    const [savedRecordingFolder, setSavedRecordingFolder] = useState(null);

    // Sync local state with Redux user when it loads
    useEffect(() => {
        if (user) {
            setEditedProfile({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                photo: user.photo || null,
                role: user.role || '',
            });
            setIsDirty(false);
        }
    }, [user]);

    // Load saved recording folder URI
    useEffect(() => {
        const loadFolderUri = async () => {
            const uri = await RecordingSyncService.getSavedFolderUri();
            if (uri) {
                setSavedRecordingFolder(uri);
            }
        };
        loadFolderUri();
    }, []);
    const handleUpdateField = (field, value) => {
        setEditedProfile(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        try {
            // Don't send role in updates (read-only from mobile)
            const { role, ...updates } = editedProfile;
            await dispatch(updateProfile(updates)).unwrap();
            setIsDirty(false);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            Alert.alert('Error', error || 'Failed to update profile');
        }
    };

    const handleAvatarPress = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status === 'granted') {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                handleUpdateField('photo', result.assets[0].uri);
            }
        } else {
            Alert.alert('Permission Required', 'We need permission to access your photos.');
        }
    };

    const handleSelectRecordingFolder = async () => {
        Alert.alert(
            'Select Call Recordings Folder',
            'To automatically sync your call recordings:\n\n1. Ensure "Auto-record calls" is enabled in your Dialer settings.\n2. Tap "Continue" and choose the folder where your phone saves the recordings (often named "Recordings" or "Call").',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Continue', 
                    onPress: async () => {
                        const uri = await RecordingSyncService.requestCallFolderAccess();
                        if (uri) {
                            setSavedRecordingFolder(uri);
                            Alert.alert('Success', 'Call recording folder selected successfully. Recordings will now be synced.');
                        }
                    } 
                },
            ]
        );
    };

    if (isLoading) {
        return <ProfileSkeleton />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => { navigation.goBack(); if (onOpenDrawer) onOpenDrawer(); }}
                    style={styles.backButton}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                {/* Space in middle to balance layout if needed, or title */}
                <View style={{ flex: 1 }} />

                {isDirty && (
                    <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                        <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onPress={handleAvatarPress}>
                            <Image
                                source={editedProfile.photo ? { uri: editedProfile.photo } : defaultAvatar}
                                style={styles.avatar}
                            />
                            {/* Decorative elements based on design inspiration */}
                            <View style={styles.avatarDecorationRight}>
                                <MaterialCommunityIcons name="star-four-points" size={20} color="#CBD5E1" />
                            </View>
                            <View style={styles.avatarDecorationLeft}>
                                <MaterialCommunityIcons name="star-four-points" size={14} color="#FFD700" />
                            </View>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.nameInput}
                        value={editedProfile.name}
                        onChangeText={(val) => handleUpdateField('name', val)}
                        placeholder="Your Name"
                        placeholderTextColor={COLORS.textSecondary}
                    />
                </View>

                {/* Details Card */}
                <View style={styles.card}>
                    {/* Email */}
                    <View style={styles.fieldRow}>
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name="email-outline" size={22} color="#64748B" />
                        </View>
                        <View style={styles.fieldContent}>
                            <Text style={styles.fieldLabel}>Email</Text>
                            <TextInput
                                style={styles.fieldInput}
                                value={editedProfile.email}
                                onChangeText={(val) => handleUpdateField('email', val)}
                                placeholder="Enter email"
                                keyboardType="email-address"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>
                    </View>
                    <View style={styles.divider} />

                    {/* Phone */}
                    <View style={styles.fieldRow}>
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name="phone-outline" size={22} color="#64748B" />
                        </View>
                        <View style={styles.fieldContent}>
                            <Text style={styles.fieldLabel}>Phone No.</Text>
                            <TextInput
                                style={styles.fieldInput}
                                value={editedProfile.phone || ''} // Assuming phone is part of profile store now
                                onChangeText={(val) => handleUpdateField('phone', val)}
                                placeholder="Enter phone number"
                                keyboardType="phone-pad"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>
                    </View>
                    <View style={styles.divider} />

                    {/* Role - Read Only */}
                    <View style={styles.fieldRow}>
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name="briefcase-outline" size={22} color="#64748B" />
                        </View>
                        <View style={styles.fieldContent}>
                            <Text style={styles.fieldLabel}>Role</Text>
                            <Text style={styles.fieldValue}>{editedProfile.role || 'N/A'}</Text>
                        </View>
                    </View>
                </View>

                {/* Call Recording Sync Settings */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="microphone-outline" size={24} color={COLORS.primary} style={styles.sectionIcon} />
                        <Text style={styles.sectionTitle}>Call Recording Sync</Text>
                    </View>
                    
                    <View style={styles.folderStatusContainer}>
                        <Text style={styles.folderStatusLabel}>Status:</Text>
                        <Text style={[styles.folderStatusText, { color: savedRecordingFolder ? '#10B981' : '#EF4444' }]}>
                            {savedRecordingFolder ? 'Folder Configured' : 'Not Configured'}
                        </Text>
                    </View>
                    
                    {savedRecordingFolder && (
                         <Text style={styles.folderUriText} numberOfLines={1} ellipsizeMode="middle">
                            {savedRecordingFolder}
                        </Text>
                    )}

                    <TouchableOpacity 
                        style={styles.actionButtonSecondary}
                        onPress={handleSelectRecordingFolder}
                    >
                        <MaterialCommunityIcons name="folder-open-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.actionTextSecondary}>
                            {savedRecordingFolder ? 'Change Recording Folder' : 'Select Recording Folder'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Change Password Button */}
                {/* <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => setShowPasswordModal(true)}
                >
                    <View style={styles.actionContent}>
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name="lock-outline" size={22} color="#64748B" />
                        </View>
                        <Text style={styles.actionText}>Change Password</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
                </TouchableOpacity> */}

            </ScrollView>

            {/* Change Password Modal */}
            {/* <ChangePasswordModal
                visible={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            /> */}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FCFCFC', // Slightly off-white background
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'transparent',
    },
    backButton: {
        padding: 5,
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
        paddingTop: 10,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 30,
        position: 'relative',
    },
    avatarContainer: {
        marginBottom: 16,
        padding: 4,
        position: 'relative',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E2E8F0',
    },
    avatarDecorationRight: {
        position: 'absolute',
        right: -10,
        top: 40,
        opacity: 0.8,
    },
    avatarDecorationLeft: {
        position: 'absolute',
        left: -10,
        top: 60,
        opacity: 0.8,
    },
    nameInput: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center',
        paddingVertical: 4,
        minWidth: 150,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginBottom: 20,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 16,
    },
    iconContainer: {
        width: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 2,
    },
    fieldContent: {
        flex: 1,
    },
    fieldLabel: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 4,
    },
    fieldInput: {
        fontSize: 16,
        color: '#1E293B', // Dark slate for strong readability
        fontWeight: '500',
        padding: 0, // Remove default padding for clean look
    },
    fieldValue: {
        fontSize: 16,
        color: '#64748B', // Lighter color for read-only
        fontWeight: '500',
        padding: 0,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginLeft: 40, // Indent to align with text
    },
    actionButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 20,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 16,
        color: '#1E293B',
        fontWeight: '500',
        marginLeft: 0, // Icon container has space
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        marginBottom: 8,
    },
    sectionIcon: {
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B',
    },
    folderStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 4,
    },
    folderStatusLabel: {
        fontSize: 14,
        color: '#64748B',
        marginRight: 6,
    },
    folderStatusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    folderUriText: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 16,
        marginTop: 4,
    },
    actionButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 10,
        marginBottom: 8,
    },
    actionTextSecondary: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.primary,
        marginLeft: 8,
    },
});

export default MyProfileScreen;
