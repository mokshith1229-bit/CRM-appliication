import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Dimensions, StatusBar, BackHandler, Keyboard, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import EmojiPicker from 'rn-emoji-keyboard';
import { useDispatch, useSelector } from 'react-redux';
import { fetchConversationMessages, sendConversationMessage, uploadMedia, receiveMessage, createConversation, clearUnread } from '../store/slices/whatsappSlice';

const ChatDetailScreen = ({ route, navigation }) => {
    // Rely primarily on conversationId for standard API compatibility
    const { chatName = 'Chat', conversationId, chatId } = route.params || {};
    // Use local state for the ID as it might be resolved asynchronously for new chats
    const [activeConversationId, setActiveConversationId] = useState(conversationId);
    const effectiveId = activeConversationId || chatId;
    
    const dispatch = useDispatch();
    
    // Instead of local mock state, get real messages from redux based on effectiveId
    const allMessages = useSelector(state => state.whatsapp.messages || {});
    const { isWhatsAppIntegrated } = useSelector(state => state.config);
    const rawMessages = allMessages[effectiveId] || []; 
    const messages = React.useMemo(() => {
        return [...rawMessages].sort((a, b) => new Date(a.timestamp || a.createdAt || 0) - new Date(b.timestamp || b.createdAt || 0));
    }, [rawMessages]);

    React.useEffect(() => {
        if (!isWhatsAppIntegrated) {
            navigation.replace('Home');
        }
    }, [isWhatsAppIntegrated]);

    const [inputText, setInputText] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isEnsuringChat, setIsEnsuringChat] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const initialMsgProcessed = React.useRef(false);
    const flatListRef = React.useRef(null);

    // Fetch/Create conversation and initial messages
    React.useEffect(() => {
        const prepareChat = async () => {
            let currentId = conversationId;

            // Step 1: If no conversation ID but we have a phone/id (chatId), ensure conversation exists
            if (!currentId && chatId) {
                // If chatId is not a phone (e.g. it's already an ID), just use it
                const looksLikePhone = /^\+?\d{7,15}$/.test(chatId);
                
                if (looksLikePhone) {
                    setIsEnsuringChat(true);
                    try {
                        const result = await dispatch(createConversation({ phone: chatId, name: chatName })).unwrap();
                        if (result && (result._id || result.id)) {
                            currentId = result._id || result.id;
                            setActiveConversationId(currentId);
                        }
                    } catch (err) {
                        console.error("Failed to create/fetch conversation:", err);
                    } finally {
                        setIsEnsuringChat(false);
                    }
                } else {
                    currentId = chatId;
                    setActiveConversationId(chatId);
                }
            }

            // Step 2: Fetch messages if we have a valid ID
            if (currentId) {
                dispatch(fetchConversationMessages({ conversationId: currentId }));
                
                // Step 3: Check for initial message to send (from redirect)
                // If route.params contains initialMessage, send it as the "first message"
                const { initialMessage } = route.params || {};
                if (initialMessage && !initialMsgProcessed.current) {
                    dispatch(sendConversationMessage({ conversationId: currentId, message: initialMessage }));
                    initialMsgProcessed.current = true;
                }
            }
        };

        prepareChat();
    }, [chatId, conversationId, chatName, dispatch]);

    // Clear unread count when chat is viewed or new messages arrive
    React.useEffect(() => {
        if (effectiveId) {
            dispatch(clearUnread(effectiveId));
        }
    }, [effectiveId, messages.length, dispatch]);

    React.useEffect(() => {
        const showListener = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
            (e) => {
                setKeyboardVisible(true);
                setKeyboardHeight(e.endCoordinates.height);
                // Scroll to end when keyboard opens
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        );
        const hideListener = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
            () => {
                setKeyboardVisible(false);
                setKeyboardHeight(0);
            }
        );

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);

    React.useEffect(() => {
        const backAction = () => {
            navigation.goBack();
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [navigation]);

    const renderMessage = ({ item }) => {
        // Backend usually handles direction: 'inbound'/'outbound' or sender identity
        const isAgent = item.direction === 'outbound' || item.sender === 'agent';
        // Handle media safely if present
        const hasMedia = item.type === 'media' && item.mediaUrl;
        
        let messageTime = item.time;
        if (!messageTime && (item.timestamp || item.createdAt)) {
            messageTime = new Date(item.timestamp || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return (
            <View style={[styles.messageBubble, isAgent ? styles.agentBubble : styles.userBubble]}>
                {hasMedia && <Text style={{fontStyle: 'italic', marginBottom: 4}}>[Media Attached]</Text>}
                <Text style={[styles.messageText, isAgent ? styles.agentMessageText : styles.userMessageText]}>
                    {item.text || item.message_text || ''}
                </Text>
                <Text style={styles.messageTime}>{messageTime || ''}</Text>
            </View>
        );
    };

    const handleSend = () => {
        if (!inputText.trim() || !effectiveId) return;
        
        // Dispatch the requested new thunk to send messages via the conversation ID link
        dispatch(sendConversationMessage({ conversationId: effectiveId, message: inputText }));
        setInputText('');
    };

    const handleAttachmentPress = async () => {
        try {
            const document = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });
            if (document.type === 'success' || !document.canceled) {
                const docAsset = document.assets ? document.assets[0] : document;
                const newMessage = {
                    id: Date.now().toString(),
                    contactId: effectiveId,
                    text: `📎 File Attached: ${docAsset.name}`,
                    sender: 'agent',
                    direction: 'outbound',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                dispatch(receiveMessage(newMessage));
            }
        } catch (error) {
            console.error("Document Picker Error: ", error);
        }
    };

    const handleCameraPress = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert("Permission required", "You need to allow camera access.");
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
            });

            if (!result.canceled) {
                const newMessage = {
                    id: Date.now().toString(),
                    contactId: effectiveId,
                    text: `📷 Photo Sent`,
                    sender: 'agent',
                    direction: 'outbound',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                dispatch(receiveMessage(newMessage));
            }
        } catch (error) {
            console.error("Camera Error: ", error);
        }
    };

    const handleVoicePressIn = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status === 'granted') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });
                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(recording);
                setIsRecording(true);
            } else {
                Alert.alert("Permission to access microphone was denied");
            }
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const handleVoicePressOut = async () => {
        if (!recording) return;

        setIsRecording(false);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            
            if (uri) {
                const newMessage = {
                    id: Date.now().toString(),
                    contactId: effectiveId,
                    text: '🎤 Voice Message',
                    sender: 'agent',
                    direction: 'outbound',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                dispatch(receiveMessage(newMessage));
            }
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
    };

    const handleEmojiPress = () => {
        setIsEmojiPickerOpen(true);
        Keyboard.dismiss();
    };

    const handleEmojiSelect = (emojiObject) => {
        setInputText(prev => prev + emojiObject.emoji);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header stays outside KeyboardAvoidingView to remain visible during pan/resize */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.avatarMini}>
                        <Text style={styles.avatarMiniText}>{chatName.charAt(0)}</Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{chatName}</Text>
                        {isEnsuringChat && <Text style={styles.headerStatus}>Connecting...</Text>}
                    </View>
                </View>
                <View style={styles.headerRight}>
                     {/* <TouchableOpacity style={styles.headerIcon}>
                        <MaterialIcons name="videocam" size={24} color="#FFF" />
                    </TouchableOpacity> */}
                    <TouchableOpacity style={styles.headerIcon}>
                        <MaterialIcons name="call" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.keyboardView, { paddingBottom: Platform.OS === 'android' ? 0 : 0 }]}>
                <View style={{ flex: 1 }}>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id || item._id || Math.random().toString()}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.messagesList}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    />
                </View>
                
                {/* Manual keyboard spacer for Android to ensure input is above keyboard */}
                <View style={[
                    styles.inputContainer, 
                    Platform.OS === 'android' && keyboardVisible && { marginBottom: keyboardHeight }
                ]}>
                    <View style={styles.inputWrapper}>
                        <TouchableOpacity style={styles.iconButton} onPress={handleEmojiPress}>
                            <MaterialIcons name="emoji-emotions" size={24} color="#8696A0" />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            placeholder="Message"
                            placeholderTextColor="#8696A0"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                        <TouchableOpacity style={styles.iconButton} onPress={handleAttachmentPress}>
                            <MaterialIcons name="attach-file" size={24} color="#8696A0" style={{ transform: [{ rotate: '-45deg' }] }} />
                        </TouchableOpacity>
                        {!inputText.trim() && (
                            <TouchableOpacity style={styles.iconButton} onPress={handleCameraPress}>
                                <MaterialIcons name="camera-alt" size={24} color="#8696A0" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {inputText.trim() ? (
                         <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                             <MaterialIcons name="send" size={20} color="#FFF" style={styles.sendIcon} />
                         </TouchableOpacity>
                    ) : (
                         <TouchableOpacity 
                             style={[styles.sendButton, isRecording && { backgroundColor: '#FF3B30', transform: [{ scale: 1.2 }] }]} 
                             onPressIn={handleVoicePressIn}
                             onPressOut={handleVoicePressOut}
                             activeOpacity={0.7}
                         >
                             <MaterialIcons name="mic" size={24} color="#FFF" />
                         </TouchableOpacity>
                    )}
                </View>
                <EmojiPicker 
                    onEmojiSelected={handleEmojiSelect}
                    open={isEmojiPickerOpen}
                    onClose={() => setIsEmojiPickerOpen(false)}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E5DDD5', // WhatsApp background color
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#128C7E', // WhatsApp Green
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 8,
        paddingBottom: 8,
        paddingHorizontal: 4,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        padding: 8,
        marginLeft: 4,
    },
    backButton: {
        padding: 8,
        marginRight: 0,
    },
    avatarMini: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    avatarMiniText: {
        color: '#128C7E', // WhatsApp Green
        fontWeight: 'bold',
        fontSize: 18,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        flexShrink: 1,
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    headerStatus: {
        fontSize: 12,
        color: '#E0E0E0',
        marginTop: -2,
    },
    messagesList: {
        padding: 16,
        flexGrow: 1, // Start messages naturally, list handles bottom up usually
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 10,
        borderRadius: 8,
        marginVertical: 4,
        elevation: 1, // Android shadow
    },
    agentBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#DCF8C6', // WhatsApp sender bubble color
        borderBottomRightRadius: 0,
    },
    userBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 0,
    },
    messageText: {
        fontSize: 15,
        color: '#333',
    },
    agentMessageText: {
        color: '#333',
    },
    userMessageText: {
        color: '#333',
    },
    messageTime: {
        fontSize: 11,
        color: '#888',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: 'transparent',
        alignItems: 'flex-end',
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 24,
        alignItems: 'flex-end',
        marginRight: 8,
        minHeight: 48,
    },
    input: {
        flex: 1,
        maxHeight: 120,
        fontSize: 16,
        paddingTop: Platform.OS === 'ios' ? 14 : 12,
        paddingBottom: Platform.OS === 'ios' ? 14 : 12,
        paddingHorizontal: 4,
    },
    iconButton: {
        padding: 12,
    },
    sendButton: {
        backgroundColor: '#128C7E', // WhatsApp Green
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendIcon: {
        marginLeft: 4, 
    }
});

export default ChatDetailScreen;
