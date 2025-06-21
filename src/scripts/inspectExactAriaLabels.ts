import { chromium } from 'playwright';

async function inspectExactAriaLabels() {
  console.log("🔍 Looking for exact aria-label attributes...\n");
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://swissdevjobs.ch/');
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Get exact aria-label elements
    const cardDetails = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card')).slice(0, 5);
      return cards.map((card, index) => {
        // Look for span with aria-label="hiring organization"
        const companySpan = card.querySelector('span[aria-label="hiring organization"]');
        const companyText = companySpan?.textContent?.trim() || "Not found";
        
        // Look for div with aria-label="hiring organization address"
        const locationDiv = card.querySelector('div[aria-label="hiring organization address"]');
        const locationText = locationDiv?.textContent?.trim() || "Not found";
        
        // Get job title for reference
        const titleLink = card.querySelector('a[href*="/job"]');
        const title = titleLink?.textContent?.trim() || "No title";
        
        return {
          cardIndex: index + 1,
          title: title,
          company: companyText,
          location: locationText,
          hasCompanySpan: !!companySpan,
          hasLocationDiv: !!locationDiv
        };
      });
    });
    
    // Print findings
    console.log("📋 Results using exact aria-labels:");
    cardDetails.forEach(card => {
      console.log(`\n${card.cardIndex}. ${card.title}`);
      console.log(`   Company: "${card.company}" (found span: ${card.hasCompanySpan})`);
      console.log(`   Location: "${card.location}" (found div: ${card.hasLocationDiv})`);
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await browser.close();
  }
}

inspectExactAriaLabels();