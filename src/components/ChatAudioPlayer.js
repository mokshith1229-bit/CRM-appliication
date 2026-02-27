import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import * as FileSystem from 'expo-file-system';

const formatTime = (ms) => {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

const ChatAudioPlayer = ({ uri, isAgent }) => {
    const soundRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [durationMs, setDurationMs] = useState(0);
    const [positionMs, setPositionMs] = useState(0);

    useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    const onPlaybackStatusUpdate = (status) => {
        if (!status.isLoaded) return;
        setIsPlaying(status.isPlaying);
        setPositionMs(status.positionMillis || 0);
        if (status.durationMillis) setDurationMs(status.durationMillis);
        
        if (status.didJustFinish) {
            setIsPlaying(false);
            setPositionMs(0);
            soundRef.current?.setPositionAsync(0);
        }
    };

    const playPauseAudio = async () => {
        try {
            if (!uri) return;

            if (soundRef.current) {
                if (isPlaying) {
                    await soundRef.current.pauseAsync();
                } else {
                    await soundRef.current.playAsync();
                }
                return;
            }

            setIsLoading(true);
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            // Download file locally to avoid streaming decoding failures
            let playUri = uri;
            try {
                // Determine a safe filename cache
                const filename = `chat_audio_${Math.round(Math.random() * 10000000)}.m4a`;
                const localUri = FileSystem.cacheDirectory + filename;
                const { uri: downloadedUri } = await FileSystem.downloadAsync(uri, localUri);
                playUri = downloadedUri;
            } catch (downloadError) {
                console.warn("Failed to download audio for playback, falling back to stream:", downloadError);
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: playUri },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );
            soundRef.current = sound;
            setIsLoading(false);
            setIsPlaying(true);
        } catch (error) {
            setIsLoading(false);
            setIsPlaying(false);
            console.error('Audio playback error:', error);
        }
    };

    const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={playPauseAudio} style={[styles.playButton, !isAgent && styles.playButtonUser]}>
                {isLoading ? (
                    <ActivityIndicator size="small" color={isAgent ? COLORS.primary : "#FFF"} />
                ) : (
                    <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={26} color={isAgent ? COLORS.primary : "#FFF"} />
                )}
            </TouchableOpacity>

            <View style={styles.trackContainer}>
                <View style={styles.trackBackground}>
                    <View style={[styles.trackProgress, { width: `${progress}%`, backgroundColor: isAgent ? COLORS.primary : "#FFF" }]} />
                </View>
                <View style={styles.timeRow}>
                    <Text style={[styles.timeText, !isAgent && styles.timeTextUser]}>
                        {formatTime(positionMs)}
                    </Text>
                    <Text style={[styles.timeText, !isAgent && styles.timeTextUser]}>
                        {formatTime(durationMs)}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 2,
        width: 220,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EAEAEA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    playButtonUser: {
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    trackContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    trackBackground: {
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    trackProgress: {
        height: '100%',
        borderRadius: 2,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    timeText: {
        fontSize: 11,
        color: '#666',
    },
    timeTextUser: {
        color: '#EEE',
    }
});

export default ChatAudioPlayer;
