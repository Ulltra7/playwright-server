import { chromium } from 'playwright';

async function debugSwissDevJobs() {
  console.log("🔍 Debugging SwissDevJobs structure...\n");
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://swissdevjobs.ch/');
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Get the HTML of the first few job cards
    const cardStructures = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card')).slice(0, 3);
      return cards.map((card, index) => {
        // Get all text content organized by element
        const structure: any = {
          cardIndex: index + 1,
          innerHTML: card.innerHTML,
          textContent: card.textContent?.trim(),
          links: Array.from(card.querySelectorAll('a')).map(a => ({
            text: a.textContent?.trim(),
            href: a.getAttribute('href'),
            className: a.className
          })),
          divs: Array.from(card.querySelectorAll('div')).map(div => ({
            text: div.textContent?.trim(),
            className: div.className
          })),
          spans: Array.from(card.querySelectorAll('span')).map(span => ({
            text: span.textContent?.trim(),
            className: span.className
          }))
        };
        return structure;
      });
    });
    
    // Print the structure
    for (const card of cardStructures) {
      console.log(`\n📋 Card ${card.cardIndex}:`);
      console.log("Links:");
      card.links.forEach((link: any, i: number) => {
        console.log(`  ${i + 1}. "${link.text}" -> ${link.href} (class: ${link.className})`);
      });
      console.log("\nInnerHTML (first 500 chars):");
      console.log(card.innerHTML.substring(0, 500) + "...");
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await browser.close();
  }
}

debugSwissDevJobs();