import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useDispatch } from 'react-redux';
import { dismissUpdate } from '../store/slices/configSlice';

const UpdateModal = ({ visible, playstoreurl }) => {
    const dispatch = useDispatch();

    const handleUpdate = () => {
        if (playstoreurl) {
            Linking.openURL(playstoreurl);
        } else {
            // Fallback Play Store URL
            const url = 'https://play.google.com/store/apps/details?id=com.telecrm.crm';
            Linking.openURL(url);
        }
    };

    const handleLater = () => {
        dispatch(dismissUpdate());
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="update" size={50} color={COLORS.primary} />
                    </View>
                    
                    <Text style={styles.title}>Update Available</Text>
                    <Text style={styles.message}>
                        A new version of TeleCRM is available. Please update to get the latest features and bug fixes.
                    </Text>

                    <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
                        <Text style={styles.updateButtonText}>Update Now</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.laterButton} onPress={handleLater}>
                        <Text style={styles.laterButtonText}>Later</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: SPACING.xl,
        width: '100%',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.lightVioletBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        ...TYPOGRAPHY.h2,
        color: '#1F2937',
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    message: {
        ...TYPOGRAPHY.body,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: SPACING.xl,
        lineHeight: 22,
    },
    updateButton: {
        backgroundColor: COLORS.primary,
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    updateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    laterButton: {
        paddingVertical: 10,
        width: '100%',
        alignItems: 'center',
    },
    laterButtonText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
    },
});

export default UpdateModal;
