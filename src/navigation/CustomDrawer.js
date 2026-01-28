import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Modal,
    Animated,
    SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useProfileStore } from '../store/profileStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useContactStore } from '../store/contactStore';
import { useCampaignStore } from '../store/campaignStore';
import LogoutModal from '../components/LogoutModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { FlatList } from 'react-native';

const CustomDrawer = ({ visible, onClose, navigation }) => {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showTestCallModal, setShowTestCallModal] = useState(false);
    const contacts = useContactStore(state => state.contacts);
    const { campaigns, initializeCampaigns } = useCampaignStore();
    const clearProfile = useProfileStore((state) => state.clearProfile);
    const clearSubscription = useSubscriptionStore((state) => state.clearSubscription);
    const slideAnim = React.useRef(new Animated.Value(-300)).current;

    React.useEffect(() => {
        initializeCampaigns();
    }, []);

    React.useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: -300,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleLogout = async () => {
        try {
            await clearProfile();
            await clearSubscription();
            // Clear Auth Token
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userPhone');

            setShowLogoutModal(false);
            onClose();
            // Navigate to Login and reset stack
            navigation.replace('Login');
        } catch (e) {
            console.error('Logout failed', e);
        }
    };

    const menuItems = [
        {
            id: 'create-lead',
            title: 'Create Lead',
            icon: 'person-add',
            onPress: () => {
                onClose();
                navigation.navigate('CreateLead');
            },
        },
        {
            id: 'my-statistics',
            title: 'My Statistics',
            icon: 'bar-chart',
            onPress: () => {
                onClose();
                navigation.navigate('MyStatistics');
            },
        },
        {
            id: 'my-profile',
            title: 'My Profile',
            icon: 'person',
            onPress: () => {
                onClose();
                navigation.navigate('MyProfile');
            },
        },

        {
            id: 'test-call',
            title: 'Test Incoming Call',
            icon: 'phone-callback',
            onPress: () => {
                setShowTestCallModal(true);
            },
        },
        {
            id: 'logout',
            title: 'Logout',
            icon: 'logout',
            onPress: () => {
                setShowLogoutModal(true);
            },
        },
    ];

    if (!visible) return null;

    return (
        <>
            <Modal
                visible={visible}
                transparent
                animationType="none"
                onRequestClose={onClose}
            >
                <View style={styles.overlay}>
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={onClose}
                    />

                    <Animated.View
                        style={[
                            styles.drawer,
                            {
                                transform: [{ translateX: slideAnim }],
                            },
                        ]}
                    >
                        <SafeAreaView style={styles.drawerContent}>
                            <View style={styles.header}>
                                <Text style={styles.headerTitle}>Menu</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.menuList}>
                                {menuItems.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.menuItem}
                                        onPress={item.onPress}
                                    >
                                        <MaterialIcons name={item.icon} size={24} color={COLORS.text} style={styles.menuIcon} />
                                        <Text style={styles.menuText}>{item.title}</Text>
                                    </TouchableOpacity>
                                ))}

                                <View style={styles.sectionDivider} />
                                <Text style={styles.sectionHeader}>Campaigns</Text>

                                {campaigns.map((campaign) => (
                                    <TouchableOpacity
                                        key={campaign.id}
                                        style={styles.menuItem}
                                        onPress={() => {
                                            onClose();
                                            navigation.navigate('CampaignLeads', {
                                                campaignId: campaign.id,
                                                campaignName: campaign.name
                                            });
                                        }}
                                    >
                                        <MaterialIcons name="campaign" size={24} color={COLORS.text} style={styles.menuIcon} />
                                        <Text style={styles.menuText}>{campaign.name}</Text>
                                    </TouchableOpacity>
                                ))}

                                <View style={styles.sectionDivider} />
                                <Text style={styles.sectionHeader}>Filters</Text>

                                {[
                                    { id: 'hot', label: 'Hot Call', icon: 'local-fire-department' },
                                    { id: 'warm', label: 'Warm Call', icon: 'wb-sunny' },
                                    { id: 'cold', label: 'Cold Call', icon: 'ac-unit' },
                                    { id: 'callback', label: 'Call Back', icon: 'phone-callback' },
                                    { id: 'interested', label: 'Interested', icon: 'star' },
                                    { id: 'not_interested', label: 'Not Interested', icon: 'block' },
                                ].map((filter) => (
                                    <TouchableOpacity
                                        key={filter.id}
                                        style={styles.menuItem}
                                        onPress={() => {
                                            onClose();
                                            navigation.navigate('FilteredContacts', {
                                                filterId: filter.id,
                                                filterLabel: filter.label
                                            });
                                        }}
                                    >
                                        <MaterialIcons name={filter.icon} size={24} color={COLORS.text} style={styles.menuIcon} />
                                        <Text style={styles.menuText}>{filter.label}</Text>
                                    </TouchableOpacity>
                                ))}

                                <View style={styles.sectionDivider} />
                                <Text style={styles.sectionHeader}>Lead Source</Text>
                                {[
                                    { id: 'source_Google', label: 'Google', icon: 'public' },
                                    { id: 'source_Facebook', label: 'Facebook', icon: 'facebook' },
                                    { id: 'source_Instagram', label: 'Instagram', icon: 'camera-alt' },
                                    { id: 'source_LinkedIn', label: 'LinkedIn', icon: 'business' },
                                    { id: 'source_Website', label: 'Website', icon: 'web' },
                                    { id: 'source_Referral', label: 'Referral', icon: 'people' },
                                ].map((filter) => (
                                    <TouchableOpacity
                                        key={filter.id}
                                        style={styles.menuItem}
                                        onPress={() => {
                                            onClose();
                                            navigation.navigate('FilteredContacts', {
                                                filterId: filter.id,
                                                filterLabel: filter.label
                                            });
                                        }}
                                    >
                                        <MaterialIcons name={filter.icon} size={24} color={COLORS.text} style={styles.menuIcon} />
                                        <Text style={styles.menuText}>{filter.label}</Text>
                                    </TouchableOpacity>
                                ))}

                                <View style={styles.sectionDivider} />
                                <Text style={styles.sectionHeader}>Transferred By</Text>
                                {[
                                    { id: 'transferred_Admin', label: 'Admin', icon: 'admin-panel-settings' },
                                    { id: 'transferred_Manager', label: 'Manager', icon: 'supervisor-account' },
                                    { id: 'transferred_System', label: 'System', icon: 'computer' },
                                    { id: 'transferred_Sales Team', label: 'Sales Team', icon: 'groups' },
                                ].map((filter) => (
                                    <TouchableOpacity
                                        key={filter.id}
                                        style={styles.menuItem}
                                        onPress={() => {
                                            onClose();
                                            navigation.navigate('FilteredContacts', {
                                                filterId: filter.id,
                                                filterLabel: filter.label
                                            });
                                        }}
                                    >
                                        <MaterialIcons name={filter.icon} size={24} color={COLORS.text} style={styles.menuIcon} />
                                        <Text style={styles.menuText}>{filter.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </SafeAreaView>
                    </Animated.View>
                </View>
            </Modal>

            <LogoutModal
                visible={showLogoutModal}
                onConfirm={handleLogout}
                onCancel={() => setShowLogoutModal(false)}
            />

            <Modal
                visible={showTestCallModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTestCallModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.selectionModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Mock Caller</Text>
                            <TouchableOpacity onPress={() => setShowTestCallModal(false)}>
                                <MaterialIcons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={contacts}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.contactItem}
                                    onPress={() => {
                                        setShowTestCallModal(false);
                                        onClose();
                                        navigation.navigate('IncomingCall', { contact: item });
                                    }}
                                >
                                    <View style={styles.avatarMini}>
                                        <Text style={styles.avatarInitials}>{item.name?.[0] || '?'}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.contactName}>{item.name}</Text>
                                        <Text style={styles.contactPhone}>{item.phone}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    selectionModal: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '70%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    avatarMini: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarInitials: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    contactName: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.text,
    },
    contactPhone: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    drawer: {
        width: 280,
        height: '100%',
        backgroundColor: COLORS.cardBackground,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    drawerContent: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        ...TYPOGRAPHY.title,
        fontSize: 24,
        fontWeight: '700',
    },
    menuList: {
        flex: 1,
        paddingTop: SPACING.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        marginHorizontal: SPACING.sm,
        marginBottom: SPACING.xs,
        borderRadius: 8,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: SPACING.md,
        marginHorizontal: SPACING.md,
    },
    sectionHeader: {
        ...TYPOGRAPHY.subtitle,
        fontSize: 14,
        color: COLORS.textSecondary,
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    menuIcon: {
        marginRight: SPACING.md,
    },
    menuText: {
        ...TYPOGRAPHY.subtitle,
        fontSize: 16,
        fontWeight: '500',
    },
});

export default CustomDrawer;
