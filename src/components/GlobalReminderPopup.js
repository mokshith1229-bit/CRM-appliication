import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import * as Notifications from 'expo-notifications';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const { width } = Dimensions.get('window');

const GlobalReminderPopup = () => {
    const [visible, setVisible] = useState(false);
    const [reminderData, setReminderData] = useState(null);

    useEffect(() => {
        const subscription = Notifications.addNotificationReceivedListener(notification => {
            const data = notification.request.content.data;
            
            // Only handle reminder notifications
            if (data && data.type === 'reminder') {
                setReminderData({
                    title: notification.request.content.title,
                    body: notification.request.content.body,
                    reason: data.reason,
                    date: new Date().toISOString(), // Received now
                    createdBy: data.createdBy // object { name, email, role }
                });
                setVisible(true);
            }
        });

        return () => subscription.remove();
    }, []);

    if (!reminderData || !visible) return null;

    const creatorName = reminderData.createdBy?.name || reminderData.createdBy?.email || 'System';
    const creatorRole = reminderData.createdBy?.role;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={() => setVisible(false)}
        >
            <View style={styles.overlay}>
                <View style={styles.popup}>
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name="bell-ring" size={24} color="#FFF" />
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.title}>Reminder Due!</Text>
                            <Text style={styles.time}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setVisible(false)}>
                            <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.label}>Reason:</Text>
                        <Text style={styles.reason}>{reminderData.reason || reminderData.body || 'Follow up required'}</Text>
                        
                        <View style={styles.divider} />
                        
                        <View style={styles.metaRow}>
                            <MaterialCommunityIcons name="account-circle-outline" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.metaText}>
                                Created by: <Text style={styles.bold}>{creatorName}</Text> {creatorRole ? `(${creatorRole})` : ''}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => setVisible(false)}
                    >
                        <Text style={styles.actionButtonText}>Acknowledge</Text>
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
        padding: 20
    },
    popup: {
        width: width * 0.9,
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text
    },
    time: {
        fontSize: 12,
        color: COLORS.textSecondary
    },
    content: {
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    reason: {
        fontSize: 16,
        color: COLORS.text,
        lineHeight: 22,
        marginBottom: 12
    },
    divider: {
        height: 1,
        backgroundColor: '#EEE',
        marginVertical: 8
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    metaText: {
        fontSize: 13,
        color: COLORS.textSecondary
    },
    bold: {
        fontWeight: '600',
        color: COLORS.text
    },
    actionButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600'
    }
});

export default GlobalReminderPopup;
