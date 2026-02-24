const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const CONFIG = require('../../config/config');
const { RateLimiter, humanType, isBotDetectionResponse } = require('../utils/rate-limiter');

puppeteer.use(StealthPlugin());

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Session check endpoints (low-risk, don't trigger bot detection)
const SESSION_CHECK_URLS = [
    '/m-meine-anzeigen.html',   // My listings - requires auth
    '/m-nachrichten.html',       // Messages - requires auth
    '/m-favoriten.html'          // Favorites - requires auth
];

class BrowserManager {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
        this.rateLimiter = new RateLimiter({
            minDelay: 1500,
            maxDelay: 4000,
            baseBackoff: 3000,
            maxBackoff: 120000  // 2 min max backoff
        });
        this.botDetected = false;
        this.loginAttempts = 0;
        this.maxLoginAttempts = 2;  // Never retry login more than twice
    }

    isConnected() {
        return this.browser && this.browser.isConnected();
    }

    async init() {
        console.log('🚀 Initializing Kleinanzeigen Manager...');
        console.log(`   Profile: ${CONFIG.profileName}`);
        console.log(`   Headless: ${CONFIG.headless}`);
        
        this.browser = await puppeteer.launch({
            headless: CONFIG.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--window-size=1280,900',
                '--user-data-dir=' + CONFIG.userDataDir
            ],
            defaultViewport: { width: 1280, height: 900 }
        });

        this.browser.on('disconnected', () => {
            console.log('⚠️ Browser disconnected.');
            this.isLoggedIn = false;
        });

        this.page = await this.browser.newPage();
        this.page.setDefaultTimeout(CONFIG.defaultTimeout);
        
        // Set up response listener for bot detection
        this.page.on('response', (response) => {
            const detection = isBotDetectionResponse(response);
            if (detection.detected) {
                console.log(`🚨 Bot detection triggered: ${detection.reason} on ${response.url()}`);
                this.botDetected = true;
            }
        });
        
        console.log('✅ Browser initialized');
    }

    /**
     * SESSION-FIRST APPROACH
     * Check if already logged in by visiting a protected page.
     * This avoids hitting the high-risk login endpoint unnecessarily.
     */
    async checkExistingSession() {
        console.log('🔍 Checking for existing session...');
        
        // Try a protected page first (low risk)
        const checkUrl = `${CONFIG.baseUrl}${SESSION_CHECK_URLS[0]}`;
        
        try {
            const response = await this.page.goto(checkUrl, { 
                waitUntil: 'networkidle2',
                timeout: 15000 
            });
            
            // Check for bot detection
            const detection = isBotDetectionResponse(response);
            if (detection.detected) {
                console.log(`🚨 Bot detection on session check: ${detection.reason}`);
                this.botDetected = true;
                return false;
            }
            
            // Handle cookie banner
            await this.dismissCookieBanner();
            
            // Check if we're actually logged in
            const currentUrl = this.page.url();
            if (!currentUrl.includes('login') && !currentUrl.includes('einloggen')) {
                // Check for user menu element
                const userMenu = await this.page.$('#user-menu, [data-testid="user-menu"], .user-menu');
                if (userMenu) {
                    console.log('✅ Existing session found - skipping login');
                    this.isLoggedIn = true;
                    return true;
                }
            }
            
            console.log('ℹ️ No active session - will need to login');
            return false;
            
        } catch (err) {
            console.log(`⚠️ Session check failed: ${err.message}`);
            return false;
        }
    }

    async dismissCookieBanner() {
        try {
            const cookieBtn = await this.page.waitForSelector('#gdpr-banner-accept', { timeout: 2000 });
            if (cookieBtn) {
                await cookieBtn.click();
                await sleep(300 + Math.random() * 400);
            }
        } catch (e) {
            // No banner present
        }
    }

    /**
     * SAFE LOGIN with rate limiting and bot detection awareness
     */
    async login() {
        // Already logged in
        if (this.isLoggedIn) return true;
        
        // Bot was detected - abort
        if (this.botDetected) {
            console.log('🛑 Aborting login - bot previously detected');
            return false;
        }
        
        // Too many login attempts
        if (this.loginAttempts >= this.maxLoginAttempts) {
            console.log('🛑 Aborting login - max attempts reached');
            return false;
        }
        
        // SESSION-FIRST: Check if already logged in
        const hasSession = await this.checkExistingSession();
        if (hasSession) return true;
        
        // Wait before attempting login
        await this.rateLimiter.waitForNext();
        
        this.loginAttempts++;
        console.log(`🔐 Login attempt ${this.loginAttempts}/${this.maxLoginAttempts}...`);
        
        try {
            // Navigate to login page (HIGH RISK)
            const response = await this.page.goto(`${CONFIG.baseUrl}/m-einloggen.html`, { 
                waitUntil: 'networkidle2' 
            });
            
            // Check for bot detection on login page
            const detection = isBotDetectionResponse(response);
            if (detection.detected) {
                console.log(`🚨 Bot detection on login page: ${detection.reason}`);
                this.botDetected = true;
                return false;
            }
            
            await this.dismissCookieBanner();
            
            // Check if already logged in (redirect happened)
            if (this.page.url().includes('/m-start.html') || await this.page.$('#user-menu')) {
                console.log('✅ Already logged in');
                this.isLoggedIn = true;
                return true;
            }
            
            // Human-like delay before typing
            await this.rateLimiter.humanDelay(800, 1500);
            
            // Type credentials with human-like behavior
            const { email, password } = CONFIG.credentials;
            
            await this.page.waitForSelector('#login-email', { visible: true });
            await humanType(this.page, '#login-email', email, { delay: 80, variance: 50 });
            
            await this.rateLimiter.humanDelay(300, 800);
            
            await humanType(this.page, '#login-password', password, { delay: 70, variance: 60 });
            
            await this.rateLimiter.humanDelay(500, 1000);
            
            // Click submit
            await this.page.click('#login-submit');
            
            // Wait for navigation
            await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
            
            // Check result
            const finalUrl = this.page.url();
            if (finalUrl.includes('login') || finalUrl.includes('einloggen')) {
                console.log('❌ Login failed - still on login page (captcha or wrong credentials)');
                
                // Backoff before potential retry
                const shouldRetry = await this.rateLimiter.backoff();
                if (shouldRetry && this.loginAttempts < this.maxLoginAttempts) {
                    return this.login();
                }
                return false;
            }
            
            console.log('✅ Login successful!');
            this.isLoggedIn = true;
            this.rateLimiter.resetFailures();
            return true;
            
        } catch (err) {
            console.error('❌ Login error:', err.message);
            
            // Check if it's a timeout (could be bot detection)
            if (err.name === 'TimeoutError') {
                console.log('⚠️ Timeout during login - possible bot detection');
                this.botDetected = true;
                return false;
            }
            
            const shouldRetry = await this.rateLimiter.backoff();
            if (shouldRetry && this.loginAttempts < this.maxLoginAttempts) {
                return this.login();
            }
            return false;
        }
    }

    /**
     * Navigate with rate limiting and bot detection check
     */
    async safeNavigate(url) {
        if (this.botDetected) {
            throw new Error('Bot detected - navigation blocked');
        }
        
        await this.rateLimiter.waitForNext();
        
        const response = await this.page.goto(url, { waitUntil: 'networkidle2' });
        
        const detection = isBotDetectionResponse(response);
        if (detection.detected) {
            this.botDetected = true;
            throw new Error(`Bot detection: ${detection.reason}`);
        }
        
        return response;
    }

    async close() {
        try {
            if (this.browser) await this.browser.close();
            console.log('🔒 Browser closed');
        } catch (e) {
            console.log('Error closing browser:', e.message);
        }
    }
}

module.exports = { BrowserManager, sleep };
