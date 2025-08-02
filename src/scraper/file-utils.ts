import { writeFileSync } from 'fs';
import { BlogPost, ScrapingResult } from './types';

export function saveResultsToJson(
  results: ScrapingResult[],
  filename: string = 'src/scraper/scraped_posts.json',
): void {
  try {
    const allPosts = results
      .filter((result) => result.success)
      .flatMap((result) => result.posts);

    writeFileSync(filename, JSON.stringify(allPosts, null, 2));
    console.log(`\nResults saved to ${filename}`);
  } catch (error) {
    console.error('Error saving results:', error);
  }
}

export function saveFullResultsToJson(
  results: ScrapingResult[],
  filename: string = 'src/scraper/full_scraping_results.json',
): void {
  try {
    writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\nFull results (including errors) saved to ${filename}`);
  } catch (error) {
    console.error('Error saving full results:', error);
  }
}
