// =============================================================================
// FAQ TYPE DEFINITIONS
// =============================================================================
// TypeScript interfaces for the FAQ system matching the database schema

// Core FAQ Document Types
export interface FAQDocumentChunk {
  id: number;
  document_name: string;
  document_type: string;
  section_title: string | null;
  content: string;
  page_number: number | null;
  chunk_index: number;
  actual_pdf_pages: number | null;
  embedding: number[]; // Vector embedding
  guide_category: string | null; // homecare, residential, maps, news, sa2
  section_category: string | null; // getting_started, features, troubleshooting
  created_at: string;
  updated_at: string;
}

// FAQ Conversation Types
export interface FAQConversation {
  id: number;
  user_id: string;
  title: string | null;
  summary: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  first_message_preview: string | null;
  last_message_preview: string | null;
  guide_types: string[] | null;
  total_citations: number;
  total_processing_time: number;
  user_rating: number | null;
  is_bookmarked: boolean;
  context_summary: string | null;
  status: 'active' | 'archived' | 'deleted';
}

// FAQ Message Types
export interface FAQMessage {
  id: number;
  conversation_id: number;
  message_index: number;
  role: 'user' | 'assistant';
  content: string;
  citations: FAQCitation[] | null;
  context_used: number;
  processing_time: number | null;
  search_intent: string | null;
  is_edited: boolean;
  is_regenerated: boolean;
  is_bookmarked: boolean;
  feedback_type: 'positive' | 'negative' | null;
  feedback_comment: string | null;
  created_at: string;
  updated_at: string;
}

// FAQ Citation Type
export interface FAQCitation {
  id: number;
  document_name: string;
  document_type: string;
  section_title: string | null;
  guide_category: string | null;
  page_number: number | null;
  chunk_index: number;
  similarity: number;
  content_preview: string;
}

// FAQ Search History Types
export interface FAQSearchHistory {
  id: number;
  user_id: string;
  search_term: string;
  search_type: 'general' | 'guide_specific' | 'feature_lookup';
  guide_category: string | null;
  results_count: number;
  response_generated: boolean;
  conversation_id: number | null;
  message_id: number | null;
  search_duration_ms: number | null;
  ai_processing_time_ms: number | null;
  created_at: string;
  updated_at: string;
}

// FAQ Bookmark Types
export interface FAQBookmark {
  id: number;
  user_id: string;
  message_id: number | null;
  conversation_id: number | null;
  bookmark_type: 'message' | 'conversation';
  title: string | null;
  notes: string | null;
  tags: string[] | null;
  preview_text: string | null;
  guide_categories: string[] | null;
  created_at: string;
  updated_at: string;
}

// FAQ Feedback Types
export interface FAQFeedback {
  id: number;
  user_id: string;
  message_id: number | null;
  conversation_id: number | null;
  feedback_type: 'positive' | 'negative' | 'report' | 'suggestion';
  rating: number | null;
  comment: string | null;
  category: 'accuracy' | 'helpfulness' | 'clarity' | 'completeness' | 'other' | null;
  subcategory: string | null;
  user_query: string | null;
  guide_context: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// FAQ SEARCH AND PROCESSING TYPES
// =============================================================================

// FAQ Document Search Result
export interface FAQSearchResult {
  id: number;
  document_name: string;
  document_type: string;
  section_title: string | null;
  content: string;
  page_number: number | null;
  chunk_index: number;
  guide_category: string | null;
  section_category: string | null;
  similarity: number;
}

// FAQ Query Processing Types
export interface FAQQueryContext {
  query: string;
  guide_category?: string;
  search_type: 'general' | 'guide_specific' | 'feature_lookup';
  conversation_id?: number;
  user_id: string;
}

export interface FAQProcessingResult {
  response: string;
  citations: FAQCitation[];
  processing_time: number;
  context_used: number;
  search_intent: string;
}

// =============================================================================
// FAQ GUIDE CATEGORIES AND CONSTANTS
// =============================================================================

export const FAQ_GUIDE_CATEGORIES = {
  HOMECARE: 'homecare',
  RESIDENTIAL: 'residential',
  MAPS: 'maps',
  NEWS: 'news',
  SA2: 'sa2'
} as const;

export const FAQ_SECTION_CATEGORIES = {
  GETTING_STARTED: 'getting_started',
  FEATURES: 'features',
  TROUBLESHOOTING: 'troubleshooting',
  ADVANCED: 'advanced',
  FAQ: 'faq',
  EXAMPLES: 'examples'
} as const;

export const FAQ_DOCUMENT_TITLES = {
  'homecare_userguide.docx': 'Home Care User Guide',
  'residential_userguide.docx': 'Residential Care User Guide',
  'maps_Userguide.docx': 'Maps Feature User Guide',
  'news_userguide.docx': 'News Feature User Guide',
  'SA2_userguide.docx': 'SA2 Analysis User Guide'
} as const;

// =============================================================================
// FAQ API RESPONSE TYPES
// =============================================================================

export interface FAQApiResponse {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  processing_time?: number;
}

export interface FAQChatResponse extends FAQApiResponse {
  data?: {
    response: string;
    citations: FAQCitation[];
    conversation_id: number;
    message_id: number;
    processing_time: number;
    context_used: number;
  };
}

export interface FAQHistoryResponse extends FAQApiResponse {
  data?: {
    conversations: FAQConversation[];
    messages: FAQMessage[];
    search_history: FAQSearchHistory[];
    bookmarks: FAQBookmark[];
  };
}

// =============================================================================
// FAQ FRONTEND COMPONENT TYPES
// =============================================================================

export interface FAQChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  citations?: FAQCitation[];
  timestamp: Date;
  isBookmarked?: boolean;
  processingTime?: number;
}

export interface FAQHistoryItem {
  id: number;
  type: 'search' | 'conversation';
  title: string;
  preview: string;
  timestamp: Date;
  guide_category?: string;
  conversation_id?: number;
  message_count?: number;
  is_bookmarked?: boolean;
}

export interface FAQBookmarkItem {
  id: number;
  type: 'message' | 'conversation';
  title: string;
  preview: string;
  timestamp: Date;
  tags?: string[];
  guide_categories?: string[];
  notes?: string;
}

// =============================================================================
// FAQ UTILITY TYPES
// =============================================================================

export type FAQGuideCategory = typeof FAQ_GUIDE_CATEGORIES[keyof typeof FAQ_GUIDE_CATEGORIES];
export type FAQSectionCategory = typeof FAQ_SECTION_CATEGORIES[keyof typeof FAQ_SECTION_CATEGORIES];

export interface FAQProcessingOptions {
  max_chunks?: number;
  similarity_threshold?: number;
  guide_category?: FAQGuideCategory;
  include_citations?: boolean;
  enable_thinking_budget?: boolean;
  thinking_budget?: number;
} 