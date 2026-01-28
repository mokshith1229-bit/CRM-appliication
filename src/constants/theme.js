export const COLORS = {
    // Status colors
    none: '#9CA3AF',
    hot: '#EF4444',
    warm: '#F97316',
    cold: '#3B82F6',
    interested: '#10B981',
    not_interested: '#6B7280',
    personal: '#8B5CF6',

    // UI colors
    primary: '#007AFF',
    background: '#FFFFFF',
    cardBackground: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#E0E0E0',
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Filter bar
    filterActive: '#007AFF',
    filterInactive: '#8E8E93',
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const TYPOGRAPHY = {
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.text,
    },
    body: {
        fontSize: 14,
        fontWeight: '400',
        color: COLORS.text,
    },
    caption: {
        fontSize: 12,
        fontWeight: '400',
        color: COLORS.textSecondary,
    },
};

export const SHADOWS = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
};

export const STATUS_CONFIG = {
    none: { label: 'None', color: COLORS.none },
    hot: { label: 'Hot Call', color: COLORS.hot },
    warm: { label: 'Warm Call', color: COLORS.warm },
    cold: { label: 'Cold Call', color: COLORS.cold },
    interested: { label: 'Interested', color: COLORS.interested },
    not_interested: { label: 'Not Interested', color: COLORS.not_interested },
    personal: { label: 'Personal', color: COLORS.personal },
    converted: { label: 'Converted', color: '#4CAF50' },
};

export const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'interested', label: 'Interested' },
    { id: 'not_interested', label: 'Not Interested' },
    { id: 'hot', label: 'Hot Call' },
    { id: 'warm', label: 'Warm Call' },
    { id: 'cold', label: 'Cold Call' },
];

export const CALL_OUTCOMES = [
    { id: 'connected', label: 'Connected', icon: 'phone-in-talk', color: '#34C759' },
    { id: 'not_picked', label: 'Not Picked', icon: 'phone-missed', color: '#FF3B30' },
    { id: 'busy', label: 'Busy', icon: 'phone-locked', color: '#FF9500' },
    { id: 'switched_off', label: 'Switched Off', icon: 'power-off', color: '#8E8E93' },
    { id: 'not_interested', label: 'Not Interested', icon: 'thumb-down', color: '#5856D6' },
    { id: 'callback', label: 'Callback', icon: 'history', color: '#007AFF' },
    { id: 'hot', label: 'Hot Call', icon: 'whatshot', color: '#FF3B30' },
    { id: 'warm', label: 'Warm Call', icon: 'wb-sunny', color: '#FF9500' },
    { id: 'cold', label: 'Cold Call', icon: 'ac-unit', color: '#007AFF' },
    { id: 'converted', label: 'Converted', icon: 'check-circle', color: '#4CAF50' },
];
