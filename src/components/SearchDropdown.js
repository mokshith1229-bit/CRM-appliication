import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { COLORS, SPACING } from '../constants/theme';

const SearchDropdown = ({ results, isSearching, onSelectLead, field }) => {
    const tenantConfig = useSelector(state => state.leads.tenantConfig);

    // Get dynamic status color from tenant config
    const getStatusColor = (status) => {
        if (!tenantConfig || !tenantConfig.lead_statuses) {
            // Fallback colors if config not loaded
            return { backgroundColor: '#F3F4F6', borderColor: '#9CA3AF' };
        }

        const statusConfig = tenantConfig.lead_statuses.find(
            s => s.label?.toLowerCase() === status?.toLowerCase()
        );

        if (statusConfig && statusConfig.color) {
            // Convert hex to lighter background color
            const color = statusConfig.color;
            return {
                backgroundColor: `${color}20`, // 20 is hex for ~12% opacity
                borderColor: color
            };
        }

        return { backgroundColor: '#F3F4F6', borderColor: '#9CA3AF' };
    };

    if (isSearching) {
        return (
            <View style={styles.dropdownContainer}>
                <View style={styles.searchingItem}>
                    <Text style={styles.searchingText}>Searching...</Text>
                </View>
            </View>
        );
    }

    if (!results || results.length === 0) {
        return null;
    }

    return (
        <View style={styles.dropdownContainer}>
            <FlatList
                data={results}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => onSelectLead(item)}
                    >
                        <View style={styles.itemContent}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.itemName}>{item.name || 'No Name'}</Text>
                                {item.status && (
                                    <View style={[styles.statusBadge, getStatusColor(item.status)]}>
                                        <Text style={styles.statusText}>{item.status}</Text>
                                    </View>
                                )}
                            </View>
                            {field === 'name' && item.phone && (
                                <View style={styles.itemRow}>
                                    <MaterialCommunityIcons name="phone" size={12} color={COLORS.textSecondary} />
                                    <Text style={styles.itemDetail}>{item.phone}</Text>
                                </View>
                            )}
                            {field === 'email' && item.email && (
                                <View style={styles.itemRow}>
                                    <MaterialCommunityIcons name="email" size={12} color={COLORS.textSecondary} />
                                    <Text style={styles.itemDetail}>{item.email}</Text>
                                </View>
                            )}
                            {field === 'phone' && item.name && (
                                <View style={styles.itemRow}>
                                    <MaterialCommunityIcons name="account" size={12} color={COLORS.textSecondary} />
                                    <Text style={styles.itemDetail}>{item.name}</Text>
                                </View>
                            )}
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                )}
                style={styles.list}
                nestedScrollEnabled
            />
        </View>
    );
};

const styles = StyleSheet.create({
    dropdownContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginTop: 4,
        maxHeight: 200,
        zIndex: 1000,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    list: {
        maxHeight: 200,
    },
    searchingItem: {
        padding: SPACING.md,
        alignItems: 'center',
    },
    searchingText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    itemContent: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        marginLeft: 8,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '600',
        color: COLORS.text,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    itemDetail: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
});

export default SearchDropdown;
