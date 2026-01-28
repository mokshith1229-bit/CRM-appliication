import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS, CALL_OUTCOMES } from '../constants/theme';

const CallStatusModal = ({ visible, onClose, onSelect }) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Call Outcome</Text>
                        <Text style={styles.subtitle}>What happened on this call?</Text>
                    </View>

                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                        <View style={styles.grid}>
                            {CALL_OUTCOMES.map((outcome) => (
                                <TouchableOpacity
                                    key={outcome.id}
                                    style={[styles.optionButton, { backgroundColor: outcome.color + '15' }]}
                                    onPress={() => onSelect(outcome)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: outcome.color }]}>
                                        <MaterialIcons name={outcome.icon} size={24} color="#FFF" />
                                    </View>
                                    <Text style={[styles.optionLabel, { color: outcome.color }]}>{outcome.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Skip</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.md,
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        width: '100%',
        maxWidth: 340,
        maxHeight: '80%', // Limit height to allow scrolling
        padding: SPACING.lg,
        ...SHADOWS.large,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    scrollView: {
        marginBottom: SPACING.md,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: SPACING.md,
        paddingBottom: SPACING.sm, // Add some bottom padding inside scroll
    },
    optionButton: {
        width: '47%', // roughly half minus gap
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    closeButton: {
        marginTop: SPACING.sm,
        paddingVertical: 12,
        alignItems: 'center',
    },
    closeButtonText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        fontWeight: '500',
    },
});

export default CallStatusModal;
