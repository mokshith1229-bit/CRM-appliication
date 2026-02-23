import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,

    StatusBar,
    Platform,
    Linking,
    Dimensions,
    Share,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects } from '../store/slices/projectSlice';
import { COLORS, SPACING } from '../constants/theme';
import ProjectCardSkeleton from '../components/ProjectCardSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - 64;

const HighDemandProjectsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { projects, isLoading } = useSelector(state => state.projects);
    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        dispatch(fetchProjects());
    }, [dispatch]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await dispatch(fetchProjects());
        setRefreshing(false);
    };

    // Map API data to UI format
    const mappedProjects = projects.map(project => ({
        id: project._id,
        developer: project.data.builder || 'N/A',
        projectName: project.name,
        certification: project.data.rera ? 'RERA' : null,
        location: project.data.location || 'Location not specified',
        images: project.data.photos?.length > 0
            ? project.data.photos
            : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400'],
        imageCount: project.data.photos?.length || 1,
        status: project.data.status || 'N/A',
        avgPrice: project.data.priceRange || 'Price on request',
        zeroBrokerage: false,
        apartments: project.data.configurations?.map(config => ({
            type: config.type,
            price: config.price
        })) || [],
        phone: '+91 9876543210', // Default phone
    }));

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

            {isLoading && projects.length === 0 ? (
                <View style={{ paddingHorizontal: 0, paddingVertical: 0 }}>
                    {[1, 2, 3].map(i => <ProjectCardSkeleton key={i} />)}
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[COLORS.primary]}
                        />
                    }
                >
                    {mappedProjects.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="office-building-outline" size={64} color={COLORS.textSecondary} />
                            <Text style={styles.emptyText}>No projects available</Text>
                        </View>
                    ) : (
                        <>
                            {mappedProjects.map((project) => (
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
                                            style={styles.viewNumberButtonContainer}
                                            onPress={() => handleForward(project)}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.viewNumberButtonGradient}
                                            >
                                                <Text style={styles.viewNumberText}>Forward</Text>
                                            </LinearGradient>
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
                        </>
                    )}
                </ScrollView>
            )}
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
    viewNumberButtonContainer: {
        flex: 1,
        borderRadius: 10,
        overflow: 'hidden',
        shadowColor: COLORS.primaryPurple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    viewNumberButtonGradient: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    viewNumberText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textSecondary,
    },
});

export default HighDemandProjectsScreen;
