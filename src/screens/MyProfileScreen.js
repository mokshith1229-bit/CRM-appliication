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
    SafeAreaView,
    Image,
    StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useProfileStore } from '../store/profileStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import defaultAvatar from '../assets/default_avatar.jpg';

const MyProfileScreen = ({ navigation, onOpenDrawer }) => {
    const profile = useProfileStore((state) => state.profile);
    const isLoading = useProfileStore((state) => state.isLoading);
    const initializeProfile = useProfileStore((state) => state.initializeProfile);
    const updateProfile = useProfileStore((state) => state.updateProfile);

    // Local state for editing
    const [editedProfile, setEditedProfile] = useState({});
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        initializeProfile();
    }, []);

    // Sync local state with store when profile loads
    useEffect(() => {
        if (profile) {
            setEditedProfile({ ...profile });
            setIsDirty(false);
        }
    }, [profile]);

    const handleUpdateField = (field, value) => {
        setEditedProfile(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        const success = await updateProfile(editedProfile);
        if (success) {
            setIsDirty(false);
            Alert.alert('Success', 'Profile updated successfully');
        } else {
            Alert.alert('Error', 'Failed to update profile');
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

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeAreaView>
        );
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

                    {/* Role */}
                    <View style={styles.fieldRow}>
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name="briefcase-outline" size={22} color="#64748B" />
                        </View>
                        <View style={styles.fieldContent}>
                            <Text style={styles.fieldLabel}>Role</Text>
                            <TextInput
                                style={styles.fieldInput}
                                value={editedProfile.role}
                                onChangeText={(val) => handleUpdateField('role', val)}
                                placeholder="Enter role"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>
                    </View>
                </View>

                {/* Change Password Button */}
                <TouchableOpacity style={styles.actionButton}>
                    <View style={styles.actionContent}>
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name="lock-outline" size={22} color="#64748B" />
                        </View>
                        <Text style={styles.actionText}>Change Password</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
                </TouchableOpacity>

            </ScrollView>
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
});

export default MyProfileScreen;
