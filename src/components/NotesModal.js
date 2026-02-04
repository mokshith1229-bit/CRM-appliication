import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    Alert,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { useDispatch } from 'react-redux';
import { updateLead } from '../store/slices/leadSlice';

const NotesModal = ({ visible, contact, onClose, campaignId }) => {
    const [newNoteText, setNewNoteText] = useState('');
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editText, setEditText] = useState('');
    const dispatch = useDispatch(); // Added useDispatch

    if (!contact) return null;

    const handleAddNote = async () => {
        if (newNoteText.trim()) {
            const newNote = {
                id: Date.now().toString(),
                text: newNoteText.trim(),
                timestamp: new Date().toISOString(),
                edited: false
            };
            const updatedNotes = [...(contact.notes || []), newNote];
            
            try {
                // Unified backend update
                await dispatch(updateLead({ id: contact.id, data: { notes: updatedNotes } })).unwrap();
                setNewNoteText('');
            } catch (error) {
                Alert.alert('Error', 'Failed to add note');
            }
        }
    };

    const handleEditNote = async (noteId) => {
        if (editText.trim()) {
            const updatedNotes = (contact.notes || []).map(n => 
                n.id === noteId ? { ...n, text: editText.trim(), edited: true } : n
            );
            
            try {
                await dispatch(updateLead({ id: contact.id, data: { notes: updatedNotes } })).unwrap();
                setEditingNoteId(null);
                setEditText('');
            } catch (error) {
                Alert.alert('Error', 'Failed to edit note');
            }
        }
    };

    const handleDeleteNote = (noteId) => {
        Alert.alert(
            'Delete Note',
            'Are you sure you want to delete this note?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const updatedNotes = (contact.notes || []).filter(n => n.id !== noteId);
                        try {
                            await dispatch(updateLead({ id: contact.id, data: { notes: updatedNotes } })).unwrap();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete note');
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Notes</Text>
                        <Text style={styles.headerSubtitle}>{contact.name}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    {(!contact.notes || contact.notes.length === 0) ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No notes yet</Text>
                            <Text style={styles.emptySubtext}>Add your first note below</Text>
                        </View>
                    ) : (
                        contact.notes.map((note) => (
                            <View key={note.id} style={styles.noteCard}>
                                {editingNoteId === note.id ? (
                                    <View>
                                        <TextInput
                                            style={styles.editInput}
                                            value={editText}
                                            onChangeText={setEditText}
                                            multiline
                                            autoFocus
                                        />
                                        <View style={styles.editActions}>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setEditingNoteId(null);
                                                    setEditText('');
                                                }}
                                                style={styles.editCancelButton}
                                            >
                                                <Text style={styles.editCancelText}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleEditNote(note.id)}
                                                style={styles.editSaveButton}
                                            >
                                                <Text style={styles.editSaveText}>Save</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <View>
                                        <Text style={styles.noteText}>{note.text}</Text>
                                        <View style={styles.noteFooter}>
                                            <Text style={styles.noteTime}>
                                                {formatDate(note.timestamp)}
                                                {note.edited && ' (edited)'}
                                            </Text>
                                            <View style={styles.noteActions}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setEditingNoteId(note.id);
                                                        setEditText(note.text);
                                                    }}
                                                    style={styles.noteActionButton}
                                                >
                                                    <Text style={styles.noteActionText}>Edit</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteNote(note.id)}
                                                    style={styles.noteActionButton}
                                                >
                                                    <Text style={[styles.noteActionText, styles.deleteText]}>
                                                        Delete
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Write a note..."
                        value={newNoteText}
                        onChangeText={setNewNoteText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[
                            styles.addButton,
                            !newNoteText.trim() && styles.addButtonDisabled,
                        ]}
                        onPress={handleAddNote}
                        disabled={!newNoteText.trim()}
                    >
                        <Text style={styles.addButtonText}>Add Note</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.lg,
        backgroundColor: COLORS.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        ...SHADOWS.small,
    },
    headerTitle: {
        ...TYPOGRAPHY.title,
    },
    headerSubtitle: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    closeButton: {
        padding: SPACING.sm,
    },
    closeText: {
        fontSize: 24,
        color: COLORS.textSecondary,
    },
    content: {
        flex: 1,
        padding: SPACING.md,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl * 2,
    },
    emptyText: {
        ...TYPOGRAPHY.subtitle,
        color: COLORS.textSecondary,
    },
    emptySubtext: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    noteCard: {
        backgroundColor: COLORS.cardBackground,
        padding: SPACING.md,
        borderRadius: 12,
        marginBottom: SPACING.md,
        ...SHADOWS.small,
    },
    noteText: {
        ...TYPOGRAPHY.body,
        lineHeight: 20,
    },
    noteFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    noteTime: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    noteActions: {
        flexDirection: 'row',
    },
    noteActionButton: {
        marginLeft: SPACING.md,
    },
    noteActionText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.primary,
        fontWeight: '600',
    },
    deleteText: {
        color: COLORS.hot,
    },
    editInput: {
        ...TYPOGRAPHY.body,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 8,
        padding: SPACING.md,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: SPACING.md,
    },
    editCancelButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        marginRight: SPACING.sm,
    },
    editCancelText: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
    },
    editSaveButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
    editSaveText: {
        ...TYPOGRAPHY.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    inputContainer: {
        padding: SPACING.md,
        backgroundColor: COLORS.cardBackground,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        ...SHADOWS.medium,
    },
    input: {
        ...TYPOGRAPHY.body,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: SPACING.md,
        minHeight: 80,
        textAlignVertical: 'top',
        backgroundColor: COLORS.background,
    },
    addButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    addButtonDisabled: {
        backgroundColor: COLORS.border,
    },
    addButtonText: {
        ...TYPOGRAPHY.subtitle,
        color: '#FFFFFF',
        fontWeight: '600',
    },
});

export default NotesModal;
