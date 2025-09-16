/**
 * RSS Service for fetching and processing RSS feeds
 * Handles multiple RSS sources with error handling and standardization
 */

import { 
  NewsItem, 
  NewsSource, 
  RSSFeedData, 
  NewsServiceConfig, 
  DEFAULT_NEWS_CONFIG,
  NewsServiceError 
} from '../types/news';
import { parseRSSXML, normalizeRSSDate, generateContentHash } from './news-parser';

export class RSSService {
  private config: NewsServiceConfig;

  constructor(config: Partial<NewsServiceConfig> = {}) {
    this.config = { ...DEFAULT_NEWS_CONFIG, ...config };
  }

  /**
   * Fetch RSS feeds from all configured sources
   * 🇦🇺 EXPERT FIX: Sequential fetching for government sources to avoid rate limiting
   */
  async fetchAllFeeds(): Promise<{ 
    items: NewsItem[], 
    errors: NewsServiceError[] 
  }> {
    // Separate government and non-government sources
    const govSources = this.config.sources.filter(s => s.category === 'government');
    const nonGovSources = this.config.sources.filter(s => s.category !== 'government');
    
    const allItems: NewsItem[] = [];
    const errors: NewsServiceError[] = [];
    
    // Fetch non-government sources in parallel (faster)
    if (nonGovSources.length > 0) {
      const nonGovPromises = nonGovSources.map(source => this.fetchSingleFeed(source));
      const nonGovResults = await Promise.allSettled(nonGovPromises);
      
      nonGovResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allItems.push(...result.value);
        } else {
          errors.push({
            message: result.reason?.message || 'Unknown error',
            code: 'FEED_FETCH_ERROR',
            source: nonGovSources[index]?.id,
            details: { error: result.reason }
          });
        }
      });
    }
    
    // Fetch government sources sequentially (rate-limit friendly) 
    for (const govSource of govSources) {
      try {
        console.log(`🇦🇺 Fetching government RSS sequentially: ${govSource.name}`);
        const items = await this.fetchSingleFeed(govSource);
        allItems.push(...items);
        
        // Add small delay between government requests
        if (govSources.indexOf(govSource) < govSources.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      } catch (error) {
        errors.push({
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'FEED_FETCH_ERROR',
          source: govSource.id,
          details: { error }
        });
      }
    }

    // Sort by publication date (newest first)
    allItems.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    // Apply deduplication if enabled
    const finalItems = this.config.enableDeduplication 
      ? this.deduplicateItems(allItems)
      : allItems;

    return { items: finalItems, errors };
  }

  /**
   * Fetch RSS feed from a single source with retry logic
   */
  async fetchSingleFeed(source: NewsSource): Promise<NewsItem[]> {
    console.log(`Fetching RSS feed from ${source.name} (${source.feedUrl})`);
    
    // 🇦🇺 EXPERT FIX: Australian-friendly user agents for gov sites (Sydney region + human headers)
    const userAgents = [
      'AustraticsBot/1.0 (+https://austratics.vercel.app; contact: admin@austratics.vercel.app)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    let lastError: Error | null = null;

    // Try different user agents
    for (const userAgent of userAgents) {
      try {
        // Add small delay between attempts for rate limiting
        if (userAgents.indexOf(userAgent) > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const response = await fetch(source.feedUrl, {
          headers: {
            'User-Agent': userAgent,
            // 🇦🇺 EXPERT FIX: Australian government-friendly headers
            'Accept': 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7',
            'Accept-Language': 'en-AU,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            // Use appropriate referer for gov sites
            'Referer': source.category === 'government' ? 'https://www.health.gov.au/news' : source.websiteUrl,
          },
          cache: 'no-store',
          next: { revalidate: 0 },
          redirect: 'follow',
          signal: AbortSignal.timeout(
            // 🇦🇺 EXPERT FIX: Longer timeout for gov sites (25s) as they can be slow
            source.category === 'government' ? 25000 : this.config.timeout
          ),
        });

        if (!response.ok) {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          console.warn(`Failed with ${userAgent}: ${lastError.message}`);
          continue; // Try next user agent
        }

        const xmlContent = await response.text();
        
        if (!xmlContent || xmlContent.trim().length === 0) {
          lastError = new Error('Empty RSS feed content');
          continue; // Try next user agent
        }

        // Parse RSS XML
        const feedData = parseRSSXML(xmlContent, source.feedUrl);
        
        if (!feedData.success) {
          lastError = new Error(feedData.error || 'RSS parsing failed');
          continue; // Try next user agent
        }

        // Convert RSS items to NewsItem format
        const newsItems = feedData.items
          .slice(0, this.config.maxItemsPerSource)
          .map(item => this.convertRSSItemToNewsItem(item, source))
          .filter(item => item !== null) as NewsItem[];

        console.log(`✅ Successfully fetched ${newsItems.length} items from ${source.name} using ${userAgent}`);
        return newsItems; // Success!

      } catch (error) {
        lastError = error as Error;
        console.warn(`Failed attempt with ${userAgent}:`, error);
        continue; // Try next user agent
      }
    }

    // All user agents failed
    console.error(`❌ All attempts failed for ${source.name}:`, lastError);
    throw lastError || new Error('All fetch attempts failed');
  }

  /**
   * Convert RSS item to standardized NewsItem format
   */
  private convertRSSItemToNewsItem(rssItem: any, source: NewsSource): NewsItem | null {
    try {
      if (!rssItem.title || !rssItem.link) {
        return null;
      }

      // Generate unique ID
      const id = this.generateItemId(rssItem, source);
      
      // Normalize publication date
      const publishedAt = normalizeRSSDate(rssItem.pubDate);
      
      // Generate content hash for deduplication
      const contentHash = generateContentHash(
        rssItem.title, 
        rssItem.description || '', 
        rssItem.link
      );

      return {
        id,
        title: rssItem.title,
        description: rssItem.description || '',
        content: rssItem.content,
        publishedAt,
        url: rssItem.link,
        source,
        author: rssItem.author,
        imageUrl: rssItem.imageUrl,
        categories: rssItem.categories || [],
        contentHash,
      };
    } catch (error) {
      console.warn('Failed to convert RSS item to NewsItem:', error);
      return null;
    }
  }

  /**
   * Generate unique ID for news item
   */
  private generateItemId(rssItem: any, source: NewsSource): string {
    // Use GUID if available, otherwise generate from source and link
    if (rssItem.guid) {
      return `${source.id}-${rssItem.guid}`;
    }
    
    // Generate hash from URL
    const urlHash = this.simpleHash(rssItem.link);
    return `${source.id}-${urlHash}`;
  }

  /**
   * Simple hash function for generating IDs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Remove duplicate items based on content hash
   */
  private deduplicateItems(items: NewsItem[]): NewsItem[] {
    const seen = new Set<string>();
    const uniqueItems: NewsItem[] = [];

    for (const item of items) {
      if (!item.contentHash) {
        // If no content hash, generate one
        item.contentHash = generateContentHash(
          item.title, 
          item.description, 
          item.url
        );
      }

      if (!seen.has(item.contentHash)) {
        seen.add(item.contentHash);
        uniqueItems.push(item);
      }
    }

    console.log(`Deduplication: ${items.length} items reduced to ${uniqueItems.length}`);
    return uniqueItems;
  }

  /**
   * Validate RSS feed URL
   */
  async validateFeedUrl(feedUrl: string): Promise<boolean> {
    try {
      const response = await fetch(feedUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': this.config.userAgent,
        },
        cache: 'no-store',
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      console.warn(`Feed validation failed for ${feedUrl}:`, error);
      return false;
    }
  }

  /**
   * Get RSS service configuration
   */
  getConfig(): NewsServiceConfig {
    return { ...this.config };
  }

  /**
   * Update RSS service configuration
   */
  updateConfig(newConfig: Partial<NewsServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Create default RSS service instance
 */
export const defaultRSSService = new RSSService();

/**
 * Fetch news from all RSS sources with error handling
 */
export async function fetchAllNews(
  config?: Partial<NewsServiceConfig>
): Promise<{ items: NewsItem[], errors: NewsServiceError[] }> {
  const service = config ? new RSSService(config) : defaultRSSService;
  return await service.fetchAllFeeds();
}

/**
 * Fetch news from a single RSS source
 */
export async function fetchSingleNews(
  source: NewsSource,
  config?: Partial<NewsServiceConfig>
): Promise<NewsItem[]> {
  const service = config ? new RSSService(config) : defaultRSSService;
  return await service.fetchSingleFeed(source);
}

/**
 * Test RSS feed connectivity
 */
export async function testRSSFeeds(
  sources: NewsSource[] = DEFAULT_NEWS_CONFIG.sources
): Promise<{ source: NewsSource, available: boolean }[]> {
  const service = new RSSService();
  
  const testPromises = sources.map(async (source) => {
    const available = await service.validateFeedUrl(source.feedUrl);
    return { source, available };
  });

  return await Promise.all(testPromises);
} 