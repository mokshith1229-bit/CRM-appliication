import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    StatusBar,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContactStore } from '../store/contactStore';
import { COLORS, SPACING } from '../constants/theme';

const ForwardProjectScreen = ({ navigation, route }) => {
    const { project } = route.params || {};
    const contacts = useContactStore((state) => state.contacts);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [filteredContacts, setFilteredContacts] = useState(contacts);

    useEffect(() => {
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = contacts.filter(
                (contact) =>
                    contact.name.toLowerCase().includes(lowerQuery) ||
                    contact.phone.includes(lowerQuery)
            );
            setFilteredContacts(filtered);
        } else {
            setFilteredContacts(contacts);
        }
    }, [searchQuery, contacts]);

    const toggleSelection = (id) => {
        if (selectedContacts.includes(id)) {
            setSelectedContacts(selectedContacts.filter((contactId) => contactId !== id));
        } else {
            setSelectedContacts([...selectedContacts, id]);
        }
    };

    const handleSend = () => {
        if (selectedContacts.length === 0) return;

        // Mock sending functionality
        Alert.alert(
            'Sent Successfully',
            `Project "${project?.projectName || 'Project'}" forwarded to ${selectedContacts.length} contacts.`,
            [
                {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                },
            ]
        );
    };

    const renderItem = ({ item }) => {
        const isSelected = selectedContacts.includes(item.id);

        return (
            <TouchableOpacity
                style={[styles.contactItem, isSelected && styles.contactItemSelected]}
                onPress={() => toggleSelection(item.id)}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                    {isSelected && (
                        <View style={styles.checkBadge}>
                            <Ionicons name="checkmark" size={12} color="#FFF" />
                        </View>
                    )}
                </View>
                <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name || 'Unknown'}</Text>
                    <Text style={styles.contactPhone}>{item.phone}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Forward to...</Text>
                        {selectedContacts.length > 0 && (
                            <Text style={styles.subtitle}>{selectedContacts.length} selected</Text>
                        )}
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search name or number..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#999"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Project Preview */}
            {project && (
                <View style={styles.projectPreview}>
                    <Ionicons name="document-text" size={20} color={COLORS.primary} />
                    <Text style={styles.previewText} numberOfLines={1}>
                        Forwarding: <Text style={{ fontWeight: '700' }}>{project.projectName}</Text>
                    </Text>
                </View>
            )}

            {/* Contact List */}
            <FlatList
                data={filteredContacts}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No contacts found</Text>
                    </View>
                }
            />

            {/* Send FAB */}
            {selectedContacts.length > 0 && (
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <Ionicons name="send" size={24} color="#FFF" />
                </TouchableOpacity>
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
        backgroundColor: COLORS.cardBackground,
        paddingHorizontal: SPACING.md,
        paddingBottom: 12,
        paddingTop: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    backButton: {
        marginRight: SPACING.md,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 40,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS.text,
    },
    projectPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8EAF6',
        paddingHorizontal: SPACING.md,
        paddingVertical: 10,
        gap: 8,
    },
    previewText: {
        fontSize: 13,
        color: '#3F51B5',
    },
    listContainer: {
        padding: SPACING.md,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBackground,
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    contactItemSelected: {
        backgroundColor: '#F5F3FF',
        borderColor: COLORS.primary,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#4CAF50',
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 2,
    },
    contactPhone: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    sendButton: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        backgroundColor: COLORS.primary,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
});

export default ForwardProjectScreen;
