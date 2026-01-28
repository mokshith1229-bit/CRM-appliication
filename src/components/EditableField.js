import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const EditableField = ({ value, onSave, placeholder, multiline = false, showButtons = true }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(value);

    // Update internal state when prop changes
    React.useEffect(() => {
        setText(value);
    }, [value]);

    const handleSave = () => {
        onSave(text);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setText(value);
        setIsEditing(false);
    };

    const handleTextChange = (newText) => {
        setText(newText);
        if (!showButtons) {
            onSave(newText);
        }
    };

    const handleBlur = () => {
        if (!showButtons) {
            handleSave();
        }
    };

    if (!isEditing) {
        return (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.container}>
                <Text style={styles.text}>{value || placeholder}</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.editContainer}>
            <TextInput
                style={[styles.input, multiline && styles.multilineInput]}
                value={text}
                onChangeText={handleTextChange}
                placeholder={placeholder}
                multiline={multiline}
                autoFocus
                onBlur={handleBlur}
            />
            {showButtons && (
                <View style={styles.buttons}>
                    <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                        <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: SPACING.sm,
    },
    text: {
        ...TYPOGRAPHY.body,
        color: COLORS.text,
    },
    editContainer: {
        paddingVertical: SPACING.sm,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        fontSize: 15,
        color: COLORS.text,
        backgroundColor: '#FFFFFF',
    },
    multilineInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    buttons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: SPACING.sm,
        gap: SPACING.sm,
    },
    cancelButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    cancelText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    saveButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.primary,
        borderRadius: 6,
    },
    saveText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default EditableField;
