// Simulating a backend compliance checklist. 
// In a real production app, this would be an API call to a moderation service.

// Basic blacklisted words for demonstration purposes
const BANNED_WORDS = [
    'admin', 'root', 'moderator', 'system', // reserved keywords
    'spam', 'scam', 'hack', 'cheat',        // malicious intent
    'nsfw', 'porn', 'sex', 'violence',      // inappropriate content
    'idiot', 'stupid', 'dumb',              // toxic language
];

const MAX_LENGTHS = {
    name: 30,
    city: 30,
    bio: 200,
    squadName: 40,
};

export function validateContent(
    text: string,
    type: 'name' | 'bio' | 'city' | 'squadName'
): { isValid: boolean; errorKey?: string } {
    if (!text || text.trim() === '') {
        // Empty strings might be allowed for bio/city, but not name/squadName
        if (type === 'name' || type === 'squadName') {
            return { isValid: false, errorKey: 'validation.empty_required_field' };
        }
        return { isValid: true };
    }

    // 1. Length Check
    if (text.length > MAX_LENGTHS[type]) {
        return { isValid: false, errorKey: 'validation.too_long' };
    }

    // 2. Reserved/Banned Words Check
    const lowerText = text.toLowerCase();
    const containsBannedWord = BANNED_WORDS.some(word => lowerText.includes(word));
    if (containsBannedWord) {
        return { isValid: false, errorKey: 'validation.inappropriate_content' };
    }

    // 3. Special Character Check (Optional, depending on strictness)
    // For names and squad names, we might want to prevent excessive special characters
    if (type === 'name' || type === 'squadName') {
        // Allow alphanumeric, spaces, and basic punctuation (.,-_) 
        // This regex is a basic example; adjust based on actual requirements (especially for foreign languages)
        // Note: For multi-language support (Chinese, etc.), standard alphanumeric regex is too strict.
        // We will skip strict regex here to allow Chinese/Global characters, and rely on the banned word list.
    }

    return { isValid: true };
}

export function validateImage(file: File): { isValid: boolean; errorKey?: string } {
    // 1. File Size Check (e.g., max 5MB)
    const MAX_SIZE_MB = 5;
    const maxSizeInBytes = MAX_SIZE_MB * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
        return { isValid: false, errorKey: 'validation.file_too_large' };
    }

    // 2. File Type Check
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        return { isValid: false, errorKey: 'validation.invalid_file_type' };
    }

    return { isValid: true };
}
