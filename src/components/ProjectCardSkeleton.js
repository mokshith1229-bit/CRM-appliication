import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ProjectCardSkeleton = () => {
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
        <View style={styles.projectCard}>
            {/* Developer Header */}
            <View style={styles.developerHeader}>
                <SkeletonPill width={36} height={36} style={{ borderRadius: 18, marginRight: 10 }} />
                <SkeletonPill width="40%" height={16} />
            </View>

            {/* Image Placeholder */}
            <SkeletonPill width="100%" height={220} style={{ borderRadius: 12, marginBottom: 14 }} />

            {/* Status Row */}
            <View style={styles.statusRow}>
                <SkeletonPill width="70%" height={14} />
                <SkeletonPill width={24} height={24} style={{ borderRadius: 12 }} />
            </View>

            {/* Project Name */}
            <View style={styles.projectNameRow}>
                <SkeletonPill width="60%" height={22} />
                <SkeletonPill width={60} height={22} style={{ borderRadius: 6 }} />
            </View>

            {/* Location */}
            <SkeletonPill width="80%" height={14} style={{ marginTop: 8, marginBottom: 16 }} />

            {/* Apartments Row */}
            <View style={styles.apartmentsRow}>
                <View style={{ flex: 1 }}>
                    <SkeletonPill width="40%" height={12} style={{ marginBottom: 6 }} />
                    <SkeletonPill width="80%" height={16} />
                </View>
                <View style={{ flex: 1 }}>
                    <SkeletonPill width="40%" height={12} style={{ marginBottom: 6 }} />
                    <SkeletonPill width="80%" height={16} />
                </View>
            </View>

            {/* Buttons */}
            <View style={styles.actionButtons}>
                <SkeletonPill width="80%" height={44} style={{ borderRadius: 10 }} />
                <SkeletonPill width={50} height={44} style={{ borderRadius: 10 }} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    projectCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    developerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    skeleton: {
        backgroundColor: '#E1E9EE',
        borderRadius: 4,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    projectNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    apartmentsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 18,
        padding: 12,
        backgroundColor: '#F8F9FA',
        borderRadius: 10,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
});

export default ProjectCardSkeleton;
