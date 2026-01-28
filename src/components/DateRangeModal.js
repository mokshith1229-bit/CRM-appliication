import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const DateRangeModal = ({ visible, onClose, onApply }) => {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showYearPicker, setShowYearPicker] = useState(false);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek };
    };

    const handleDatePress = (day) => {
        const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

        if (!startDate || (startDate && endDate)) {
            // First selection or reset
            setStartDate(selectedDate);
            setEndDate(null);
        } else {
            // Second selection
            if (selectedDate < startDate) {
                setEndDate(startDate);
                setStartDate(selectedDate);
            } else {
                setEndDate(selectedDate);
            }
        }
    };

    const handleApply = () => {
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                onApply({ type: 'range', start, end });
            } else {
                onApply({ type: 'single', date: start });
            }
            handleClose();
        }
    };

    const handleClose = () => {
        setStartDate(null);
        setEndDate(null);
        onClose();
    };

    const renderCalendar = () => {
        const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
        const days = [];
        const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        // Week day headers
        const headers = weekDays.map((day, i) => (
            <Text key={`header-${i}`} style={styles.weekDayHeader}>{day}</Text>
        ));

        // Empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
        }

        // Actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const isStart = startDate && date.toDateString() === startDate.toDateString();
            const isEnd = endDate && date.toDateString() === endDate.toDateString();
            const isInRange = startDate && endDate && date > startDate && date < endDate;
            const isToday = date.toDateString() === new Date().toDateString();

            days.push(
                <TouchableOpacity
                    key={day}
                    style={[
                        styles.dayCell,
                        isStart && styles.startDate,
                        isEnd && styles.endDate,
                        isInRange && styles.inRange,
                        isToday && !isStart && !isEnd && styles.today
                    ]}
                    onPress={() => handleDatePress(day)}
                >
                    <Text style={[
                        styles.dayText,
                        (isStart || isEnd) && styles.selectedDayText,
                        isToday && !isStart && !isEnd && styles.todayText
                    ]}>
                        {day}
                    </Text>
                </TouchableOpacity>
            );
        }

        return (
            <View>
                <View style={styles.weekDayRow}>{headers}</View>
                <View style={styles.daysGrid}>{days}</View>
            </View>
        );
    };

    const changeMonth = (direction) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(currentMonth.getMonth() + direction);
        setCurrentMonth(newMonth);
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const handleYearSelect = (year) => {
        const newDate = new Date(currentMonth);
        newDate.setFullYear(year);
        setCurrentMonth(newDate);
        setShowYearPicker(false);
    };

    const renderYearPicker = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = 2020; year <= currentYear; year++) {
            years.push(year);
        }

        return (
            <View style={styles.yearPickerContainer}>
                <Text style={styles.yearPickerTitle}>Select Year</Text>
                <View style={styles.yearGrid}>
                    {years.map((year) => (
                        <TouchableOpacity
                            key={year}
                            style={[
                                styles.yearItem,
                                year === currentMonth.getFullYear() && styles.yearItemSelected
                            ]}
                            onPress={() => handleYearSelect(year)}
                        >
                            <Text style={[
                                styles.yearText,
                                year === currentMonth.getFullYear() && styles.yearTextSelected
                            ]}>
                                {year}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <Pressable style={styles.overlay} onPress={handleClose}>
                <View style={styles.container} onStartShouldSetResponder={() => true}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => changeMonth(-1)}>
                            <MaterialIcons name="chevron-left" size={28} color="#000" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowYearPicker(!showYearPicker)}>
                            <Text style={styles.monthText}>
                                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => changeMonth(1)}>
                            <MaterialIcons name="chevron-right" size={28} color="#000" />
                        </TouchableOpacity>
                    </View>

                    {/* Year Picker or Calendar */}
                    {showYearPicker ? renderYearPicker() : renderCalendar()}

                    {/* Info Text */}
                    <Text style={styles.infoText}>
                        {!startDate && 'Select start date'}
                        {startDate && !endDate && 'Select end date or tap OK for single date'}
                        {startDate && endDate && `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`}
                    </Text>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.okButton, !startDate && styles.okButtonDisabled]}
                            onPress={handleApply}
                            disabled={!startDate}
                        >
                            <Text style={styles.okText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        width: '90%',
        maxWidth: 400,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    monthText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    weekDayRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    weekDayHeader: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 2,
    },
    dayText: {
        fontSize: 14,
        color: '#000',
    },
    startDate: {
        backgroundColor: COLORS.primary,
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
    },
    endDate: {
        backgroundColor: COLORS.primary,
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
    },
    inRange: {
        backgroundColor: '#E3F2FD',
    },
    today: {
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 20,
    },
    selectedDayText: {
        color: '#FFF',
        fontWeight: '600',
    },
    todayText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    infoText: {
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
        fontSize: 13,
        color: '#666',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    cancelText: {
        fontSize: 15,
        color: '#666',
        fontWeight: '600',
    },
    okButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
    okButtonDisabled: {
        backgroundColor: '#CCC',
    },
    okText: {
        fontSize: 15,
        color: '#FFF',
        fontWeight: '600',
    },
    yearPickerContainer: {
        minHeight: 250,
    },
    yearPickerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginBottom: 16,
        textAlign: 'center',
    },
    yearGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    yearItem: {
        width: 70,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
    },
    yearItemSelected: {
        backgroundColor: COLORS.primary,
    },
    yearText: {
        fontSize: 16,
        color: '#000',
        fontWeight: '500',
    },
    yearTextSelected: {
        color: '#FFF',
        fontWeight: '600',
    },
});

export default DateRangeModal;
