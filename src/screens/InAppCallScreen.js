import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, StatusBar as NativeStatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useDispatch, useSelector } from 'react-redux';
import { updateLead, createLead } from '../store/slices/leadSlice';

const InAppCallScreen = ({ route, navigation }) => {
    const { contact: initialContact, number, leadSource = 'Manual', campaignId } = route.params || {};
    const dispatch = useDispatch();
    const leads = useSelector(state => state.leads.leads);

    // Find contact in Redux store to ensure fresh data
    const contact = initialContact ? leads.find(l => l._id === initialContact.id || l.id === initialContact.id) || initialContact : (number ? leads.find(c => c.phone === number) : null);
    
    // Fallback if contact structure differs (e.g. from route params vs leads store) - we normalize in HomeScreen but here we access raw or normalized?
    // leads in store are backend objects (with _id, mobile_number, call_logs).
    // initialContact passed from Home might be the normalized one (id, phone, callLogs).
    // We should normalize access or use the backend object if found.
    // Let's assume contact is the Redux object if found, else initialParam.
    
    const displayPhone = contact?.phone || number || 'Unknown Number';

    const [callStatus, setCallStatus] = useState('Calling...');
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);

    // Timer logic
    useEffect(() => {
        let timer;
        const connectTimer = setTimeout(() => {
            setCallStatus('00:00');
            timer = setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);
        }, 2000);

        return () => {
            clearTimeout(connectTimer);
            clearInterval(timer);
        };
    }, []);

    // Update status text based on duration
    useEffect(() => {
        if (duration > 0) {
            const mins = Math.floor(duration / 60).toString().padStart(2, '0');
            const secs = (duration % 60).toString().padStart(2, '0');
            setCallStatus(`${mins}:${secs}`);
        }
    }, [duration]);

    const handleEndCall = async () => {
        const systemResult = duration > 0 ? 'Connected' : 'Disconnected';
        const callLog = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            status: 'Call Ended',
            systemResult: systemResult,
            duration: `${Math.floor(duration / 60)}m ${duration % 60}sec`,
            type: 'Outgoing',
            notes: '',
            leadSource: leadSource, 
        };

        try {
            if (contact && (contact.id || contact._id)) {
                // We no longer manually push `call_logs` as CallLogService and
                // backend handle all log synchronization seamlessly.
                // Just log success or let the next Home refresh pull it.
                console.log('Call ended for existing lead - will sync automatically');
            } else {
                 console.log('Call ended for unknown number. Lead will not be automatically created.');
            }
        } catch (error) {
            console.error('Failed to log call:', error);
            // We might want to alert user, but ending call should arguably just exit
        }

        // Navigate back to the appropriate screen
        if (campaignId) {
            navigation.navigate('CampaignLeads', {
                campaignId,
                campaignName: route.params.campaignName || 'Campaign',
                closeModals: true
            });
        } else {
            navigation.navigate('Home', { closeModals: true });
        }
    };

    const KeypadModal = () => {
        const keys = [
            { id: '1', label: '', sub: '' },
            { id: '2', label: 'ABC', sub: '' },
            { id: '3', label: 'DEF', sub: '' },
            { id: '4', label: 'GHI', sub: '' },
            { id: '5', label: 'JKL', sub: '' },
            { id: '6', label: 'MNO', sub: '' },
            { id: '7', label: 'PQRS', sub: '' },
            { id: '8', label: 'TUV', sub: '' },
            { id: '9', label: 'WXYZ', sub: '' },
            { id: '*', label: '', sub: '' },
            { id: '0', label: '+', sub: '' },
            { id: '#', label: '', sub: '' },
        ];

        return (
            <Modal visible={showKeypad} transparent animationType="fade">
                <View style={styles.keypadOverlay}>
                    <TouchableOpacity style={styles.keypadBackdrop} onPress={() => setShowKeypad(false)} />
                    <View style={styles.keypadContainer}>
                        <TouchableOpacity onPress={() => setShowKeypad(false)} style={styles.hideKeypadButton}>
                            <MaterialIcons name="keyboard-arrow-down" size={28} color="#000" />
                        </TouchableOpacity>
                        <View style={styles.dialPad}>
                            {keys.map((k) => (
                                <TouchableOpacity key={k.id} style={styles.dialKey}>
                                    <Text style={styles.dialKeyText}>{k.id}</Text>
                                    {k.label ? <Text style={styles.dialKeyLabel}>{k.label}</Text> : null}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topSection}>
                <Text style={styles.statusText}>{callStatus}</Text>
                <Text style={styles.phoneText}>{displayPhone}</Text>
                <Text style={styles.countryText}>India</Text>
            </View>

            <View style={styles.middleSection} />

            <View style={styles.bottomSection}>
                <View style={styles.controlsRow}>
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => setShowKeypad(true)}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name="keypad" size={28} color="#000" />
                        </View>
                        <Text style={styles.controlLabel}>Keypad</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => setIsMuted(!isMuted)}
                    >
                        <View style={[styles.iconContainer, isMuted && styles.activeIcon]}>
                            <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color="#000" />
                        </View>
                        <Text style={styles.controlLabel}>Mute</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => setIsSpeakerOn(!isSpeakerOn)}
                    >
                        <View style={[styles.iconContainer, isSpeakerOn && styles.activeIcon]}>
                            <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={28} color="#000" />
                        </View>
                        <Text style={styles.controlLabel}>Speaker</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.controlButton}>
                        <View style={styles.iconContainer}>
                            <MaterialIcons name="more-vert" size={28} color="#000" />
                        </View>
                        <Text style={styles.controlLabel}>More</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
                    <MaterialIcons name="call-end" size={36} color="#FFF" />
                </TouchableOpacity>
            </View>

            <KeypadModal />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
        // paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0,
    },
    topSection: {
        alignItems: 'center',
        marginTop: 60,
    },
    statusText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 10,
    },
    phoneText: {
        fontSize: 32,
        fontWeight: '500', // Matches Android style
        color: '#000',
        marginBottom: 5,
    },
    countryText: {
        fontSize: 16,
        color: '#666',
    },
    middleSection: {
        flex: 1,
    },
    bottomSection: {
        backgroundColor: '#F3E5F5', // Light purple tint from reference image? Or just white/grey?
        // Reference image bottom looks like a rounded card overlay.
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingBottom: 50,
        paddingTop: 30,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    controlsRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    controlButton: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    activeIcon: {
        backgroundColor: '#E0E0E0',
    },
    controlLabel: {
        fontSize: 12,
        color: '#666',
    },
    endCallButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        // Shadow
        shadowColor: "#FF3B30",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    keypadOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    keypadBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    keypadContainer: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        paddingTop: 10,
        elevation: 20,
    },
    hideKeypadButton: {
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 10,
    },
    dialPad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    dialKey: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#F5F5F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 15,
        marginVertical: 10,
    },
    dialKeyText: {
        fontSize: 28,
        color: '#000',
        fontWeight: '400',
    },
    dialKeyLabel: {
        fontSize: 9,
        color: '#666',
        marginTop: -2,
        fontWeight: '600',
        letterSpacing: 2,
    },
});

export default InAppCallScreen;
