/**
 * Rate Limiter and Backoff Utilities
 * 
 * Prevents bot detection by:
 * - Enforcing minimum delays between requests
 * - Using exponential backoff on failures
 * - Randomizing delays to appear human-like
 */

class RateLimiter {
    constructor(options = {}) {
        this.minDelay = options.minDelay || 1000;
        this.maxDelay = options.maxDelay || 5000;
        this.lastRequestTime = 0;
        this.failureCount = 0;
        this.maxBackoff = options.maxBackoff || 60000;
        this.baseBackoff = options.baseBackoff || 2000;
    }

    /**
     * Wait before next request with randomized delay
     */
    async waitForNext() {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        const randomDelay = this.randomDelay();
        
        if (elapsed < randomDelay) {
            const waitTime = randomDelay - elapsed;
            await this.sleep(waitTime);
        }
        
        this.lastRequestTime = Date.now();
    }

    /**
     * Exponential backoff after failure
     * @returns {boolean} true if should retry, false if max backoff exceeded
     */
    async backoff() {
        this.failureCount++;
        const calculatedBackoff = this.baseBackoff * Math.pow(2, this.failureCount - 1);
        const backoffTime = Math.min(calculatedBackoff, this.maxBackoff);
        
        // Add jitter (±20%)
        const jitter = backoffTime * 0.2 * (Math.random() * 2 - 1);
        const actualBackoff = Math.round(backoffTime + jitter);
        
        console.log(`⏳ Backoff #${this.failureCount}: waiting ${actualBackoff}ms`);
        await this.sleep(actualBackoff);
        
        // Return false if we've hit the max backoff (no more retries)
        return calculatedBackoff < this.maxBackoff;
    }

    /**
     * Reset failure count on success
     */
    resetFailures() {
        this.failureCount = 0;
    }

    /**
     * Random delay between min and max
     */
    randomDelay() {
        return this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
    }

    /**
     * Human-like random sleep
     */
    async humanDelay(minMs = 500, maxMs = 2000) {
        const delay = minMs + Math.random() * (maxMs - minMs);
        await this.sleep(delay);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Human-like typing with variable speed
 */
async function humanType(page, selector, text, options = {}) {
    const baseDelay = options.delay || 80;
    const variance = options.variance || 60;
    
    await page.focus(selector);
    
    for (const char of text) {
        // Random delay per character
        const delay = baseDelay + Math.random() * variance;
        await page.keyboard.type(char, { delay });
        
        // Occasional pause (5% chance)
        if (Math.random() < 0.05) {
            await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
        }
    }
}

/**
 * Check if response indicates bot detection
 */
function isBotDetectionResponse(response) {
    if (!response) return false;
    
    const status = response.status();
    const url = response.url();
    
    // 403 Forbidden - likely bot block
    if (status === 403) {
        return { detected: true, reason: '403-forbidden' };
    }
    
    // 429 Too Many Requests
    if (status === 429) {
        return { detected: true, reason: 'rate-limited' };
    }
    
    // Redirect to captcha/challenge page
    if (url.includes('captcha') || url.includes('challenge') || url.includes('bot')) {
        return { detected: true, reason: 'challenge-page' };
    }
    
    return { detected: false };
}

module.exports = {
    RateLimiter,
    humanType,
    isBotDetectionResponse
};
