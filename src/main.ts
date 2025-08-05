import { summarizeDocuments } from './summarizer/main';
import { runDirectScraper, runSitemapBasedScraper } from './scraper/main';

async function main() {
  const scappingResults = await runSitemapBasedScraper([
    'https://www.aboutjs.dev',
  ]);

  const filteredScrappedResults = scappingResults.filter((result) => {
    if (result.error) {
      console.error(`❌ ${result.url}: ${result.error}`);
    }
    return result.success;
  });

  const summarized = summarizeDocuments(
    filteredScrappedResults.flatMap((result) => result.posts),
  );
}

void main();
