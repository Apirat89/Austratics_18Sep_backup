/**
 * RSS Parser utilities for news aggregation
 * Handles different RSS feed formats and standardizes data structure
 */

import { XMLParser } from 'fast-xml-parser';
import { RSSFeedData, RSSItem, RSSFeedMetadata } from '../types/news';

/**
 * Parse RSS XML content into structured data
 */
export function parseRSSXML(xmlContent: string, feedUrl: string): RSSFeedData {
  try {
    // Create XML parser instance
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true,
    });
    
    const xmlDoc = parser.parse(xmlContent);
    
    if (!xmlDoc) {
      throw new Error('Failed to parse XML content');
    }

    // Extract feed metadata
    const metadata = extractFeedMetadata(xmlDoc, feedUrl);
    
    // Extract RSS items
    const items = extractRSSItems(xmlDoc);

    return {
      url: feedUrl,
      items,
      metadata,
      parsedAt: new Date().toISOString(),
      success: true,
    };
  } catch (error) {
    return {
      url: feedUrl,
      items: [],
      metadata: {
        title: 'Parse Error',
        description: 'Failed to parse RSS feed',
        url: feedUrl,
      },
      parsedAt: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

/**
 * Extract feed metadata from RSS XML
 */
function extractFeedMetadata(xmlDoc: any, feedUrl: string): RSSFeedMetadata {
  let channel = null;
  
  // Try RSS 2.0 format first
  if (xmlDoc.rss && xmlDoc.rss.channel) {
    channel = xmlDoc.rss.channel;
  }
  // Try Atom format if RSS not found
  else if (xmlDoc.feed) {
    channel = xmlDoc.feed;
  }
  
  if (!channel) {
    throw new Error('No valid RSS channel or Atom feed found');
  }

  const title = getTextValue(channel.title) || 'Unknown Feed';
  const description = getTextValue(channel.description) || 
                     getTextValue(channel.subtitle) || 
                     'No description available';
  const language = getTextValue(channel.language) || 
                  channel['@_xml:lang'] || 
                  undefined;
  const lastBuildDate = getTextValue(channel.lastBuildDate) || 
                       getTextValue(channel.updated) || 
                       undefined;
  const copyright = getTextValue(channel.copyright) || 
                   getTextValue(channel.rights) || 
                   undefined;

  return {
    title,
    description,
    url: feedUrl,
    language,
    lastBuildDate,
    copyright,
  };
}

/**
 * Extract RSS items from XML document
 */
function extractRSSItems(xmlDoc: any): RSSItem[] {
  const items: RSSItem[] = [];
  
  let itemElements: any[] = [];
  
  // Try RSS 2.0 format
  if (xmlDoc.rss && xmlDoc.rss.channel && xmlDoc.rss.channel.item) {
    itemElements = Array.isArray(xmlDoc.rss.channel.item) ? xmlDoc.rss.channel.item : [xmlDoc.rss.channel.item];
  }
  // Try Atom format if RSS not found
  else if (xmlDoc.feed && xmlDoc.feed.entry) {
    itemElements = Array.isArray(xmlDoc.feed.entry) ? xmlDoc.feed.entry : [xmlDoc.feed.entry];
  }
  
  itemElements.forEach((item: any) => {
    try {
      const rssItem = parseRSSItem(item);
      if (rssItem) {
        items.push(rssItem);
      }
    } catch (error) {
      console.warn('Failed to parse RSS item:', error);
    }
  });

  return items;
}

/**
 * Parse individual RSS item element
 */
function parseRSSItem(itemElement: any): RSSItem | null {
  const title = getTextValue(itemElement.title);
  const link = getTextValue(itemElement.link) || 
               itemElement.link?.['@_href'] || 
               itemElement.link?.href;
  
  if (!title || !link) {
    return null; // Skip items without title or link
  }

  const description = getTextValue(itemElement.description) || 
                     getTextValue(itemElement.summary) || 
                     getTextValue(itemElement.content) || '';
  
  const content = getTextValue(itemElement['content:encoded']) || 
                 getTextValue(itemElement.content) || 
                 undefined;
  
  const pubDate = getTextValue(itemElement.pubDate) || 
                 getTextValue(itemElement.published) || 
                 getTextValue(itemElement.updated) || 
                 new Date().toISOString();
  
  const author = getTextValue(itemElement.author) || 
                getTextValue(itemElement['dc:creator']) || 
                getAuthorFromElement(itemElement) || 
                undefined;
  
  const guid = getTextValue(itemElement.guid) || 
              getTextValue(itemElement.id) || 
              undefined;
  
  const categories = extractCategories(itemElement);
  const imageUrl = extractImageUrl(itemElement);

  return {
    title: cleanHtmlText(title),
    description: cleanHtmlText(description),
    content: content ? cleanHtmlText(content) : undefined,
    link,
    pubDate,
    author,
    categories,
    guid,
    imageUrl,
  };
}

/**
 * Extract categories from RSS item
 */
function extractCategories(itemElement: any): string[] {
  const categories: string[] = [];
  
  // RSS 2.0 categories
  if (itemElement.category) {
    const categoryElements = Array.isArray(itemElement.category) ? itemElement.category : [itemElement.category];
    categoryElements.forEach((cat: any) => {
      const category = getTextValue(cat);
      if (category) {
        categories.push(category);
      }
    });
  }
  
  return categories;
}

/**
 * Helper function to extract text value from parsed XML element
 */
function getTextValue(element: any): string | undefined {
  if (!element) {
    return undefined;
  }
  
  if (typeof element === 'string') {
    return element.trim();
  }
  
  if (element['#text']) {
    return element['#text'].trim();
  }
  
  if (typeof element === 'object' && element !== null) {
    // Handle simple objects with text content
    for (const key in element) {
      if (key === '#text' || key === '_text' || key === 'text') {
        return element[key].trim();
      }
    }
  }
  
  return undefined;
}

/**
 * Extract image URL from RSS item
 */
function extractImageUrl(itemElement: any): string | undefined {
  // Try media:content first
  if (itemElement['media:content']) {
    const mediaContent = Array.isArray(itemElement['media:content']) ? itemElement['media:content'][0] : itemElement['media:content'];
    if (mediaContent && mediaContent['@_url']) {
      return mediaContent['@_url'];
    }
  }
  
  // Try media:thumbnail
  if (itemElement['media:thumbnail'] && itemElement['media:thumbnail']['@_url']) {
    return itemElement['media:thumbnail']['@_url'];
  }
  
  // Try enclosure with image type
  if (itemElement.enclosure && itemElement.enclosure['@_type'] && itemElement.enclosure['@_type'].startsWith('image/')) {
    return itemElement.enclosure['@_url'];
  }
  
  // Try to find image URL in description
  const description = getTextValue(itemElement.description) || '';
  const imgMatch = description.match(/<img[^>]+src="([^"]+)"/);
  if (imgMatch) {
    return imgMatch[1];
  }
  
  return undefined;
}

/**
 * Extract author from various Atom author formats
 */
function getAuthorFromElement(itemElement: any): string | undefined {
  // Atom author element
  if (itemElement.author) {
    const name = getTextValue(itemElement.author.name);
    const email = getTextValue(itemElement.author.email);
    
    if (name && email) {
      return `${name} <${email}>`;
    } else if (name) {
      return name;
    } else if (email) {
      return email;
    }
  }
  
  return undefined;
}

/**
 * Clean HTML tags and decode HTML entities from text
 */
function cleanHtmlText(text: string): string {
  if (!text) return '';
  
  // Remove HTML tags
  const stripped = text.replace(/<[^>]*>/g, '');
  
  // Decode numeric HTML entities (decimal format &#123;)
  let decoded = stripped.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  // Decode hexadecimal HTML entities (&#x1A;)
  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Decode common named HTML entities
  decoded = decoded
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&bull;/g, '•')
    .replace(/&middot;/g, '·')
    .replace(/&trade;/g, '™')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&deg;/g, '°')
    .replace(/&plusmn;/g, '±')
    .replace(/&frac12;/g, '½')
    .replace(/&frac14;/g, '¼')
    .replace(/&frac34;/g, '¾');
  
  // Clean up whitespace
  return decoded.replace(/\s+/g, ' ').trim();
}

/**
 * Validate RSS date format and convert to ISO string
 */
export function normalizeRSSDate(dateString: string): string {
  if (!dateString) {
    return new Date().toISOString();
  }
  
  try {
    // Try parsing as-is first
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    
    // Try parsing RFC 2822 format (common in RSS)
    const rfc2822Match = dateString.match(/^\w{3},\s\d{1,2}\s\w{3}\s\d{4}\s\d{2}:\d{2}:\d{2}\s[+-]\d{4}$/);
    if (rfc2822Match) {
      return new Date(dateString).toISOString();
    }
    
    // Fallback to current date
    console.warn(`Failed to parse date: ${dateString}, using current date`);
    return new Date().toISOString();
  } catch (error) {
    console.warn(`Date parsing error for "${dateString}":`, error);
    return new Date().toISOString();
  }
}

/**
 * Generate content hash for deduplication
 */
export function generateContentHash(title: string, description: string, link: string): string {
  const content = `${title}|${description}|${link}`.toLowerCase();
  
  // Simple hash function (for deduplication, not cryptographic security)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
} 