/**
 * Language Detection Unit Tests
 * 
 * Spec: Detect German vs English text for proper response handling
 */

const { detectLanguage } = require('../src/utils/language');

describe('detectLanguage', () => {
    describe('German text detection', () => {
        it('should detect German for common German phrases', () => {
            expect(detectLanguage('Das ist ein Test')).toBe('de');
            expect(detectLanguage('Wie viel kostet das?')).toBe('de');
            expect(detectLanguage('Ich möchte das kaufen')).toBe('de');
            expect(detectLanguage('Bitte und danke')).toBe('de');
        });

        it('should detect German for price inquiries', () => {
            expect(detectLanguage('Was ist der Preis?')).toBe('de');
            expect(detectLanguage('Ist das noch zu haben?')).toBe('de');
        });

        it('should detect German for greetings', () => {
            expect(detectLanguage('Guten Tag, wie geht es?')).toBe('de');
            expect(detectLanguage('Hallo, ich habe Interesse')).toBe('de');
        });
    });

    describe('English text detection', () => {
        it('should detect English for common English phrases', () => {
            expect(detectLanguage('This is a test')).toBe('en');
            expect(detectLanguage('How much does it cost?')).toBe('en');
            expect(detectLanguage('I would like to buy this')).toBe('en');
        });

        it('should detect English for price inquiries', () => {
            expect(detectLanguage('What is the price?')).toBe('en');
            expect(detectLanguage('Is this still available?')).toBe('en');
        });

        it('should detect English for greetings', () => {
            expect(detectLanguage('Hello, how are you?')).toBe('en');
            expect(detectLanguage('Hi, I am interested')).toBe('en');
        });
    });

    describe('Edge cases', () => {
        it('should return German (default) for empty string', () => {
            expect(detectLanguage('')).toBe('de');
        });

        it('should return German (default) for null', () => {
            expect(detectLanguage(null)).toBe('de');
        });

        it('should return German (default) for undefined', () => {
            expect(detectLanguage(undefined)).toBe('de');
        });

        it('should return German (default) for mixed/ambiguous text', () => {
            // Equal or no recognized words
            expect(detectLanguage('...')).toBe('de');
            expect(detectLanguage('12345')).toBe('de');
        });

        it('should handle mixed language text', () => {
            // More German words
            expect(detectLanguage('Das ist the test und ich bin here')).toBe('de');
            // More English words
            expect(detectLanguage('This is der Test and I bin here')).toBe('en');
        });

        it('should be case insensitive', () => {
            expect(detectLanguage('DAS IST EIN TEST')).toBe('de');
            expect(detectLanguage('THIS IS A TEST')).toBe('en');
        });

        it('should detect words at string boundaries', () => {
            expect(detectLanguage('der')).toBe('de');
            expect(detectLanguage('the')).toBe('en');
            expect(detectLanguage('Hallo Welt')).toBe('de');
            expect(detectLanguage('Hello World')).toBe('en');
        });
    });

    describe('Real-world examples', () => {
        it('should detect German buyer messages', () => {
            const messages = [
                'Hallo, ist das noch verfügbar?',
                'Ich hätte Interesse. Was ist der letzte Preis?',
                'Wann kann ich das abholen?',
                'Hallo, ich würde gerne vorbeikommen.'
            ];
            
            messages.forEach(msg => {
                expect(detectLanguage(msg)).toBe('de');
            });
        });

        it('should detect English buyer messages', () => {
            const messages = [
                'Hello, is this still available?',
                'I am interested. What is your last price?',
                'When can I pick it up?',
                'Hi, I would like to come by.'
            ];
            
            messages.forEach(msg => {
                expect(detectLanguage(msg)).toBe('en');
            });
        });
    });
});
