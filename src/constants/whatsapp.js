export const WHATSAPP_MEDIA_CONSTRAINTS = {
    image: {
        allowed_mimetypes: ['image/jpeg', 'image/png'],
        allowed_extensions: ['.jpg', '.jpeg', '.png'],
        max_size: 5 * 1024 * 1024, // 5 MB
        category: 'Images'
    },
    video: {
        allowed_mimetypes: ['video/mp4', 'video/3gp'],
        allowed_extensions: ['.mp4', '.3gp'],
        max_size: 16 * 1024 * 1024, // 16 MB
        category: 'Video',
        note: 'Videos must use H.264 video codec and AAC audio codec.'
    },
    audio: {
        allowed_mimetypes: ['audio/aac', 'audio/amr', 'audio/mpeg', 'audio/mp4', 'audio/ogg'],
        allowed_extensions: ['.aac', '.amr', '.mp3', '.m4a', '.ogg'],
        max_size: 16 * 1024 * 1024, // 16 MB
        category: 'Audio',
        note: 'OGG files are only supported if they use the Opus codec.'
    },
    document: {
        allowed_mimetypes: [
            'application/pdf', 
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain'
        ],
        allowed_extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'],
        max_size: 100 * 1024 * 1024, // 100 MB
        category: 'Documents'
    },
    sticker: {
        allowed_mimetypes: ['image/webp'],
        allowed_extensions: ['.webp'],
        max_size: 500 * 1024, // 500 KB
        category: 'Stickers',
        note: 'Stickers must be exactly 512x512 pixels.'
    }
};

export const WHATSAPP_ALL_ALLOWED_MIMETYPES = Object.values(WHATSAPP_MEDIA_CONSTRAINTS)
    .flatMap(c => c.allowed_mimetypes);
