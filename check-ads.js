const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('https://redbeard-manhwa.vercel.app', { waitUntil: 'networkidle2' });
  
  // Check if ad container exists
  const adContainer = await page.$('div[data-provider="adsterra"]');
  if (adContainer) {
    console.log('Ad container found.');
    // Check its children
    const html = await page.evaluate(el => el.innerHTML, adContainer);
    console.log('Ad container HTML:', html);
  } else {
    console.log('Ad container not found.');
  }

  await browser.close();
})();
