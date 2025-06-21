// Test the parsing logic with various company/location formats

const testCases = [
  "SwissquoteChemin de la Crétaux 33, Gland",
  "BEGASOFT AGLaupenstrasse 17, Bern",
  "SCIGILITYEuropaallee 41, Zürich",
  "Zürcher KantonalbankNeue Hard 9, Zürich",
  "ERNI Schweiz AGLöwenstrasse 11, Zürich",
  "HolidayCheckBahnweg 8, Bottighofen",
  "autoSense agBadenerstrasse 141, Zürich",
  "UnisysGurtenbrauerei 92, Bern-Wabern",
  "Consulteer AGBrandschenkestrasse 150, Zürich",
  "Ypsomed AGBrunnmattstrasse 6, Burgdorf",
  "SwitchWerdstrasse 2, Zurich",
  "Expleo Technology SwitzerlandVadianstrasse , St Gallen"
];

function parseCompanyLocation(companyLocationText: string) {
  let company = "";
  let location = "";
  
  // Pattern 1: Company with AG/GmbH/etc followed by address
  const companySuffixPattern = /^(.+?(?:AG|GmbH|SA|Ltd|Inc|Corp|LLC|AB|Oy|Sàrl|S\.A\.|S\.à\.r\.l\.|ag|gmbh))([A-Z][a-zÀ-ÿ].*)$/;
  const suffixMatch = companyLocationText.match(companySuffixPattern);
  
  if (suffixMatch) {
    company = suffixMatch[1].trim();
    location = suffixMatch[2].trim();
  } else {
    // Pattern 2: Look for known street prefixes (when no company suffix)
    const streetPrefixes = [
      'Chemin', 'Route', 'Avenue', 'Rue', 'Via', 'Strada', 
      'Bahnhof', 'Haupt', 'Neue', 'Alte', 'Obere', 'Untere',
      'Badener', 'Löwen', 'Gurten', 'Werd', 'Vadian', 'Brunnen',
      'Laupen', 'Europa', 'Neue Hard', 'Brandschen'
    ];
    
    let foundSplit = false;
    for (const prefix of streetPrefixes) {
      const prefixIndex = companyLocationText.indexOf(prefix);
      if (prefixIndex > 0) {
        // Make sure it's a new word (capital letter after lowercase)
        const charBefore = companyLocationText[prefixIndex - 1];
        if (charBefore && charBefore === charBefore.toLowerCase()) {
          company = companyLocationText.substring(0, prefixIndex).trim();
          location = companyLocationText.substring(prefixIndex).trim();
          foundSplit = true;
          break;
        }
      }
    }
    
    if (!foundSplit) {
      // Pattern 3: Look for street suffixes
      const streetSuffixPattern = /^(.+?)([A-Z][a-zÀ-ÿ]*(strasse|gasse|weg|platz|ring|allee)\s*\d+.*)$/i;
      const streetMatch = companyLocationText.match(streetSuffixPattern);
      
      if (streetMatch) {
        company = streetMatch[1].trim();
        location = streetMatch[2].trim();
      } else if (companyLocationText.includes(',')) {
        // Pattern 4: Split by comma
        const parts = companyLocationText.split(',');
        company = parts[0].trim();
        location = parts.slice(1).join(',').trim();
      } else {
        // Last resort: Try to find where lowercase meets uppercase
        const caseChangePattern = /^(.+[a-z])([A-Z].+)$/;
        const caseMatch = companyLocationText.match(caseChangePattern);
        
        if (caseMatch && caseMatch[2].length > 10) { // Address should be reasonably long
          company = caseMatch[1].trim();
          location = caseMatch[2].trim();
        } else {
          // Really last resort: Use the whole text as company
          company = companyLocationText;
        }
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
  
  return { company, location };
}

console.log("🧪 Testing company/location parsing logic:\n");

testCases.forEach((testCase, index) => {
  const result = parseCompanyLocation(testCase);
  console.log(`${index + 1}. Input: "${testCase}"`);
  console.log(`   Company: "${result.company}"`);
  console.log(`   Location: "${result.location}"\n`);
});