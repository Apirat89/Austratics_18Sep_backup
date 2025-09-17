import { NextResponse } from 'next/server';

// Canonical news sources configuration - always returns these regardless of RSS availability
const CANONICAL_SOURCES = [
  {
    id: 'australian-ageing-agenda',
    name: 'Australian Ageing Agenda',
    feedUrl: 'https://www.australianageingagenda.com.au/feed/',
    enabled: true
  },
  {
    id: 'aged-care-insite', 
    name: 'Aged Care Insite',
    feedUrl: 'https://www.agedcareinsite.com.au/feed/',
    enabled: true
  },
  {
    id: 'health-gov-au',
    name: 'Australian Government Health Department',
    feedUrl: 'https://www.health.gov.au/news/rss.xml',
    enabled: true
  }
];

export async function GET() {
  try {
    // Return canonical sources regardless of current RSS availability
    const sources = CANONICAL_SOURCES.filter(source => source.enabled);
    
    return NextResponse.json({ 
      success: true, 
      sources: sources.map(({ id, name, feedUrl }) => ({ id, name, feedUrl }))
    });
  } catch (e: any) {
    console.error('Failed to load canonical sources:', e);
    return NextResponse.json({ 
      success: false, 
      message: e?.message || 'Failed to load sources' 
    }, { status: 500 });
  }
} 