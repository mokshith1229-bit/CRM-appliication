import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BottomTabs = ({ activeTab, onTabPress }) => {
    const insets = useSafeAreaInsets();

    const tabs = [
        { id: 'Home', label: 'Home', icon: 'home' },
        { id: 'Keypad', label: 'Keypad', icon: 'dialpad' },
    ];

    return (
        <View style={[styles.container, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={styles.tab}
                        onPress={() => onTabPress(tab.id)}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.iconContainer,
                            isActive && styles.activeIconContainer
                        ]}>
                            <MaterialIcons
                                name={tab.icon}
                                size={24}
                                color={isActive ? '#1C1C1E' : '#8E8E93'}
                            />
                        </View>
                        <Text style={[
                            styles.tabLabel,
                            isActive && styles.activeTabLabel
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#EBEBEB',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
    },
    iconContainer: {
        width: 60,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    activeIconContainer: {
        backgroundColor: '#DCE4F9',
    },
    tabLabel: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '500',
    },
    activeTabLabel: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
});

export default BottomTabs;
