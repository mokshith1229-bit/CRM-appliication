import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const QuickContactSkeleton = () => {
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
            {/* Header Placeholder */}
            <View style={styles.header}>
                <Animated.View style={[styles.backBtn, { opacity }]} />
                <Animated.View style={[styles.rightBtn, { opacity }]} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Profile Placeholder */}
                <View style={styles.profileSection}>
                    <Animated.View style={[styles.avatar, { opacity }]} />
                    <Animated.View style={[styles.phonePlaceholder, { opacity }]} />
                </View>

                {/* Actions Row Placeholder */}
                <View style={styles.actionsRow}>
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={styles.actionItem}>
                            <Animated.View style={[styles.actionCircle, { opacity }]} />
                            <Animated.View style={[styles.actionLabel, { opacity }]} />
                        </View>
                    ))}
                </View>

                {/* Info Card Placeholder */}
                <Animated.View style={[styles.card, { height: 60, opacity }]} />

                {/* Section Title Placeholder */}
                <Animated.View style={[styles.sectionTitle, { opacity }]} />

                {/* Collapsible Card Placeholders */}
                {[1, 2, 3].map((i) => (
                    <Animated.View key={i} style={[styles.card, { height: 55, opacity, marginBottom: 10 }]} />
                ))}

                {/* Call Logs Section Placeholder */}
                <View style={[styles.card, { marginTop: 10 }]}>
                    <Animated.View style={[styles.logHeader, { opacity }]} />
                    <View style={styles.logList}>
                        {[1, 2, 3].map((i) => (
                            <View key={i} style={styles.logItem}>
                                <Animated.View style={[styles.logIcon, { opacity }]} />
                                <View style={styles.logTextContainer}>
                                    <Animated.View style={[styles.logLineLong, { opacity }]} />
                                    <Animated.View style={[styles.logLineShort, { opacity }]} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        height: 100,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    backBtn: {
        width: 35,
        height: 35,
        borderRadius: 8,
        backgroundColor: '#E1E9EE',
    },
    rightBtn: {
        width: 35,
        height: 35,
        borderRadius: 8,
        backgroundColor: '#E1E9EE',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 25,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E1E9EE',
        marginBottom: 15,
    },
    phonePlaceholder: {
        width: 180,
        height: 28,
        borderRadius: 4,
        backgroundColor: '#E1E9EE',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 30,
    },
    actionItem: {
        alignItems: 'center',
    },
    actionCircle: {
        width: 60,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#E1E9EE',
        marginBottom: 8,
    },
    actionLabel: {
        width: 50,
        height: 12,
        borderRadius: 4,
        backgroundColor: '#E1E9EE',
    },
    card: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    sectionTitle: {
        width: 120,
        height: 16,
        borderRadius: 4,
        backgroundColor: '#E1E9EE',
        marginTop: 10,
        marginBottom: 12,
        marginLeft: 4,
    },
    logHeader: {
        width: 100,
        height: 20,
        borderRadius: 4,
        backgroundColor: '#E1E9EE',
        marginBottom: 15,
    },
    logList: {
        gap: 20,
    },
    logItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#E1E9EE',
        marginRight: 12,
    },
    logTextContainer: {
        flex: 1,
        gap: 8,
    },
    logLineLong: {
        width: '70%',
        height: 14,
        borderRadius: 4,
        backgroundColor: '#E1E9EE',
    },
    logLineShort: {
        width: '40%',
        height: 10,
        borderRadius: 4,
        backgroundColor: '#E1E9EE',
    },
});

export default QuickContactSkeleton;
