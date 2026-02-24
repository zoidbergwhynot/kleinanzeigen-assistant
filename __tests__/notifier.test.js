/**
 * Notifier Spec Tests
 * 
 * Specs:
 * 1. Sends notification via openclaw cron wake command
 * 2. Escapes special characters for shell safety
 * 3. Returns success/failure status
 */

const { notifyAgent } = require('../src/notifier');
const { execSync } = require('child_process');

jest.mock('child_process', () => ({ execSync: jest.fn() }));

describe('Notifier', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => jest.restoreAllMocks());

    it('should send notification via openclaw cron wake', () => {
        notifyAgent({ mode: 'seller', itemTitle: 'MacBook' });

        const call = execSync.mock.calls[0][0];
        expect(call).toContain('/usr/bin/openclaw cron wake');
        expect(call).toContain('--mode now');
        expect(call).toContain('MacBook');
    });

    it('should escape special characters for shell safety', () => {
        notifyAgent({ 
            mode: 'seller', 
            lastMessage: 'He said "hi" and `$100` cost\nnew line' 
        });

        const call = execSync.mock.calls[0][0];
        expect(call).toMatch(/\\"/);  // escaped quotes
        expect(call).toContain('\\`'); // escaped backticks
        expect(call).toContain('\\$'); // escaped dollar
        expect(call).toContain('\\n'); // escaped newline
    });

    it('should return true on success', () => {
        execSync.mockImplementation(() => true);
        expect(notifyAgent({ mode: 'seller' })).toBe(true);
    });

    it('should return false on failure', () => {
        execSync.mockImplementation(() => { throw new Error('fail'); });
        expect(notifyAgent({ mode: 'seller' })).toBe(false);
    });
});
