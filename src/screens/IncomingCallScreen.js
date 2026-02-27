import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
    StatusBar,
    
    Modal,
    TextInput,
    Linking,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { useContactStore } from '../store/contactStore';
import defaultAvatar from '../assets/default_avatar.jpg';

const IncomingCallScreen = ({ navigation, route }) => {
    const { contact } = route.params;
    const addCallLog = useContactStore((state) => state.addCallLog);

    const [isMuted, setIsMuted] = useState(false);
    const [showQuickReply, setShowQuickReply] = useState(false);
    const [showCustomMsg, setShowCustomMsg] = useState(false);
    const [customMsg, setCustomMsg] = useState('');

    // Pulse animation for avatar
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const quickReplies = [
        "I will call you back",
        "In a meeting, will call later",
        "Busy now, call later",
        "Custom message"
    ];

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const handleAccept = async () => {
        const callData = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            status: 'connected',
            direction: 'incoming',
            systemCallResult: 'Connected',
            duration: '0s',
            notes: '',
        };
        await addCallLog(contact.id, callData);
        navigation.replace('InAppCall', { contact });
    };

    const handleDecline = async (reason = 'Decline', businessStatus = null) => {
        const callData = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            status: 'missed',
            direction: 'incoming',
            systemCallResult: 'Missed',
            businessStatus: businessStatus,
            duration: '0s',
            notes: reason !== 'Decline' ? `Quick Reply: ${reason}` : '',
        };
        await addCallLog(contact.id, callData);
        navigation.navigate('Home');
    };

    const handleSendQuickReply = async (message) => {
        if (message === "Custom message") {
            setShowQuickReply(false);
            setShowCustomMsg(true);
            return;
        }

        const url = `sms:${contact.phone}?body=${encodeURIComponent(message)}`;
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            }
            await handleDecline(message, 'Callback');
        } catch (error) {
            Alert.alert('Error', 'Could not open messaging app');
        }
    };

    const handleSendCustomMsg = async () => {
        if (!customMsg.trim()) return;

        const message = customMsg.trim();
        const url = `sms:${contact.phone}?body=${encodeURIComponent(message)}`;

        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            }
            setShowCustomMsg(false);
            await handleDecline(message, 'Callback');
        } catch (error) {
            Alert.alert('Error', 'Could not open messaging app');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <SafeAreaView style={styles.safeArea}>
                {/* Top Section */}
                <View style={styles.topSection}>
                    <Text style={styles.incomingText}>Incoming Call...</Text>
                    {isMuted && (
                        <View style={styles.mutedBadge}>
                            <Ionicons name="notifications-off" size={12} color="#8E8E93" />
                            <Text style={styles.mutedText}>Ringtone muted</Text>
                        </View>
                    )}
                </View>

                {/* Center Section */}
                <View style={styles.centerSection}>
                    <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
                        <Image
                            source={contact.photo ? { uri: contact.photo } : defaultAvatar}
                            style={styles.avatar}
                        />
                    </Animated.View>
                    <Text style={styles.callerName}>{contact.name || contact.phone}</Text>
                    <Text style={styles.mobileLabel}>Mobile</Text>
                </View>

                {/* Bottom Section */}
                <View style={styles.bottomSection}>
                    <View style={styles.mainButtonsRow}>
                        {/* Decline Button */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.circleButton, styles.declineButton]}
                                onPress={() => handleDecline()}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons name="call-end" size={32} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.buttonLabel}>Decline</Text>
                        </View>

                        {/* Accept Button */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.circleButton, styles.acceptButton]}
                                onPress={handleAccept}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons name="call" size={32} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.buttonLabel}>Accept</Text>
                        </View>
                    </View>

                    {/* Quick Actions Row */}
                    <View style={styles.quickActionsRow}>
                        <TouchableOpacity
                            style={styles.smallActionBtn}
                            onPress={() => setShowQuickReply(true)}
                        >
                            <Ionicons name="chatbubble-ellipses" size={20} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.smallActionBtn, isMuted && styles.mutedBtnActive]}
                            onPress={() => setIsMuted(!isMuted)}
                        >
                            <Ionicons
                                name={isMuted ? "notifications-off" : "notifications"}
                                size={20}
                                color={isMuted ? COLORS.primary : "#666"}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Reply Sheet */}
                <Modal
                    visible={showQuickReply}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowQuickReply(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.bottomSheet}>
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>Quick Reply</Text>
                                <TouchableOpacity onPress={() => setShowQuickReply(false)}>
                                    <Text style={styles.closeText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                            {quickReplies.map((reply, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.replyItem}
                                    onPress={() => handleSendQuickReply(reply)}
                                >
                                    <Text style={styles.replyText}>{reply}</Text>
                                    <MaterialIcons name="chevron-right" size={24} color="#CCC" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Modal>

                {/* Custom Message Modal */}
                <Modal
                    visible={showCustomMsg}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowCustomMsg(false)}
                >
                    <View style={styles.modalOverlayCenter}>
                        <View style={styles.customMsgBox}>
                            <Text style={styles.customMsgTitle}>Type message to {contact.name || contact.phone}</Text>
                            <TextInput
                                style={styles.customInput}
                                value={customMsg}
                                onChangeText={setCustomMsg}
                                placeholder="Write your message..."
                                multiline
                                autoFocus
                            />
                            <View style={styles.boxButtons}>
                                <TouchableOpacity
                                    style={styles.boxBtn}
                                    onPress={() => setShowCustomMsg(false)}
                                >
                                    <Text style={styles.boxBtnTextCancel}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.boxBtn, styles.boxBtnPrimary]}
                                    onPress={handleSendCustomMsg}
                                >
                                    <Text style={styles.boxBtnTextPrimary}>Send & Decline</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 60,
    },
    topSection: {
        alignItems: 'center',
    },
    incomingText: {
        fontSize: 18,
        color: '#999',
        letterSpacing: 0.5,
    },
    mutedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
        gap: 4,
    },
    mutedText: {
        fontSize: 12,
        color: '#8E8E93',
    },
    centerSection: {
        alignItems: 'center',
        marginTop: -50,
    },
    avatarWrapper: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        ...SHADOWS.medium,
    },
    avatar: {
        width: 190,
        height: 190,
        borderRadius: 95,
        resizeMode: 'cover',
    },
    callerName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1C1C1E',
        marginBottom: 4,
    },
    mobileLabel: {
        fontSize: 16,
        color: '#8E8E93',
    },
    bottomSection: {
        width: '100%',
        alignItems: 'center',
    },
    mainButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '80%',
        marginBottom: 30,
    },
    buttonContainer: {
        alignItems: 'center',
    },
    circleButton: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        ...SHADOWS.medium,
    },
    acceptButton: {
        backgroundColor: '#4CD964',
    },
    declineButton: {
        backgroundColor: '#FF3B30',
    },
    buttonLabel: {
        fontSize: 14,
        color: '#1C1C1E',
        fontWeight: '500',
    },
    quickActionsRow: {
        flexDirection: 'row',
        gap: 20,
    },
    smallActionBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    mutedBtnActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '10',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalOverlayCenter: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    bottomSheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1C1C1E',
    },
    closeText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    replyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    replyText: {
        fontSize: 16,
        color: '#1C1C1E',
    },
    customMsgBox: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        width: '100%',
        padding: 24,
        ...SHADOWS.large,
    },
    customMsgTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1C1E',
        marginBottom: 16,
    },
    customInput: {
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        height: 100,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    boxButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    boxBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
    },
    boxBtnPrimary: {
        backgroundColor: COLORS.primary,
    },
    boxBtnTextCancel: {
        color: '#8E8E93',
        fontWeight: '600',
        fontSize: 16,
    },
    boxBtnTextPrimary: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
});

export default IncomingCallScreen;
