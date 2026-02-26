import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { COLORS, SPACING } from '../constants/theme';

const BAR_COUNT = 40;

// Seeded pseudo-random heights so waveform is stable across renders
const generateBars = () => {
    const bars = [];
    let seed = 42;
    for (let i = 0; i < BAR_COUNT; i++) {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        const norm = (seed >>> 0) / 0xffffffff;
        // Emphasize mid-range heights for a natural audio look
        const h = 4 + Math.round(Math.abs(Math.sin(norm * Math.PI * 3)) * 22);
        bars.push(h);
    }
    return bars;
};

const BARS = generateBars();

const formatTime = (ms) => {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

const AudioPlayer = ({ recording }) => {
    console.log('recording', recording);
    const soundRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [durationMs, setDurationMs] = useState(0);
    const [positionMs, setPositionMs] = useState(0);

    // Cleanup sound on unmount
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
        // Reset when playback finishes
        if (status.didJustFinish) {
            setIsPlaying(false);
            setPositionMs(0);
            soundRef.current?.setPositionAsync(0);
        }
    };

    const playPauseAudio = async () => {
        try {
            const url = recording?.recording_url;
            if (!url) {
                Alert.alert('No Recording', 'No audio URL available for this call.');
                return;
            }

            // If sound is already loaded
            if (soundRef.current) {
                if (isPlaying) {
                    await soundRef.current.pauseAsync();
                } else {
                    await soundRef.current.playAsync();
                }
                return;
            }

            // First time — load and play
            setIsLoading(true);
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            const { sound } = await Audio.Sound.createAsync(
                { uri: url },
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
            Alert.alert('Playback Error', 'Could not play the recording. Please try again.');
        }
    };

    const progress = durationMs > 0 ? positionMs / durationMs : 0;

    const handleSeek = useCallback(async (evt) => {
        if (!soundRef.current || !durationMs) return;
        const { locationX } = evt.nativeEvent;
        const tapRatio = Math.max(0, Math.min(1, locationX / (BAR_COUNT * 7)));
        await soundRef.current.setPositionAsync(Math.round(tapRatio * durationMs));
    }, [durationMs]);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.header}
                onPress={() => setIsExpanded(!isExpanded)}
                activeOpacity={0.7}
            >
                <Text style={styles.listenText}>🎙 Listen to Recording</Text>
                <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isExpanded && recording?.status === 'Connected' && (
                <View style={styles.player}>
                    <TouchableOpacity
                        onPress={playPauseAudio}
                        style={styles.playButton}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.waveformContainer}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={handleSeek}
                            style={styles.waveform}
                        >
                            {BARS.map((h, i) => {
                                const played = (i / BAR_COUNT) <= progress;
                                return (
                                    <View
                                        key={i}
                                        style={[
                                            styles.bar,
                                            {
                                                height: h,
                                                backgroundColor: played ? COLORS.primary : '#D8D8E8',
                                                opacity: played ? 1 : 0.55,
                                            },
                                        ]}
                                    />
                                );
                            })}
                        </TouchableOpacity>
                        <View style={styles.timeRow}>
                            <Text style={styles.timeText}>{formatTime(positionMs)}</Text>
                            <Text style={styles.timeText}>
                                {recording?.duration || formatTime(durationMs)}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {isExpanded && recording?.status !== 'Connected' && (
                <View style={styles.noRecording}>
                    <Text style={styles.noRecordingText}>No recording available for missed/unanswered calls.</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        marginTop: 8,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    listenText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
    },
    expandIcon: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    player: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.md,
        padding: SPACING.sm,
        backgroundColor: '#F9F9F9',
        borderRadius: 8,
        gap: 12,
    },
    playButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    waveformContainer: {
        flex: 1,
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 32,
        gap: 3,
    },
    bar: {
        width: 3,
        borderRadius: 2,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    timeText: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    noRecording: {
        marginTop: SPACING.sm,
        padding: SPACING.sm,
    },
    noRecordingText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
});

export default AudioPlayer;
