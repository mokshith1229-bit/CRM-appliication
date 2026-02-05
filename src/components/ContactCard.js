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
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E0E0E0',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    info: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '400',
        color: '#000000',
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    phoneText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 2, // Reverted to smaller spacing
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
        fontSize: 13,
        fontWeight: '500',
    },
    bullet: {
        fontSize: 12,
        color: '#999',
        marginHorizontal: 16, // Significantly increased spacing
    },
    timeText: {
        fontSize: 13,
        color: '#666',
    },
    assignedText: {
        fontSize: 13,
        color: '#666',
    },
    callButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    callIconCustom: {
        width: 24,
        height: 24,
        // tintColor: COLORS.primary, // Removed to show original image (black) as it is a JPG
    },
    callButtonIcon: {
        fontSize: 18,
    },
    assignedByText: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 2,
    },
    leadSourceText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '600',
        marginTop: 2,
    },
    transferredByText: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 1,
    },
    attributesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 4,
        gap: 6,
    },
    attributeChip: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    attributeText: {
        fontSize: 11,
        color: '#374151',
        fontWeight: '500',
    },
});

export default ContactCard;
