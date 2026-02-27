import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Dimensions, StatusBar, BackHandler, Keyboard, Alert, Image, Modal, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio, Video, ResizeMode } from 'expo-av';
import EmojiPicker from 'rn-emoji-keyboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import ChatAudioPlayer from '../components/ChatAudioPlayer';
import { useDispatch, useSelector } from 'react-redux';
import { fetchConversationMessages, sendConversationMessage, uploadMedia, receiveMessage, createConversation, clearUnread } from '../store/slices/whatsappSlice';

const ChatDetailScreen = ({ route, navigation }) => {
    // Rely primarily on conversationId for standard API compatibility
    const { chatName = 'Chat', conversationId, chatId } = route.params || {};
    // Use local state for the ID as it might be resolved asynchronously for new chats
    const [activeConversationId, setActiveConversationId] = useState(conversationId);
    
    const dispatch = useDispatch();
    const chats = useSelector(state => state.whatsapp.chats || []);
    const { isWhatsAppIntegrated } = useSelector(state => state.config);
    
    // Attempt to resolve the chat's real ID from the store if we only have a phone number
    const resolvedChat = React.useMemo(() => {
        return chats.find(c => 
            (c.phone && (c.phone === chatId || c.phone === conversationId)) || 
            (c._id && (c._id === chatId || c._id === conversationId)) ||
            (c.id && (c.id === chatId || c.id === conversationId))
        );
    }, [chats, chatId, conversationId]);

    const resolvedId = resolvedChat ? (resolvedChat._id || resolvedChat.id) : null;
    const effectiveId = activeConversationId || resolvedId || conversationId || chatId;
    
    // Instead of local mock state, get real messages from redux based on effectiveId
    const allMessages = useSelector(state => state.whatsapp.messages || {});
    const rawMessages = allMessages[effectiveId] || []; 
    
    // Also try to get messages by phone if we are using an ID, and vice-versa
    // to handle consistency during transition
    const alternativeId = (effectiveId === resolvedId) ? (resolvedChat?.phone) : (resolvedId);
    const alternativeMessages = (alternativeId && alternativeId !== effectiveId) ? (allMessages[alternativeId] || []) : [];

    const messages = React.useMemo(() => {
        const combined = [...rawMessages];
        // Merge alternative messages if they aren't already in the list
        alternativeMessages.forEach(msg => {
            const msgId = msg._id || msg.id || msg.messageId;
            if (!combined.some(m => (m._id || m.id || m.messageId) === msgId)) {
                combined.push(msg);
            }
        });

        return combined.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
            const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
            return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
        });
    }, [rawMessages, alternativeMessages]);

    React.useEffect(() => {
        if (!isWhatsAppIntegrated) {
            navigation.replace('Home');
        }
    }, [isWhatsAppIntegrated]);

    const [inputText, setInputText] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [fullscreenImageUri, setFullscreenImageUri] = useState(null);
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isEnsuringChat, setIsEnsuringChat] = useState(false);
    const [downloadingUrl, setDownloadingUrl] = useState(null);
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

    const downloadAndOpenFile = async (url, filename, mimeType) => {
        try {
            setDownloadingUrl(url);
            let extension = '';
            if (filename && filename.includes('.')) {
                extension = filename.substring(filename.lastIndexOf('.'));
            } else if (mimeType && mimeType.includes('/')) {
                extension = '.' + mimeType.split('/')[1];
                if (extension === '.vnd.openxmlformats-officedocument.wordprocessingml.document') extension = '.docx';
                if (extension === '.vnd.openxmlformats-officedocument.spreadsheetml.sheet') extension = '.xlsx';
                if (extension === '.vnd.openxmlformats-officedocument.presentationml.presentation') extension = '.pptx';
            }

            const nameWithoutExt = filename ? filename.replace(/\.[^/.]+$/, "") : 'document';
            const safeFilename = nameWithoutExt.replace(/[^a-zA-Z0-9.\-_]/g, '_') + extension;
            const fileUri = `${FileSystem.documentDirectory}${safeFilename}`;
            
            const { uri } = await FileSystem.downloadAsync(url, fileUri);
            
            if (Platform.OS === 'android') {
                try {
                    const contentUri = await FileSystem.getContentUriAsync(uri);
                    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                        data: contentUri,
                        flags: 1,
                        type: mimeType || '*/*'
                    });
                } catch (err) {
                     Alert.alert("Notice", "No application found to open this document.");
                }
            } else {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, { UTI: mimeType, mimeType });
                } else {
                    Alert.alert("Notice", "Sharing is not available on this device");
                }
            }
        } catch (error) {
            console.error("Error downloading file:", error);
            Alert.alert("Download Error", "Could not download the document.");
        } finally {
            setDownloadingUrl(null);
        }
    };

    const renderMessage = ({ item }) => {
        const isAgent = item.direction === 'outbound' || item.sender === 'agent';
        // Handle media safely if present
        const mediaUrl = item.mediaUrl || item.content?.mediaUrl || item.content?.url || item.content?.gcsUrl;
        const type = item.type || (mediaUrl ? 'media' : 'text');
        
        let messageTime = item.time;
        if (!messageTime && (item.timestamp || item.createdAt)) {
            messageTime = new Date(item.timestamp || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const messageText = item.text || item.message_text || item.message || item.body || item.content?.body || '';
        
        // Mime Type or Type
        const mimeType = item.content?.mime_type || item.mime_type || '';
        const isImage = type === 'image' || mimeType.startsWith('image/') || (type === 'media' && mediaUrl?.match(/\.(jpg|jpeg|png|gif|webp)/i));
        const isAudio = type === 'audio' || mimeType.startsWith('audio/') || (type === 'media' && mediaUrl?.match(/\.(mp3|wav|ogg|m4a|aac)/i) || type === 'ptt');
        const isVideo = type === 'video' || mimeType.startsWith('video/') || (type === 'media' && mediaUrl?.match(/\.(mp4|mov|avi|wmv|mkv)/i));
        const isDocument = type === 'document' || (!isImage && !isAudio && !isVideo && !!mediaUrl);

        return (
            <View style={[styles.messageBubble, isAgent ? styles.agentBubble : styles.userBubble]}>
                {isImage && (
                    <TouchableOpacity style={styles.imageContainer} onPress={() => setFullscreenImageUri(mediaUrl)}>
                        <Image source={{ uri: mediaUrl }} style={styles.messageImage} resizeMode="cover" />
                    </TouchableOpacity>
                )}
                {isVideo && (
                    <View style={styles.imageContainer}>
                        <Video
                            source={{ uri: mediaUrl }}
                            style={styles.messageImage}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                            isLooping={false}
                        />
                    </View>
                )}
                {isAudio && (
                     <ChatAudioPlayer uri={mediaUrl} isAgent={isAgent} />
                )}
                {isDocument && (
                    <TouchableOpacity 
                        style={styles.fileContainer} 
                        onPress={() => downloadAndOpenFile(mediaUrl, item.description || item.content?.filename, mimeType)}
                        disabled={downloadingUrl === mediaUrl}
                    >
                        {downloadingUrl === mediaUrl ? (
                            <ActivityIndicator size="small" color="#128C7E" />
                        ) : (
                            <MaterialIcons name="insert-drive-file" size={24} color="#8696A0" />
                        )}
                        <Text style={styles.fileText} numberOfLines={1}>{item.description || item.content?.filename || 'Document'}</Text>
                    </TouchableOpacity>
                )}
                {messageText ? (
                    <Text style={[styles.messageText, isAgent ? styles.agentMessageText : styles.userMessageText]}>
                        {messageText}
                    </Text>
                ) : null}
                <View style={styles.messageFooter}>
                    <Text style={styles.messageTime}>{messageTime || ''}</Text>
                    {isAgent && (
                        <MaterialIcons 
                            name={item.status === 'sending' ? 'access-time' : (item.status === 'error' ? 'error-outline' : 'done-all')} 
                            size={14} 
                            color={item.status === 'error' ? '#FF3B30' : '#8696A0'} 
                            style={styles.statusIcon}
                        />
                    )}
                </View>
            </View>
        );
    };

    const handleSend = () => {
        if (!inputText.trim() || !effectiveId) return;
        
        // Optimistically add a temporary message to the UI (optional, but improves UX)
        // Redux will handle the real update when the socket/response comes back
        
        dispatch(sendConversationMessage({ 
            conversationId: effectiveId, 
            message: inputText 
        }));
        setInputText('');
    };

    const handleAttachmentPress = async () => {
        try {
            const allowedFileTypes = [
                'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg', 'audio/opus', 
                'application/vnd.ms-powerpoint', 'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                'application/pdf', 'text/plain', 'application/vnd.ms-excel', 
                'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/3gpp'
            ];

            const document = await DocumentPicker.getDocumentAsync({
                type: allowedFileTypes,
                copyToCacheDirectory: true,
            });
            if (!document.canceled) {
                const docAsset = document.assets[0];
                const uploadResult = await dispatch(uploadMedia(docAsset)).unwrap();
                if (uploadResult.id) {
                    dispatch(sendConversationMessage({
                        conversationId: effectiveId,
                        mediaId: uploadResult.id,
                        type: 'media',
                        fileName: docAsset.name
                    }));
                }
            }
        } catch (error) {
            console.error("Document Picker Error: ", error);
            Alert.alert("Error", "Failed to upload file");
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
                const photoUri = result.assets[0].uri;
                const uploadResult = await dispatch(uploadMedia(photoUri)).unwrap();
                if (uploadResult.id) {
                    dispatch(sendConversationMessage({
                        conversationId: effectiveId,
                        mediaId: uploadResult.id,
                        type: 'image'
                    }));
                }
            }
        } catch (error) {
            console.error("Camera Error: ", error);
            Alert.alert("Error", "Failed to upload photo");
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
                const uploadResult = await dispatch(uploadMedia(uri)).unwrap();
                if (uploadResult.id) {
                    dispatch(sendConversationMessage({
                        conversationId: effectiveId,
                        mediaId: uploadResult.id,
                        type: 'audio'
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to stop recording', error);
            Alert.alert("Error", "Failed to upload audio");
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

            <Modal visible={!!fullscreenImageUri} transparent={true} animationType="fade" onRequestClose={() => setFullscreenImageUri(null)}>
                <View style={styles.fullscreenModal}>
                    <SafeAreaView style={styles.fullscreenHeaderWrapper}>
                        <View style={styles.fullscreenHeader}>
                            <TouchableOpacity onPress={() => setFullscreenImageUri(null)} style={styles.fullscreenClose}>
                                <MaterialIcons name="arrow-back" size={26} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.fullscreenTitle}>Photo</Text>
                        </View>
                    </SafeAreaView>
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                        maximumZoomScale={3}
                        minimumZoomScale={1}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                    >
                        <Image source={{ uri: fullscreenImageUri }} style={styles.fullscreenImage} resizeMode="contain" />
                    </ScrollView>
                </View>
            </Modal>
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
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    statusIcon: {
        marginLeft: 4,
    },
    imageContainer: {
        width: 220,
        height: 220,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 4,
        backgroundColor: '#000',
    },
    messageImage: {
        width: '100%',
        height: '100%',
    },
    fullscreenModal: {
        flex: 1,
        backgroundColor: '#000',
    },
    fullscreenHeaderWrapper: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'absolute',
        top: 0,
        width: '100%',
        zIndex: 10,
    },
    fullscreenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 12,
    },
    fullscreenClose: {
        padding: 8,
        marginRight: 16,
    },
    fullscreenTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '500',
    },
    fullscreenImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    fileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 8,
        borderRadius: 8,
        marginBottom: 4,
    },
    fileText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#333',
        flex: 1,
    }
});

export default ChatDetailScreen;
