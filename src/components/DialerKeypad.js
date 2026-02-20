import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DialerKeypad = ({ onNumberPress, onBackspace, onClear, onLongZero, onCall, canCall }) => {

    const keys = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['*', '0', '#'],
    ];

    const subLabels = {
        '2': 'ABC', '3': 'DEF',
        '4': 'GHI', '5': 'JKL', '6': 'MNO',
        '7': 'PQRS', '8': 'TUV', '9': 'WXYZ',
        '0': '+',
    };

    const triggerHaptic = (type = 'light') => {
        // Haptics logic removed for stability
    };

    const renderKey = (digit) => (
        <TouchableOpacity
            key={digit}
            style={styles.key}
            activeOpacity={0.6}
            onPress={() => {
                triggerHaptic();
                onNumberPress(digit);
            }}
            onLongPress={() => {
                if (digit === '0') {
                    triggerHaptic('medium');
                    onLongZero();
                }
            }}
        >
            <Text style={styles.keyText}>{digit}</Text>
            {subLabels[digit] && (
                <Text style={styles.subText}>{subLabels[digit]}</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Top row with backspace */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backspaceIconButton}
                    onPress={() => {
                        triggerHaptic();
                        onBackspace();
                    }}
                    onLongPress={() => {
                        triggerHaptic('medium');
                        onClear();
                    }}
                >
                    <MaterialIcons name="backspace" size={22} color="#8E8E93" />
                </TouchableOpacity>
            </View>

            {/* Keypad Grid */}
            <View style={styles.grid}>
                {keys.map((row, i) => (
                    <View key={i} style={styles.row}>
                        {row.map(renderKey)}
                    </View>
                ))}
            </View>

            {/* Call Button Row */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.callButtonContainer, !canCall && styles.disabledCallButton]}
                    activeOpacity={0.8}
                    onPress={() => {
                        if (canCall) {
                            triggerHaptic('success');
                            onCall();
                        }
                    }}
                    disabled={!canCall}
                >
                    <LinearGradient
                        colors={canCall ? ['#6C4DFF', '#4FC3F7'] : ['#E5E7EB', '#D1D5DB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.callButtonGradient}
                    >
                        <Ionicons name="call" size={32} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#F5F3FF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 90,
        shadowColor: '#8A79D6',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingVertical: 8,
        paddingRight: 12,
        marginBottom: 8,
    },
    backspaceIconButton: {
        padding: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    grid: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    key: {
        width: (SCREEN_WIDTH - 72) / 3, /* Fill space with gaps */
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#8A79D6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F9FAFB',
    },
    keyText: {
        fontSize: 24,
        color: '#111827',
        fontWeight: '600',
    },
    subText: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '400',
        marginTop: 0,
    },
    actionRow: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    callButtonContainer: {
        borderRadius: 36,
        shadowColor: '#6C4DFF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    disabledCallButton: {
        shadowOpacity: 0,
        elevation: 0,
    },
    callButtonGradient: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default DialerKeypad;
