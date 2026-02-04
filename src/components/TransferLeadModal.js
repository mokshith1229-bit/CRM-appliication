import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    FlatList,
    TextInput
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

const TransferLeadModal = ({ visible, onClose, onTransfer, teamMembers = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [reason, setReason] = useState('');

    // Filter team members based on search
    const filteredTeam = teamMembers.filter(member =>
        (member.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.role || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }) => {
        // Generate initials for avatar fallback
        const initials = item.name 
            ? item.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : '?';
        
        return (
            <TouchableOpacity
                style={styles.memberCard}
                onPress={() => onTransfer(item, reason)}
            >
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                )}
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name || item.email || 'Unknown'}</Text>
                    <Text style={styles.role}>{item.role || 'Team Member'}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#C7C7CC" />
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Transfer Lead</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialCommunityIcons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <MaterialCommunityIcons name="magnify" size={20} color="#999" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search team members..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Reason Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Transfer Reason (Optional)</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Add a note for this transfer..."
                            value={reason}
                            onChangeText={setReason}
                            multiline
                        />
                    </View>

                    {/* Team List */}
                    <Text style={styles.sectionTitle}>Select Team Member</Text>
                    <FlatList
                        data={filteredTeam}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '70%',
        padding: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: SPACING.lg,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#333',
    },
    sectionTitle: {
        color: '#666',
        marginBottom: SPACING.sm,
        textTransform: 'uppercase',
    },
    inputContainer: {
        marginBottom: SPACING.lg,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    textInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: '#1F2937',
        minHeight: 40,
    },
    listContent: {
        paddingBottom: 20,
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        backgroundColor: '#E0E0E0',
    },
    avatarFallback: {
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    role: {
        fontSize: 12,
        color: '#888',
    },
});

export default TransferLeadModal;
