async function extractFirstResult(page) {
    return await page.evaluate(() => {
        const ad = document.querySelector('[class*="aditem"], article');
        if (!ad) return null;
        
        const linkEl = ad.querySelector('a') || ad.closest('a');
        const link = linkEl ? linkEl.href : null;
        const titleEl = ad.querySelector('[class*="title"], h2');
        const title = titleEl ? titleEl.textContent?.trim() : 'Unknown';
        const priceEl = ad.querySelector('[class*="price"]');
        const price = priceEl ? priceEl.textContent?.trim() : '';
        
        return { link, title, price };
    });
}

async function extractAdDetails(page) {
    return await page.evaluate(() => {
        const title = document.querySelector('h1')?.textContent?.trim() || '';
        const desc = document.querySelector('[id*="description"]')?.textContent?.trim() || '';
        const sellerName = document.querySelector('[class*="username"]')?.textContent?.trim() || 'Seller';
        const priceEl = document.querySelector('[class*="price"]');
        const price = priceEl ? priceEl.textContent?.trim() : '';
        
        return { title, description: desc, sellerName, price };
    });
}

module.exports = { extractFirstResult, extractAdDetails };
