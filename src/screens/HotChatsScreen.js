import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, StatusBar, BackHandler, TextInput, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDispatch, useSelector } from 'react-redux';
import { fetchChats, searchGlobalMessages, fetchContacts, createConversation } from '../store/slices/whatsappSlice';

const HotChatsScreen = ({ navigation, onOpenDrawer }) => {
    const dispatch = useDispatch();
    const { chats, isLoading,contacts } = useSelector((state) => state.whatsapp);
    const { isWhatsAppIntegrated } = useSelector((state) => state.config);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchLoading, setIsSearchLoading] = useState(false);

    // Contacts Modal State
    const [isContactsModalVisible, setIsContactsModalVisible] = useState(false);
    const [contactsSearchQuery, setContactsSearchQuery] = useState('');
    const [contactsResults, setContactsResults] = useState([]);
    const [isContactsLoading, setIsContactsLoading] = useState(false);
    const [contactsSearchTimeout, setContactsSearchTimeout] = useState(null);

    useEffect(() => {
        if (!isWhatsAppIntegrated) {
            navigation.replace('Home');
            return;
        }
        dispatch(fetchChats());
    }, [dispatch, isWhatsAppIntegrated, navigation]);

    useEffect(() => {
        const backAction = () => {
            if (isSearching) {
                handleCloseSearch();
                return true;
            }
            navigation.navigate('Home');
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [navigation, isSearching]);

    const handleSearch = useCallback(async (query) => {
        setSearchQuery(query);
        if (query.trim().length > 0) {
            setIsSearchLoading(true);
            try {
                const result = await dispatch(searchGlobalMessages(query)).unwrap();
                // Assuming result is an array of conversations or messages with conversation context
                setSearchResults(result || []);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsSearchLoading(false);
            }
        } else {
            setSearchResults([]);
        }
    }, [dispatch]);

    const handleCloseSearch = () => {
        setIsSearching(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleOpenContacts = async () => {
        setIsContactsModalVisible(true);
        loadContacts('');
    };

    const loadContacts = async (query = '') => {
        setIsContactsLoading(true);
        try {
            const data = await dispatch(fetchContacts({ page: 1, limit: 100, search: query })).unwrap();
            console.log(data, "data from fetchContacts");
            // Handle both cases: data being the array or the wrapper object
            const contactsList = Array.isArray(data) ? data : (data?.contacts || []);
            setContactsResults(contactsList);
        } catch (error) {
            console.error('Fetch contacts error', error);
        } finally {
            setIsContactsLoading(false);
        }
    };

    const handleContactsSearch = (text) => {
        setContactsSearchQuery(text);
        
        if (contactsSearchTimeout) {
            clearTimeout(contactsSearchTimeout);
        }
        const timeout = setTimeout(() => {
            loadContacts(text);
        }, 500);
        setContactsSearchTimeout(timeout);
    };

    const handleSelectContact = async (contact) => {
        setIsContactsModalVisible(false);
        try {
            const result = await dispatch(createConversation({ 
                phone: contact.phone, 
                name: contact.wa_name || contact.name 
            })).unwrap();

            if (result && (result.data || result._id)) {
                const conv = result.data || result;
                navigation.navigate('ChatDetail', { 
                    conversationId: conv._id, 
                    chatId: conv._id, 
                    chatName: conv.contactName 
                });
            } else {
                 dispatch(fetchChats());
            }
        } catch (error) {
            console.error('Error selecting contact to chat', error);
        }
    };

    const renderContactItem = ({ item }) => {
        const name = item.wa_name || item.name || item.phone || 'Unknown';
        return (
            <TouchableOpacity 
                style={styles.chatItem}
                onPress={() => handleSelectContact(item)}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.chatContent}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.chatName} numberOfLines={1}>{name}</Text>
                    </View>
                    <View style={styles.chatFooter}>
                        <Text style={styles.lastMessage} numberOfLines={1}>{item.phone}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderChatItem = ({ item }) => {
        // Handle both chat items and search result items (which might be messages)
        const convObj = typeof item.conversationId === 'object' ? item.conversationId : (typeof item.conversation === 'object' ? item.conversation : null);
        
        const id = convObj?._id || convObj?.id || item.conversationId || item.chatId || item._id || item.id;
        const name = item.name || item.contactName || item.participantName || item.phone || 
                     convObj?.contactName || convObj?.name || convObj?.contactPhone || convObj?.phone || 
                     'Unknown';
        
        // Comprehensive fallback for the message text
        const lastMessageText = 
            item.text || 
            item.content?.body ||
            item.lastMessage?.text || 
            item.lastMessage?.message || 
            item.lastMessage?.body ||
            (typeof item.lastMessage === 'string' ? item.lastMessage : null) ||
            item.latestMessage?.body || 
            item.latestMessage?.text || 
            'Message';
        
        let displayTime = item.lastMessageTime || item.latestMessage?.timestamp || item.updatedAt || item.time || item.createdAt || item.timestamp || '';
        if (displayTime) {
           const d = new Date(displayTime);
           displayTime = isNaN(d) ? displayTime : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const unreadCnt = item.unreadCount || item.unread || 0;

        return (
            <TouchableOpacity 
                style={styles.chatItem}
                onPress={() => navigation.navigate('ChatDetail', { 
                    conversationId: id, 
                    chatId: id, 
                    chatName: name 
                })}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.chatContent}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.chatName} numberOfLines={1}>{name}</Text>
                        <Text style={[styles.chatTime, unreadCnt > 0 && styles.chatTimeUnread]}>{displayTime}</Text>
                    </View>
                    <View style={styles.chatFooter}>
                        <Text style={styles.lastMessage} numberOfLines={1}>{lastMessageText}</Text>
                        {unreadCnt > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>
                                    {unreadCnt > 9 ? '9+' : unreadCnt}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar backgroundColor={isSearching ? "#FFF" : COLORS.primaryPurple} barStyle={isSearching ? "dark-content" : "light-content"} />
            
            {isSearching ? (
                <View style={styles.searchHeader}>
                    <TouchableOpacity onPress={handleCloseSearch} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color="#667781" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search..."
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                </View>
            ) : (
                <View style={styles.headerContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButtonHeader} onPress={() => navigation.navigate('Home')}>
                            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <View style={styles.titleContainer}>
                            <Text style={styles.headerTitle}>WhatsaApp Inbox</Text>
                        </View>
                        <View style={styles.headerIcons}>
                            <TouchableOpacity style={styles.iconButton} onPress={() => setIsSearching(true)}>
                                <MaterialIcons name="search" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
                            <Text style={[styles.tabText, styles.activeTabText]}>CHATS</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tab}>
                            <Text style={styles.tabText}>CALLS</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <FlatList
                data={isSearching && searchQuery.length > 0 ? searchResults : chats}
                keyExtractor={(item) => (item._id || item.id || Math.random().toString()) + (item.timestamp || '')}
                renderItem={renderChatItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                   <View style={styles.emptyContainer}>
                        {isSearchLoading ? (
                            <ActivityIndicator size="large" color={COLORS.primaryPurple} />
                        ) : (
                            <Text style={styles.emptyText}>
                                {isSearching ? "No results found." : (isLoading ? "Loading chats..." : "No recent conversations found.")}
                            </Text>
                        )}
                   </View>
                }
            />
            
            {!isSearching && (
                <TouchableOpacity style={styles.floatingButton} onPress={handleOpenContacts}>
                    <MaterialIcons name="message" size={24} color="#FFF" />
                </TouchableOpacity>
            )}

            {/* Contacts Modal */}
            <Modal
                visible={isContactsModalVisible}
                animationType="slide"
                onRequestClose={() => setIsContactsModalVisible(false)}
            >
                <SafeAreaView style={styles.container} edges={['top']}>
                    <StatusBar backgroundColor={COLORS.primaryPurple} barStyle="light-content" />
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsContactsModalVisible(false)} style={styles.backButton}>
                            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <View style={styles.modalTitleContainer}>
                            <Text style={styles.modalTitle}>Select Contact</Text>
                            <Text style={styles.modalSubtitle}>{contactsResults.length} contacts</Text>
                        </View>
                    </View>
                    
                    <View style={styles.contactsSearchContainer}>
                        <MaterialIcons name="search" size={20} color="#888" style={styles.searchIconInline} />
                        <TextInput
                            style={styles.contactsSearchInput}
                            placeholder="Search contacts..."
                            value={contactsSearchQuery}
                            onChangeText={handleContactsSearch}
                        />
                    </View>

                    <FlatList
                        data={contactsResults}
                        keyExtractor={(item) => item._id || item.phone || Math.random().toString()}
                        renderItem={renderContactItem}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={
                           <View style={styles.emptyContainer}>
                                {isContactsLoading ? (
                                    <ActivityIndicator size="large" color={COLORS.primaryPurple} />
                                ) : (
                                    <Text style={styles.emptyText}>No contacts found.</Text>
                                )}
                           </View>
                        }
                    />
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerContainer: {
        backgroundColor: COLORS.primaryPurple,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        // height: 60,
        paddingHorizontal: 8,
        justifyContent: 'space-between',
        paddingTop: 8,
    },
    titleContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFF',
    },
    backButtonHeader: {
        marginRight: 12,
        padding: 4,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        marginLeft: 20,
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        height: 60,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        elevation: 2,
    },
    backButton: {
        padding: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 18,
        color: '#000',
        marginLeft: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.primaryPurple,
    },
    tab: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: '#FFF',
    },
    tabText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        opacity: 0.7,
    },
    activeTabText: {
        opacity: 1,
    },
    listContainer: {
        flexGrow: 1,
        paddingBottom: 80,
    },
    chatItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#BCC5C9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 22,
        fontWeight: '400',
        color: '#FFF',
    },
    chatContent: {
        flex: 1,
        justifyContent: 'center',
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    chatName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
        flex: 1,
        marginRight: 8,
    },
    chatTime: {
        fontSize: 12,
        color: '#667781',
    },
    chatTimeUnread: {
        color: COLORS.primaryPurple,
        fontWeight: '600',
    },
    chatFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 14,
        color: '#667781',
        flex: 1,
        marginRight: 8,
    },
    unreadBadge: {
        backgroundColor: COLORS.primaryPurple,
        borderRadius: 12,
        minWidth: 22,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    floatingButton: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primaryPurple,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    emptyContainer: {
        flex: 1, 
        padding: 40, 
        justifyContent: 'center', 
        alignItems: 'center'
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
        textAlign: 'center'
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryPurple,
        height: 60,
        paddingHorizontal: 8,
    },
    modalTitleContainer: {
        flex: 1,
        marginLeft: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '500',
        color: '#FFF',
    },
    modalSubtitle: {
        fontSize: 12,
        color: '#E0E0E0',
    },
    contactsSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F2F5',
        margin: 12,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 40,
    },
    searchIconInline: {
        marginRight: 8,
    },
    contactsSearchInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
    }
});

export default HotChatsScreen;
