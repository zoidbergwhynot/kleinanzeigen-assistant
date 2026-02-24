/**
 * Search URL Builder Unit Tests
 * 
 * Spec: Build search URLs with proper query parameters and price filters
 */

const { buildSearchUrl } = require('../src/index');

describe('buildSearchUrl', () => {
    const baseUrl = 'https://www.kleinanzeigen.de';

    describe('Basic search', () => {
        it('should build URL with search term only', () => {
            const url = buildSearchUrl('MacBook');
            expect(url).toBe(`${baseUrl}/s-suchanfrage.html?keywords=MacBook`);
        });

        it('should encode special characters in search term', () => {
            const url = buildSearchUrl('MacBook Pro 13"');
            expect(url).toBe(`${baseUrl}/s-suchanfrage.html?keywords=MacBook%20Pro%2013%22`);
        });

        it('should encode spaces in search term', () => {
            const url = buildSearchUrl('Herman Miller Aeron');
            expect(url).toContain('keywords=Herman%20Miller%20Aeron');
        });

        it('should encode German umlauts', () => {
            const url = buildSearchUrl('Möbel');
            expect(url).toContain('keywords=M%C3%B6bel');
        });
    });

    describe('Price filtering', () => {
        it('should add minPrice parameter', () => {
            const url = buildSearchUrl('MacBook', 500, undefined);
            expect(url).toContain('minPrice=500');
        });

        it('should add maxPrice parameter', () => {
            const url = buildSearchUrl('MacBook', undefined, 1000);
            expect(url).toContain('maxPrice=1000');
        });

        it('should add both min and max price', () => {
            const url = buildSearchUrl('MacBook', 500, 1000);
            expect(url).toContain('minPrice=500');
            expect(url).toContain('maxPrice=1000');
        });

        it('should not add price params when null', () => {
            const url = buildSearchUrl('MacBook', null, null);
            expect(url).not.toContain('minPrice');
            expect(url).not.toContain('maxPrice');
        });

        it('should not add price params when undefined', () => {
            const url = buildSearchUrl('MacBook', undefined, undefined);
            expect(url).not.toContain('minPrice');
            expect(url).not.toContain('maxPrice');
        });

        it('should handle zero as valid minPrice', () => {
            const url = buildSearchUrl('Free', 0, 100);
            expect(url).toContain('minPrice=0');
        });
    });

    describe('URL structure', () => {
        it('should start with correct base URL', () => {
            const url = buildSearchUrl('test');
            expect(url).toMatch(/^https:\/\/www\.kleinanzeigen\.de\/s-suchanfrage\.html/);
        });

        it('should have keywords as first parameter', () => {
            const url = buildSearchUrl('test');
            expect(url).toMatch(/\?keywords=/);
        });

        it('should use & for additional parameters', () => {
            const url = buildSearchUrl('test', 100, 500);
            expect(url).toMatch(/\?keywords=test&minPrice=100&maxPrice=500/);
        });
    });

    describe('Real-world search scenarios', () => {
        it('should build URL for MacBook search with price range', () => {
            const url = buildSearchUrl('MacBook M1', 500, 800);
            expect(url).toContain('keywords=MacBook%20M1');
            expect(url).toContain('minPrice=500');
            expect(url).toContain('maxPrice=800');
        });

        it('should build URL for chair search with max price only', () => {
            const url = buildSearchUrl('Herman Miller Aeron', undefined, 600);
            expect(url).toContain('keywords=Herman%20Miller%20Aeron');
            expect(url).toContain('maxPrice=600');
            expect(url).not.toContain('minPrice');
        });

        it('should build URL for camera search with min price only', () => {
            const url = buildSearchUrl('Sony A7 III', 1000, undefined);
            expect(url).toContain('keywords=Sony%20A7%20III');
            expect(url).toContain('minPrice=1000');
            expect(url).not.toContain('maxPrice');
        });
    });
});

// Helper for contains check
expect.extend({
    toContain(received, expected) {
        const pass = received.includes(expected);
        return {
            pass,
            message: () => pass
                ? `expected ${received} not to contain ${expected}`
                : `expected ${received} to contain ${expected}`
        };
    }
});
