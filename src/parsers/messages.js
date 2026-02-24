async function extractConversations(page) {
    return await page.evaluate(() => {
        const selectors = ['.msglist-item', '.message-list-item', '[class*="Item"]'];
        let items = [];
        for (const sel of selectors) {
            items = document.querySelectorAll(sel);
            if (items.length > 0) break;
        }
        
        return Array.from(items).map(item => {
            const isUnread = item.classList.contains('msglist-item-unread') ||
                item.getAttribute('class')?.includes('unread');
            
            const userNameEl = item.querySelector('.msglist-item-username, h3');
            const userName = userNameEl ? userNameEl.textContent?.trim() : 'Unknown';
            
            const linkEl = item.querySelector('a') || item.closest('a');
            const href = linkEl ? linkEl.href : null;
            
            return { isUnread, userName, href };
        }).filter(c => c.isUnread);
    });
}

async function extractConversationContext(page) {
    return await page.evaluate(() => {
        const msgSelectors = ['.message-bubble', '.chat-message', '[class*="message"]'];
        let msgs = [];
        for (const sel of msgSelectors) {
            msgs = document.querySelectorAll(sel);
            if (msgs.length > 0) break;
        }
        
        const history = Array.from(msgs).map((msg, idx) => {
            const isFromMe = msg.classList.contains('from-me') ||
                msg.closest('[class*="sent"]') !== null;
            const textEl = msg.querySelector('[class*="text"], p') || msg;
            return { isFromMe, text: textEl.textContent?.trim() || '', index: idx };
        });

        const titleEl = document.querySelector('.conversation-summary-title, .ad-title, h2');
        const priceEl = document.querySelector('.conversation-summary-price, .ad-price');
        
        return {
            history,
            itemTitle: titleEl ? titleEl.textContent?.trim() : 'Unknown Item',
            price: priceEl ? priceEl.textContent?.trim() : ''
        };
    });
}

module.exports = { extractConversations, extractConversationContext };
