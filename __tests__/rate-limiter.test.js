/**
 * Rate Limiter Spec Tests
 * 
 * Specs:
 * 1. Backoff allows retry until max exceeded
 * 2. Bot detection identifies 403/429/challenge responses
 */

const { RateLimiter, isBotDetectionResponse } = require('../src/utils/rate-limiter');

describe('RateLimiter', () => {
    let rateLimiter;
    
    beforeEach(() => {
        rateLimiter = new RateLimiter({
            baseBackoff: 1000,
            maxBackoff: 10000
        });
        rateLimiter.sleep = jest.fn().mockResolvedValue(undefined);
    });

    describe('Backoff', () => {
        it('should allow retry when backoff is under max', async () => {
            const result = await rateLimiter.backoff();
            expect(result).toBe(true);
        });

        it('should stop retry when backoff exceeds max', async () => {
            rateLimiter.failureCount = 4; // 1000 * 2^4 = 16000 > 10000
            const result = await rateLimiter.backoff();
            expect(result).toBe(false);
        });
    });
});

describe('Bot Detection', () => {
    it('should detect 403 forbidden as bot block', () => {
        const response = { status: () => 403, url: () => 'https://example.com' };
        expect(isBotDetectionResponse(response)).toEqual({ detected: true, reason: '403-forbidden' });
    });

    it('should detect 429 rate limit as bot block', () => {
        const response = { status: () => 429, url: () => 'https://example.com' };
        expect(isBotDetectionResponse(response)).toEqual({ detected: true, reason: 'rate-limited' });
    });

    it('should detect challenge/captcha/bot pages', () => {
        const paths = ['/captcha', '/challenge', '/bot-detection'];
        paths.forEach(path => {
            const response = { status: () => 200, url: () => `https://example.com${path}` };
            expect(isBotDetectionResponse(response)).toEqual({ detected: true, reason: 'challenge-page' });
        });
    });

    it('should not detect normal responses', () => {
        const response = { status: () => 200, url: () => 'https://kleinanzeigen.de/m-nachrichten.html' };
        expect(isBotDetectionResponse(response)).toEqual({ detected: false });
    });

    it('should handle null/undefined responses', () => {
        expect(isBotDetectionResponse(null)).toBe(false);
        expect(isBotDetectionResponse(undefined)).toBe(false);
    });
});
