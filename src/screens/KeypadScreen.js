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
        <View style={[styles.container, { paddingTop: insets.top }]}>
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
                                activeOpacity={0.7}
                            >
                                <View style={styles.avatarContainer}>
                                    <View style={[
                                        styles.avatar,
                                        { backgroundColor: '#B39DFF' }
                                    ]}>
                                        <Text style={styles.avatarText}>
                                            {contact.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.suggestedInfo}>
                                    <Text style={styles.contactName}>{contact.name}</Text>
                                    <Text style={styles.contactPhone}>
                                        Phone {contact.phone}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleCall(contact.phone, contact)}
                                    style={styles.callIconButton}
                                >
                                    <MaterialIcons name="phone" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Info Bar: Actions when no exact match found but phone has input */}
                {phoneNumber.length > 0 && (
                    <View style={styles.infoBar}>
                        <View style={styles.actionsRow}>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateLead', { phone: phoneNumber })}>
                                <MaterialIcons name="person-add" size={20} color={'#6C4DFF'} />
                                <Text style={styles.actionLabel}>Create contact</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Number Input Selection Area - Shows directly above keypad */}
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
        backgroundColor: '#F7F5FF',
    },
    topFlexArea: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    suggestedContainer: {
        flex: 1,
    },
    suggestedTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
    },
    suggestedList: {
        flex: 1,
    },
    suggestedListContent: {
        paddingHorizontal: 20,
        paddingBottom: 32,
    },
    suggestedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
        shadowColor: '#8A79D6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F3F0FF',
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    suggestedInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    contactName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 2,
    },
    contactPhone: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '400',
    },
    callIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6C4DFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6C4DFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    inputArea: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingBottom: 24,
    },
    phoneNumberInput: {
        fontSize: 36,
        fontWeight: '500',
        color: '#111827',
        textAlign: 'center',
        letterSpacing: 2,
    },
    infoBar: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EBE8FF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6C4DFF',
        marginLeft: 6,
    },
});

export default KeypadScreen;
