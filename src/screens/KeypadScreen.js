import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
    Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContactStore } from '../store/contactStore';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import DialerKeypad from '../components/DialerKeypad';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const T9_MAP = {
    '2': '[abcABC]',
    '3': '[defDEF]',
    '4': '[ghiGHI]',
    '5': '[jklJKL]',
    '6': '[mnoMNO]',
    '7': '[pqrsPQRS]',
    '8': '[tuvTUV]',
    '9': '[wxyzWXYZ]',
};

const KeypadScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [phoneNumber, setPhoneNumber] = useState('');

    const contacts = useContactStore(state => state.contacts);
    const recentDials = useContactStore(state => state.recentDials);
    const addRecentDial = useContactStore(state => state.addRecentDial);

    // Generate T9 Regex for name matching
    const getT9Regex = (input) => {
        let regexStr = '';
        for (let char of input) {
            regexStr += T9_MAP[char] || char;
        }
        return new RegExp(regexStr);
    };

    // Filter suggestions based on phoneNumber
    const suggestions = useMemo(() => {
        if (!phoneNumber) {
            // Priority 1: Recent Dials (if empty, show first 10 contacts)
            if (recentDials.length > 0) {
                return recentDials.map(num => {
                    const contact = contacts.find(c => c.phone.replace(/\D/g, '') === num.replace(/\D/g, ''));
                    return {
                        id: `recent-${num}`,
                        name: contact ? contact.name : 'Unknown',
                        phone: num,
                        isRecent: true
                    };
                });
            }
            return contacts.slice(0, 10);
        }

        const digits = phoneNumber.replace(/\D/g, '');
        const t9Regex = getT9Regex(digits);

        const filtered = contacts.filter(c => {
            const numericPhone = c.phone.replace(/\D/g, '');
            const phoneMatch = numericPhone.includes(digits);
            const nameMatch = c.name && t9Regex.test(c.name);
            return phoneMatch || nameMatch;
        });

        // Sort by name match priority, then phone match
        return filtered.sort((a, b) => {
            const aNameMatch = a.name && t9Regex.test(a.name);
            const bNameMatch = b.name && t9Regex.test(b.name);
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            return 0;
        }).slice(0, 15);
    }, [phoneNumber, contacts, recentDials]);

    const handleKeyPress = (digit) => {
        setPhoneNumber(prev => prev + digit);
    };

    const handleBackspace = () => {
        setPhoneNumber(prev => prev.slice(0, -1));
    };

    const handleClear = () => {
        setPhoneNumber('');
    };

    const handleCall = (number, contact = null) => {
        if (number.length >= 3) {
            addRecentDial(number);
            Linking.openURL(`tel:${number}`);
        }
    };

    const handleSuggestionPress = (contact) => {
        setPhoneNumber(contact.phone);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: 60 + insets.bottom }]}>
            <View style={styles.topFlexArea}>
                {/* Suggested Section - Moved to top */}
                <View style={styles.suggestedContainer}>
                    <Text style={styles.suggestedTitle}>
                        {!phoneNumber ? 'Recent Dials' : 'Suggestions'}
                    </Text>
                    <ScrollView
                        style={styles.suggestedList}
                        contentContainerStyle={styles.suggestedListContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {suggestions.map((contact) => (
                            <TouchableOpacity
                                key={contact.id}
                                style={styles.suggestedItem}
                                onPress={() => handleSuggestionPress(contact)}
                            >
                                <View style={styles.avatarContainer}>
                                    <View style={[
                                        styles.avatar,
                                        { backgroundColor: contact.isRecent ? '#E0E0E0' : (contact.id.toString().charCodeAt(0) % 2 === 0 ? '#4DB6AC' : '#4FC3F7') }
                                    ]}>
                                        <Text style={[styles.avatarText, contact.isRecent && { color: '#666' }]}>
                                            {contact.name.charAt(0)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.suggestedInfo}>
                                    <Text style={styles.contactName}>{contact.name}</Text>
                                    <Text style={styles.contactPhone}>
                                        {contact.isRecent ? 'Recently dialed ' : 'Phone '}
                                        {contact.phone}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleCall(contact.phone, contact)}
                                    style={styles.callIconButton}
                                >
                                    <MaterialIcons name="phone-in-talk" size={24} color="#007AFF" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Number Input Selection Area - Only show when there's input */}
                {phoneNumber.length > 0 && (
                    <View style={styles.inputArea}>
                        <TextInput
                            style={styles.phoneNumberInput}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            placeholder=""
                            keyboardType="none"
                            showSoftInputOnFocus={false}
                            autoFocus={false}
                            caretHidden={phoneNumber.length === 0}
                        />
                    </View>
                )}

                {/* Info Bar: Actions when no exact match found but phone has input */}
                {phoneNumber.length > 0 && (
                    <View style={styles.infoBar}>
                        <View style={styles.actionsRow}>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateLead', { phone: phoneNumber })}>
                                <MaterialIcons name="person-add" size={20} color={COLORS.primary} />
                                <Text style={styles.actionLabel}>Create contact</Text>
                            </TouchableOpacity>
                            <View style={styles.actionDivider} />
                            <TouchableOpacity style={styles.actionBtn}>
                                <MaterialIcons name="add" size={20} color={COLORS.primary} />
                                <Text style={styles.actionLabel}>Add to contact</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Dialer Keypad */}
            <DialerKeypad
                onNumberPress={handleKeyPress}
                onBackspace={handleBackspace}
                onClear={handleClear}
                onLongZero={() => setPhoneNumber(prev => prev + '+')}
                onCall={() => handleCall(phoneNumber)}
                canCall={phoneNumber.length > 0}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    topFlexArea: {
        flex: 1,
    },
    inputArea: {
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    phoneNumberInput: {
        fontSize: SCREEN_WIDTH < 380 ? 32 : 44,
        color: '#1C1C1E',
        textAlign: 'center',
        width: '100%',
        fontWeight: '300',
    },
    infoBar: {
        height: 50,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    actionLabel: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
        marginLeft: 6,
    },
    actionDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#DDD',
        marginHorizontal: 15,
    },
    suggestedContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    suggestedTitle: {
        fontSize: 16,
        color: '#8E8E93',
        fontWeight: '500',
        marginBottom: 15,
    },
    suggestedList: {
        flex: 1,
    },
    suggestedListContent: {
        paddingBottom: 20,
    },
    suggestedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        marginRight: 15,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '600',
    },
    suggestedInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 17,
        color: '#1C1C1E',
        fontWeight: '600',
        marginBottom: 2,
    },
    contactPhone: {
        fontSize: 14,
        color: '#8E8E93',
    },
    callIconButton: {
        padding: 10,
    }
});

export default KeypadScreen;
