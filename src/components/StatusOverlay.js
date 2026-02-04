import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

const StatusOverlay = ({ visible, contact, onSelect, onClose }) => {
    const { statuses } = useSelector(state => state.config);
    if (!contact) return null;

    const getIconForStatus = (label) => {
         const l = label.toLowerCase();
         if (l.includes('hot')) return 'whatshot';
         if (l.includes('warm')) return 'wb-sunny';
         if (l.includes('cold')) return 'ac-unit';
         if (l.includes('interested')) return 'check-circle';
         if (l.includes('not')) return 'block';
         if (l.includes('call')) return 'phone-callback';
         return 'label';
    };

    const overlayOptions = [
        ...statuses.map(s => ({
            id: s.key,
            label: s.label,
            color: s.color || '#333',
            icon: getIconForStatus(s.label)
        })),
        { id: 'none', label: 'Clear Status', color: '#333333', icon: 'delete-outline' }
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.popoverContainer}>
                    {overlayOptions.map((option, index) => {
                        const isActive = (contact.status || 'none') === option.id;
                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={[
                                    styles.optionItem,
                                    index === 0 && styles.firstItem,
                                    index === overlayOptions.length - 1 && styles.lastItem,
                                    isActive && styles.activeItem
                                ]}
                                onPress={() => {
                                    onSelect(option.id);
                                    onClose();
                                }}
                            >
                                <View style={styles.optionContent}>
                                    <MaterialIcons
                                        name={option.icon}
                                        size={20}
                                        color={isActive ? COLORS.primary : option.color}
                                        style={styles.optionIcon}
                                    />
                                    <Text style={[
                                        styles.optionLabel,
                                        isActive && styles.activeLabel
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {isActive && (
                                        <MaterialIcons name="check" size={20} color={COLORS.primary} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.15)', // Slightly darker for better contrast on white
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 60, // Postion near top
        paddingRight: 20, // Position near right
    },
    popoverContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        width: 200,
        ...SHADOWS.large,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        overflow: 'hidden',
    },
    optionItem: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    firstItem: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    lastItem: {
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        borderBottomWidth: 0,
    },
    activeItem: {
        backgroundColor: '#F0F7FF',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionIcon: {
        marginRight: 12,
    },
    optionLabel: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
        flex: 1,
    },
    activeLabel: {
        color: COLORS.primary,
        fontWeight: '600',
    },
});

export default StatusOverlay;
