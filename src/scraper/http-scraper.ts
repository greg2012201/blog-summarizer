import { BlogPost, ScrapingResult, ScrapingConfig } from './types';

const DEFAULT_CONFIG: ScrapingConfig = {
  headless: true,
  timeout: 30000,
  delayBetweenRequests: 1000,
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

export async function scrapeUrlWithHttp(
  url: string,
  config: Partial<ScrapingConfig> = {},
): Promise<ScrapingResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  console.log(`Scraping with HTTP: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': finalConfig.userAgent,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(finalConfig.timeout),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const posts = parseHtmlForPosts(html, url);

    console.log(`Found ${posts.length} posts on ${url}`);
    return {
      url,
      posts,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to scrape ${url}:`, errorMessage);
    return {
      url,
      posts: [],
      success: false,
      error: errorMessage,
    };
  }
}

function parseHtmlForPosts(html: string, sourceUrl: string): BlogPost[] {
  const posts: BlogPost[] = [];


  const postSelectors = [

    /<article[^>]*>([\s\S]*?)<\/article>/gi,

    /<div[^>]*class="[^"]*(?:post|article|entry|blog)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,

    /<main[^>]*>([\s\S]*?)<\/main>/gi,
  ];

  for (const selectorRegex of postSelectors) {
    const matches = html.matchAll(selectorRegex);
    let index = 0;

    for (const match of matches) {
      const postHtml = match[1];
      if (!postHtml) continue;

      const post = extractPostData(postHtml, sourceUrl, index);
      if (post.title || post.content) {
        posts.push(post);
        index++;
      }
    }

    if (posts.length > 0) break;
  }

  return posts;
}

function extractPostData(
  postHtml: string,
  sourceUrl: string,
  index: number,
): BlogPost {

  const titleRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/i;
  const titleMatch = postHtml.match(titleRegex);
  const title = titleMatch ? stripHtml(titleMatch[1]).trim() : '';


  const contentRegex = /<p[^>]*>(.*?)<\/p>/gi;
  const contentMatches = postHtml.matchAll(contentRegex);
  let content = '';
  for (const match of contentMatches) {
    content += stripHtml(match[1]) + ' ';
  }
  content = content.trim();


  const dateRegex = /<time[^>]*(?:datetime="([^"]*)")?[^>]*>(.*?)<\/time>/i;
  const dateMatch = postHtml.match(dateRegex);
  const date = dateMatch
    ? (dateMatch[1] || stripHtml(dateMatch[2])).trim()
    : '';


  const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>/i;
  const linkMatch = postHtml.match(linkRegex);
  let link = linkMatch ? linkMatch[1] : sourceUrl;


  if (link.startsWith('/')) {
    const urlObj = new URL(sourceUrl);
    link = `${urlObj.protocol}//${urlObj.host}${link}`;
  }

  return {
    title: title || 'No title',
    content: content || 'No content',
    link,
    date: date || 'No date',
    source: sourceUrl,
    selector: 'http-parser',
    index,
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function scrapeMultipleUrlsWithHttp(
  urls: string[],
  config: Partial<ScrapingConfig> = {},
): Promise<ScrapingResult[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const results: ScrapingResult[] = [];

  for (const url of urls) {
    try {
      const result = await scrapeUrlWithHttp(url, finalConfig);
      results.push(result);


      if (finalConfig.delayBetweenRequests > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, finalConfig.delayBetweenRequests),
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      results.push({
        url,
        posts: [],
        success: false,
        error: errorMessage,
      });
    }
  }

  return results;
}
