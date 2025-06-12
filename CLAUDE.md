# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
yarn install

# Install Playwright browsers (required for scraping)
npx playwright install

# Start development server with hot reload
yarn dev

# Build TypeScript to JavaScript
yarn build

# Start production server
yarn start
```

## Architecture Overview

This is a job scraping and application automation server built with TypeScript, Express, and Playwright. The project follows MVC architecture with a modular scraper system.

### Core Components

**BaseScraper** (`src/services/BaseScraper.ts`): Abstract base class providing browser automation utilities, debugging methods, and page analysis tools. All scrapers extend this class.

**JobScraperController** (`src/controllers/JobScraperController.ts`): Main controller handling scraping endpoints, database operations, and job application automation.

**SupabaseService** (`src/services/SupabaseService.ts`): Database layer for job storage, retrieval, and application status tracking.

**JobApplicationService** (`src/services/JobApplicationService.ts`): Handles automated job applications using CV data and form filling.

### Database Schema

The application uses Supabase with normalized tables:
- `job_applications`: Main job data with application tracking
- `job_sources`: Configurable job sites 
- `technologies`: Tech stack tags
- `job_application_technologies`: Many-to-many job-tech relationships

Schema is defined in `database/schema.sql` and should be run in Supabase SQL Editor.

### Adding New Job Scrapers

1. Add site configuration to `src/constants/urls.ts`
2. Create scraper class in `src/scrapers/` extending `BaseScraper`
3. Implement abstract `scrape()` method
4. Add controller method in `JobScraperController`
5. Register route in `src/routes/index.ts`

### Browser Configuration

Browser settings in `src/constants/urls.ts`:
- Currently runs in non-headless mode (`HEADLESS: false`) for debugging
- Set to `true` for production deployment
- Includes debugging tools like screenshots and page analysis

### Environment Setup

Requires `.env` file with Supabase credentials:
- `SUPABASE_URL`
- `SUPABASE_KEY`

CV file should be placed in `data/CV.pdf` for job applications.