import { scrapeMultipleUrlsWithHttp } from './http-scraper';
import {
  discoverPostUrlsFromSitemap,
  discoverPostUrlsFromMultipleSites,
} from './sitemap-discovery';
import { saveResultsToJson, saveFullResultsToJson } from './file-utils';
import { ScrapingConfig, ScrapingResult } from './types';

const DEFAULT_BASE_URLS = ['https://www.aboutjs.dev'];

export async function runSitemapBasedScraper(
  baseUrls: string[],
  config: Partial<ScrapingConfig> = {},
): Promise<void> {
  console.log(
    `🗺️  Starting sitemap-based scraping for ${baseUrls.length} sites...`,
  );

  const discoveryResults = await discoverPostUrlsFromMultipleSites(
    baseUrls,
    config,
  );

  const allPostUrls: string[] = [];
  let totalSitesProcessed = 0;
  let totalSitesSuccessful = 0;

  for (const result of discoveryResults) {
    totalSitesProcessed++;
    if (result.success) {
      totalSitesSuccessful++;
      allPostUrls.push(...result.postUrls);
      console.log(
        `✅ ${result.baseUrl}: Found ${result.postUrls.length} post URLs`,
      );
    } else {
      console.log(`❌ ${result.baseUrl}: ${result.error}`);
    }
  }

  console.log(`\n📊 Discovery Summary:`);
  console.log(`   Sites processed: ${totalSitesProcessed}`);
  console.log(`   Sites successful: ${totalSitesSuccessful}`);
  console.log(`   Total post URLs discovered: ${allPostUrls.length}`);

  if (allPostUrls.length === 0) {
    console.log('❌ No post URLs discovered. Exiting.');
    return;
  }

  console.log(
    `\n🚀 Starting to scrape ${allPostUrls.length} discovered post URLs...`,
  );
  await runDirectScraper(allPostUrls, config);
}

export async function runDirectScraper(
  urls: string[],
  config: Partial<ScrapingConfig> = {},
): Promise<void> {
  console.log(`📄 Starting direct scraping of ${urls.length} URLs...`);

  try {
    const results = await scrapeMultipleUrlsWithHttp(urls, config);

    printResults(results);
    saveResultsToJson(results);
    saveFullResultsToJson(results);
  } catch (error) {
    console.error('Scraping failed:', error);
  }
}

function printResults(results: ScrapingResult[]): void {
  const allPosts = results
    .filter((result) => result.success)
    .flatMap((result) => result.posts);
  const successfulScrapes = results.filter((r) => r.success).length;
  const failedScrapes = results.filter((r) => !r.success).length;

  console.log(`\n=== SCRAPING RESULTS ===`);
  console.log(`URLs processed: ${results.length}`);
  console.log(`Successful: ${successfulScrapes}`);
  console.log(`Failed: ${failedScrapes}`);
  console.log(`Total posts found: ${allPosts.length}`);

  if (failedScrapes > 0) {
    console.log(`\n--- Failed URLs ---`);
    results
      .filter((r) => !r.success)
      .forEach((result) => {
        console.log(`${result.url}: ${result.error}`);
      });
  }

  allPosts.forEach((post, index) => {
    console.log(`\n--- Post ${index + 1} ---`);
    console.log(`Title: ${post.title}`);
    console.log(
      `Content: ${post.content.substring(0, 200)}${post.content.length > 200 ? '...' : ''}`,
    );
    console.log(`Source: ${post.source}`);
    console.log(`Date: ${post.date}`);
    if (post.link !== post.source) {
      console.log(`Link: ${post.link}`);
    }
  });
}

if (require.main === module) {
  const customUrls = process.argv.slice(2);

  if (customUrls.length > 0) {
    const areBaseUrls = customUrls.every((url) => {
      try {
        const urlObj = new URL(url);

        return urlObj.pathname === '/' || urlObj.pathname === '';
      } catch {
        return false;
      }
    });

    if (areBaseUrls) {
      console.log('🔍 Detected base URLs - using sitemap discovery mode');
      runSitemapBasedScraper(customUrls).catch(console.error);
    } else {
      console.log('📄 Detected specific URLs - using direct scraping mode');
      runDirectScraper(customUrls).catch(console.error);
    }
  } else {
    console.log('🌐 No URLs provided - using default sitemap discovery mode');
    runSitemapBasedScraper(DEFAULT_BASE_URLS).catch(console.error);
  }
}
