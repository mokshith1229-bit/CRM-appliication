export const getCoreName = (name) => {
    if (!name) return 'Other';
    // Remove anything in brackets (e.g., "(1)" or "[App]")
    const cleanName = name.replace(/\[.*?\]|\(.*?\)/g, '').trim();
    return cleanName;
};

// Helper to format dynamic field data into a readable list
export const formatRequirementsFromFields = (record) => {
    if (!record) return null;
    const customData = {};

    // Ignore core standard fields and Mongoose internal properties like $__ or $isNew
    const filterRegex = /^(name|email|phone|whatsapp|mobile|status|tenant_id|fb_lead_id|fb_page_id|fb_form_id|campaign_id|is_promoted|tags|source|integration_id|contact_count|assigned_to|assigned_by|created_at|updated_at|received_at|_id|__v|id|created_time|full_name|phone_number|id)$/i;
    const isStandardField = (key) => filterRegex.test(key) || key.startsWith('$') || key.startsWith('_');

    const addFact = (key, value) => {
        if (!key || typeof value === 'undefined' || value === null || value === '') return;
        if (isStandardField(key)) return;
        
        if (typeof value === 'object') {
            try { 
                value = JSON.stringify(value); 
                if (value.length > 100) value = '...'; 
            } catch(e) { return; }
        }
        
        const cleanName = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (txt) => txt.toUpperCase())
            .trim();
            
        customData[cleanName] = value;
    };

    const attrs = record.attributes || {};

    if (Array.isArray(attrs.field_data)) {
        attrs.field_data.forEach(field => {
            const value = Array.isArray(field.values) ? field.values.join(', ') : field.values;
            addFact(field.name, value);
        });
    }

    if (Array.isArray(attrs.user_column_data)) {
        attrs.user_column_data.forEach(col => {
            const value = col.string_value || col.value; 
            addFact(col.column_name || col.column_id, value);
        });
    }

    Object.keys(attrs).forEach(key => {
        if (key !== 'field_data' && key !== 'user_column_data') {
            addFact(key, attrs[key]);
        }
    });

    const formattedList = Object.entries(customData).map(([key, value]) => `• ${key}: ${value}`);
    return formattedList.length > 0 ? formattedList.join('\n') : null;
};
