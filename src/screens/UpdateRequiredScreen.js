import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const UpdateRequiredScreen = ({ storeUrl }) => {
    
    const handleUpdate = () => {
        const url = storeUrl || (Platform.OS === 'ios' ? 'https://apps.apple.com' : 'https://play.google.com/store');
        Linking.openURL(url);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#BE123C', '#4C0519']} // Red/Pink gradient for urgency
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
                <Text style={styles.title}>Update Required</Text>
                <Text style={styles.message}>
                    A new version of the app is available. Please update to continue using the application.
                </Text>

                <TouchableOpacity style={styles.button} onPress={handleUpdate}>
                    <Text style={styles.buttonText}>Update Now</Text>
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
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
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
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    button: {
        backgroundColor: '#FFF',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#BE123C',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default UpdateRequiredScreen;
