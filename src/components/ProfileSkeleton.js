import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const ProfileSkeleton = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();

        return () => animation.stop();
    }, [opacity]);

    return (
        <View style={styles.container}>
            {/* Header Area */}
            <View style={styles.headerSpacer} />

            {/* Avatar Section */}
            <View style={styles.avatarSection}>
                <Animated.View style={[styles.avatar, { opacity }]} />
                <Animated.View style={[styles.namePlaceholder, { opacity }]} />
            </View>

            {/* Fields Card */}
            <View style={styles.card}>
                <View style={styles.fieldRow}>
                    <Animated.View style={[styles.iconPlaceholder, { opacity }]} />
                    <View style={styles.fieldContent}>
                        <Animated.View style={[styles.labelPlaceholder, { opacity }]} />
                        <Animated.View style={[styles.inputPlaceholder, { opacity }]} />
                    </View>
                </View>
                <View style={styles.divider} />

                <View style={styles.fieldRow}>
                    <Animated.View style={[styles.iconPlaceholder, { opacity }]} />
                    <View style={styles.fieldContent}>
                        <Animated.View style={[styles.labelPlaceholder, { opacity }]} />
                        <Animated.View style={[styles.inputPlaceholder, { opacity }]} />
                    </View>
                </View>
                <View style={styles.divider} />

                <View style={styles.fieldRow}>
                    <Animated.View style={[styles.iconPlaceholder, { opacity }]} />
                    <View style={styles.fieldContent}>
                        <Animated.View style={[styles.labelPlaceholder, { opacity }]} />
                        <Animated.View style={[styles.inputPlaceholder, { opacity }]} />
                    </View>
                </View>
            </View>

            {/* Action Button */}
            <Animated.View style={[styles.actionButton, { opacity }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FCFCFC',
    },
    headerSpacer: {
        height: 60,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E0E0E0',
        marginBottom: 16,
    },
    namePlaceholder: {
        width: 150,
        height: 32,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    iconPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E0E0E0',
        marginRight: 16,
    },
    fieldContent: {
        flex: 1,
    },
    labelPlaceholder: {
        width: 60,
        height: 12,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        marginBottom: 8,
    },
    inputPlaceholder: {
        width: '80%',
        height: 16,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginLeft: 40,
    },
    actionButton: {
        height: 56,
        marginHorizontal: 20,
        borderRadius: 16,
        backgroundColor: '#E0E0E0',
    },
});

export default ProfileSkeleton;
