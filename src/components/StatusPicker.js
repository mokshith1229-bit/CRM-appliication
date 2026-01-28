import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const StatusPicker = ({ visible, onClose, options, selectedValue, onSelect, title }) => {
    const handleSelect = (value) => {
        onSelect(value);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.modal}>
                    <Text style={styles.title}>{title}</Text>
                    <ScrollView style={styles.optionsList}>
                        {options.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.option,
                                    selectedValue === option.value && styles.optionSelected,
                                ]}
                                onPress={() => handleSelect(option.value)}
                            >
                                <Text
                                    style={[
                                        styles.optionText,
                                        selectedValue === option.value && styles.optionTextSelected,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                                {selectedValue === option.value && (
                                    <Text style={styles.checkmark}>✓</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </TouchableOpacity>
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
    modal: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: SPACING.lg,
        width: '80%',
        maxWidth: 300,
        maxHeight: '60%',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.md,
    },
    optionsList: {
        maxHeight: 300,
    },
    option: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        borderRadius: 8,
        marginBottom: SPACING.xs,
    },
    optionSelected: {
        backgroundColor: '#F0F9FF',
    },
    optionText: {
        fontSize: 15,
        color: COLORS.text,
    },
    optionTextSelected: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    checkmark: {
        fontSize: 18,
        color: COLORS.primary,
        fontWeight: '700',
    },
});

export default StatusPicker;
