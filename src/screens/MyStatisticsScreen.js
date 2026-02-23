import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Platform, StatusBar as NativeStatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import { useDispatch, useSelector } from 'react-redux';
import { fetchMyStats } from '../store/slices/statsSlice';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import StatsSkeleton from '../components/StatsSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MyStatisticsScreen = ({ navigation, onOpenDrawer }) => {
    const dispatch = useDispatch();
    const { stats, isLoading } = useSelector(state => state.stats);
    const [dateFilter, setDateFilter] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const fetchStats = useCallback(() => {
        const dateParam = dateFilter ? dateFilter.toISOString().split('T')[0] : null;
        dispatch(fetchMyStats(dateParam));
    }, [dateFilter, dispatch]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const onRefresh = useCallback(() => {
        fetchStats();
    }, [fetchStats]);

    const handleDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setDateFilter(selectedDate);
        }
        // For iOS, we don't necessarily hide the inline picker on change
        // Users will press the "Done" button to dismiss it
    };

    const openDatePicker = () => {
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                value: dateFilter || new Date(),
                onChange: handleDateChange,
                mode: 'date',
                is24Hour: true,
            });
        } else {
            setShowDatePicker(true);
        }
    };

    const clearDateFilter = () => {
        setDateFilter(null);
    };

    // Prepare chart data from API response safely
    const dailyCalls = stats?.dailyCalls || [];
    const chartData = {
        labels: dailyCalls.length > 0 ? dailyCalls.map(day => {
            const d = new Date(day.date || new Date());
            return `${d.getDate()}/${d.getMonth() + 1}`;
        }) : ['No Data'],
        datasets: [{
            data: dailyCalls.length > 0
                ? dailyCalls.map(day => day.count)
                : [0] // Prevent chart error with empty data
        }]
    };

    const StatCard = ({ title, value, icon, color }) => (
        <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <MaterialCommunityIcons name={icon} size={24} color={color} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardValue}>{value}</Text>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" backgroundColor="transparent" translucent={true} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Statistics</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
            >

                {/* Date Filter Section */}
                <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Filter Statistics By Date</Text>
                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={[styles.dateButton, dateFilter && styles.activeDateButton]}
                            onPress={openDatePicker}
                        >
                            <MaterialCommunityIcons
                                name="calendar"
                                size={20}
                                color={dateFilter ? COLORS.primary : '#666'}
                            />
                            <Text style={[styles.dateButtonText, dateFilter && styles.activeDateButtonText]}>
                                {dateFilter ? dateFilter.toLocaleDateString() : 'Select Date'}
                            </Text>
                        </TouchableOpacity>

                        {dateFilter && (
                            <TouchableOpacity style={styles.clearButton} onPress={clearDateFilter}>
                                <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {dateFilter && (
                        <Text style={styles.filterHint}>Showing stats for {dateFilter.toLocaleDateString()}</Text>
                    )}
                </View>

                {/* iOS Date Picker (Conditional Inline Display) */}
                {Platform.OS === 'ios' && showDatePicker && (
                    <View style={styles.iosPickerContainer}>
                        <DateTimePicker
                            value={dateFilter || new Date()}
                            mode="date"
                            display="inline"
                            onChange={handleDateChange}
                        />
                        <TouchableOpacity
                            style={styles.pickerDoneBtn}
                            onPress={() => setShowDatePicker(false)}
                        >
                            <Text style={styles.pickerDoneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Loading State */}
                {isLoading ? (
                    <StatsSkeleton />
                ) : (
                    <>
                        {/* Stats Grid */}
                        <Text style={styles.sectionTitle}>Performance Overview</Text>
                        <View style={styles.grid}>
                            <StatCard title="Calls Attempted" value={stats?.calls?.attempted || 0} icon="phone-outgoing" color={COLORS.primaryPurple} />
                            <StatCard title="Calls Connected" value={stats?.calls?.connected || 0} icon="phone-check" color="#34C759" />
                            <StatCard title="Not Connected" value={stats?.calls?.notConnected || 0} icon="phone-missed" color="#FF3B30" />
                            <StatCard title="In-Progress" value={stats?.leads?.inProgress || 0} icon="progress-clock" color="#FF9500" />
                            <StatCard title="Converted" value={stats?.leads?.converted || 0} icon="check-decagram" color="#10B981" />
                            <StatCard title="Lost Leads" value={stats?.leads?.lost || 0} icon="close-circle" color="#8E8E93" />
                            <StatCard title="WhatsApp Sent" value={stats?.whatsapp || 0} icon="whatsapp" color="#25D366" />
                        </View>

                        {/* Chart Section */}
                        <Text style={styles.sectionTitle}>Daily Call Attempts (Last 7 Days)</Text>
                        <View style={styles.chartCard}>
                            <BarChart
                                data={chartData}
                                width={SCREEN_WIDTH - 48}
                                height={220}
                                yAxisLabel=""
                                chartConfig={{
                                    backgroundColor: '#ffffff',
                                    backgroundGradientFrom: '#ffffff',
                                    backgroundGradientTo: '#ffffff',
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                    barPercentage: 0.7,
                                }}
                                style={styles.chart}
                                showValuesOnTopOfBars
                                fromZero
                            />
                        </View>
                    </>
                )}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        // paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: COLORS.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    backButton: {
        padding: 4,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.md,
        marginTop: SPACING.lg,
    },
    filterSection: {
        marginBottom: SPACING.sm,
        padding: SPACING.sm,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flex: 1,
    },
    activeDateButton: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '10',
    },
    dateButtonText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    activeDateButtonText: {
        color: COLORS.primary,
    },
    clearButton: {
        padding: 10,
        marginLeft: 8,
    },
    filterHint: {
        marginTop: 8,
        fontSize: 12,
        color: COLORS.primary,
        fontStyle: 'italic',
    },
    iosPickerContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    pickerDoneBtn: {
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: COLORS.primary,
        borderRadius: 20,
    },
    pickerDoneText: {
        color: '#fff',
        fontWeight: '600',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
    },
    card: {
        width: (SCREEN_WIDTH - 48) / 2,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    cardValue: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    chartCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: SPACING.md,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    chart: {
        borderRadius: 16,
        marginVertical: 8,
    }
});

export default MyStatisticsScreen;
