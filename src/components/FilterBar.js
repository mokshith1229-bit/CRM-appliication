import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const FilterBar = ({ activeFilter, onFilterChange, newLeadsCount = 0 }) => {
    const filters = [
        { id: 'all', label: 'All Calls' },
        { id: 'contacts', label: 'All Leads' },
        { id: 'new_leads', label: 'New Enquiries' },
    ];
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
                            {isActive && (
                                <LinearGradient
                                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
                                />
                            )}
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
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24, // Exact annotated radius
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        padding: 4, // Inner padding
        height: 48, // 44px active area + 4px padding
        shadowColor: '#8a79d6', // Soft purple shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    rowContainer: {
        flexDirection: 'row',
        width: '100%',
        height: '100%',
    },
    filterButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        position: 'relative',
        height: '100%',
    },
    filterButtonActive: {
        // Handled by absolute linear gradient
    },
    filterText: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        fontWeight: '500',
        zIndex: 1,
    },
    filterTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
        zIndex: 1,
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 10,
        backgroundColor: COLORS.lightPurpleTint,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        zIndex: 1,
    },
    badgeText: {
        color: COLORS.primaryPurple,
        fontSize: 10,
        fontWeight: '700',
    },
});

export default FilterBar;
