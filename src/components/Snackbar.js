import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const Snackbar = forwardRef((props, ref) => {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState('error'); // 'success', 'error', 'info'
    
    const translateY = React.useRef(new Animated.Value(100)).current;

    const show = useCallback((msg, msgType = 'error') => {
        setMessage(msg);
        setType(msgType);
        setVisible(true);
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
        }).start();

        setTimeout(() => {
            hide();
        }, 3000);
    }, []);

    const hide = useCallback(() => {
        Animated.timing(translateY, {
            toValue: 100,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setVisible(false);
        });
    }, []);

    useImperativeHandle(ref, () => ({
        show,
        hide
    }));

    if (!visible) return null;

    const getBgColor = () => {
        switch (type) {
            case 'success': return '#10B981'; // Green
            case 'error': return '#EF4444'; // Red
            case 'info': return '#3B82F6'; // Blue
            default: return '#374151'; // Gray
        }
    };

    return (
        <Animated.View style={[
            styles.container,
            { backgroundColor: getBgColor(), transform: [{ translateY }] }
        ]}>
            <View style={styles.content}>
                <MaterialIcons 
                    name={type === 'success' ? 'check-circle' : type === 'error' ? 'error' : 'info'} 
                    size={20} 
                    color="#FFF" 
                />
                <Text style={styles.message}>{message}</Text>
            </View>
            <TouchableOpacity onPress={hide} style={styles.closeBtn}>
                <MaterialIcons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        right: 20,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 9999,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    message: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'SF Pro Display',
        flex: 1,
    },
    closeBtn: {
        padding: 4,
    },
});

export default Snackbar;

// Usage: Global exposure
let snackbarRef = null;
export const setGlobalSnackbarRef = (ref) => {
    snackbarRef = ref;
};
export const showSnackbar = (msg, type) => {
    if (snackbarRef) {
        snackbarRef.show(msg, type);
    }
};
