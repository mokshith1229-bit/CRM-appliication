import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import CreateLeadScreen from '../screens/CreateLeadScreen';
import MyProfileScreen from '../screens/MyProfileScreen';
import SubscriptionReminderScreen from '../screens/SubscriptionReminderScreen';
import CustomDrawer from './CustomDrawer';
import InAppCallScreen from '../screens/InAppCallScreen';
import BookSiteVisitScreen from '../screens/BookSiteVisitScreen';
import HighDemandProjectsScreen from '../screens/HighDemandProjectsScreen';
import ForwardProjectScreen from '../screens/ForwardProjectScreen';

import LoginScreen from '../screens/LoginScreen';
import MyStatisticsScreen from '../screens/MyStatisticsScreen';
import KeypadScreen from '../screens/KeypadScreen';
import QuickContactScreen from '../screens/QuickContactScreen';
import IncomingCallScreen from '../screens/IncomingCallScreen';
import CampaignLeadsScreen from '../screens/CampaignLeadsScreen';
import FilteredContactsScreen from '../screens/FilteredContactsScreen';
import BottomTabs from '../components/BottomTabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator } from 'react-native';

const AppNavigator = () => {
    const [currentScreen, setCurrentScreen] = useState(null); // Null initially for loading
    const [screenStack, setScreenStack] = useState([]);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [currentParams, setCurrentParams] = useState({});

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                if (token) {
                    setCurrentScreen('Home');
                    setScreenStack(['Home']);
                } else {
                    setCurrentScreen('Login');
                    setScreenStack(['Login']);
                }
            } catch (e) {
                setCurrentScreen('Login');
                setScreenStack(['Login']);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);

    const navigation = {
        navigate: (screenName, params = {}) => {
            if (currentScreen === screenName) {
                setCurrentParams(params);
                return;
            }
            setScreenStack((prev) => [...prev, screenName]);
            setCurrentScreen(screenName);
            setCurrentParams(params);
        },
        replace: (screenName, params = {}) => {
            setScreenStack([screenName]); // Reset stack on replace (for login/logout)
            setCurrentScreen(screenName);
            setCurrentParams(params);
        },
        goBack: () => {
            if (screenStack.length > 1) {
                const newStack = [...screenStack];
                newStack.pop(); // Remove current screen
                const previousScreen = newStack[newStack.length - 1];
                setScreenStack(newStack);
                setCurrentScreen(previousScreen);
            }
        },
        setParams: (newParams) => {
            setCurrentParams(prev => ({ ...prev, ...newParams }));
        },
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    const renderScreen = () => {
        const commonProps = {
            navigation,
            route: { params: currentParams },
            onOpenDrawer: () => setDrawerVisible(true),
        };

        switch (currentScreen) {
            case 'Home':
                return <HomeScreen {...commonProps} />;
            case 'CreateLead':
                return <CreateLeadScreen {...commonProps} />;
            case 'BookSiteVisit':
                return <BookSiteVisitScreen {...commonProps} />;
            case 'HighDemandProjects':
                return <HighDemandProjectsScreen {...commonProps} />;
            case 'ForwardProject':
                return <ForwardProjectScreen {...commonProps} />;
            case 'MyProfile':
                return <MyProfileScreen {...commonProps} />;
            case 'SubscriptionReminder':
                return <SubscriptionReminderScreen {...commonProps} />;
            case 'InAppCall':
                return <InAppCallScreen {...commonProps} />;
            case 'MyStatistics':
                return <MyStatisticsScreen {...commonProps} />;
            case 'Keypad':
                return <KeypadScreen {...commonProps} />;
            case 'QuickContact':
                return <QuickContactScreen {...commonProps} />;
            case 'IncomingCall':
                return <IncomingCallScreen {...commonProps} />;
            case 'CampaignLeads':
                return <CampaignLeadsScreen {...commonProps} />;
            case 'FilteredContacts':
                return <FilteredContactsScreen {...commonProps} />;
            case 'Login':
                return <LoginScreen {...commonProps} />;
            default:
                return <HomeScreen {...commonProps} />;
        }
    };

    const showTabs = ['Home', 'Keypad'].includes(currentScreen);

    return (
        <View style={styles.container}>
            <View style={{ flex: 1 }}>
                {renderScreen()}
            </View>
            {showTabs && (
                <BottomTabs
                    activeTab={currentScreen}
                    onTabPress={(tab) => navigation.navigate(tab)}
                />
            )}
            <CustomDrawer
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                navigation={navigation}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default AppNavigator;
