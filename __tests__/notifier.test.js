/**
 * Notifier Unit Tests
 * 
 * Spec: Agent notification via openclaw cron wake command
 */

const { notifyAgent } = require('../src/notifier');
const { execSync } = require('child_process');

// Mock execSync
jest.mock('child_process', () => ({
    execSync: jest.fn()
}));

describe('notifyAgent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock console.log to suppress output during tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Seller mode notifications', () => {
        it('should send notification with seller context', () => {
            const context = {
                mode: 'seller',
                counterpartName: 'Max Mustermann',
                itemTitle: 'MacBook Pro',
                price: '1.200 €',
                lastMessage: 'Hallo, ist das noch verfügbar?',
                language: 'de'
            };

            notifyAgent(context);

            expect(execSync).toHaveBeenCalledTimes(1);
            const call = execSync.mock.calls[0][0];
            expect(call).toContain('/usr/bin/openclaw cron wake');
            expect(call).toContain('--mode now');
            expect(call).toContain('seller');
            expect(call).toContain('Max Mustermann');
        });

        it('should include conversation history', () => {
            const context = {
                mode: 'seller',
                counterpartName: 'Test User',
                conversationHistory: [
                    { isFromMe: false, text: 'First message' },
                    { isFromMe: true, text: 'My reply' }
                ]
            };

            notifyAgent(context);

            const call = execSync.mock.calls[0][0];
            expect(call).toContain('First message');
            expect(call).toContain('My reply');
        });
    });

    describe('Buyer mode notifications', () => {
        it('should send notification with buyer context', () => {
            const context = {
                mode: 'buyer',
                counterpartName: 'Seller Name',
                itemTitle: 'iPhone 15',
                price: '800 €',
                itemUrl: 'https://kleinanzeigen.de/anzeige/123',
                itemDescription: 'Good condition...',
                language: 'de'
            };

            notifyAgent(context);

            expect(execSync).toHaveBeenCalledTimes(1);
            const call = execSync.mock.calls[0][0];
            expect(call).toContain('buyer');
            expect(call).toContain('Seller Name');
            expect(call).toContain('iPhone 15');
        });
    });

    describe('Shell escaping', () => {
        it('should escape double quotes in context', () => {
            const context = {
                mode: 'seller',
                lastMessage: 'He said "hello" to me'
            };

            notifyAgent(context);

            const call = execSync.mock.calls[0][0];
            // JSON.stringify adds extra escaping, so we get multiple backslashes
            expect(call).toContain('hello');
            expect(call).toMatch(/\\{3,}"hello\\{3,}"/);
        });

        it('should escape backticks in context', () => {
            const context = {
                mode: 'seller',
                lastMessage: 'Price is `negotiable`'
            };

            notifyAgent(context);

            const call = execSync.mock.calls[0][0];
            expect(call).toContain('\\`negotiable\\`');
        });

        it('should escape dollar signs in context', () => {
            const context = {
                mode: 'seller',
                lastMessage: 'Cost is $100'
            };

            notifyAgent(context);

            const call = execSync.mock.calls[0][0];
            expect(call).toContain('\\$100');
        });

        it('should escape backslashes in context', () => {
            const context = {
                mode: 'seller',
                lastMessage: 'Path: C:\\Users\\test'
            };

            notifyAgent(context);

            const call = execSync.mock.calls[0][0];
            expect(call).toContain('\\\\Users\\\\');
        });

        it('should escape newlines in context', () => {
            const context = {
                mode: 'seller',
                lastMessage: 'Line 1\nLine 2'
            };

            notifyAgent(context);

            const call = execSync.mock.calls[0][0];
            expect(call).toContain('\\n');
        });
    });

    describe('Error handling', () => {
        it('should return false on execSync failure', () => {
            execSync.mockImplementation(() => {
                throw new Error('Command failed');
            });

            const result = notifyAgent({ mode: 'seller' });

            expect(result).toBe(false);
        });

        it('should return true on success', () => {
            execSync.mockImplementation(() => true);

            const result = notifyAgent({ mode: 'seller' });

            expect(result).toBe(true);
        });

        it('should log error on failure', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            execSync.mockImplementation(() => {
                throw new Error('Command failed');
            });

            notifyAgent({ mode: 'seller' });

            expect(errorSpy).toHaveBeenCalled();
        });
    });
});
