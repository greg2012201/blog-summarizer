import { ScrapingConfig } from './types';

const DEFAULT_CONFIG: ScrapingConfig = {
  headless: true,
  timeout: 30000,
  delayBetweenRequests: 1000,
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

export interface SitemapDiscoveryResult {
  baseUrl: string;
  sitemapUrl: string;
  postUrls: string[];
  totalUrls: number;
  success: boolean;
  error?: string;
}

export async function discoverPostUrlsFromSitemap(
  baseUrl: string,
  config: Partial<ScrapingConfig> = {},
): Promise<SitemapDiscoveryResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  console.log(`🔍 Discovering post URLs from ${baseUrl}...`);

  try {
    const sitemapUrls = generateSitemapUrls(baseUrl);

    for (const sitemapUrl of sitemapUrls) {
      console.log(`Checking sitemap: ${sitemapUrl}`);

      try {
        const response = await fetch(sitemapUrl, {
          headers: {
            'User-Agent': finalConfig.userAgent,
            Accept: 'application/xml,text/xml,*/*',
          },
          signal: AbortSignal.timeout(finalConfig.timeout),
        });

        if (response.ok) {
          const sitemapContent = await response.text();
          const urls = await parseSitemap(sitemapContent, baseUrl);
          const postUrls = filterPostUrls(urls);

          console.log(`✅ Found sitemap at ${sitemapUrl}`);
          console.log(`📄 Total URLs in sitemap: ${urls.length}`);
          console.log(`📝 Inferred post URLs: ${postUrls.length}`);

          return {
            baseUrl,
            sitemapUrl,
            postUrls,
            totalUrls: urls.length,
            success: true,
          };
        }
      } catch (error) {
        console.log(
          `❌ Failed to fetch ${sitemapUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        continue;
      }
    }

    throw new Error('No accessible sitemap found');
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to discover URLs from ${baseUrl}:`, errorMessage);

    return {
      baseUrl,
      sitemapUrl: '',
      postUrls: [],
      totalUrls: 0,
      success: false,
      error: errorMessage,
    };
  }
}

function generateSitemapUrls(baseUrl: string): string[] {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  return [
    `${cleanBaseUrl}/sitemap.xml`,
    `${cleanBaseUrl}/sitemap_index.xml`,
    `${cleanBaseUrl}/sitemaps.xml`,
    `${cleanBaseUrl}/sitemap/sitemap.xml`,
    `${cleanBaseUrl}/wp-sitemap.xml`,
    `${cleanBaseUrl}/sitemap-index.xml`,
    `${cleanBaseUrl}/robots.txt`,
  ];
}

async function parseSitemap(
  sitemapContent: string,
  baseUrl: string,
): Promise<string[]> {
  const urls: string[] = [];

  if (sitemapContent.includes('Sitemap:')) {
    const sitemapMatches = sitemapContent.match(/Sitemap:\s*(.+)/gi);
    if (sitemapMatches) {
      for (const match of sitemapMatches) {
        const sitemapUrl = match.replace(/Sitemap:\s*/i, '').trim();
        try {
          const response = await fetch(sitemapUrl);
          if (response.ok) {
            const xmlContent = await response.text();
            const sitemapUrls = await parseSitemap(xmlContent, baseUrl);
            urls.push(...sitemapUrls);
          }
        } catch (error) {
          console.log(`Failed to fetch sitemap from robots.txt: ${sitemapUrl}`);
        }
      }
      return urls;
    }
  }

  if (sitemapContent.includes('<sitemapindex')) {
    const sitemapRegex = /<loc>(.*?)<\/loc>/g;
    const matches = sitemapContent.matchAll(sitemapRegex);

    for (const match of matches) {
      const sitemapUrl = match[1].trim();
      try {
        console.log(`📋 Found nested sitemap: ${sitemapUrl}`);
        const response = await fetch(sitemapUrl);
        if (response.ok) {
          const xmlContent = await response.text();
          const nestedUrls = await parseSitemap(xmlContent, baseUrl);
          urls.push(...nestedUrls);
        }
      } catch (error) {
        console.log(`Failed to fetch nested sitemap: ${sitemapUrl}`);
      }
    }

    return urls;
  }

  const urlRegex = /<loc>(.*?)<\/loc>/g;
  const matches = sitemapContent.matchAll(urlRegex);

  for (const match of matches) {
    const url = match[1].trim();
    if (url && isValidUrl(url, baseUrl)) {
      urls.push(url);
    }
  }

  return urls;
}

function filterPostUrls(urls: string[]): string[] {
  const postPatterns = [
    /\/posts?\//i,
    /\/blog\//i,
    /\/articles?\//i,
    /\/news\//i,
    /\/entry\//i,
    /\/stories\//i,
    /\/writings?\//i,
    /\/tutorials?\//i,
    /\/guides?\//i,
    /\/\d{4}\/\d{2}\//,
    /\/\d{4}-\d{2}-\d{2}/,
  ];

  const excludePatterns = [
    /\/(tag|category|author|archive|page)\//i,
    /\/(wp-content|wp-admin|wp-includes)\//i,
    /\.(xml|json|rss|atom|pdf|jpg|jpeg|png|gif|css|js)$/i,
    /\/(feed|rss|sitemap)/i,
  ];

  return urls.filter((url) => {
    const matchesPostPattern = postPatterns.some((pattern) =>
      pattern.test(url),
    );

    const matchesExcludePattern = excludePatterns.some((pattern) =>
      pattern.test(url),
    );

    return matchesPostPattern && !matchesExcludePattern;
  });
}

function isValidUrl(url: string, baseUrl: string): boolean {
  try {
    const urlObj = new URL(url);
    const baseUrlObj = new URL(baseUrl);

    return urlObj.hostname === baseUrlObj.hostname;
  } catch {
    return false;
  }
}

export async function discoverPostUrlsFromMultipleSites(
  baseUrls: string[],
  config: Partial<ScrapingConfig> = {},
): Promise<SitemapDiscoveryResult[]> {
  const results: SitemapDiscoveryResult[] = [];
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  for (const baseUrl of baseUrls) {
    try {
      const result = await discoverPostUrlsFromSitemap(baseUrl, finalConfig);
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
        baseUrl,
        sitemapUrl: '',
        postUrls: [],
        totalUrls: 0,
        success: false,
        error: errorMessage,
      });
    }
  }

  return results;
}
