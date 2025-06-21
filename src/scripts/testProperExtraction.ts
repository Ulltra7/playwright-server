import { chromium } from 'playwright';

async function testProperExtraction() {
  console.log("🧪 Testing proper company/location extraction from SwissDevJobs...\n");
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://swissdevjobs.ch/');
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Get first 10 job cards
    const jobs = await page.$$eval('.card', (cards) => {
      return cards.slice(0, 10).map((card, index) => {
        // Get job title
        const titleLink = card.querySelector('a[href*="/job"]');
        const title = titleLink?.textContent?.trim() || "";
        
        // Get company from /companies/ link
        let company = "";
        const companyLink = card.querySelector('a[href*="/companies/"]');
        if (companyLink) {
          const href = companyLink.getAttribute('href');
          if (href) {
            const slug = href.split('/companies/')[1];
            if (slug) {
              company = slug
                .replace(/-/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase())
                .replace(/\s+Ag\b/gi, ' AG')
                .replace(/\s+Gmbh\b/gi, ' GmbH')
                .replace(/\s+Sa\b/gi, ' SA')
                .trim();
            }
          }
        }
        
        // Get location from aria-label div
        let location = "";
        const locationDiv = card.querySelector('div[aria-label*="address"]');
        if (locationDiv) {
          const fullAddress = locationDiv.textContent?.trim() || "";
          if (fullAddress.includes(',')) {
            location = fullAddress.split(',').pop()?.trim() || fullAddress;
          } else {
            location = fullAddress;
          }
        }
        
        // Also get the problematic third link for comparison
        const links = Array.from(card.querySelectorAll('a'));
        const thirdLinkText = links[2]?.textContent?.trim() || "";
        
        return {
          index: index + 1,
          title,
          company: company || "Not found",
          location: location || "Not found",
          companyFromHref: !!companyLink,
          locationFromAriaLabel: !!locationDiv,
          thirdLinkText
        };
      });
    });
    
    // Print results
    console.log("📋 Extracted Jobs:");
    for (const job of jobs) {
      console.log(`\n${job.index}. ${job.title}`);
      console.log(`   Company: "${job.company}" (from href: ${job.companyFromHref})`);
      console.log(`   Location: "${job.location}" (from aria-label: ${job.locationFromAriaLabel})`);
      console.log(`   Third link text: "${job.thirdLinkText}"`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await browser.close();
  }
}

testProperExtraction();