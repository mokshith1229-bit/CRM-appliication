import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const CustomFieldModal = ({ visible, onClose, onAdd }) => {
    const [fieldType, setFieldType] = useState('');
    const [fieldValue, setFieldValue] = useState('');

    const fieldTypes = [
        { id: 'company', label: 'Company' },
        { id: 'address', label: 'Address' },
        { id: 'budget', label: 'Budget' },
        { id: 'source', label: 'Source' },
        { id: 'custom', label: 'Custom' },
    ];

    const handleAdd = () => {
        if (fieldType && fieldValue) {
            onAdd({ type: fieldType, value: fieldValue, id: Date.now().toString() });
            setFieldType('');
            setFieldValue('');
            onClose();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <Text style={styles.title}>Add Custom Field</Text>

                    <Text style={styles.label}>Field Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                        {fieldTypes.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                style={[styles.typeButton, fieldType === type.id && styles.typeButtonActive]}
                                onPress={() => setFieldType(type.id)}
                            >
                                <Text style={[styles.typeText, fieldType === type.id && styles.typeTextActive]}>
                                    {type.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={styles.label}>Value</Text>
                    <TextInput
                        style={styles.input}
                        value={fieldValue}
                        onChangeText={setFieldValue}
                        placeholder="Enter value..."
                        placeholderTextColor={COLORS.textSecondary}
                    />

                    <View style={styles.buttons}>
                        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
                            <Text style={styles.addText}>Add Field</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
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
        width: '85%',
        maxWidth: 400,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.sm,
        marginTop: SPACING.md,
    },
    typeScroll: {
        marginBottom: SPACING.md,
    },
    typeButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: SPACING.sm,
    },
    typeButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    typeText: {
        fontSize: 14,
        color: COLORS.text,
    },
    typeTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        fontSize: 15,
        color: COLORS.text,
    },
    buttons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: SPACING.lg,
        gap: SPACING.md,
    },
    cancelButton: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    cancelText: {
        color: COLORS.textSecondary,
        fontSize: 15,
    },
    addButton: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
    addText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default CustomFieldModal;
