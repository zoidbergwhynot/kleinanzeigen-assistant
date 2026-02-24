#!/usr/bin/env node
const fs = require('fs').promises;
const CONFIG = require('../config/config');
const { BrowserManager, sleep } = require('./browser/manager');
const { extractConversations, extractConversationContext } = require('./parsers/messages');
const { extractFirstResult, extractAdDetails } = require('./parsers/ads');
const { notifyAgent } = require('./notifier');
const { detectLanguage } = require('./utils/language');
const { RateLimiter } = require('./utils/rate-limiter');

process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

/**
 * Build search URL with optional price filters
 */
function buildSearchUrl(searchTerm, minPrice, maxPrice) {
    let url = `${CONFIG.baseUrl}/s-suchanfrage.html?keywords=${encodeURIComponent(searchTerm)}`;
    
    if (minPrice !== undefined && minPrice !== null) {
        url += `&minPrice=${encodeURIComponent(minPrice)}`;
    }
    
    if (maxPrice !== undefined && maxPrice !== null) {
        url += `&maxPrice=${encodeURIComponent(maxPrice)}`;
    }
    
    return url;
}

class KleinanzeigenAssistant {
    constructor() {
        this.browser = new BrowserManager();
        this.rateLimiter = new RateLimiter();
    }

    async pollMessages() {
        console.log('📨 Polling for unread messages...');
        if (!this.browser.isConnected()) return;
        
        try {
            // Use safe navigation
            await this.browser.safeNavigate(`${CONFIG.baseUrl}/m-nachrichten.html`);
            
            if (this.browser.page.url().includes('login')) {
                console.log('⚠️ Session lost.');
                return;
            }

            const conversations = await extractConversations(this.browser.page);
            
            console.log(`📬 Found ${conversations.length} unread conversation(s)`);
            
            // Process max 5 conversations
            for (const conv of conversations.slice(0, 5)) {
                if (!this.browser.isConnected()) break;
                if (this.browser.botDetected) {
                    console.log('🛑 Stopping - bot detected');
                    break;
                }
                
                console.log(`👤 Processing: ${conv.userName}`);
                
                try {
                    if (conv.href) {
                        await this.browser.safeNavigate(conv.href);
                    } else {
                        continue;
                    }
                    
                    await this.rateLimiter.humanDelay(1500, 3000);
                    
                    const contextData = await extractConversationContext(this.browser.page);
                    
                    const lastBuyerMessage = contextData.history.filter(m => !m.isFromMe).pop();
                    
                    if (!lastBuyerMessage) {
                        console.log('   -> No new message from counterpart.');
                        continue;
                    }

                    const lastMessageText = lastBuyerMessage.text;
                    const language = detectLanguage(lastMessageText);
                    
                    const context = {
                        mode: 'seller',
                        counterpartName: conv.userName,
                        itemTitle: contextData.itemTitle,
                        price: contextData.price,
                        conversationHistory: contextData.history.slice(-10),
                        language: language,
                        lastMessage: lastMessageText
                    };

                    notifyAgent(context);
                    
                } catch (convErr) {
                    console.error(`❌ Error processing ${conv.userName}:`, convErr.message);
                    // Continue with next conversation
                }
                
                await this.rateLimiter.humanDelay(1000, 2500);
            }
            
        } catch (err) {
            console.error('❌ Error polling messages:', err.message);
        }
    }

    async searchAndInquire(searchTerm, minPrice, maxPrice) {
        console.log(`🔍 Searching for: "${searchTerm}"`);
        if (minPrice !== undefined || maxPrice !== undefined) {
            console.log(`   Price range: ${minPrice ?? 'any'} - ${maxPrice ?? 'any'}`);
        }
        if (!this.browser.isConnected()) return;

        try {
            const searchUrl = buildSearchUrl(searchTerm, minPrice, maxPrice);
            
            await this.browser.safeNavigate(searchUrl);
            
            await this.browser.page.waitForSelector('[class*="aditem"], article', { timeout: 10000 }).catch(() => null);
            
            const firstResult = await extractFirstResult(this.browser.page);
            
            if (!firstResult || !firstResult.link) {
                console.log('⚠️ No results found');
                return;
            }
            
            console.log(`📦 Found: "${firstResult.title}" - ${firstResult.price}`);
            
            await this.browser.safeNavigate(firstResult.link);
            await this.rateLimiter.humanDelay(1500, 3000);
            
            const adContext = await extractAdDetails(this.browser.page);
            
            const language = detectLanguage(adContext.title + ' ' + adContext.description);
            
            const context = {
                mode: 'buyer',
                counterpartName: adContext.sellerName,
                itemTitle: adContext.title || firstResult.title,
                price: adContext.price || firstResult.price,
                itemDescription: adContext.description.substring(0, 500) + '...',
                itemUrl: firstResult.link,
                language: language
            };
            
            notifyAgent(context);
            
        } catch (err) {
            console.error('❌ Error searching:', err.message);
        }
    }

    async runSavedSearches() {
        try {
            const searchesRaw = await fs.readFile(CONFIG.searchesFile, 'utf8');
            const searches = JSON.parse(searchesRaw);
            
            const activeSearches = searches.filter(s => s.active);
            console.log(`📋 Running ${activeSearches.length} saved searches...`);
            
            for (const search of activeSearches) {
                if (this.browser.botDetected) {
                    console.log('🛑 Stopping searches - bot detected');
                    break;
                }
                
                await this.searchAndInquire(search.query, search.minPrice, search.maxPrice);
                await this.rateLimiter.humanDelay(2000, 4000);
            }
        } catch (e) {
            console.error('Error reading saved searches:', e.message);
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const assistant = new KleinanzeigenAssistant();
    
    process.on('SIGINT', async () => {
        console.log('\nCaught interrupt signal');
        await assistant.browser.close();
        process.exit();
    });

    try {
        await assistant.browser.init();
        
        switch (command) {
            case 'poll':
            case 'messages':
                if (await assistant.browser.login()) {
                    await assistant.pollMessages();
                }
                break;
                
            case 'search':
                const searchTerm = args[1];
                if (!searchTerm) {
                    console.error('❌ Usage: node src/index.js search "<search term>"');
                    process.exit(1);
                }
                if (await assistant.browser.login()) {
                    await assistant.searchAndInquire(searchTerm);
                }
                break;

            case 'searches':
                if (await assistant.browser.login()) {
                    await assistant.runSavedSearches();
                }
                break;
                
            default:
                console.log(`
Kleinanzeigen Assistant - Human-in-the-Loop Automation

Usage: node src/index.js <command>

Commands:
  poll, messages   Check for unread messages and notify
  search <term>    Search for an item and notify
  searches         Run all active saved searches

Environment:
  KLEINANZEIGEN_EMAIL    Your login email
  KLEINANZEIGEN_PASSWORD Your login password
  HEADLESS              Set to 'false' to show browser (default: true)
  PROFILE               Profile to use: main, human-sim, fresh (default: main)

Anti-Bot Features:
  - Session-first: Checks existing session before hitting login
  - Rate limiting: Randomized delays between requests
  - Backoff: Exponential backoff on failures
  - Bot detection: Stops on 403/429/challenge responses
`);
        }
        
    } catch (err) {
        console.error('❌ Fatal error:', err.message);
        process.exitCode = 1;
    } finally {
        await assistant.browser.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = { KleinanzeigenAssistant, buildSearchUrl };
