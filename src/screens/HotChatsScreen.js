import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Platform, StatusBar, BackHandler } from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

import { useDispatch, useSelector } from 'react-redux';
import { fetchChats } from '../store/slices/whatsappSlice';

const HotChatsScreen = ({ navigation, onOpenDrawer }) => {
    const dispatch = useDispatch();
    const { chats, isLoading } = useSelector((state) => state.whatsapp);
    const { isWhatsAppIntegrated } = useSelector((state) => state.config);

    useEffect(() => {
        if (!isWhatsAppIntegrated) {
            navigation.replace('Home');
            return;
        }
        dispatch(fetchChats());
    }, [dispatch, isWhatsAppIntegrated, navigation]);

    useEffect(() => {
        const backAction = () => {
            navigation.navigate('Home');
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [navigation]);

    const renderChatItem = ({ item }) => {
        const id = item._id || item.id;
        // Handling both our legacy slice schema and likely backend schema
        const name = item.name || item.contactName || item.participantName || item.phone || 'Unknown';
        const lastMessageText = item.latestMessage?.body || item.latestMessage?.text || item.lastMessage?.text || item.lastMessage || 'Message';
        
        let displayTime = item.latestMessage?.timestamp || item.updatedAt || item.time || '';
        if (displayTime) {
           const d = new Date(displayTime);
           displayTime = isNaN(d) ? displayTime : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const unreadCnt = item.unreadCount || item.unread || 0;

        return (
            <TouchableOpacity 
                style={styles.chatItem}
                onPress={() => navigation.navigate('ChatDetail', { conversationId: id, chatId: id, chatName: name })}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.chatContent}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.chatName}>{name}</Text>
                        <Text style={styles.chatTime}>{displayTime}</Text>
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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onOpenDrawer} style={styles.menuButton}>
                    <MaterialIcons name="menu" size={28} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                    <FontAwesome name="whatsapp" size={20} color="#FFF" style={styles.whatsappIcon} />
                    <Text style={styles.headerTitle}>Messages</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.menuButton}>
                    <MaterialIcons name="home" size={28} color="#FFF" />
                </TouchableOpacity>
            </View>
            <FlatList
                data={chats}
                keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                renderItem={renderChatItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                   <Text style={{padding: 20, textAlign: 'center', color: '#666'}}>
                       {isLoading ? "Loading chats..." : "No recent conversations found."}
                   </Text>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    whatsappIcon: {
        marginRight: 6,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#128C7E', // WhatsApp Green
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 16,
        paddingBottom: 16,
        paddingHorizontal: 16,
        justifyContent: 'space-between',
    },
    menuButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    listContainer: {
        flexGrow: 1,
    },
    chatItem: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#128C7E20', // WhatsApp Green Tint
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#128C7E', // WhatsApp Green
    },
    chatContent: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    chatName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    chatTime: {
        fontSize: 12,
        color: '#888',
    },
    chatFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 14,
        color: '#666',
        flex: 1,
        marginRight: 8,
    },
    unreadBadge: {
        backgroundColor: '#25D366', // WhatsApp green
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default HotChatsScreen;
