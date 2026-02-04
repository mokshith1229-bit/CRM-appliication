import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Dimensions,
    Image, // Import Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// import LottieView from 'lottie-react-native'; // Removed Lottie
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';

import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../store/slices/authSlice';

const { width, height } = Dimensions.get('window');
// import { BASE_URL } from '../constants/api'; // Not needed here anymore, handled in slice

const LoginScreen = ({ navigation }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    
    const dispatch = useDispatch();
    const { isLoading, error, isAuthenticated } = useSelector((state) => state.auth);

    useEffect(() => {
        if (error) {
            Alert.alert('Login Failed', error, [
                { text: 'OK', onPress: () => dispatch(clearError()) }
            ]);
        }
        if (isAuthenticated) {
            navigation.replace('Home');
        }
    }, [error, isAuthenticated, dispatch, navigation]);

    const handleLogin = () => {
        // Validation
        if (!identifier.trim()) {
            Alert.alert('Invalid Input', 'Please enter your Email or Phone Number');
            return;
        }
        if (!password.trim()) {
            Alert.alert('Invalid Password', 'Please enter your password');
            return;
        }

        dispatch(login({ identifier: identifier.trim(), password }));
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <StatusBar style="light" />
            <LinearGradient
                colors={['#2E0B56', '#12123E']} // Deep Purple to Dark Blue
                style={styles.background}
            />

            <View style={styles.content}>
                {/* Logo Image */}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../assets/app_logo.png')}
                        style={styles.logo}
                        resizeMode="cover"
                    />
                </View>

                {/* Header Text */}
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Manage your calls smarter</Text>
                </View>

                {/* Form Card */}
                <View style={styles.formCard}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email or Phone</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Email or 10-digit number"
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            keyboardType="email-address"
                            value={identifier}
                            onChangeText={setIdentifier}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your password"
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.loginButtonText}>Login</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer Actions */}

            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: height,
    },
    content: {
        flex: 1,
        justifyContent: 'center', // Center vertically
        paddingHorizontal: 16,
    },
    lottieContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    lottie: {
        width: 150,
        height: 150,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        overflow: 'hidden',
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '400',
    },
    formCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // Glassmorphism backdrop
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        marginBottom: 30,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#0F1221', // Very dark blue/black
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#FFF',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 5,
    },
    loginButton: {
        backgroundColor: '#00E0FF', // Bright Cyan
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: "#00E0FF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    loginButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000', // Black text on bright button
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    footerDivider: {
        color: 'rgba(255,255,255,0.5)',
        marginHorizontal: 15,
        fontSize: 14,
    },
});

export default LoginScreen;
