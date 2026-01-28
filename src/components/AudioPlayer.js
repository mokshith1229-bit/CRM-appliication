import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { COLORS, SPACING } from '../constants/theme';

const AudioPlayer = ({ recording }) => {
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);

    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    const playPauseAudio = async () => {
        try {
            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            } else {
                // For demo purposes, we'll just show an alert
                // In production, you'd load actual audio file
                Alert.alert('Audio Playback', 'Audio playback would start here with actual recording file');
                setIsPlaying(true);
                setTimeout(() => setIsPlaying(false), 2000);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not play audio');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.time}>
                    {recording.date} | {recording.status} | {recording.duration}
                </Text>
                <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.expandButton}>
                    <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>
            </View>

            {isExpanded && recording.status === 'Connected' && (
                <View style={styles.player}>
                    <TouchableOpacity onPress={playPauseAudio} style={styles.playButton}>
                        <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
                    </TouchableOpacity>
                    <View style={styles.waveform}>
                        <Text style={styles.waveformText}>▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃▂▁</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        marginBottom: SPACING.sm,
        padding: SPACING.md,
        borderRadius: 8,
        marginHorizontal: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    time: {
        fontSize: 13,
        color: COLORS.text,
        flex: 1,
    },
    expandButton: {
        padding: SPACING.xs,
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
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.text,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    playIcon: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    waveform: {
        flex: 1,
    },
    waveformText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        letterSpacing: 1,
    },
});

export default AudioPlayer;
