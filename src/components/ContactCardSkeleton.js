import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const ContactCardSkeleton = () => {
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
        <View style={styles.card}>
            <View style={styles.leftSection}>
                {/* Avatar Skeleton */}
                <Animated.View style={[styles.avatar, { opacity }]} />

                {/* Info Text Skeleton */}
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Animated.View style={[styles.namePlaceholder, { opacity }]} />
                        <Animated.View style={[styles.badgePlaceholder, { opacity }]} />
                    </View>

                    {/* Phone Number Skeleton */}
                    <Animated.View style={[styles.textPlaceholder, { width: 100, opacity }]} />

                    {/* Meta Info Skeleton */}
                    <View style={styles.metaRow}>
                        <Animated.View style={[styles.textPlaceholder, { width: 60, opacity }]} />
                        <Animated.View style={[styles.textPlaceholder, { width: 80, marginLeft: 10, opacity }]} />
                    </View>
                </View>
            </View>

            {/* Call Button Skeleton */}
            <Animated.View style={[styles.callButton, { opacity }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E0E0E0',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E0E0E0',
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    namePlaceholder: {
        width: 120,
        height: 16,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        marginRight: 8,
    },
    badgePlaceholder: {
        width: 50,
        height: 16,
        backgroundColor: '#E0E0E0',
        borderRadius: 8,
    },
    textPlaceholder: {
        height: 12,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        marginTop: 4,
    },
    metaRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    callButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E0E0E0',
    },
});

export default ContactCardSkeleton;
