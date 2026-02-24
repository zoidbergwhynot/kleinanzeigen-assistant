const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PROFILES_DIR = path.join(__dirname, '..', 'profiles');

const PROFILE_MAP = {
    main: path.join(PROFILES_DIR, 'main'),
    'human-sim': path.join(PROFILES_DIR, 'human-sim'),
    fresh: path.join(PROFILES_DIR, 'fresh')
};

function getCredentials() {
    const email = process.env.KLEINANZEIGEN_EMAIL;
    const password = process.env.KLEINANZEIGEN_PASSWORD;
    
    if (!email || !password) {
        console.error('❌ Credentials not found. Set KLEINANZEIGEN_EMAIL and KLEINANZEIGEN_PASSWORD in .env');
        process.exit(1);
    }
    
    return { email, password };
}

function getProfilePath(profileName = 'main') {
    return PROFILE_MAP[profileName] || PROFILE_MAP.main;
}

const CONFIG = {
    baseUrl: 'https://www.kleinanzeigen.de',
    searchesFile: path.join(__dirname, 'searches.json'),
    headless: process.env.HEADLESS !== 'false',
    defaultTimeout: 30000,
    profileName: process.env.PROFILE || 'main',
    get userDataDir() {
        return getProfilePath(this.profileName);
    },
    get credentials() {
        return getCredentials();
    }
};

module.exports = CONFIG;
