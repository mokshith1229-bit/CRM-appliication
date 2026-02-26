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
import CreateNewEnquiryScreen from '../screens/CreateNewEnquiryScreen';
import HotChatsScreen from '../screens/HotChatsScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import BottomTabs from '../components/BottomTabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator } from 'react-native';

import { useDispatch, useSelector } from 'react-redux';
import { checkAuth } from '../store/slices/authSlice';

const AppNavigator = () => {
    const [currentScreen, setCurrentScreen] = useState(null);
    const [screenStack, setScreenStack] = useState([]);
    const [drawerVisible, setDrawerVisible] = useState(false);

    // Use Redux state
    const dispatch = useDispatch();
    const { isAuthenticated, isLoading: isAuthLoading } = useSelector(state => state.auth);
    const [isNavReady, setIsNavReady] = useState(false); // To prevent flickering

    const [currentParams, setCurrentParams] = useState({});

    // 1. Check Auth on Mount
    useEffect(() => {
        dispatch(checkAuth());
    }, [dispatch]);

    // 2. React to Auth State Changes
    useEffect(() => {
        if (!isAuthLoading) {
            if (isAuthenticated) {
                // Only navigate if not already there to avoid reset loops if possible, 
                // but for this custom navigator, setting state is fine.
                if (currentScreen !== 'Home' && !isNavReady) {
                    setCurrentScreen('Home');
                    setScreenStack(['Home']);
                    setIsNavReady(true);
                }
            } else {
                if (currentScreen !== 'Login') {
                    setCurrentScreen('Login');
                    setScreenStack(['Login']);
                    setIsNavReady(true);
                }
            }
        }
    }, [isAuthLoading, isAuthenticated]);

    // Show loading while checking auth
    if (isAuthLoading || !isNavReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

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

    // Loading handled above

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
            case 'CreateNewEnquiry':
                return <CreateNewEnquiryScreen {...commonProps} />;
            case 'HotChats':
                return <HotChatsScreen {...commonProps} />;
            case 'ChatDetail':
                return <ChatDetailScreen {...commonProps} />;
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
