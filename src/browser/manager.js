const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const CONFIG = require('../../config/config');

puppeteer.use(StealthPlugin());

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class BrowserManager {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
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
        
        console.log('✅ Browser initialized');
    }

    async login() {
        if (this.isLoggedIn) return true;
        console.log('🔐 Checking login status...');
        
        try {
            await this.page.goto(`${CONFIG.baseUrl}/m-einloggen.html`, { waitUntil: 'networkidle2' });
            
            try {
                const cookieBtn = await this.page.waitForSelector('#gdpr-banner-accept', { timeout: 3000 });
                if (cookieBtn) {
                    await cookieBtn.click();
                    await sleep(500);
                }
            } catch (e) { }

            if (this.page.url().includes('/m-start.html') || await this.page.$('#user-menu')) {
                console.log('✅ Already logged in');
                this.isLoggedIn = true;
                return true;
            }

            const { email, password } = CONFIG.credentials;
            
            console.log('Typing credentials...');
            await this.page.waitForSelector('#login-email', { visible: true });
            await this.page.type('#login-email', email, { delay: 100 });
            await this.page.type('#login-password', password, { delay: 100 });
            
            await sleep(500);
            await this.page.click('#login-submit');
            
            await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
            
            if (this.page.url().includes('login')) {
                console.log('❌ Login failed or captcha triggered.');
                return false;
            } else {
                console.log('✅ Login successful!');
                this.isLoggedIn = true;
                return true;
            }
            
        } catch (err) {
            console.error('❌ Login error:', err.message);
            return false;
        }
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
