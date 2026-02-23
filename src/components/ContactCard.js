import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { makeCall } from '../utils/intents';
import defaultAvatar from '../assets/default_avatar.jpg';
import customCallIcon from '../assets/custom_call_icon.jpg';

const ContactCard = ({ contact, onPress, onLongPress, onAvatarPress, onCallPress }) => {
    const { statuses, sources } = useSelector(state => state.config);

    const handleCallPress = (e) => {
        e.stopPropagation();
        if (onCallPress) {
            onCallPress(contact);
        } else {
            makeCall(contact.phone);
        }
    };

    const handleAvatarPress = (e) => {
        e.stopPropagation();
        if (onAvatarPress) {
            onAvatarPress(contact);
        }
    };



    // Get call direction icon
    const getCallDirectionIcon = () => {
        if (contact.callStatus === 'missed') {
            return '✕';
        }
        return contact.callDirection === 'outgoing' ? '↗' : '↙';
    };

    // Get call status text
    const getCallStatusText = () => {
        if (contact.callStatus === 'connected') {
            return 'Connected';
        } else if (contact.callStatus === 'missed') {
            return 'Missed';
        } else {
            return 'Disconnected';
        }
    };

    // Get status color
    const getStatusColor = () => {
        if (contact.callStatus === 'connected') {
            return '#34C759'; // Green
        } else {
            return '#FF3B30'; // Red
        }
    };

    // Format time
    const formatTime = (timestamp) => {
        const now = new Date();
        const callTime = new Date(timestamp);
        const diffMs = now - callTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
            return `${diffMins} min ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''}  ago`;
        } else if (diffDays === 0) {
            return callTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        } else {
            return callTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
                ', ' +
                callTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
    };

    // Get status badge color and text - DYNAMIC
    const getStatusBadge = () => {
        // For New Enquiries, always show "New" status
        if (contact.isNewLead) {
            return { label: 'NEW', color: COLORS.primaryPurple, bg: COLORS.lightPurpleTint };
        }

        // Handle "Unsaved" status for device logs
        if (contact?.status === 'Unsaved' || contact._source === 'log') {
            return { label: 'UNSAVED', color: COLORS.primaryPurple, bg: COLORS.lightPurpleTint };
        }

        // Safety check for statuses array
        if (!statuses || statuses.length === 0) {
            console.warn('ContactCard: statuses config is empty or undefined');
            return { label: contact?.status || 'None', color: '#9CA3AF', bg: '#F3F4F6' };
        }

        // Find matching status in dynamic config
        // Keys in config have format: "status_Cold", but contact.status is just "Cold"
        const statusValue = contact?.status;

        if (!statusValue) {
            return { label: 'None', color: '#9CA3AF', bg: '#F3F4F6' };
        }

        const matchingStatus = statuses.find(s => {
            return s.label?.toLowerCase() === statusValue?.toLowerCase();
        });
        if (matchingStatus) {
            return {
                label: matchingStatus.label.toUpperCase(),
                color: COLORS.primaryPurple, // Explicitly standardizing to soft purple background
                bg: COLORS.lightPurpleTint
            };
        }

        // Default fallback - show the status value even if not in config
        console.warn(`ContactCard: No matching status found for "${statusValue}"`);
        return { label: statusValue?.toUpperCase(), color: COLORS.primaryPurple, bg: COLORS.lightPurpleTint };
    };

    const statusBadge = getStatusBadge();

    const formatOutcomeDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
            d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatBudget = (amount) => {
        if (!amount) return '';
        // Format in Indian Rupee style (Lakhs/Crores)
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(2)}Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)}L`;
        }
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const formatSiteVisitDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        const now = new Date();
        const diffMs = d - now;
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffDays < 0) {
            return `${Math.abs(diffDays)}d ago`;
        } else if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Tomorrow';
        } else if (diffDays <= 7) {
            return `in ${diffDays}d`;
        }
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress(contact)}
            onLongPress={() => onLongPress(contact)}
            activeOpacity={0.7}
        >
            <View style={styles.leftSection}>
                {/* Avatar - tappable */}
                <TouchableOpacity
                    onPress={handleAvatarPress}
                    activeOpacity={0.7}
                >
                    <Image
                        source={contact.photo ? { uri: contact.photo } : defaultAvatar}
                        style={styles.avatar}
                    />
                </TouchableOpacity>

                {/* Contact info */}
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{contact.name || contact.phone}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                                {statusBadge.label}
                            </Text>
                        </View>
                    </View>

                    {/* Phone Number */}
                    <Text style={styles.phoneText}>{contact.phone}</Text>

                    {/* Lead Source & Assignment Info */}
                    <View>
                        {contact.leadSource && (
                            <Text style={styles.leadSourceText}>
                                {(() => {
                                    const sourceValue = contact.leadSource;
                                    if (!sources || sources.length === 0) return sourceValue;
                                    
                                    const matchingSource = sources.find(s => {
                                        const keyWithoutPrefix = s.key?.startsWith('source_') ? s.key.replace('source_', '') : s.key;
                                        return keyWithoutPrefix === sourceValue || s.key === sourceValue || s.label === sourceValue;
                                    });
                                    
                                    return matchingSource ? matchingSource.label : sourceValue;
                                })()}
                            </Text>
                        )}

                        {/* Only show assignment info for CRM leads, not device logs */}
                        {contact._source !== 'log' && (
                            <>
                                {contact.transferredBy ? (
                                    <Text style={styles.transferredByText}>
                                        Transferred by: {
                                            typeof contact.transferredBy === 'object'
                                                ? contact.transferredBy.name || contact.transferredBy.role
                                                : contact.transferredBy
                                        }
                                    </Text>
                                ) : (
                                    <Text style={styles.assignedByText}>
                                        Assigned by: {
                                            contact.assigned_by
                                                ? (typeof contact.assigned_by === 'object'
                                                    ? contact.assigned_by.name || contact.assigned_by.role
                                                    : contact.assigned_by)
                                                : (contact.assignedBy || 'System')
                                        }
                                    </Text>
                                )}
                            </>
                        )}
                    </View>


                    {/* Search Result / Status Row */}
                    {/* Hide for New Enquiries - only show for regular contacts */}
                    {!contact.isNewLead && (
                        <View style={styles.statusRow}>
                            {contact.lastCallRecord ? (
                                <Text style={styles.statusLine} numberOfLines={1} ellipsizeMode="tail">
                                    <Text style={styles.statusText}>
                                        {`${contact.lastCallRecord.duration || '0s'}`}
                                    </Text>

                                    <Text style={styles.bullet}> · </Text>
                                    <Text style={styles.timeText}>
                                        {formatOutcomeDate(contact.lastCallRecord.date)}
                                    </Text>
                                    {(contact.isCampaignLead || contact.campaignName) && (
                                        <>
                                            <Text style={styles.bullet}> · </Text>
                                            <Text style={styles.assignedText}>
                                                {contact.campaignName || contact.source}
                                            </Text>
                                        </>
                                    )}
                                </Text>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={styles.statusText}>No call done</Text>
                                    <Text style={styles.bullet}> · </Text>
                                    <Text style={styles.timeText}>--</Text>
                                    {(contact.isCampaignLead || contact.campaignName) && (
                                        <>
                                            <Text style={styles.bullet}> · </Text>
                                            <Text style={styles.assignedText}>{contact.campaignName || contact.source}</Text>
                                        </>
                                    )}
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* Primary Action Button - 48px size, 24px radius, gradient */}
            <TouchableOpacity
                style={styles.callButtonContainer}
                onPress={handleCallPress}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.callButtonGradient}
                >
                    <MaterialIcons name="phone" size={20} color="#FFFFFF" />
                </LinearGradient>
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginHorizontal: 6, // Reduced from 16 to make cards broader
        marginBottom: 10,
        borderRadius: 20, // Modern floating card radius
        shadowColor: '#8a79d6', // Soft purple shadow
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: 2,
        borderColor: COLORS.lightViolet, // Light Violet border
    },
    avatarText: {
        color: COLORS.background,
        fontSize: 20,
        fontWeight: '600',
    },
    info: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        flexWrap: 'wrap',
    },
    name: {
        fontFamily: 'SF Pro Display',
        fontSize: 16,
        fontWeight: '600', // Semibold
        color: '#1F2937',
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        backgroundColor: '#F3E5F5',
    },
    statusBadgeText: {
        fontFamily: 'SF Pro Display',
        fontSize: 10,
        fontWeight: '700', // Bold
        letterSpacing: 0.5,
    },
    phoneText: {
        fontFamily: 'SF Pro Display',
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '500', // Medium
        marginBottom: 6,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusLine: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    callIcon: {
        fontSize: 14,
        marginRight: 4,
        fontWeight: '600',
    },
    statusText: {
        fontFamily: 'SF Pro Display',
        fontSize: 13,
        fontWeight: '400',
        color: '#6B7280',
    },
    bullet: {
        fontFamily: 'SF Pro Display',
        fontSize: 12,
        color: COLORS.lightViolet, // Light Violet bullet
        marginHorizontal: 8,
    },
    timeText: {
        fontFamily: 'SF Pro Display',
        fontSize: 13,
        fontWeight: '400',
        color: '#666',
    },
    assignedText: {
        fontFamily: 'SF Pro Display',
        fontSize: 13,
        fontWeight: '400',
        color: '#666',
    },
    callButtonContainer: {
        borderRadius: 24, // Exact radius
        shadowColor: COLORS.gradientStart,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    callButtonGradient: {
        width: 48, // Exact size annotated
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    assignedByText: {
        fontFamily: 'SF Pro Display',
        fontSize: 12,
        fontWeight: '400',
        color: '#8E8E93',
        marginTop: 2,
        fontStyle: 'italic',
    },
    leadSourceText: {
        fontFamily: 'SF Pro Display',
        fontSize: 13,
        color: '#6C4DFF',
        fontWeight: '500',
        marginTop: 2,
    },
    transferredByText: {
        fontFamily: 'SF Pro Display',
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 1,
        fontWeight: '400', // Regular
        fontStyle: 'italic',
    },
    sourceText: {
        fontFamily: 'SF Pro Display',
        fontSize: 13,
        color: COLORS.primaryPurple,
        fontWeight: '400', // Regular
    },
    campaignText: {
        fontFamily: 'SF Pro Display',
        fontSize: 13,
        color: COLORS.primaryPurple,
        fontWeight: '400', // Regular
    },
    attributesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 6,
        gap: 6,
    },
    attributeChip: {
        backgroundColor: COLORS.lightVioletBg, // Light violet
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: '#DDD6FE',
    },
    attributeText: {
        fontSize: 10,
        color: COLORS.darkPurpleText, // Darker purple text
        fontWeight: '600',
    },
});

export default ContactCard;
