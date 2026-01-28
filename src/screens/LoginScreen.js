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

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        // Validation
        if (!phone.trim() || phone.length < 10) {
            Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
            return;
        }
        if (!password.trim() || password.length < 6) {
            Alert.alert('Invalid Password', 'Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        // Mock API Call
        setTimeout(async () => {
            setIsLoading(false);
            try {
                // Save session
                await AsyncStorage.setItem('userToken', 'dummy-token-123');
                await AsyncStorage.setItem('userPhone', phone);

                // Navigate to Home
                navigation.replace('Home');
            } catch (e) {
                Alert.alert('Error', 'Failed to save login session');
            }
        }, 2000);
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
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter 10-digit number"
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
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
