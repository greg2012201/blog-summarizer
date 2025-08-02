# Blog Summarizer

A TypeScript web scraping application using HTTP requests and HTML parsing to discover and scrape blog posts from websites.

## Features

- **Functional Programming**: Built with pure functions, no classes
- **TypeScript**: Full type safety and modern JavaScript features
- **HTTP-Based Scraping**: Lightweight scraping using fetch and regex parsing
- **Sitemap Discovery**: Automatically discovers post URLs from website sitemaps
- **Flexible Configuration**: Customizable scraping parameters
- **Multiple URL Support**: Scrape multiple websites in sequence
- **Error Handling**: Graceful handling of failed requests
- **JSON Export**: Save results to JSON files
- **No Dependencies**: Works without browser automation or external libraries

## Installation

```bash
npm install
```

## Usage

### Sitemap Discovery Mode (Default)

```bash
npm run dev
```

This will discover and scrape all blog posts from aboutjs.dev using sitemap discovery.

### Custom Base URLs (Sitemap Discovery)

```bash
npm run dev https://example.com/ https://another-blog.com/
```

### Direct URL Scraping

```bash
npm run dev https://example.com/specific-post https://another-blog.com/another-post
```

### Run Tests

```bash
npm test
```

### Build and Run

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── types.ts          # TypeScript interfaces and types
├── browser.ts        # Browser initialization and management
├── scraper.ts        # Core scraping functions
├── fileUtils.ts      # File I/O utilities
├── main.ts           # Main application entry point
└── index.ts          # Public API exports
```

## Configuration

The scraper accepts a configuration object with the following options:

```typescript
interface ScrapingConfig {
  headless: boolean; // Run browser in headless mode
  timeout: number; // Page load timeout in ms
  delayBetweenRequests: number; // Delay between requests in ms
  userAgent: string; // Custom user agent
}
```

## Output

The scraper generates two files:

- `scraped_posts.json` - Clean array of scraped posts
- `full_scraping_results.json` - Complete results including errors

## API

### Main Functions

- `runScraper(urls, config)` - Main scraping function
- `scrapeMultipleUrls(urls, pageFactory, config)` - Scrape multiple URLs
- `initializeBrowser(config)` - Initialize Playwright browser
- `saveResultsToJson(results, filename)` - Save results to JSON

### Types

- `BlogPost` - Individual blog post data
- `ScrapingResult` - Result from scraping a single URL
- `ScrapingConfig` - Configuration options

## Example

```typescript
import { runScraper } from './src/main';

const urls = ['https://news.ycombinator.com', 'https://dev.to'];

const config = {
  headless: false,
  delayBetweenRequests: 2000,
};

runScraper(urls, config);
```
