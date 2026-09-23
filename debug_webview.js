const puppeteer = require('puppeteer-core');
(async () => {
    try {
        const browserURL = 'http://127.0.0.1:9222';
        console.log('Connecting to', browserURL);
        const browser = await puppeteer.connect({ browserURL });
        const targets = await browser.targets();
        let target = targets.find(t => t.type() === 'page' || t.type() === 'webview');
        if(!target) { console.log("No page found"); process.exit(1); }
        console.log("Attached to target:", target.url());
        const page = await target.page();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
        page.on('requestfailed', request => {
            console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
        });

        console.log('Waiting for events... (Press Ctrl+C to exit)');
        
        // Output initial URL
        const url = await page.evaluate(() => window.location.href);
        console.log('Current URL:', url);
        
        // Wait forever
        await new Promise(() => {});
    } catch(e) {
        console.error("Puppeteer Script Error:", e);
    }
})();
