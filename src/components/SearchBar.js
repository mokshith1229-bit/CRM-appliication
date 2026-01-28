import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

const SearchBar = ({ searchQuery, onSearchChange, onMenuPress, onCalendarPress, isDateFiltered, hideMenuIcon }) => {
    return (
        <View style={styles.container}>
            {/* Menu Icon */}
            {!hideMenuIcon && (
                <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
                    <MaterialIcons name="menu" size={24} color="#333" />
                </TouchableOpacity>
            )}

            {/* Search Input */}
            <TextInput
                style={styles.searchInput}
                placeholder="Search contacts"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={onSearchChange}
            />

            {/* Calendar Filter Icon */}
            <TouchableOpacity style={styles.iconButton} onPress={onCalendarPress}>
                <MaterialIcons
                    name="calendar-today"
                    size={24}
                    color={isDateFiltered ? COLORS.primary : '#333'}
                />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: SPACING.md,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    iconButton: {
        padding: 8,
    },
    menuIcon: {
        width: 20,
        height: 20,
        justifyContent: 'space-around',
    },
    menuLine: {
        width: 20,
        height: 2,
        backgroundColor: '#333',
        borderRadius: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    micIcon: {
        width: 16,
        height: 20,
        alignItems: 'center',
    },
    micBody: {
        width: 12,
        height: 14,
        backgroundColor: '#333',
        borderRadius: 6,
    },
    micBase: {
        width: 16,
        height: 3,
        backgroundColor: '#333',
        marginTop: 2,
        borderRadius: 1.5,
    },
});

export default SearchBar;
