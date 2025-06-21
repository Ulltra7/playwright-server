import { chromium } from 'playwright';

async function inspectSwissDevJobsHTML() {
  console.log("🔍 Inspecting SwissDevJobs HTML structure...\n");
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://swissdevjobs.ch/');
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Get detailed HTML structure of first few cards
    const cardDetails = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card')).slice(0, 3);
      return cards.map((card, index) => {
        // Find company link
        const companyLink = card.querySelector('a[href*="/companies/"]');
        const companyName = companyLink?.textContent?.trim() || "No company link found";
        const companyHref = companyLink?.getAttribute('href') || "";
        
        // Find location div with aria-label
        const locationDiv = card.querySelector('div[aria-label*="address"]');
        const locationText = locationDiv?.textContent?.trim() || "No location div found";
        
        // Get all links to understand structure
        const allLinks = Array.from(card.querySelectorAll('a')).map(a => ({
          text: a.textContent?.trim(),
          href: a.getAttribute('href'),
          hasCompaniesInHref: a.getAttribute('href')?.includes('/companies/') || false
        }));
        
        // Get divs with aria-label
        const ariaLabelDivs = Array.from(card.querySelectorAll('div[aria-label]')).map(div => ({
          ariaLabel: div.getAttribute('aria-label'),
          text: div.textContent?.trim()
        }));
        
        return {
          cardIndex: index + 1,
          companyFromLink: companyName,
          companyHref: companyHref,
          locationFromAriaLabel: locationText,
          allLinks: allLinks,
          ariaLabelDivs: ariaLabelDivs,
          // Also get the problematic third link for comparison
          thirdLinkText: allLinks[2]?.text || ""
        };
      });
    });
    
    // Print findings
    cardDetails.forEach(card => {
      console.log(`\n📋 Card ${card.cardIndex}:`);
      console.log(`Company (from /companies/ link): "${card.companyFromLink}"`);
      console.log(`Company href: ${card.companyHref}`);
      console.log(`Location (from aria-label div): "${card.locationFromAriaLabel}"`);
      console.log(`Third link text (what we were parsing): "${card.thirdLinkText}"`);
      
      console.log("\nAll links in card:");
      card.allLinks.forEach((link, i) => {
        console.log(`  ${i + 1}. ${link.hasCompaniesInHref ? '[COMPANY LINK]' : ''} "${link.text}" -> ${link.href}`);
      });
      
      console.log("\nDivs with aria-label:");
      card.ariaLabelDivs.forEach(div => {
        console.log(`  aria-label="${div.ariaLabel}" -> "${div.text}"`);
      });
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await browser.close();
  }
}

inspectSwissDevJobsHTML();