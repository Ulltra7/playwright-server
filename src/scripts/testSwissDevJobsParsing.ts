import { chromium } from 'playwright';

async function testParsing() {
  console.log("🧪 Testing SwissDevJobs parsing...\n");
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://swissdevjobs.ch/');
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Get first 5 job cards
    const jobs = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card')).slice(0, 5);
      return cards.map((card, index) => {
        const links = Array.from(card.querySelectorAll('a'));
        const titleLink = links[1]; // Second link is usually the title
        const companyLocationLink = links[2]; // Third link contains company+location
        
        const title = titleLink?.textContent?.trim() || "";
        const companyLocationText = companyLocationLink?.textContent?.trim() || "";
        
        // Parse company and location
        let company = "";
        let location = "";
        
        // Look for where a capital letter starts after a company name (no space between)
        // Examples: "SwissquoteChemin de la Crétaux 33" -> "Swissquote" + "Chemin de la Crétaux 33"
        
        // First try to find company endings followed immediately by a capital letter
        const companyEndPattern = /^(.+?)([A-Z][a-zÀ-ÿ].*)$/;
        const endMatch = companyLocationText.match(companyEndPattern);
        
        if (endMatch && endMatch[2].match(/^(Chemin|Route|Avenue|Rue|Via|Strada|Strasse|Gasse|Weg|Platz|Ring|Allee|[A-Z][a-zÀ-ÿ]*(strasse|gasse|weg|platz|ring|allee))/i)) {
          // Found a street name starting with capital letter
          company = endMatch[1].trim();
          location = endMatch[2].trim();
        } else {
          // Try patterns for company suffixes
          const pattern1 = /^(.+?(?:AG|GmbH|SA|Ltd|Inc|Corp|LLC|AB|Oy|Sàrl|S\.A\.|S\.à\.r\.l\.))([A-Z].*)$/;
          const match1 = companyLocationText.match(pattern1);
          
          if (match1) {
            company = match1[1].trim();
            location = match1[2].trim();
          } else {
            // Look for known street patterns
            const streetPattern = /(strasse|gasse|weg|platz|ring|allee)\s*\d+/i;
            const streetMatch = companyLocationText.match(streetPattern);
            
            if (streetMatch) {
              // Find where the street name starts
              const streetStartIndex = companyLocationText.search(/[A-Z][a-zÀ-ÿ]*(strasse|gasse|weg|platz|ring|allee)/);
              if (streetStartIndex > 0) {
                company = companyLocationText.substring(0, streetStartIndex).trim();
                location = companyLocationText.substring(streetStartIndex).trim();
              }
            } else if (companyLocationText.includes(',')) {
              // Split by comma
              const parts = companyLocationText.split(',');
              company = parts[0].trim();
              location = parts.slice(1).join(',').trim();
            } else {
              // Last resort: Use the whole text as company
              company = companyLocationText;
            }
          }
        }
        
        // Clean up location - often it's "Street Number, City"
        if (location && location.includes(',')) {
          // Extract just the city (last part after comma)
          const locationParts = location.split(',');
          const city = locationParts[locationParts.length - 1].trim();
          if (city && city.length > 2 && city.length < 50) {
            location = city;
          }
        }
        
        return {
          index: index + 1,
          title,
          company: company || "Unknown",
          location: location || "Not specified",
          raw: companyLocationText
        };
      });
    });
    
    // Print results
    console.log("📋 Parsed Jobs:");
    for (const job of jobs) {
      console.log(`\n${job.index}. ${job.title}`);
      console.log(`   Company: ${job.company}`);
      console.log(`   Location: ${job.location}`);
      console.log(`   Raw: "${job.raw}"`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await browser.close();
  }
}

testParsing();