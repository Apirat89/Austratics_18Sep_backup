/**
 * News types for RSS feed aggregation
 * Supports multiple RSS sources with standardized interface
 */

export interface NewsItem {
  /** Unique identifier for the news item */
  id: string;
  /** Article title */
  title: string;
  /** Article summary/description */
  description: string;
  /** Full article content (if available) */
  content?: string;
  /** Publication date as ISO string */
  publishedAt: string;
  /** Article URL */
  url: string;
  /** Source information */
  source: NewsSource;
  /** Article author (if available) */
  author?: string;
  /** Article image URL (if available) */
  imageUrl?: string;
  /** Article categories/tags */
  categories?: string[];
  /** Unique hash for deduplication */
  contentHash?: string;
}

export interface NewsSource {
  /** Source identifier */
  id: string;
  /** Display name */
  name: string;
  /** RSS feed URL */
  feedUrl: string;
  /** Source website URL */
  websiteUrl: string;
  /** Source description */
  description: string;
  /** Source category */
  category: 'government' | 'news' | 'industry';
  /** Source logo URL (if available) */
  logoUrl?: string;
}

export interface NewsResponse {
  /** Array of news items */
  items: NewsItem[];
  /** Response metadata */
  metadata: NewsResponseMetadata;
}

export interface NewsResponseMetadata {
  /** Total number of items */
  total: number;
  /** Number of items per page */
  limit: number;
  /** Current page offset */
  offset: number;
  /** Last update timestamp */
  lastUpdated: string;
  /** Sources included in response */
  sources: NewsSource[];
  /** Cache status */
  cached: boolean;
  /** Cache expiration time */
  cacheExpires?: string;
}

export interface RSSFeedData {
  /** RSS feed URL */
  url: string;
  /** Parsed RSS items */
  items: RSSItem[];
  /** Feed metadata */
  metadata: RSSFeedMetadata;
  /** Parse timestamp */
  parsedAt: string;
  /** Success status */
  success: boolean;
  /** Error message (if failed) */
  error?: string;
}

export interface RSSItem {
  /** Item title */
  title: string;
  /** Item description */
  description: string;
  /** Item content (if available) */
  content?: string;
  /** Item link */
  link: string;
  /** Publication date string (various formats) */
  pubDate: string;
  /** Item author */
  author?: string;
  /** Item categories */
  categories?: string[];
  /** Item GUID */
  guid?: string;
  /** Item image URL */
  imageUrl?: string;
}

export interface RSSFeedMetadata {
  /** Feed title */
  title: string;
  /** Feed description */
  description: string;
  /** Feed URL */
  url: string;
  /** Feed language */
  language?: string;
  /** Feed last build date */
  lastBuildDate?: string;
  /** Feed copyright */
  copyright?: string;
}

export interface NewsServiceError {
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Source that caused the error */
  source?: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

export interface NewsServiceConfig {
  /** RSS sources to fetch */
  sources: NewsSource[];
  /** Cache duration in minutes */
  cacheDuration: number;
  /** Maximum items per source */
  maxItemsPerSource: number;
  /** Request timeout in milliseconds */
  timeout: number;
  /** User agent for RSS requests */
  userAgent: string;
  /** Enable content deduplication */
  enableDeduplication: boolean;
}

/** Predefined news sources */
export const NEWS_SOURCES: NewsSource[] = [
  {
    id: 'health-gov-au',
    name: 'Australian Government Health Department',
    feedUrl: 'https://www.health.gov.au/news/rss.xml',
    websiteUrl: 'https://www.health.gov.au',
    description: 'Official health news from the Australian Government',
    category: 'government',
  },
  {
    id: 'aged-care-insite',
    name: 'Aged Care Insite',
    feedUrl: 'https://www.agedcareinsite.com.au/feed/',
    websiteUrl: 'https://www.agedcareinsite.com.au',
    description: 'Industry news and insights for aged care professionals',
    category: 'industry',
  },
];

export const DEFAULT_NEWS_CONFIG: NewsServiceConfig = {
  sources: NEWS_SOURCES,
  cacheDuration: 30, // 30 minutes
  maxItemsPerSource: 50,
  timeout: 10000, // 10 seconds
  userAgent: 'Aged Care Analytics News Aggregator 1.0',
  enableDeduplication: true,
}; 