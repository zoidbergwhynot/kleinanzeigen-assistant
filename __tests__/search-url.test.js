/**
 * Search URL Builder Spec Tests
 * 
 * Specs:
 * 1. Builds correct Kleinanzeigen search URLs
 * 2. Encodes special characters
 * 3. Adds optional price filters
 */

const { buildSearchUrl } = require('../src/index');

describe('Search URL Builder', () => {
    const BASE = 'https://www.kleinanzeigen.de/s-suchanfrage.html';

    it('should build URL with encoded search term', () => {
        expect(buildSearchUrl('MacBook Pro')).toBe(`${BASE}?keywords=MacBook%20Pro`);
        expect(buildSearchUrl('Möbel')).toContain('M%C3%B6bel');
    });

    it('should add price filters when provided', () => {
        const url = buildSearchUrl('MacBook', 500, 1000);
        expect(url).toContain('minPrice=500');
        expect(url).toContain('maxPrice=1000');
    });

    it('should omit price filters when not provided', () => {
        const url = buildSearchUrl('MacBook', undefined, undefined);
        expect(url).not.toContain('minPrice');
        expect(url).not.toContain('maxPrice');
    });

    it('should handle partial price filters', () => {
        expect(buildSearchUrl('test', 100, undefined)).toContain('minPrice=100');
        expect(buildSearchUrl('test', undefined, 500)).toContain('maxPrice=500');
    });
});
