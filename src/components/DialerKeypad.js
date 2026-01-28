import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
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
                    style={[styles.callButton, !canCall && styles.disabledCallButton]}
                    onPress={() => {
                        if (canCall) {
                            triggerHaptic('success');
                            onCall();
                        }
                    }}
                    disabled={!canCall}
                >
                    <Ionicons name="call" size={24} color="#FFF" style={styles.callIcon} />
                    <Text style={styles.callButtonText}>Call</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#EBEDF4',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingVertical: 4,
        paddingRight: 8,
    },
    backspaceIconButton: {
        padding: 8,
        borderRadius: 20,
    },
    grid: {
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    key: {
        width: (SCREEN_WIDTH - 64) / 3, // Slightly adjusted for better gutter control
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
        elevation: 2,
    },
    keyText: {
        fontSize: SCREEN_WIDTH < 380 ? 24 : 28,
        color: '#1C1C1E',
        fontWeight: '400',
    },
    subText: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: '500',
        marginTop: -1,
    },
    actionRow: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    callButton: {
        width: 140,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#008F39',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    disabledCallButton: {
        backgroundColor: '#A5D6A7',
        opacity: 0.7,
    },
    callIcon: {
        marginRight: 12,
    },
    callButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
});

export default DialerKeypad;
