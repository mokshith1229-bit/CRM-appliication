import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Pressable,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const LogoutModal = ({ visible, onConfirm, onCancel }) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <Pressable style={styles.overlay} onPress={onCancel}>
                <View style={styles.container}>
                    <Text style={styles.title}>Confirm Logout</Text>
                    <Text style={styles.message}>
                        Are you sure you want to logout? This will clear your session data.
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.confirmButton]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.confirmButtonText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: SPACING.lg,
        width: '85%',
        maxWidth: 400,
    },
    title: {
        ...TYPOGRAPHY.title,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: SPACING.md,
    },
    message: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        marginBottom: SPACING.lg,
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    button: {
        flex: 1,
        paddingVertical: SPACING.md,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cancelButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: '#EF4444',
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default LogoutModal;
