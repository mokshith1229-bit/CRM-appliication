import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, CALL_OUTCOMES } from '../constants/theme';
import EditableField from './EditableField';

const ActivityLogItem = ({ activity, onUpdateNote }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Format Date: "Jan 12, 11:03"
    const formatDate = (dateString) => {
        try {
            const d = new Date(dateString);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
                d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (e) {
            return dateString;
        }
    };

    // Format status label
    const formatStatusLabel = (status) => {
        if (!status) return 'None';
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    };

    // Render based on activity type
    if (activity.type === 'status_change') {
        const { oldStatus, newStatus } = activity.data;
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.logRow}>
                        <MaterialIcons name="swap-horiz" size={16} color="#FF9500" style={{ marginRight: 6 }} />
                        <Text style={[styles.statusText, { color: '#FF9500' }]}>
                            Status Changed
                        </Text>
                        <Text style={styles.divider}>·</Text>
                        <Text style={styles.time}>{formatDate(activity.timestamp)}</Text>
                    </View>
                </View>
                <View style={styles.statusChangeContent}>
                    <Text style={styles.statusChangeText}>
                        <Text style={styles.oldStatus}>{formatStatusLabel(oldStatus)}</Text>
                        {' → '}
                        <Text style={styles.newStatus}>{formatStatusLabel(newStatus)}</Text>
                    </Text>
                </View>
            </View>
        );
    }

    if (activity.type === 'first_call') {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.logRow}>
                        <MaterialIcons name="phone-in-talk" size={16} color="#34C759" style={{ marginRight: 6 }} />
                        <Text style={[styles.statusText, { color: '#34C759' }]}>
                            First Call Done
                        </Text>
                        <Text style={styles.divider}>·</Text>
                        <Text style={styles.time}>{formatDate(activity.timestamp)}</Text>
                    </View>
                </View>
            </View>
        );
    }

    // Call activity (default)
    const call = activity.data || activity;
    const outcomeConfig = CALL_OUTCOMES.find(o => o.label === call.status) ||
        CALL_OUTCOMES.find(o => o.id === call.status?.toLowerCase()) ||
        { icon: 'phone', color: '#666', label: call.status || 'Unknown' };

    const handleSaveNote = (newNote) => {
        if (onUpdateNote) {
            onUpdateNote(call.id, newNote);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.header} onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
                <View style={styles.logRow}>
                    <MaterialIcons name={outcomeConfig.icon} size={16} color={outcomeConfig.color} style={{ marginRight: 6 }} />
                    <Text style={[styles.statusText, { color: outcomeConfig.color }]}>
                        {outcomeConfig.label}
                    </Text>
                    <Text style={styles.divider}>·</Text>
                    <Text style={styles.time}>{formatDate(call.date || activity.timestamp)}</Text>
                    {call.agentName && (
                        <>
                            <Text style={styles.divider}>·</Text>
                            <Text style={styles.agentText}>By {call.agentName}</Text>
                        </>
                    )}
                </View>

                <View style={styles.headerIcons}>
                    <TouchableOpacity onPress={() => setShowDetailsModal(true)} style={styles.iconButton}>
                        <MaterialIcons name="info-outline" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.expandedContent}>
                    <TouchableOpacity onPress={() => setIsExpanded(false)} activeOpacity={1}>
                        <Text style={styles.notesLabel}>Call Notes:</Text>
                    </TouchableOpacity>
                    <EditableField
                        value={call.notes}
                        onSave={handleSaveNote}
                        placeholder="Add notes about this call..."
                        multiline
                    />
                </View>
            )}

            {/* Details Modal */}
            <Modal
                visible={showDetailsModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDetailsModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowDetailsModal(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Call Details</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Date & Time:</Text>
                            <Text style={styles.detailValue}>{call.date || activity.timestamp}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Status:</Text>
                            <Text style={styles.detailValue}>{call.status}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Duration:</Text>
                            <Text style={styles.detailValue}>{call.duration}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Call Type:</Text>
                            <Text style={styles.detailValue}>{call.type || 'Outgoing'}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowDetailsModal(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        marginBottom: SPACING.sm,
        padding: SPACING.md,
        borderRadius: 8,
        marginHorizontal: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        flexWrap: 'wrap',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    divider: {
        marginHorizontal: 4,
        color: '#999',
    },
    time: {
        fontSize: 13,
        color: '#666',
    },
    agentText: {
        fontSize: 13,
        color: '#666',
        fontStyle: 'italic',
    },
    headerIcons: {
        flexDirection: 'row',
        marginLeft: 8,
    },
    iconButton: {
        padding: 4,
    },
    expandedContent: {
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    notesLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    statusChangeContent: {
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    statusChangeText: {
        fontSize: 14,
        color: COLORS.text,
    },
    oldStatus: {
        color: '#FF3B30',
        fontWeight: '600',
    },
    newStatus: {
        color: '#34C759',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: SPACING.lg,
        width: '85%',
        maxWidth: 350,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.lg,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    detailLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    detailValue: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '600',
    },
    closeButton: {
        marginTop: SPACING.lg,
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default ActivityLogItem;
