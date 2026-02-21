import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const StatsSkeleton = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
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
        ).start();
    }, [opacity]);

    const SkeletonPill = ({ width = '100%', height = 20, style }) => (
        <Animated.View
            style={[
                styles.skeleton,
                { width, height, opacity },
                style,
            ]}
        />
    );

    return (
        <View style={styles.container}>
            {/* Filter Section Skeleton */}
            <View style={styles.filterSection}>
                <SkeletonPill width="50%" height={14} style={{ marginBottom: 12 }} />
                <SkeletonPill width="100%" height={44} style={{ borderRadius: 8 }} />
            </View>

            {/* Performance Overview Title */}
            <SkeletonPill width="60%" height={24} style={{ marginTop: 24, marginBottom: 16 }} />

            {/* Stats Grid */}
            <View style={styles.grid}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <View key={i} style={styles.card}>
                        <SkeletonPill width={40} height={40} style={{ borderRadius: 20, marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                            <SkeletonPill width="40%" height={20} style={{ marginBottom: 4 }} />
                            <SkeletonPill width="80%" height={12} />
                        </View>
                    </View>
                ))}
            </View>

            {/* Chart Section Title */}
            <SkeletonPill width="70%" height={24} style={{ marginTop: 24, marginBottom: 16 }} />
            
            {/* Chart Card */}
            <View style={styles.chartCard}>
                <SkeletonPill width="100%" height={200} style={{ borderRadius: 12 }} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    filterSection: {
        padding: SPACING.sm,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    skeleton: {
        backgroundColor: '#E1E9EE',
        borderRadius: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: (SCREEN_WIDTH - 48) / 2,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    chartCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
});

export default StatsSkeleton;
