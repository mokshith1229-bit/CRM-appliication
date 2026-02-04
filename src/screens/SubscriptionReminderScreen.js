import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    Switch,
    Platform,
    
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const SubscriptionReminderScreen = ({ navigation, onOpenDrawer }) => {
    const subscription = useSubscriptionStore((state) => state.subscription);
    const initializeSubscription = useSubscriptionStore((state) => state.initializeSubscription);
    const updateSubscription = useSubscriptionStore((state) => state.updateSubscription);
    const getDaysRemaining = useSubscriptionStore((state) => state.getDaysRemaining);
    const isExpired = useSubscriptionStore((state) => state.isExpired);

    useEffect(() => {
        initializeSubscription();
    }, []);

    const handleSetExpiryDate = () => {
        Alert.alert(
            'Set Expiry Date',
            'Set subscription expiry to 30 days from now?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: '30 Days',
                    onPress: () => {
                        const date = new Date();
                        date.setDate(date.getDate() + 30);
                        updateSubscription({ expiryDate: date.toISOString() });
                    },
                },
                {
                    text: '60 Days',
                    onPress: () => {
                        const date = new Date();
                        date.setDate(date.getDate() + 60);
                        updateSubscription({ expiryDate: date.toISOString() });
                    },
                },
                {
                    text: '90 Days',
                    onPress: () => {
                        const date = new Date();
                        date.setDate(date.getDate() + 90);
                        updateSubscription({ expiryDate: date.toISOString() });
                    },
                },
            ]
        );
    };

    const handleSetReminderDate = () => {
        Alert.alert(
            'Set Reminder',
            'Set reminder before expiry?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: '7 Days Before',
                    onPress: () => {
                        const date = new Date();
                        date.setDate(date.getDate() + 7);
                        updateSubscription({ reminderDate: date.toISOString() });
                    },
                },
                {
                    text: '14 Days Before',
                    onPress: () => {
                        const date = new Date();
                        date.setDate(date.getDate() + 14);
                        updateSubscription({ reminderDate: date.toISOString() });
                    },
                },
            ]
        );
    };

    const handleNotificationToggle = (value) => {
        updateSubscription({ notificationEnabled: value });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const daysRemaining = getDaysRemaining();
    const expired = isExpired();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => { navigation.goBack(); if (onOpenDrawer) onOpenDrawer(); }} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Subscription Reminder</Text>
                </View>

                {/* Subscription Status Card */}
                <View style={[styles.statusCard, expired && styles.expiredCard]}>
                    <Text style={styles.statusTitle}>
                        {expired ? '⚠️ Subscription Expired' : '✓ Subscription Active'}
                    </Text>
                    {daysRemaining !== null && (
                        <Text style={styles.daysRemaining}>
                            {expired
                                ? `Expired ${Math.abs(daysRemaining)} days ago`
                                : `${daysRemaining} days remaining`}
                        </Text>
                    )}
                </View>

                <View style={styles.form}>
                    {/* Expiry Date */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Subscription Expiry Date</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={handleSetExpiryDate}
                        >
                            <Text style={styles.dateText}>{formatDate(subscription.expiryDate)}</Text>
                            <Text style={styles.calendarIcon}>📅</Text>
                        </TouchableOpacity>
                        <Text style={styles.helperText}>Tap to set expiry (30/60/90 days)</Text>
                    </View>

                    {/* Reminder Date */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Reminder Date</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={handleSetReminderDate}
                        >
                            <Text style={styles.dateText}>{formatDate(subscription.reminderDate)}</Text>
                            <Text style={styles.calendarIcon}>🔔</Text>
                        </TouchableOpacity>
                        <Text style={styles.helperText}>Tap to set reminder (7/14 days before)</Text>
                    </View>

                    {/* Notification Toggle */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.toggleContainer}>
                            <View>
                                <Text style={styles.label}>Enable Notifications</Text>
                                <Text style={styles.helperText}>
                                    Get notified before subscription expires
                                </Text>
                            </View>
                            <Switch
                                value={subscription.notificationEnabled}
                                onValueChange={handleNotificationToggle}
                                trackColor={{ false: '#D1D1D6', true: COLORS.primary }}
                                thumbColor="#FFFFFF"
                            />
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: SPACING.xl * 3,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        marginBottom: SPACING.sm,
    },
    backButtonText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        ...TYPOGRAPHY.title,
        fontSize: 24,
        fontWeight: '700',
    },
    statusCard: {
        margin: SPACING.md,
        padding: SPACING.lg,
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#34C759',
    },
    expiredCard: {
        backgroundColor: '#FFE5E5',
        borderLeftColor: '#EF4444',
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    daysRemaining: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    form: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
    },
    fieldContainer: {
        marginBottom: SPACING.lg,
    },
    label: {
        ...TYPOGRAPHY.subtitle,
        marginBottom: SPACING.xs,
        fontWeight: '600',
    },
    dateButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: SPACING.md,
        backgroundColor: COLORS.cardBackground,
    },
    dateText: {
        fontSize: 16,
        color: COLORS.text,
    },
    calendarIcon: {
        fontSize: 20,
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    helperText: {
        ...TYPOGRAPHY.caption,
        marginTop: SPACING.xs,
    },
});

export default SubscriptionReminderScreen;
