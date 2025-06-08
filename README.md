# Playwright Job Scraper Server

A Node.js server with TypeScript that uses Playwright to scrape job sites and potentially apply for jobs automatically.

## Project Structure

The project follows the MVC (Model-View-Controller) pattern:

```
src/
├── index.ts                    # Main server entry point
├── constants/                  # Configuration and constants
│   ├── index.ts               # Export barrel
│   └── urls.ts                # Job site URLs and browser config
├── controllers/               # Request handlers
│   └── JobScraperController.ts # Handles job scraping requests
├── routes/                    # Route definitions
│   └── index.ts               # Main routes file
├── scrapers/                  # Site-specific scrapers
│   └── SwissDevJobsScraper.ts  # Swiss Dev Jobs scraper
├── services/                  # Business logic
│   └── BaseScraper.ts         # Base scraper class
└── types/                     # TypeScript type definitions
    ├── index.ts               # Export barrel
    └── job.ts                 # Job-related types
```

## Features

- **Modular Architecture**: Easy to add new job site scrapers
- **TypeScript**: Full type safety
- **MVC Pattern**: Clean separation of concerns
- **Base Scraper Class**: Reusable browser automation logic
- **Constants Organization**: Centralized configuration

## Available Endpoints

- `GET /health` - Health check endpoint
- `GET /scrape/swissdevjobs` - Scrape Swiss Dev Jobs (placeholder for full implementation)

## Development

```bash
# Install dependencies
yarn install

# Install Playwright browsers
npx playwright install

# Start development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start
```

## Adding New Scrapers

1. **Add site constants** to `src/constants/urls.ts`
2. **Create scraper class** in `src/scrapers/` extending `BaseScraper`
3. **Add controller method** in `src/controllers/JobScraperController.ts`
4. **Add route** in `src/routes/index.ts`

## Next Steps

- Implement actual job extraction logic in scrapers
- Add job application automation
- Add database integration for storing job data
- Add filtering and matching logic
- Add scheduling for periodic scraping
