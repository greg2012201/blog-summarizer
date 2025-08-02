import { scrapeMultipleUrlsWithHttp } from './http-scraper';
import {
  discoverPostUrlsFromSitemap,
  discoverPostUrlsFromMultipleSites,
} from './sitemap-discovery';

import { ScrapingConfig, ScrapingResult } from './types';

const DEFAULT_BASE_URLS = ['https://www.aboutjs.dev'];

export async function runSitemapBasedScraper(
  baseUrls: string[],
  config: Partial<ScrapingConfig> = {},
): Promise<ScrapingResult[]> {
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
    return [];
  }

  console.log(
    `\n🚀 Starting to scrape ${allPostUrls.length} discovered post URLs...`,
  );
  return await runDirectScraper(allPostUrls, config);
}

export async function runDirectScraper(
  urls: string[],
  config: Partial<ScrapingConfig> = {},
): Promise<ScrapingResult[]> {
  console.log(`📄 Starting direct scraping of ${urls.length} URLs...`);

  try {
    const scrapingResults = await scrapeMultipleUrlsWithHttp(urls, config);

    console.log(
      `\n🎯 Scraping completed! Successfully scraped ${scrapingResults.filter((r) => r.success).length}/${scrapingResults.length} URLs`,
    );

    return scrapingResults;
  } catch (error) {
    console.error('Scraping failed:', error);
    return [];
  }
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
      runSitemapBasedScraper(customUrls)
        .then((results) => {
          console.log(`\n✅ Scraping completed! Found ${results.filter(r => r.success).flatMap(r => r.posts).length} total posts from ${results.filter(r => r.success).length} successful URLs.`);
        })
        .catch(console.error);
    } else {
      console.log('📄 Detected specific URLs - using direct scraping mode');
      runDirectScraper(customUrls)
        .then((results) => {
          console.log(`\n✅ Scraping completed! Found ${results.filter(r => r.success).flatMap(r => r.posts).length} total posts from ${results.filter(r => r.success).length} successful URLs.`);
        })
        .catch(console.error);
    }
  } else {
    console.log('🌐 No URLs provided - using default sitemap discovery mode');
    runSitemapBasedScraper(DEFAULT_BASE_URLS)
      .then((results) => {
        console.log(`\n✅ Scraping completed! Found ${results.filter(r => r.success).flatMap(r => r.posts).length} total posts from ${results.filter(r => r.success).length} successful URLs.`);
      })
      .catch(console.error);
  }
}
