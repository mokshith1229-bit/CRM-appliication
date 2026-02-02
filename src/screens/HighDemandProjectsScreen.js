import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    SafeAreaView,
    StatusBar,
    Platform,
    Linking,
    Dimensions,
    Share,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - 64; // Account for card padding (16*2) and margins (16*2)

const HighDemandProjectsScreen = ({ navigation }) => {
    const projects = [
        {
            id: '1',
            developer: 'MVV Builders',
            projectName: 'MVV Green Field',
            certification: 'RERA',
            location: 'Gollala Yendada, Yendada, Visakhapatnam',
            images: [
                'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
                'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400',
            ],
            imageCount: 27,
            status: 'Ready to Move',
            avgPrice: '₹5.00k',
            zeroBrokerage: true,
            apartments: [
                { type: '2 BHK Apartment', price: '₹ 67.50 L' },
                { type: '3 BHK Apartment', price: '₹ 70.51 L - ₹ 1.11 Cr' },
            ],
            phone: '+91 9876543210',
        },
        {
            id: '2',
            developer: 'MVV & GV Housing',
            projectName: 'MVV The Grand',
            certification: 'RERA',
            location: 'Madhurawada, Visakhapatnam',
            images: [
                'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400',
                'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400',
            ],
            imageCount: 113,
            status: 'Possession by Oct, 2028',
            avgPrice: '₹6.00k',
            zeroBrokerage: true,
            apartments: [
                { type: '2 BHK Apartment', price: '₹ 83.39 L - ₹ 85.55 L' },
                { type: '3 BHK Apartment', price: '₹ 86.57 L - ₹ 1.25 Cr' },
            ],
            phone: '+91 9876543211',
        },
    ];

    const handleCall = (phone) => {
        Linking.openURL(`tel:${phone}`);
    };

    const handleForward = (project) => {
        navigation.navigate('ForwardProject', { project });
    };

    const handleShare = async (project) => {
        try {
            const message = `Check out this project: *${project.projectName}* by ${project.developer}\n\n📍 Location: ${project.location}\n🏗️ Status: ${project.status}\n💰 Price: ${project.avgPrice}\n\nCall for more info: ${project.phone}`;

            await Share.share({
                message: message,
            });
        } catch (error) {
            alert(error.message);
        }
    };

    const handleViewNumber = (phone) => {
        alert(`Contact Number: ${phone}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Projects</Text>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {projects.map((project) => (
                    <View key={project.id} style={styles.projectCard}>
                        {/* Developer Header */}
                        <View style={styles.developerHeader}>
                            <View style={styles.developerIcon}>
                                <MaterialCommunityIcons name="office-building" size={20} color="#666" />
                            </View>
                            <Text style={styles.developerName}>{project.developer}</Text>
                        </View>

                        {/* Images - Horizontal Scrollable */}
                        <View style={styles.imagesContainer}>
                            <ScrollView
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                style={styles.imageScrollView}
                                onScroll={(event) => {
                                    const slideIndex = Math.round(
                                        event.nativeEvent.contentOffset.x /
                                        event.nativeEvent.layoutMeasurement.width
                                    );
                                }}
                                scrollEventThrottle={16}
                            >
                                {project.images.map((image, index) => (
                                    <View key={index} style={styles.imageSlide}>
                                        <Image source={{ uri: image }} style={styles.slideImage} />
                                        {index === project.images.length - 1 && (
                                            <View style={styles.imageCountBadge}>
                                                <Text style={styles.imageCountText}>{index + 1}/{project.imageCount}</Text>
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Status and Price */}
                        <View style={styles.statusRow}>
                            <Text style={styles.statusText}>
                                {project.status} • Avg. Price/ sq.ft. {project.avgPrice}
                            </Text>
                            <TouchableOpacity>
                                <Ionicons name="heart-outline" size={24} color="#999" />
                            </TouchableOpacity>
                        </View>

                        {/* Project Name */}
                        <View style={styles.projectNameRow}>
                            <Text style={styles.projectName}>{project.projectName}</Text>
                            {project.certification && (
                                <View style={styles.reraBadge}>
                                    <MaterialCommunityIcons name="check-circle" size={14} color={COLORS.success} />
                                    <Text style={styles.reraText}>{project.certification}</Text>
                                </View>
                            )}
                        </View>

                        {/* Location */}
                        <Text style={styles.location}>{project.location}</Text>

                        {/* Apartments */}
                        <View style={styles.apartmentsRow}>
                            {project.apartments.map((apt, index) => (
                                <View key={index} style={styles.apartmentItem}>
                                    <Text style={styles.apartmentType}>{apt.type}</Text>
                                    <Text style={styles.apartmentPrice}>{apt.price}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.viewNumberButton}
                                onPress={() => handleForward(project)}
                            >
                                <Text style={styles.viewNumberText}>Forward</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.callButton}
                                onPress={() => handleShare(project)}
                            >
                                <Ionicons name="share-social" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: 16,
        backgroundColor: COLORS.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    backButton: {
        marginRight: SPACING.md,
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        letterSpacing: 0.3,
    },
    scrollView: {
        flex: 1,
    },
    projectCard: {
        backgroundColor: COLORS.cardBackground,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        borderRadius: 16,
        padding: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    developerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    developerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F5F3FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    developerName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        letterSpacing: 0.2,
    },
    imagesContainer: {
        marginBottom: 14,
        height: 220,
        borderRadius: 12,
        overflow: 'hidden',
    },
    imageScrollView: {
        flex: 1,
    },
    imageSlide: {
        width: IMAGE_WIDTH,
        height: 220,
        position: 'relative',
        marginRight: 8,
    },
    slideImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
        backgroundColor: '#E8E8E8',
    },
    zeroBrokerageBadge: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: 'rgba(76, 175, 80, 0.95)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    zeroBrokerageText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    imageCountBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    imageCountText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingVertical: 4,
    },
    statusText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    projectNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 8,
    },
    projectName: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        letterSpacing: 0.2,
    },
    reraBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    reraText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2E7D32',
        letterSpacing: 0.3,
    },
    location: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 16,
        lineHeight: 20,
    },
    apartmentsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 18,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#F8F9FA',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    apartmentItem: {
        flex: 1,
    },
    apartmentType: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 6,
        fontWeight: '500',
    },
    apartmentPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        letterSpacing: 0.2,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    viewNumberButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
    },
    viewNumberText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.primary,
        letterSpacing: 0.3,
    },
    callButton: {
        width: 50,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
});

export default HighDemandProjectsScreen;
