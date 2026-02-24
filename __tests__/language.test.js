/**
 * Language Detection Spec Tests
 * 
 * Specs:
 * 1. Detects German vs English by word frequency
 * 2. Returns German as default for invalid input
 */

const { detectLanguage } = require('../src/utils/language');

describe('Language Detection', () => {
    it('should detect German text', () => {
        expect(detectLanguage('Das ist ein Test')).toBe('de');
        expect(detectLanguage('Hallo, ich habe Interesse')).toBe('de');
    });

    it('should detect English text', () => {
        expect(detectLanguage('This is a test')).toBe('en');
        expect(detectLanguage('Hello, I am interested')).toBe('en');
    });

    it('should return German as default for invalid input', () => {
        expect(detectLanguage(null)).toBe('de');
        expect(detectLanguage(undefined)).toBe('de');
        expect(detectLanguage('')).toBe('de');
        expect(detectLanguage('12345')).toBe('de');
    });

    it('should handle mixed language by word count', () => {
        // More German words
        expect(detectLanguage('Das ist the test und ich bin here')).toBe('de');
        // More English words  
        expect(detectLanguage('This is der Test and I bin here')).toBe('en');
    });
});
