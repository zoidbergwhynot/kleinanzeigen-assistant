/**
 * Rate Limiter Unit Tests
 * 
 * Spec: Rate limiting and backoff utilities for anti-bot detection
 */

const { RateLimiter, isBotDetectionResponse } = require('../src/utils/rate-limiter');

// Mock page object for humanType tests
const createMockPage = () => ({
    focus: jest.fn().mockResolvedValue(undefined),
    keyboard: {
        type: jest.fn().mockResolvedValue(undefined)
    }
});

describe('RateLimiter', () => {
    let rateLimiter;
    
    beforeEach(() => {
        rateLimiter = new RateLimiter({
            minDelay: 100,
            maxDelay: 200,
            baseBackoff: 1000,
            maxBackoff: 10000
        });
        // Mock sleep to resolve immediately
        rateLimiter.sleep = jest.fn().mockResolvedValue(undefined);
    });

    describe('constructor', () => {
        it('should use default values when no options provided', () => {
            const rl = new RateLimiter();
            expect(rl.minDelay).toBe(1000);
            expect(rl.maxDelay).toBe(5000);
            expect(rl.maxBackoff).toBe(60000);
            expect(rl.baseBackoff).toBe(2000);
        });

        it('should use provided options', () => {
            expect(rateLimiter.minDelay).toBe(100);
            expect(rateLimiter.maxDelay).toBe(200);
            expect(rateLimiter.baseBackoff).toBe(1000);
            expect(rateLimiter.maxBackoff).toBe(10000);
        });
    });

    describe('waitForNext', () => {
        it('should update lastRequestTime after call', async () => {
            expect(rateLimiter.lastRequestTime).toBe(0);
            await rateLimiter.waitForNext();
            expect(rateLimiter.lastRequestTime).toBeGreaterThan(0);
        });
    });

    describe('backoff', () => {
        it('should increment failure count', async () => {
            await rateLimiter.backoff();
            expect(rateLimiter.failureCount).toBe(1);
            
            await rateLimiter.backoff();
            expect(rateLimiter.failureCount).toBe(2);
        });

        it('should call sleep with backoff time', async () => {
            await rateLimiter.backoff();
            expect(rateLimiter.sleep).toHaveBeenCalled();
        });

        it('should return true when calculated backoff is under max', async () => {
            // baseBackoff=1000, failureCount=1 => 1000 < 10000
            const result = await rateLimiter.backoff();
            expect(result).toBe(true);
        });

        it('should return false when calculated backoff exceeds max', async () => {
            // With baseBackoff=1000 and maxBackoff=10000
            // After 5 failures: 1000 * 2^4 = 16000 > 10000
            rateLimiter.failureCount = 4; // Will become 5 in backoff
            
            const result = await rateLimiter.backoff();
            expect(result).toBe(false);
        });

        it('should cap backoff at maxBackoff', async () => {
            rateLimiter.failureCount = 10; // Very high
            
            await rateLimiter.backoff();
            // Sleep should have been called (time is capped at maxBackoff)
            expect(rateLimiter.sleep).toHaveBeenCalled();
        });
    });

    describe('resetFailures', () => {
        it('should reset failure count to zero', () => {
            rateLimiter.failureCount = 5;
            rateLimiter.resetFailures();
            expect(rateLimiter.failureCount).toBe(0);
        });
    });

    describe('randomDelay', () => {
        it('should return value between min and max', () => {
            for (let i = 0; i < 100; i++) {
                const delay = rateLimiter.randomDelay();
                expect(delay).toBeGreaterThanOrEqual(100);
                expect(delay).toBeLessThanOrEqual(200);
            }
        });
    });

    describe('humanDelay', () => {
        it('should call sleep', async () => {
            await rateLimiter.humanDelay(10, 20);
            expect(rateLimiter.sleep).toHaveBeenCalled();
        });
    });
});

describe('humanType', () => {
    let mockPage;
    let humanType;
    
    beforeEach(() => {
        mockPage = createMockPage();
        // Re-require to get fresh module
        jest.resetModules();
        humanType = require('../src/utils/rate-limiter').humanType;
    });

    it('should focus on selector before typing', async () => {
        await humanType(mockPage, '#input', 'test');
        
        expect(mockPage.focus).toHaveBeenCalledWith('#input');
    });

    it('should type each character', async () => {
        await humanType(mockPage, '#input', 'ab');
        
        expect(mockPage.keyboard.type).toHaveBeenCalledTimes(2);
    });

    it('should use provided delay options', async () => {
        await humanType(mockPage, '#input', 'x', { delay: 50, variance: 10 });
        
        expect(mockPage.keyboard.type).toHaveBeenCalled();
    });
});

describe('isBotDetectionResponse', () => {
    it('should detect 403 forbidden', () => {
        const response = { status: () => 403, url: () => 'https://example.com' };
        const result = isBotDetectionResponse(response);
        
        expect(result).toEqual({ detected: true, reason: '403-forbidden' });
    });

    it('should detect 429 rate limited', () => {
        const response = { status: () => 429, url: () => 'https://example.com' };
        const result = isBotDetectionResponse(response);
        
        expect(result).toEqual({ detected: true, reason: 'rate-limited' });
    });

    it('should detect captcha page redirect', () => {
        const response = { status: () => 200, url: () => 'https://example.com/captcha' };
        const result = isBotDetectionResponse(response);
        
        expect(result).toEqual({ detected: true, reason: 'challenge-page' });
    });

    it('should detect challenge page redirect', () => {
        const response = { status: () => 200, url: () => 'https://example.com/challenge' };
        const result = isBotDetectionResponse(response);
        
        expect(result).toEqual({ detected: true, reason: 'challenge-page' });
    });

    it('should detect bot page redirect', () => {
        const response = { status: () => 200, url: () => 'https://example.com/bot-detection' };
        const result = isBotDetectionResponse(response);
        
        expect(result).toEqual({ detected: true, reason: 'challenge-page' });
    });

    it('should return false for normal responses', () => {
        const response = { status: () => 200, url: () => 'https://kleinanzeigen.de/m-nachrichten.html' };
        const result = isBotDetectionResponse(response);
        
        expect(result).toEqual({ detected: false });
    });

    it('should handle null response', () => {
        const result = isBotDetectionResponse(null);
        expect(result).toBe(false);
    });

    it('should handle undefined response', () => {
        const result = isBotDetectionResponse(undefined);
        expect(result).toBe(false);
    });
});
