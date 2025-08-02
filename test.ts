import { runSitemapBasedScraper, runDirectScraper } from './src/scraper/main';

// Test sitemap discovery with aboutjs.dev
const testSites = ['https://www.aboutjs.dev'];

// Test direct scraping with specific URLs
const testUrls = [
  'https://www.aboutjs.dev/en/posts/building-reusable-ui-components-in-react',
  'https://www.aboutjs.dev/en/posts/not-just-testing-react-ui-components-with-vitest-and-storybook',
];

const config = {
  headless: true,
  timeout: 15000,
  delayBetweenRequests: 500,
};

async function runTests() {
  console.log('🧪 Testing HTTP-only blog scraper...\n');

  try {
    // Test 1: Sitemap-based discovery and scraping
    console.log('=== Test 1: Sitemap Discovery ===');
    const sitemapResults = await runSitemapBasedScraper(testSites, config);
    console.log('\n✅ Sitemap-based scraping test completed!');
    console.log(`Found ${sitemapResults.filter(r => r.success).flatMap(r => r.posts).length} posts from ${sitemapResults.filter(r => r.success).length} successful URLs`);

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Direct URL scraping
    console.log('=== Test 2: Direct URL Scraping ===');
    const directResults = await runDirectScraper(testUrls, config);
    console.log('\n✅ Direct scraping test completed!');
    console.log(`Found ${directResults.filter(r => r.success).flatMap(r => r.posts).length} posts from ${directResults.filter(r => r.success).length} successful URLs`);

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  runTests();
}
