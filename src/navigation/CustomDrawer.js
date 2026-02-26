import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Modal,
    Animated,
    Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useProfileStore } from '../store/profileStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCampaigns, } from '../store/slices/leadSlice';
import { logout } from '../store/slices/authSlice';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useContactStore } from '../store/contactStore';
import LogoutModal from '../components/LogoutModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CustomDrawer = ({ visible, onClose, navigation }) => {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showTestCallModal, setShowTestCallModal] = useState(false);
    const [shouldRender, setShouldRender] = useState(visible);
    const contacts = useContactStore(state => state.contacts);
    const dispatch = useDispatch();
    const campaigns = useSelector(state => state.leads.campaigns);
    const { sources, statuses } = useSelector(state => state.config);
    const authUser = useSelector(state => state.auth.user);
    const clearProfile = useProfileStore((state) => state.clearProfile);
    const clearSubscription = useSubscriptionStore((state) => state.clearSubscription);
    const slideAnim = React.useRef(new Animated.Value(-320)).current;
    
    // Get unread WhatsApp count
    const unreadWhatsAppCount = useSelector(state => state.whatsapp.unreadCount || 0);

    const formatUnreadCount = (count) => {
        if (count > 9) return '9+';
        return count.toString();
    };

    const groupedSources = React.useMemo(() => {
        const groups = {};
        const baseTypes = [
            { id: 'facebook', label: 'Facebook', icon: 'facebook' },
            { id: 'google', label: 'Google Ads', icon: 'public' },
            { id: 'instagram', label: 'Instagram', icon: 'camera-alt' },
            { id: 'linkedin', label: 'LinkedIn', icon: 'business' },
            { id: 'indiamart', label: 'IndiaMART', icon: 'shopping-cart' },
            { id: '99acres', label: '99 Acres', icon: 'home' },
            { id: 'housing', label: 'Housing.com', icon: 'apartment' },
            { id: 'magicbricks', label: 'Magic Bricks', icon: 'domain' },
            { id: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
            { id: 'referral', label: 'Referral', icon: 'people' },
            { id: 'website', label: 'Website', icon: 'web' },
            { id: 'offline', label: 'Offline', icon: 'storefront' }
        ];

        sources.forEach(source => {
            const lowKey = source.key?.toLowerCase() || '';
            const lowLabel = source.label?.toLowerCase() || '';
            let matchedBase = null;

            // Check if it matches a base type (prefix or contains in label)
            for (const base of baseTypes) {
                if (lowKey.startsWith(`${base.id}_`) ||
                    lowKey.startsWith(`${base.id} `) ||
                    lowKey.startsWith(`${base.id}(`) ||
                    lowKey === base.id ||
                    lowLabel.includes(base.id)) {
                    matchedBase = base;
                    break;
                }
            }

            if (matchedBase) {
                const typeKey = `type:${matchedBase.id}`;
                if (!groups[typeKey]) {
                    groups[typeKey] = {
                        key: typeKey,
                        baseType: matchedBase.id,
                        label: matchedBase.label,
                        icon: matchedBase.icon,
                        isGroup: true,
                        count: 0
                    };
                }
                groups[typeKey].count += 1;
            } else {
                // Regular static or unknown source
                groups[source.key] = { ...source, isGroup: false };
            }
        });
        return Object.values(groups);
    }, [sources]);

    React.useEffect(() => {
        dispatch(fetchCampaigns());
    }, [dispatch]);

    React.useEffect(() => {
        if (visible) {
            setShouldRender(true);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: -320,
                duration: 250,
                useNativeDriver: true,
            }).start(() => {
                setShouldRender(false);
            });
        }
    }, [visible]);

    const handleLogout = async () => {
        try {
            await clearProfile();
            await clearSubscription();

            // Dispatch Logout Action (Handlers Server Logout + Storage Clear + Redux State Update)
            await dispatch(logout()).unwrap();

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
            id: 'hot-chats',
            title: 'Messages',
            icon: 'whatsapp',
            iconFamily: 'MaterialCommunityIcons',
            onPress: () => {
                onClose();
                navigation.navigate('HotChats');
            },
        },
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
            id: 'create-enquiry',
            title: 'Create New Enquiry',
            icon: 'post-add',
            onPress: () => {
                onClose();
                navigation.navigate('CreateNewEnquiry');
            },
        },
        // {
        //     id: 'book-site-visit',
        //     title: 'Site Visit',
        //     icon: 'home-work',
        //     onPress: () => {
        //         onClose();
        //         navigation.navigate('BookSiteVisit');
        //     },
        // },
        {
            id: 'high-demand-projects',
            title: 'Projects',
            icon: 'domain',
            onPress: () => {
                onClose();
                navigation.navigate('HighDemandProjects');
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

        // {
        //     id: 'test-call',
        //     title: 'Test Incoming Call',
        //     icon: 'phone-callback',
        //     onPress: () => {
        //         setShowTestCallModal(true);
        //     },
        // },
    ];

    if (!shouldRender && !visible) return null;

    return (
        <>
            <Modal
                visible={shouldRender || visible}
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
                                <TouchableOpacity onPress={() => { onClose(); navigation.navigate('MyProfile'); }}>
                                    <View style={styles.profileAvatarContainer}>
                                        <Text style={styles.profileAvatarText}>
                                            {authUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                <View style={styles.headerTextContainer}>
                                    <Text style={styles.headerTitle}>
                                        {authUser?.name|| authUser?.email || authUser?.phone || 'User Name'}
                                    </Text>
                                    <Text style={styles.headerSubtitle}>
                                        {authUser?.role && authUser?.role.split('_')?.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Sales Executive'}
                                    </Text>
                                </View>
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <MaterialIcons name="close" size={24} color="#8E8E93" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.menuList}>
                                {menuItems.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.menuItem}
                                        onPress={item.onPress}
                                    >
                                        {item.iconFamily === 'MaterialCommunityIcons' ? (
                                            <MaterialCommunityIcons name={item.icon} size={24} color={COLORS.text} style={styles.menuIcon} />
                                        ) : (
                                            <MaterialIcons name={item.icon} size={24} color={COLORS.text} style={styles.menuIcon} />
                                        )}
                                        <Text style={styles.menuText}>{item.title}</Text>
                                        {item.id === 'hot-chats' && unreadWhatsAppCount > 0 && (
                                            <View style={styles.menuBadge}>
                                                <Text style={styles.menuBadgeText}>{formatUnreadCount(unreadWhatsAppCount)}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}

                                <View style={styles.sectionDivider} />
                                <Text style={styles.sectionHeader}>CAMPAIGNS</Text>

                                {campaigns.map((campaign) => (
                                    <TouchableOpacity
                                        key={campaign._id}
                                        style={styles.campaignItem}
                                        onPress={() => {
                                            onClose();
                                            navigation.navigate('CampaignLeads', {
                                                campaignId: campaign._id,
                                                campaignName: campaign.name
                                            });
                                        }}
                                    >
                                        <MaterialIcons name="campaign" size={20} color={COLORS.primaryPurple} style={styles.menuIcon} />
                                        <Text style={styles.campaignText}>{campaign.name}</Text>
                                        <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" style={styles.chevronIcon} />
                                    </TouchableOpacity>
                                ))}

                                <View style={styles.sectionDivider} />
                                <Text style={styles.sectionHeader}>FILTERS</Text>

                                {statuses.length > 0 ? (
                                    statuses.map((status) => (
                                        <TouchableOpacity
                                            key={status.key}
                                            style={styles.campaignItem}
                                            onPress={() => {
                                                onClose();
                                                navigation.navigate('FilteredContacts', {
                                                    filterId: `status_${status.key}`,
                                                    filterLabel: status.label,
                                                    timestamp: Date.now()
                                                });
                                            }}
                                        >
                                            <MaterialIcons
                                                name={
                                                    status.label.includes('Hot') ? 'local-fire-department' :
                                                        status.label.includes('Warm') ? 'wb-sunny' :
                                                            status.label.includes('Cold') ? 'ac-unit' :
                                                                status.label.includes('Interested') ? 'star' :
                                                                    status.label.includes('Not Interested') ? 'block' :
                                                                        'label'
                                                }
                                                size={20}
                                                color={status.color || COLORS.text}
                                                style={styles.menuIcon}
                                            />
                                            <Text style={styles.campaignText}>{status.label}</Text>
                                            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" style={styles.chevronIcon} />
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={[styles.menuText, { padding: 16, color: COLORS.textSecondary }]}>No statuses found</Text>
                                )}

                                <View style={styles.sectionDivider} />
                                <Text style={styles.sectionHeader}>LEAD SOURCE</Text>
                                {groupedSources.length > 0 ? (
                                    groupedSources.map((source) => (
                                        <TouchableOpacity
                                            key={source.key}
                                            style={styles.menuItem}
                                            onPress={() => {
                                                onClose();
                                                navigation.navigate('FilteredContacts', {
                                                    filterId: `source_${source.key}`,
                                                    filterLabel: source.label,
                                                    timestamp: Date.now()
                                                });
                                            }}
                                        >
                                            <MaterialIcons
                                                name={source.icon || 'link'
                                                }
                                                size={20}
                                                color={COLORS.text}
                                                style={styles.menuIcon}
                                            />
                                            <Text style={styles.campaignText}>{source.label}{source.isGroup && source.count > 1 && <Text style={{ fontSize: 12, color: COLORS.textSecondary }}> ({source.count} accounts)</Text>}</Text>
                                            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" style={styles.chevronIcon} />
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={[styles.menuText, { padding: 16, color: COLORS.textSecondary }]}>No sources found</Text>
                                )}

                            </ScrollView>

                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={styles.logoutButton}
                                    onPress={() => setShowLogoutModal(true)}
                                >
                                    <MaterialIcons name="logout" size={20} color="#EF4444" style={{ marginRight: 12 }} />
                                    <Text style={styles.logoutText}>Logout</Text>
                                </TouchableOpacity>
                            </View>
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
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(247, 245, 255, 0.90)', // Soft purple tint #F7F5FF backdrop overlaying the main app
    },
    drawer: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '85%',
        maxWidth: 320,
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // Glass white
        borderTopRightRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#8a79d6',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    drawerContent: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 20 : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginBottom: 8,
    },
    profileAvatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EBE6FF', // Soft purple background for avatar
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    profileAvatarText: {
        fontFamily: 'SF Pro Display',
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.primaryPurple,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontFamily: 'SF Pro Display',
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    headerSubtitle: {
        fontFamily: 'SF Pro Display',
        fontSize: 14,
        fontWeight: '400',
        color: '#6B7280',
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
    },
    menuList: {
        flex: 1,
        paddingTop: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginHorizontal: 16,
        marginBottom: 4,
        borderRadius: 16,
    },
    campaignItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginHorizontal: 16,
        marginBottom: 4,
        borderRadius: 16,
        backgroundColor: COLORS.lightPurpleTint, // Highlighted background
    },
    sectionDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 12,
        marginHorizontal: 20,
    },
    sectionHeader: {
        fontFamily: 'SF Pro Display',
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
        paddingHorizontal: 24,
        marginBottom: 8,
        marginTop: 4,
        letterSpacing: 1.2,
    },
    menuIcon: {
        marginRight: 16,
        color: '#111827', // Darker generic icon color
    },
    chevronIcon: {
        marginLeft: 'auto',
    },
    menuText: {
        fontFamily: 'SF Pro Display',
        fontSize: 16,
        fontWeight: '600', // Medium
        color: '#111827',
    },
    menuBadge: {
        backgroundColor: '#25D366', // WhatsApp green
        borderRadius: 12,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 'auto',
        paddingHorizontal: 6,
    },
    menuBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    campaignText: {
        fontFamily: 'SF Pro Display',
        fontSize: 15,
        fontWeight: '500', // Medium
        color: COLORS.primaryPurple,
    },
    footer: {
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingTop: 12,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2', // Soft red tint
        paddingVertical: 16,
        marginHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    logoutText: {
        fontFamily: 'SF Pro Display',
        fontSize: 16,
        fontWeight: '600',
        color: '#EF4444',
    },
});

export default CustomDrawer;
