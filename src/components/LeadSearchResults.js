import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

const LeadSearchResults = ({ results, isSearching, onViewLead, onDismiss }) => {
    if (isSearching) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Searching...</Text>
                </View>
            </View>
        );
    }

    if (!results || results.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.warningIcon}>
                    <MaterialCommunityIcons name="alert-circle" size={20} color="#F59E0B" />
                </View>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.warningTitle}>Possible Duplicates Found</Text>
                    <Text style={styles.warningSubtitle}>
                        {results.length} existing lead{results.length > 1 ? 's' : ''} found with similar information
                    </Text>
                </View>
                <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
                    <MaterialCommunityIcons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.resultsContainer} nestedScrollEnabled>
                {results.map((lead) => (
                    <TouchableOpacity
                        key={lead._id}
                        style={styles.resultCard}
                        onPress={() => onViewLead && onViewLead(lead)}
                    >
                        <View style={styles.resultHeader}>
                            <Text style={styles.resultName}>{lead.name || 'No Name'}</Text>
                            {lead.status && (
                                <View style={[styles.statusBadge, getStatusColor(lead.status)]}>
                                    <Text style={styles.statusText}>{lead.status}</Text>
                                </View>
                            )}
                        </View>
                        {lead.email && (
                            <View style={styles.resultRow}>
                                <MaterialCommunityIcons name="email" size={14} color={COLORS.textSecondary} />
                                <Text style={styles.resultText}>{lead.email}</Text>
                            </View>
                        )}
                        {lead.mobile && (
                            <View style={styles.resultRow}>
                                <MaterialCommunityIcons name="phone" size={14} color={COLORS.textSecondary} />
                                <Text style={styles.resultText}>{lead.mobile}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Review these leads before creating a duplicate
                </Text>
            </View>
        </View>
    );
};

const getStatusColor = (status) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
        case 'hot':
            return { backgroundColor: '#FEE2E2', borderColor: '#EF4444' };
        case 'warm':
            return { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' };
        case 'cold':
            return { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' };
        case 'converted':
        case 'won':
            return { backgroundColor: '#D1FAE5', borderColor: '#10B981' };
        default:
            return { backgroundColor: '#F3F4F6', borderColor: '#9CA3AF' };
    }
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFF9E6',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F59E0B',
        marginBottom: SPACING.md,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: '#FFFBEB',
        borderBottomWidth: 1,
        borderBottomColor: '#FDE68A',
    },
    warningIcon: {
        marginRight: SPACING.sm,
    },
    headerTextContainer: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400E',
        marginBottom: 2,
    },
    warningSubtitle: {
        fontSize: 12,
        color: '#B45309',
    },
    dismissButton: {
        padding: 4,
    },
    loadingContainer: {
        padding: SPACING.md,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    resultsContainer: {
        maxHeight: 200,
        padding: SPACING.sm,
    },
    resultCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: SPACING.sm,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    resultName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.text,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    resultText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 6,
    },
    footer: {
        padding: SPACING.sm,
        backgroundColor: '#FFFBEB',
        borderTopWidth: 1,
        borderTopColor: '#FDE68A',
    },
    footerText: {
        fontSize: 12,
        color: '#92400E',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

export default LeadSearchResults;
