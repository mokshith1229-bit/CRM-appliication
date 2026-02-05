import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const SubscriptionExpiredScreen = () => {

    const handleContactSupport = () => {
        // Replace with actual support email or link
        Linking.openURL('mailto:support@telecrm.com?subject=Subscription Expired Renewal');
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#1e1b4b', '#0f172a']} // Dark slate/blue for professional "Service Denied" look
                style={styles.background}
            />
            <View style={styles.content}>
                 <View style={styles.iconContainer}>
                     <Image
                        source={require('../../assets/icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>
                <Text style={styles.title}>Subscription Expired</Text>
                <Text style={styles.message}>
                    Your organization's subscription has expired. Please contact your administrator to renew the plan and restore access.
                </Text>

                <TouchableOpacity style={styles.button} onPress={handleContactSupport}>
                    <Text style={styles.buttonText}>Contact Support</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    iconContainer: {
        marginBottom: 32,
        width: 120,
        height: 120,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
     logo: {
        width: 80,
        height: 80,
        tintColor: '#FFF'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 16,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    button: {
        backgroundColor: '#6366f1', // Indigo
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default SubscriptionExpiredScreen;
