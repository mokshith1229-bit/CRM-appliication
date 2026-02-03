import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const FilterBar = ({ activeFilter, onFilterChange, newLeadsCount = 0, excludeFilters = [] }) => {
    const allFilters = [
        { id: 'all', label: 'All Calls' },
        { id: 'new_leads', label: 'New Enquiries' },
    ];

    // Filter out excluded filters
    const filters = allFilters.filter(filter => !excludeFilters.includes(filter.id));
    return (
        <View style={styles.container}>
            <View style={styles.rowContainer}>
                {filters.map((filter) => {
                    const isActive = activeFilter === filter.id;
                    const showBadge = filter.id === 'new_leads' && newLeadsCount > 0;

                    return (
                        <TouchableOpacity
                            key={filter.id}
                            style={[
                                styles.filterButton,
                                isActive && styles.filterButtonActive,
                            ]}
                            onPress={() => onFilterChange(filter.id)}
                            activeOpacity={0.7}
                        >
                            {/* Render badge if needed */}
                            {showBadge && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {newLeadsCount > 99 ? '99+' : newLeadsCount}
                                    </Text>
                                </View>
                            )}

                            <Text
                                style={[
                                    styles.filterText,
                                    isActive && styles.filterTextActive,
                                ]}
                            >
                                {filter.label}
                            </Text>
                            {isActive && <View style={styles.activeIndicator} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    rowContainer: {
        flexDirection: 'row',
        width: '100%',
    },
    filterButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        position: 'relative',
    },
    filterButtonActive: {
        // Active state styling handled by text and indicator
    },
    filterText: {
        ...TYPOGRAPHY.body,
        color: COLORS.filterInactive,
        fontWeight: '500',
    },
    filterTextActive: {
        color: COLORS.filterActive,
        fontWeight: '700',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        width: '60%', // Use a percentage width for the indicator
        backgroundColor: COLORS.filterActive,
        borderRadius: 2,
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 10,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        zIndex: 1,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
});

export default FilterBar;
