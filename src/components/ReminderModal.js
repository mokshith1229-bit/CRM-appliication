import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import defaultAvatar from '../assets/default_avatar.jpg';

const { width } = Dimensions.get('window');

const ReminderModal = ({ visible, contact, onCall, onDismiss }) => {
    if (!contact) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => { }} // Block back button closing
        >
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                    <View style={styles.header}>
                        <Text style={styles.icon}>🔔</Text>
                        <Text style={styles.title}>Call Reminder Due!</Text>
                    </View>

                    <View style={styles.content}>
                        <Image
                            source={contact.photo ? { uri: contact.photo } : defaultAvatar}
                            style={styles.avatar}
                        />
                        <Text style={styles.name}>{contact.name || contact.phone}</Text>
                        <Text style={styles.subtitle}>You scheduled a call with this contact.</Text>
                        {contact.callScheduleNote && (
                            <View style={styles.noteContainer}>
                                <Text style={styles.noteLabel}>Note:</Text>
                                <Text style={styles.noteText}>{contact.callScheduleNote}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
                            <Text style={styles.dismissText}>OK, Later</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.callButton} onPress={() => onCall(contact)}>
                            <Text style={styles.callText}>📞 Call Now</Text>
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
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
    },
    dialog: {
        width: width * 0.85,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: SPACING.xl,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    icon: {
        fontSize: 40,
        marginBottom: SPACING.sm,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
    },
    content: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: SPACING.md,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    name: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    noteContainer: {
        marginTop: SPACING.md,
        backgroundColor: '#FFF9C4', // Light yellow notes bg
        padding: SPACING.md,
        borderRadius: 8,
        width: '100%',
    },
    noteLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    noteText: {
        fontSize: 14,
        color: COLORS.text,
        fontStyle: 'italic',
    },
    actions: {
        flexDirection: 'row',
        gap: SPACING.md,
        width: '100%',
    },
    dismissButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    dismissText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    callButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    callText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default ReminderModal;
