const puppeteer = require('puppeteer-core');
(async () => {
    try {
        const browserURL = 'http://127.0.0.1:9222';
        const browser = await puppeteer.connect({ browserURL });
        const targets = await browser.targets();
        let target = targets.find(t => t.type() === 'page' || t.type() === 'webview');
        const page = await target.page();
        
        console.log("Current URL:", await page.url());
        
        // Find CHAPTER 141-150 and click it
        const clicked = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('*'));
            const node = elements.find(el => el.textContent && el.textContent.includes('CHAPTER 141-150') && el.children.length === 0);
            
            if (node) {
                console.log("Found node:", node.tagName, node.className);
                node.click();
                
                // If it's just text inside a div, try to click its parent container too
                let parent = node.parentElement;
                if(parent) { parent.click(); }
                return true;
            }
            return false;
        });
        
        console.log("Clicked?", clicked);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();
