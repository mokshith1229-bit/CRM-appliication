import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { makeCall } from '../utils/intents';
import defaultAvatar from '../assets/default_avatar.jpg';
import customCallIcon from '../assets/custom_call_icon.jpg';

const ContactCard = ({ contact, onPress, onLongPress, onAvatarPress, onCallPress }) => {
    const { statuses } = useSelector(state => state.config);

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
            return { label: 'New', color: '#34C759', bg: '#E8F5E9' };
        }

        // Handle "Unsaved" status for device logs
        if (contact?.status === 'Unsaved' || contact._source === 'log') {
            return { label: 'Unsaved', color: '#FF9500', bg: '#FFF3E0' };
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
                label: matchingStatus.label,
                color: matchingStatus.color || '#9CA3AF',
                bg: matchingStatus.color ? `${matchingStatus.color}20` : '#F3F4F6' // 20% opacity
            };
        }

        // Default fallback - show the status value even if not in config
        console.warn(`ContactCard: No matching status found for "${statusValue}"`);
        return { label: statusValue, color: '#9CA3AF', bg: '#F3F4F6' };
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
                                {contact.leadSource}
                            </Text>
                        )}
                        
                        {/* Only show assignment info for CRM leads, not device logs */}
                        {contact._source !== 'log' && (
                            <>
                                {contact.transferredBy ? (
                                    <Text style={styles.transferredByText}>
                                        Transferred by: {
                                            typeof contact.transferredBy === 'object' 
                                                ? contact.transferredBy.name  || contact.transferredBy.role
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

            {/* Call Button - Custom Image */}
            <TouchableOpacity
                style={styles.callButton}
                onPress={handleCallPress}
            >
                <Image
                    source={customCallIcon}
                    style={styles.callIconCustom}
                    resizeMode="contain"
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.background,
        paddingVertical: 12, // Slightly reduced vertical padding
        paddingHorizontal: 12, // Reduced horizontal padding
        marginBottom: 8, // Reduced margin bottom
        // marginHorizontal removed
        borderRadius: 12, // Slightly less rounded
        // More subtle shadow
        shadowColor: COLORS.shadowBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F5', 
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
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.royalBlue, // Royal Blue
        marginRight: 8,
        letterSpacing: 0.3,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        backgroundColor: '#F3E5F5',
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    phoneText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.deepPurple, // Deep Purple
        marginBottom: 4,
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
        fontSize: 12,
        fontWeight: '500',
        color: '#666',
    },
    bullet: {
        fontSize: 12,
        color: COLORS.lightViolet, // Light Violet bullet
        marginHorizontal: 8,
    },
    timeText: {
        fontSize: 12,
        color: '#888',
        fontWeight: '400',
    },
    assignedText: {
        fontSize: 12,
        color: COLORS.purple, // Purple
        fontWeight: '500',
    },
    callButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.lightVioletBg, // Very light violet bg
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.lightPurpleBorder, // Light purple border
        marginLeft: 8,
    },
    callIconCustom: {
        width: 22,
        height: 22,
    },
    callButtonIcon: {
        fontSize: 18,
    },
    assignedByText: {
        fontSize: 11,
        color: COLORS.violet, // Violet
        marginTop: 2,
        fontStyle: 'italic',
    },
    leadSourceText: {
        fontSize: 11,
        color: COLORS.purple, // Purple
        fontWeight: '700',
        marginTop: 2,
        backgroundColor: COLORS.violetAccent,
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    transferredByText: {
        fontSize: 11,
        color: COLORS.violet, // Violet
        marginTop: 1,
        fontStyle: 'italic',
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
