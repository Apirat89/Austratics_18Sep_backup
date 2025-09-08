import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { faqDocumentTitleService } from './faqDocumentTitleService';
import { FAQDocumentChunk, FAQCitation, FAQMessage, FAQConversation } from '../types/faq';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: FAQCitation[];
}

export interface ChatResponse {
  message: string;
  citations: FAQCitation[];
  context_used: number;
  processing_time: number;
  conversation_id?: number;
  message_id?: number;
}

// Conversation interfaces
export interface ConversationContext {
  conversation_id?: number;
  user_id: string;
  conversation_history?: ChatMessage[];
  max_context_messages?: number;
}

export interface CreateConversationRequest {
  user_id: string;
  title?: string;
  first_message: string;
}

export interface AddMessageRequest {
  conversation_id: number;
  user_id: string;
  user_message: string;
  conversation_history?: ChatMessage[];
}

export class FAQChatService {
  private genAI: GoogleGenerativeAI;
  private supabase: any;
  
  // Response cache for performance
  private responseCache: Map<string, ChatResponse> = new Map();
  private readonly CACHE_MAX_SIZE = 100;
  private readonly CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes TTL

  constructor() {
    // Initialize Gemini AI for chat
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  // =============================================================================
  // RESPONSE FORMATTING HELPERS
  // =============================================================================

  /**
   * Strip any bracketed source mentions from model responses
   */
  private stripSourceMentions(text: string): string {
    // Remove bracketed citation-like spans such as [Something - Section]
    return text.replace(/\[[^\]\[\n]{2,80}\]/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  /**
   * Format Markdown text with strict spacing and structure rules
   */
  private formatMarkdownStrict(md: string): string {
    if (!md) return md;

    // 1) Split "...: ### Heading" / "...: ## Heading" onto a new line
    md = md.replace(/:\s*(#{1,6}\s+)/g, ':\n\n$1');

    // 2) Normalize bullets "* " -> "- "
    md = md.replace(/^\s*\*\s+/gm, '- ');

    // 3) Normalize ordered list markers "1) " -> "1. "
    md = md.replace(/^(\s*\d+)\)\s+/gm, '$1. ');

    // 4) Ensure a blank line BEFORE any block element (headings, lists, blockquotes, fences)
    md = md.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2');      // before headings
    md = md.replace(/([^\n])\n(-\s|\d+\.\s|>\s|```)/g, '$1\n\n$2'); // before lists/quotes/fences

    // 5) Ensure a blank line AFTER headings (when next line is plain text)
    md = md.replace(/(#{1,6}\s.*)\n(?!\n|#{1,6}\s|-\s|\d+\.\s|>\s|```)/g, '$1\n\n');

    // 6) Collapse 3+ blank lines to exactly 2
    md = md.replace(/\n{3,}/g, '\n\n');

    // 7) Trim trailing spaces per line
    md = md.replace(/[ \t]+$/gm, '');

    return md.trim();
  }

  // =============================================================================
  // CONVERSATION MANAGEMENT METHODS
  // =============================================================================

  /**
   * Create a new FAQ conversation
   */
  async createConversation(request: CreateConversationRequest): Promise<number> {
    try {
      const { user_id, title, first_message } = request;

      // Insert new FAQ conversation
      const { data, error } = await this.supabase
        .from('faq_conversations')
        .insert({
          user_id,
          title: title || this.generateConversationTitle(first_message),
          status: 'active'
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating FAQ conversation:', error);
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Error creating FAQ conversation:', error);
      throw error;
    }
  }

  /**
   * Add a message to an FAQ conversation using RPC function
   */
  async addMessageToConversation(
    conversation_id: number,
    role: 'user' | 'assistant',
    content: string,
    citations?: FAQCitation[],
    processing_time?: number
  ): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .rpc('add_message_to_faq_conversation', {
          conversation_id,
          role,
          content,
          citations: citations || null,
          context_used: citations?.length || 0,
          processing_time: processing_time || null,
          search_intent: role === 'user' ? 'question' : null
        });

      if (error) {
        console.error('Error adding message to FAQ conversation:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error adding message to FAQ conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(conversation_id: number): Promise<ChatMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('faq_messages')
        .select('*')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error getting FAQ conversation messages:', error);
        throw error;
      }

      return (data || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        citations: msg.citations || []
      }));
    } catch (error) {
      console.error('Error getting FAQ conversation messages:', error);
      throw error;
    }
  }

  /**
   * Get user's recent FAQ conversations
   */
  async getUserConversations(user_id: string, limit: number = 20): Promise<FAQConversation[]> {
    try {
      const { data, error } = await this.supabase
        .from('faq_conversations')
        .select('*')
        .eq('user_id', user_id)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting user FAQ conversations:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user FAQ conversations:', error);
      throw error;
    }
  }

  /**
   * Generate conversation title from first message
   */
  private generateConversationTitle(firstMessage: string): string {
    if (!firstMessage || firstMessage.length === 0) {
      return 'New FAQ Conversation';
    }
    
    // Clean up the message and truncate
    const cleaned = firstMessage
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleaned.length > 50 ? cleaned.substring(0, 50) + '...' : cleaned;
  }

  // =============================================================================
  // FAQ QUERY PROCESSING WITH CONVERSATION CONTEXT
  // =============================================================================

  /**
   * Process a complete FAQ chat query with conversation context
   */
  async processConversationalQuery(
    question: string, 
    context: ConversationContext = {} as ConversationContext
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    const { conversation_id, user_id, conversation_history = [], max_context_messages = 5 } = context;
    
    let actualConversationId = conversation_id;

    try {
      console.log(`🔍 Processing FAQ conversational query: "${question}"`);
      console.log(`📚 Context: ${conversation_history.length} messages, conversation_id: ${conversation_id}`);

      // Step 1: Create conversation if this is the first message
      if (!actualConversationId && user_id) {
        actualConversationId = await this.createConversation({
          user_id,
          first_message: question
        });
        console.log(`✨ Created new FAQ conversation: ${actualConversationId}`);
      }

      // Step 2: Add user message to conversation
      let userMessageId: number | undefined;
      if (actualConversationId) {
        try {
          console.log(`🔧 DEBUGGING: About to save user message to FAQ conversation ${actualConversationId}`);
          
          userMessageId = await this.addMessageToConversation(
            actualConversationId,
            'user',
            question
          );
          
          console.log(`🎉 SUCCESS: Added user message with ID: ${userMessageId}`);
        } catch (error) {
          console.error(`❌ ERROR: Failed to save user message:`, error);
          // Continue execution even if saving fails
        }
      }

      // Step 3: Search for relevant FAQ documents using ultimate retrieval pipeline
      const citations = await this.searchRelevantFAQDocumentsUltimate(question, 8);
      console.log(`📄 Ultimate search found ${citations.length} relevant FAQ sections`);

      if (citations.length === 0) {
        const response: ChatResponse = {
          message: "I couldn't find any relevant information in the FAQ user guides to answer your question. Please try asking about specific features like homecare provider search, residential facility comparison, maps navigation, news reading, or SA2 analysis.",
          citations: [], // Always empty - no citations ever returned
          context_used: 0,
          processing_time: Date.now() - startTime,
          conversation_id: actualConversationId,
          message_id: userMessageId
        };

        // Add assistant message to conversation with no citations
        if (actualConversationId) {
          await this.addMessageToConversation(
            actualConversationId,
            'assistant',
            response.message,
            [], // Never store citations
            response.processing_time
          );
        }

        return response;
      }

      // Step 4: Build conversation context from history
      const conversationContext = this.buildConversationContext(conversation_history, max_context_messages);

      // Step 5: Generate answer using FAQ context
      const answer = await this.generateFAQAnswer(question, citations, conversationContext);
      const processingTime = Date.now() - startTime;

      console.log(`⚡ FAQ query processed in ${processingTime}ms`);

      const response: ChatResponse = {
        message: answer,
        citations: [], // Always empty - no citations ever returned to users
        context_used: citations.length, // Keep for analytics but don't expose citations
        processing_time: processingTime,
        conversation_id: actualConversationId,
        message_id: userMessageId
      };

      // Step 6: Add assistant response to conversation with no citations
      if (actualConversationId) {
        await this.addMessageToConversation(
          actualConversationId,
          'assistant',
          response.message,
          [], // Never store citations in database
          response.processing_time
        );
      }

      return response;

    } catch (error) {
      console.error('Error processing FAQ conversational query:', error);
      
      const errorResponse: ChatResponse = {
        message: "I'm sorry, I encountered an error while processing your question. Please try again or rephrase your question.",
        citations: [], // Always empty - no citations ever returned
        context_used: 0,
        processing_time: Date.now() - startTime,
        conversation_id: actualConversationId
      };

      return errorResponse;
    }
  }

  // =============================================================================
  // FAQ DOCUMENT SEARCH METHODS
  // =============================================================================

  /**
   * Search for relevant FAQ documents using vector similarity
   */
  async searchRelevantFAQDocuments(query: string, limit: number = 5): Promise<FAQCitation[]> {
    try {
      // Generate embedding for the user's query
      const embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const embeddingResult = await embeddingModel.embedContent(query);
      const queryEmbedding = embeddingResult.embedding.values;

      // Search for similar content in the FAQ vector database
      const { data, error } = await this.supabase.rpc('match_faq_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.2, // Slightly higher threshold for FAQ relevance
        match_count: limit
      });

      if (error) {
        throw new Error(`FAQ search error: ${error.message}`);
      }

      // Transform results into FAQ citation format
      const citations: FAQCitation[] = (data || []).map((chunk: any) => ({
        id: chunk.id || 0,
        document_name: chunk.document_name,
        document_type: chunk.document_type || 'FAQ',
        section_title: chunk.section_title,
        guide_category: chunk.guide_category,
        page_number: chunk.page_number,
        chunk_index: chunk.chunk_index || 0,
        similarity: chunk.similarity,
        content_preview: chunk.content
      }));

      return this.deduplicateFAQResults(citations);
    } catch (error) {
      console.error('Error searching FAQ documents:', error);
      throw error;
    }
  }

  /**
   * Search FAQ documents by specific category
   */
  async searchRelevantFAQDocumentsByCategory(
    query: string, 
    category: string, 
    limit: number = 5
  ): Promise<FAQCitation[]> {
    try {
      // Generate embedding for the user's query
      const embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const embeddingResult = await embeddingModel.embedContent(query);
      const queryEmbedding = embeddingResult.embedding.values;

      // Search within specific category
      const { data, error } = await this.supabase.rpc('match_faq_documents_by_category', {
        query_embedding: queryEmbedding,
        filter_guide_category: category,
        match_threshold: 0.2,
        match_count: limit
      });

      if (error) {
        throw new Error(`FAQ category search error: ${error.message}`);
      }

      // Transform results into FAQ citation format
      const citations: FAQCitation[] = (data || []).map((chunk: any) => ({
        id: chunk.id || 0,
        document_name: chunk.document_name,
        document_type: chunk.document_type || 'FAQ',
        section_title: chunk.section_title,
        guide_category: chunk.guide_category,
        page_number: chunk.page_number,
        chunk_index: chunk.chunk_index || 0,
        similarity: chunk.similarity,
        content_preview: chunk.content
      }));

      return this.deduplicateFAQResults(citations);
    } catch (error) {
      console.error('Error searching FAQ documents by category:', error);
      throw error;
    }
  }

  /**
   * Deduplicate FAQ search results by content similarity
   */
  private deduplicateFAQResults(citations: FAQCitation[]): FAQCitation[] {
    const deduped: FAQCitation[] = [];
    const seen = new Set<string>();

    for (const citation of citations) {
      // Create a hash of the content to check for duplicates
      const contentHash = this.generateContentHash(citation.content_preview);
      
      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        deduped.push(citation);
      }
    }

    return deduped;
  }

  /**
   * Generate a hash of content for deduplication
   */
  private generateContentHash(content: string): string {
    // Simple hash based on normalized content
    const normalized = content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .toLowerCase()
      .trim();
    
    return normalized.substring(0, 100); // Use first 100 chars as hash
  }

  // =============================================================================
  // ENHANCED RETRIEVAL METHODS FOR INTELLIGENCE IMPROVEMENTS
  // =============================================================================

  /**
   * Generate diverse paraphrases and reformulations of user query for better recall
   */
  private async expandQueriesWithGemini(userQ: string): Promise<string[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `You will generate diverse paraphrases and decompositions of a user question
to search a user guide. Return 6 lines, each a different query; include synonyms and
alternate phrasings; avoid punctuation. Question: "${userQ}"`;
      
      const { response } = await model.generateContent(prompt);
      const lines = response.text().split('\n').map(s => s.trim()).filter(Boolean);
      
      // Ensure uniqueness and cap at 6 total queries including original
      return Array.from(new Set([userQ, ...lines])).slice(0, 6);
    } catch (error) {
      console.error('Error in query expansion:', error);
      // Fallback to original query if expansion fails
      return [userQ];
    }
  }

  /**
   * Generate hypothetical answer to improve semantic matching (HyDE)
   */
  private async hyde(userQ: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const { response } = await model.generateContent(
        `Write a short, factual answer (120-180 words) to this question based only on a generic user guide.
         No hallucinations. This is a synthetic draft to improve search.\nQ: ${userQ}`
      );
      return response.text();
    } catch (error) {
      console.error('Error in HyDE generation:', error);
      // Return original query as fallback
      return userQ;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosine(a: number[], b: number[]): number {
    let d = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { 
      d += a[i] * b[i]; 
      na += a[i] * a[i]; 
      nb += b[i] * b[i]; 
    }
    return d / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
  }

  /**
   * Maximal Marginal Relevance for result diversification
   */
  private mmr<T>(queryV: number[], cands: {item: T, emb: number[]}[], topK = 12, lambda = 0.7): T[] {
    const selected: T[] = [];
    const chosen: boolean[] = new Array(cands.length).fill(false);
    const sims = cands.map(c => this.cosine(queryV, c.emb));
    
    for (let k = 0; k < Math.min(topK, cands.length); k++) {
      let best = -1, bestScore = -1;
      
      for (let i = 0; i < cands.length; i++) {
        if (chosen[i]) continue;
        
        const diversity = selected.length === 0 ? 0 :
          Math.max(...selected.map((_, j) => {
            const selectedIndex = cands.findIndex(c => c.item === selected[j]);
            return selectedIndex >= 0 ? this.cosine(cands[i].emb, cands[selectedIndex].emb) : 0;
          }));
        
        const score = lambda * sims[i] - (1 - lambda) * diversity;
        if (score > bestScore) { 
          bestScore = score; 
          best = i; 
        }
      }
      
      if (best >= 0) { 
        chosen[best] = true; 
        selected.push(cands[best].item); 
      }
    }
    return selected;
  }

  /**
   * Search with multiple queries for higher recall
   */
  private async vectorSearchMany(queries: string[], limitPerQ = 12, threshold = 0.12): Promise<any[]> {
    const embModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const results: any[] = [];
    
    for (const q of queries) {
      try {
        const e = await embModel.embedContent(q);
        const { data } = await this.supabase.rpc('match_faq_documents', {
          query_embedding: e.embedding.values,
          match_threshold: threshold,
          match_count: limitPerQ
        });
        
        for (const r of (data || [])) {
          results.push({ ...r, _query: q, _emb: e.embedding.values });
        }
      } catch (error) {
        console.error(`Error searching with query "${q}":`, error);
      }
    }
    
    return results;
  }

  /**
   * Use LLM to rerank results by answerability
   */
  private async rerankWithGemini(question: string, candidates: FAQCitation[], topN = 8): Promise<FAQCitation[]> {
    if (candidates.length === 0) return [];
    
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const packed = candidates.map((c, i) =>
        `#${i}\nTitle: ${c.document_name}\nSection: ${c.section_title || ''}\nSnippet: ${c.content_preview}`
      ).join('\n\n');

      const prompt = `Score each chunk for how well it can answer the question (0-100). 
Return JSON array of {index, score}. Question: "${question}"\n\nChunks:\n${packed}`;
      
      const { response } = await model.generateContent(prompt);
      const jsonMatch = response.text().match(/\[[\s\S]*?\]/);
      
      if (!jsonMatch) {
        console.warn('Could not parse reranking JSON, using original order');
        return candidates.slice(0, topN);
      }
      
      const json = JSON.parse(jsonMatch[0]);
      const sorted = [...json]
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .map((j: any) => candidates[j.index])
        .filter(c => c); // Remove any undefined entries
        
      return sorted;
    } catch (error) {
      console.error('Error in LLM reranking:', error);
      // Fallback to original order if reranking fails
      return candidates.slice(0, topN);
    }
  }

  /**
   * Enhanced FAQ search with multi-query expansion, HyDE, MMR, and LLM reranking
   */
  private async searchRelevantFAQDocumentsEnhanced(question: string, finalLimit = 8): Promise<FAQCitation[]> {
    try {
      console.log(`🚀 Starting enhanced FAQ search for: "${question}"`);
      
      // Step 1: Multi-Query Expansion
      const expansions = await this.expandQueriesWithGemini(question);
      console.log(`📝 Generated ${expansions.length} query variations`);
      
      // Step 2: HyDE - Generate hypothetical answer
      const synthetic = await this.hyde(question);
      console.log(`🔍 Generated hypothetical answer for search`);
      
      // Step 3: High-recall search with all queries
      const allQueries = [...expansions, synthetic];
      const raw = await this.vectorSearchMany(allQueries, 12, 0.12);
      console.log(`📊 Retrieved ${raw.length} total chunks from enhanced search`);
      
      if (raw.length === 0) {
        return [];
      }
      
      // Step 4: Transform to citation format with proper FAQCitation interface
      const toCite = raw.map((chunk: any) => ({
        id: chunk.id || 0,
        document_name: chunk.document_name,
        document_type: chunk.document_type || 'FAQ',
        section_title: chunk.section_title,
        guide_category: chunk.guide_category,
        page_number: chunk.page_number,
        chunk_index: chunk.chunk_index || 0,
        similarity: chunk.similarity,
        content_preview: chunk.content,
        _emb: chunk._emb // Keep embedding for MMR
      }));
      
      // Step 5: Apply MMR for diversity and deduplication
      const embModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const qEmb = (await embModel.embedContent(question)).embedding.values;
      const diversified = this.mmr(qEmb, toCite.map(c => ({item: c, emb: c._emb})), 16, 0.75);
      console.log(`🎯 MMR selected ${diversified.length} diverse candidates`);
      
      // Step 6: Remove _emb property before reranking (clean citations)
      const cleanCitations: FAQCitation[] = diversified.map(c => ({
        id: c.id,
        document_name: c.document_name,
        document_type: c.document_type,
        section_title: c.section_title,
        guide_category: c.guide_category,
        page_number: c.page_number,
        chunk_index: c.chunk_index,
        similarity: c.similarity,
        content_preview: c.content_preview
      }));
      
      // Step 7: LLM reranking for final selection
      const topReranked = await this.rerankWithGemini(question, cleanCitations, finalLimit);
      console.log(`⭐ LLM reranking selected top ${topReranked.length} results`);
      
      return topReranked;
    } catch (error) {
      console.error('Error in enhanced FAQ search:', error);
      // Fallback to basic search if enhanced search fails
      console.log('🔄 Falling back to basic search');
      return this.searchRelevantFAQDocuments(question, finalLimit);
    }
  }

  // =============================================================================
  // HYBRID SEARCH METHODS (SEMANTIC + LEXICAL)
  // =============================================================================

  /**
   * Hybrid search combining vector similarity with full-text search
   */
  private async searchRelevantFAQDocumentsHybrid(
    question: string, 
    finalLimit = 8,
    semanticWeight = 0.7,
    lexicalWeight = 0.3
  ): Promise<FAQCitation[]> {
    try {
      console.log(`🔀 Starting hybrid FAQ search for: "${question}"`);
      
      // Generate embedding for the question
      const embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const embeddingResult = await embeddingModel.embedContent(question);
      const queryEmbedding = embeddingResult.embedding.values;
      
      // Perform hybrid search using RPC function
      const { data, error } = await this.supabase.rpc('match_faq_documents_hybrid', {
        query_embedding: queryEmbedding,
        lex_query: question,
        match_count: finalLimit * 2, // Get more candidates for reranking
        semantic_weight: semanticWeight,
        lexical_weight: lexicalWeight
      });

      if (error) {
        throw new Error(`FAQ hybrid search error: ${error.message}`);
      }

      console.log(`📊 Hybrid search returned ${data?.length || 0} candidates`);
      
      // Transform results into FAQ citation format
      const citations: FAQCitation[] = (data || []).map((chunk: any) => ({
        id: chunk.id || 0,
        document_name: chunk.document_name,
        document_type: chunk.document_type || 'FAQ',
        section_title: chunk.section_title,
        guide_category: chunk.guide_category,
        page_number: chunk.page_number,
        chunk_index: chunk.chunk_index || 0,
        similarity: chunk.hybrid_score, // Use hybrid score as similarity
        content_preview: chunk.content
      }));

      // Apply LLM reranking for final precision
      const reranked = await this.rerankWithGemini(question, citations, finalLimit);
      console.log(`⭐ Hybrid search + LLM reranking selected top ${reranked.length} results`);
      
      return reranked;
    } catch (error) {
      console.error('Error in hybrid FAQ search:', error);
      // Fallback to enhanced search if hybrid fails
      console.log('🔄 Falling back to enhanced search');
      return this.searchRelevantFAQDocumentsEnhanced(question, finalLimit);
    }
  }

  /**
   * Hybrid search by category combining vector similarity with full-text search
   */
  private async searchRelevantFAQDocumentsHybridByCategory(
    question: string, 
    category: string, 
    finalLimit = 8,
    semanticWeight = 0.7,
    lexicalWeight = 0.3
  ): Promise<FAQCitation[]> {
    try {
      console.log(`🔀 Starting hybrid FAQ search by category "${category}" for: "${question}"`);
      
      // Generate embedding for the question
      const embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const embeddingResult = await embeddingModel.embedContent(question);
      const queryEmbedding = embeddingResult.embedding.values;
      
      // Perform hybrid search by category using RPC function
      const { data, error } = await this.supabase.rpc('match_faq_documents_hybrid_by_category', {
        query_embedding: queryEmbedding,
        lex_query: question,
        filter_guide_category: category,
        match_count: finalLimit * 2,
        semantic_weight: semanticWeight,
        lexical_weight: lexicalWeight
      });

      if (error) {
        throw new Error(`FAQ hybrid category search error: ${error.message}`);
      }

      console.log(`📊 Hybrid category search returned ${data?.length || 0} candidates`);
      
      // Transform results into FAQ citation format
      const citations: FAQCitation[] = (data || []).map((chunk: any) => ({
        id: chunk.id || 0,
        document_name: chunk.document_name,
        document_type: chunk.document_type || 'FAQ',
        section_title: chunk.section_title,
        guide_category: chunk.guide_category,
        page_number: chunk.page_number,
        chunk_index: chunk.chunk_index || 0,
        similarity: chunk.hybrid_score, // Use hybrid score as similarity
        content_preview: chunk.content
      }));

      // Apply LLM reranking for final precision
      const reranked = await this.rerankWithGemini(question, citations, finalLimit);
      console.log(`⭐ Hybrid category search + LLM reranking selected top ${reranked.length} results`);
      
      return reranked;
    } catch (error) {
      console.error('Error in hybrid FAQ category search:', error);
      // Fallback to enhanced search if hybrid fails
      console.log('🔄 Falling back to enhanced search');
      return this.searchRelevantFAQDocumentsEnhanced(question, finalLimit);
    }
  }

  /**
   * Ultimate FAQ search with full pipeline: hybrid → enhanced → basic fallback
   */
  private async searchRelevantFAQDocumentsUltimate(question: string, finalLimit = 8): Promise<FAQCitation[]> {
    try {
      console.log(`🚀 Starting ultimate FAQ search pipeline for: "${question}"`);
      
      // Try hybrid search first
      const hybridResults = await this.searchRelevantFAQDocumentsHybrid(question, finalLimit);
      
      if (hybridResults.length > 0) {
        console.log(`✅ Ultimate search completed with ${hybridResults.length} hybrid results`);
        return hybridResults;
      }
      
      // Fallback to enhanced search
      console.log('🔄 Hybrid returned no results, trying enhanced search');
      const enhancedResults = await this.searchRelevantFAQDocumentsEnhanced(question, finalLimit);
      
      if (enhancedResults.length > 0) {
        console.log(`✅ Ultimate search completed with ${enhancedResults.length} enhanced results`);
        return enhancedResults;
      }
      
      // Final fallback to basic search
      console.log('🔄 Enhanced returned no results, trying basic search');
      const basicResults = await this.searchRelevantFAQDocuments(question, finalLimit);
      console.log(`✅ Ultimate search completed with ${basicResults.length} basic results`);
      
      return basicResults;
    } catch (error) {
      console.error('Error in ultimate FAQ search:', error);
      // Final fallback to basic search
      return this.searchRelevantFAQDocuments(question, finalLimit);
    }
  }

  // =============================================================================
  // FAQ ANSWER GENERATION
  // =============================================================================

  /**
   * Generate a comprehensive FAQ answer using Gemini 2.5 Flash
   */
  async generateFAQAnswer(
    question: string, 
    citations: FAQCitation[], 
    conversationContext: string = ''
  ): Promise<string> {
    try {
      // DEBUG: Log input parameters
      console.log(`🔍 generateFAQAnswer DEBUG:`);
      console.log(`- Question: "${question}"`);
      console.log(`- Citations count: ${citations.length}`);
      console.log(`- Conversation context length: ${conversationContext.length} chars`);

      // Sort citations by relevance score (highest first)
      const sortedCitations = [...citations].sort((a, b) => b.similarity - a.similarity);

      // Prepare context with better formatting for FAQ content
      const contextChunks = sortedCitations.map((citation, index) => {
        const relevanceIndicator = citation.similarity > 0.8 ? "🎯 HIGH RELEVANCE" : 
                                   citation.similarity > 0.6 ? "📋 MEDIUM RELEVANCE" : 
                                   "📄 LOWER RELEVANCE";
        
        return `[USER GUIDE ${index + 1}] ${relevanceIndicator}
Guide: "${citation.document_name}"
Category: ${citation.guide_category}${citation.section_title ? `
Section: ${citation.section_title}` : ''}
Relevance: ${(citation.similarity * 100).toFixed(1)}%

CONTENT:
${citation.content_preview}

${'='.repeat(80)}`;
      });

      const context = contextChunks.join('\n\n');

      // DEBUG: Log context info
      console.log(`- Context chunks created: ${contextChunks.length}`);
      console.log(`- Total context length: ${context.length} chars`);
      if (context.length === 0) {
        console.log(`⚠️  WARNING: Empty context string generated from citations!`);
      }

      // Citation-free prompt optimized for clean, self-contained responses
      const prompt = `You are a helpful assistant for the Austratics Aged Care Analytics platform. Provide clear, step-by-step guidance using the provided information.

**Instructions:**
1. Start by rephrasing the user's question to show understanding
2. Provide detailed, step-by-step instructions using the content below
3. Use clear formatting with numbered steps and bullet points
4. Write authoritative, self-contained answers without referencing source documents
5. Do NOT reference, cite, name, or link to any documents or sources. Write a complete answer.

**FORMAT STRICTLY AS MARKDOWN:**
- Use H2 (##) for main sections and H3 (###) for subsections
- Always put a blank line before and after each heading
- Use numbered lists with "1.", "2.", ... and bullets with "- "
- Never place a heading on the same line as narrative text; headings start on a new line
- Use **bold** for UI labels (button names, menu items)

${conversationContext ? `**Previous Conversation:**\n${conversationContext}\n` : ''}

**Content:**
${context}

**User Question:** ${question}

**Your Response:**`;

      // Generate response using Gemini 2.5 Flash with enhanced configuration
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          maxOutputTokens: 2500,      // Increased for longer, more detailed responses
          temperature: 0.4,           // Slightly higher for more thoughtful variations
          topK: 40,                   // Allow more diverse word choices
          topP: 0.95,                 // High nucleus sampling for coherent long-form text
          candidateCount: 1           // Single candidate for consistency
        }
      });

      // DEBUG: Log prompt info
      console.log(`- Final prompt length: ${prompt.length} chars`);
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      
      // DEBUG: Log raw response info
      console.log(`- Raw Gemini response object:`, response);
      console.log(`- Response candidates:`, response.candidates?.length);
      
      let answer = response.text()?.trim() || '';

      // DEBUG: Initial extraction attempt
      console.log(`- Initial answer length: ${answer.length} chars`);

      // FALLBACK 1: Mine candidate parts if .text() is empty
      if (!answer && response.candidates) {
        console.log(`🔄 Fallback 1: Extracting from candidates...`);
        const fromCandidates = response.candidates
          .map(c => 
            (c?.content?.parts || [])
              .map(p => (typeof p.text === 'string' ? p.text : ''))
              .join('')
          )
          .find(t => t && t.trim());

        if (fromCandidates && fromCandidates.trim()) {
          answer = fromCandidates.trim();
          console.log(`✅ Fallback 1 success: ${answer.length} chars`);
        } else {
          console.log(`❌ Fallback 1 failed: No valid candidate content`);
        }
      }

      // FALLBACK 2: Retry with shorter prompt + lighter model
      if (!answer) {
        console.log(`🔄 Fallback 2: Retry with simpler model...`);
        try {
          const shortContext = contextChunks.slice(0, 4).join('\n\n'); // top 3-4 chunks
          const retryPrompt = `Answer the user's question using ONLY the context below.
Be concise, step-by-step, and provide a complete self-contained answer.
Format as clean Markdown with proper headings (##, ###) and bullet points (-).

QUESTION: ${question}

CONTEXT:
${shortContext}`;

          const retryModel = this.genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: { 
              maxOutputTokens: 1024, 
              temperature: 0.2, 
              topP: 0.9 
            }
          });

          const retryResult = await retryModel.generateContent(retryPrompt);
          const retryAnswer = retryResult.response.text()?.trim() || '';
          
          if (retryAnswer) {
            answer = retryAnswer;
            console.log(`✅ Fallback 2 success: ${answer.length} chars`);
          } else {
            console.log(`❌ Fallback 2 failed: Empty retry response`);
          }
        } catch (error) {
          console.log(`❌ Fallback 2 error:`, error);
        }
      }

      // FALLBACK 3: Citation-free extractive answer
      if (!answer) {
        console.log(`🔄 Fallback 3: Creating citation-free extractive answer...`);
        const bulletLines = sortedCitations.slice(0, 5).map(c => {
          return `• ${c.content_preview}`;
        }).join('\n\n');

        answer = `## Here's what I found to help with your question:

${bulletLines}

**Tip:** Ask a follow-up if you need more specific guidance.`;

        console.log(`✅ Fallback 3 success: ${answer.length} chars (citation-free extractive)`);
      }

      // Final validation and citation sanitization
      if (answer.length === 0) {
        console.log(`❌ CRITICAL: All fallbacks failed! Using emergency response.`);
        answer = "I apologize, but I'm having trouble generating a response right now. Please try rephrasing your question or try again in a moment.";
      } else {
        console.log(`- Final answer preview: "${answer.substring(0, 100)}..."`);
      }

      // Apply defensive citation sanitization - strip any bracketed references
      const originalLength = answer.length;
      answer = this.stripSourceMentions(answer);
      if (answer.length !== originalLength) {
        console.log(`🧹 Stripped ${originalLength - answer.length} chars of citation references`);
      }

      // Apply strict Markdown formatting for professional presentation
      const preFormattingLength = answer.length;
      answer = this.formatMarkdownStrict(answer);
      if (answer.length !== preFormattingLength) {
        console.log(`📝 Applied formatting changes: ${Math.abs(answer.length - preFormattingLength)} char difference`);
      }

      console.log(`✅ Generated formatted, citation-free FAQ answer (${answer.length} chars)`);
      
      return answer;

    } catch (error) {
      console.error('❌ Error generating FAQ answer:', error);
      console.error('- Error type:', typeof error);
      console.error('- Error message:', error instanceof Error ? error.message : String(error));
      console.error('- Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Build conversation context from chat history
   */
  private buildConversationContext(
    conversationHistory: ChatMessage[], 
    maxMessages: number = 5
  ): string {
    if (!conversationHistory || conversationHistory.length === 0) {
      return '';
    }

    // Take the last N messages for context
    const recentMessages = conversationHistory.slice(-maxMessages);
    
    const contextLines = recentMessages.map(msg => {
      const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
      return `${role}: ${msg.content}`;
    });

    return contextLines.join('\n');
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Cache management for responses
   */
  private getCachedResponse(key: string): ChatResponse | null {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.processing_time < this.CACHE_TTL_MS) {
      return cached;
    }
    this.responseCache.delete(key);
    return null;
  }

  private setCachedResponse(key: string, response: ChatResponse): void {
    if (this.responseCache.size >= this.CACHE_MAX_SIZE) {
      // Remove oldest entry
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey) {
        this.responseCache.delete(firstKey);
      }
    }
    this.responseCache.set(key, response);
  }
}

// Export singleton instance
export const faqChatService = new FAQChatService(); 