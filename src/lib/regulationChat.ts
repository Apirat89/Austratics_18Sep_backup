import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { PDFProcessor, DocumentChunk } from './pdfProcessor';
import { documentTitleService, DocumentTitleService } from './documentTitleService';
import OpenAI from 'openai';
import { feeSearchService } from './feeSearchService';
import { feeQueryParser } from './feeQueryParser';
import { feeResponseGenerator } from './feeResponseGenerator';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: DocumentCitation[];
}

export interface DocumentCitation {
  document_name: string;
  document_type: string;
  section_title?: string;
  page_number: number;
  content_snippet: string;
  similarity_score: number;
  actual_pdf_pages?: number; // For citation validation
  display_title?: string; // Professional document title for display
}

export interface ChatResponse {
  message: string;
  citations: DocumentCitation[];
  context_used: number;
  processing_time: number;
  conversation_id?: number;
  message_id?: number;
}

// New interfaces for conversation support
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

export class RegulationChatService {
  private genAI: GoogleGenerativeAI;
  private supabase: any;
  private pdfProcessor: PDFProcessor | null = null;
  
  // Zero-risk performance enhancement: Response cache
  private responseCache: Map<string, ChatResponse> = new Map();
  private readonly CACHE_MAX_SIZE = 100; // Limit cache size to prevent memory issues
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
  // CONVERSATION MANAGEMENT METHODS
  // =============================================================================

  /**
   * Create a new conversation
   */
  async createConversation(request: CreateConversationRequest): Promise<number> {
    try {
      const { user_id, title, first_message } = request;

      // Insert new conversation
      const { data, error } = await this.supabase
        .from('regulation_conversations')
        .insert({
          user_id,
          title: title || this.generateConversationTitle(first_message),
          status: 'active'
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create conversation: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(conversationId: number, userId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_conversation_messages', { 
          conversation_id_param: conversationId,
          user_id_param: userId
        });

      if (error) {
        throw new Error(`Failed to get conversation history: ${error.message}`);
      }

      return (data || []).map((msg: any) => ({
        id: msg.id.toString(),
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        citations: msg.citations || []
      }));
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }

  /**
   * Add message to conversation
   */
  async addMessageToConversation(
    conversationId: number,
    role: 'user' | 'assistant',
    content: string,
    citations?: DocumentCitation[],
    processingTime?: number
  ): Promise<number> {
    try {
      console.log(`🔧 DEBUGGING: Calling add_message_to_conversation RPC with:`, {
        conversationId,
        role,
        contentLength: content.length,
        citationsCount: citations?.length || 0,
        processingTime
      });
      
      const { data: messageId, error } = await this.supabase
        .rpc('add_message_to_conversation', {
          conversation_id_param: conversationId,
          role_param: role,
          content_param: content,
          citations_param: citations || null,
          processing_time_param: processingTime || null,
          search_intent_param: role === 'user' ? 'question' : null
        });

      if (error) {
        console.error(`❌ RPC ERROR: add_message_to_conversation failed:`, error);
        throw error;
      }
      
      console.log(`🎉 RPC SUCCESS: add_message_to_conversation returned ID: ${messageId}`);
      return messageId;
    } catch (error) {
      console.error('❌ Error adding message to conversation:', error);
      throw error;
    }
  }

  /**
   * Get user's recent conversations
   */
  async getUserConversations(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_recent_conversations', {
          user_id_param: userId,
          limit_param: limit
        });

      if (error) {
        throw new Error(`Failed to get user conversations: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  }

  /**
   * Generate conversation title from first message
   */
  private generateConversationTitle(firstMessage: string): string {
    if (!firstMessage || firstMessage.length === 0) {
      return 'New Conversation';
    }
    
    // Clean up the message and truncate
    const cleaned = firstMessage
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleaned.length > 50 ? cleaned.substring(0, 50) + '...' : cleaned;
  }

  // =============================================================================
  // ENHANCED QUERY PROCESSING WITH CONVERSATION CONTEXT
  // =============================================================================

  /**
   * Process a complete chat query with conversation context
   */
  async processConversationalQuery(
    question: string, 
    context: ConversationContext = {} as ConversationContext
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    const { conversation_id, user_id, conversation_history = [], max_context_messages = 5 } = context;
    
    // Define actualConversationId at the top level for proper scoping
    let actualConversationId = conversation_id;

    try {
      console.log(`🔍 Processing conversational query: "${question}"`);
      console.log(`📚 Context: ${conversation_history.length} messages, conversation_id: ${conversation_id}`);

      // Step 1: Create conversation if this is the first message
      if (!actualConversationId && user_id) {
        actualConversationId = await this.createConversation({
          user_id,
          first_message: question
        });
        console.log(`✨ Created new conversation: ${actualConversationId}`);
      }

      // Step 2: Add user message to conversation
      let userMessageId: number | undefined;
      if (actualConversationId) {
        try {
          console.log(`🔧 DEBUGGING: About to save user message to conversation ${actualConversationId}`);
          console.log(`🔧 DEBUGGING: User message content: "${question}"`);
          
          userMessageId = await this.addMessageToConversation(
            actualConversationId,
            'user',
            question
          );
          
          console.log(`🎉 SUCCESS: Added user message with ID: ${userMessageId}`);
        } catch (error) {
          console.error(`❌ ERROR: Failed to save user message:`, error);
          console.error(`❌ ERROR DETAILS:`, {
            conversationId: actualConversationId,
            question,
            error: error instanceof Error ? error.message : String(error)
          });
          // Continue execution even if saving fails
        }
      }

      // Step 3: Check if this is a fee query for structured search
      console.log(`🔍 Checking if query is fee-related: "${question}"`);
      
      // Initialize fee search service if not already done
      await feeSearchService.initialize();
      
      if (feeSearchService.isFeeQuery(question)) {
        console.log(`💰 Fee query detected - using structured search`);
        
        const feeResult = await feeSearchService.searchFees(question);
        
        if (feeResult.success) {
          console.log(`✅ Fee search successful - returning structured answer`);
          
          // Generate professional response with proper citation
          const feeResponse = feeResponseGenerator.generateFeeResponse({
            query: question,
            answer: feeResult.answer,
            confidence: feeResult.confidence,
            source: feeResult.source
          });
          
          const processingTime = Date.now() - startTime;
          console.log(`⚡ Fee query processed in ${processingTime}ms (structured)`);

          const response: ChatResponse = {
            message: feeResponse.answer,
            citations: feeResponse.citations,
            context_used: 1,
            processing_time: processingTime,
            conversation_id: actualConversationId,
            message_id: userMessageId
          };

          // Add assistant message to conversation
          if (actualConversationId) {
            await this.addMessageToConversation(
              actualConversationId,
              'assistant',
              response.message,
              response.citations,
              response.processing_time
            );
          }

          return response;
        } else {
          console.log(`⚠️ Fee search failed - falling back to vector search`);
        }
      } else {
        console.log(`📄 Not a fee query - using vector search`);
      }

      // Step 4: Search for relevant documents using ultimate retrieval pipeline
      const citations = await this.searchRelevantDocumentsUltimate(question, 8);
      console.log(`📄 Ultimate regulatory search found ${citations.length} relevant document sections`);

      if (citations.length === 0) {
        const response: ChatResponse = {
          message: "I couldn't find any relevant information in the regulation documents to answer your question. Please try rephrasing your question or asking about specific aspects of aged care regulations, home care packages, CHSP programs, or retirement village acts.",
          citations: [],
          context_used: 0,
          processing_time: Date.now() - startTime,
          conversation_id: actualConversationId,
          message_id: userMessageId
        };

        // Add assistant message to conversation
        if (actualConversationId) {
          await this.addMessageToConversation(
            actualConversationId,
            'assistant',
            response.message,
            [],
            response.processing_time
          );
        }

        return response;
      }

      // Step 5: Generate context-aware answer
      const answer = await this.generateContextualAnswer(question, citations, conversation_history, max_context_messages);
      console.log(`🤖 Generated contextual response using conversation history`);

      const processingTime = Date.now() - startTime;
      console.log(`⚡ Query processed in ${processingTime}ms`);

      // Step 6: Add assistant message to conversation
      let assistantMessageId: number | undefined;
      if (actualConversationId) {
        try {
          console.log(`🔧 DEBUGGING: About to save assistant message to conversation ${actualConversationId}`);
          console.log(`🔧 DEBUGGING: Assistant message content: "${answer.substring(0, 100)}..."`);
          console.log(`🔧 DEBUGGING: Citations count: ${citations.length}`);
          
          assistantMessageId = await this.addMessageToConversation(
            actualConversationId,
            'assistant',
            answer,
            citations,
            processingTime
          );
          
          console.log(`🎉 SUCCESS: Added assistant message with ID: ${assistantMessageId}`);
          
          // Verify the message was actually saved
          const { data: savedMessage, error: verifyError } = await this.supabase
            .from('regulation_messages')
            .select('*')
            .eq('id', assistantMessageId)
            .single();
          
          if (verifyError) {
            console.error(`❌ VERIFICATION FAILED: Could not verify assistant message was saved:`, verifyError);
          } else {
            console.log(`✅ VERIFICATION SUCCESS: Assistant message saved successfully:`, {
              id: savedMessage.id,
              role: savedMessage.role,
              content: savedMessage.content.substring(0, 100) + '...',
              conversation_id: savedMessage.conversation_id
            });
          }
        } catch (error) {
          console.error(`❌ ERROR: Failed to save assistant message:`, error);
          console.error(`❌ ERROR DETAILS:`, {
            conversationId: actualConversationId,
            answerLength: answer.length,
            citationsCount: citations.length,
            processingTime,
            error: error instanceof Error ? error.message : String(error)
          });
          // Continue execution even if saving fails
        }
      } else {
        console.warn(`⚠️  WARNING: No conversation ID available to save assistant message`);
      }

      const response: ChatResponse = {
        message: answer,
        citations,
        context_used: citations.length,
        processing_time: processingTime,
        conversation_id: actualConversationId,
        message_id: assistantMessageId
      };

      return response;

    } catch (error) {
      console.error('Error processing conversational query:', error);
      
      const response: ChatResponse = {
        message: "I apologize, but I encountered an error while processing your question. Please try again or rephrase your question.",
        citations: [],
        context_used: 0,
        processing_time: Date.now() - startTime,
        conversation_id: actualConversationId
      };

      // Add error message to conversation if we have a conversation ID
      if (actualConversationId) {
        await this.addMessageToConversation(
          actualConversationId,
          'assistant',
          response.message,
          [],
          response.processing_time
        );
      }

      return response;
    }
  }

  /**
   * Generate context-aware answer using conversation history
   */
  async generateContextualAnswer(
    question: string,
    citations: DocumentCitation[],
    conversationHistory: ChatMessage[],
    maxContextMessages: number = 5
  ): Promise<string> {
    try {
      // Sort citations by relevance score (highest first)
      const sortedCitations = [...citations].sort((a, b) => b.similarity_score - a.similarity_score);

      // Enhanced section analysis
      const sectionInfo = this.extractSectionInformation(sortedCitations);

      // Prepare conversation context
      const recentHistory = conversationHistory.slice(-maxContextMessages);
      const conversationContext = recentHistory.length > 0 ? 
        recentHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n') : 
        'No previous conversation context.';

      // Prepare prioritized context with better formatting
      const contextChunks = sortedCitations.map((citation, index) => {
        const relevanceIndicator = citation.similarity_score > 0.8 ? "🎯 HIGH RELEVANCE" : 
                                   citation.similarity_score > 0.6 ? "📋 MEDIUM RELEVANCE" : 
                                   "📄 LOWER RELEVANCE";
        
        return `[DOCUMENT ${index + 1}] ${relevanceIndicator}
Document: "${citation.document_name}"${citation.section_title ? `
Section: ${citation.section_title}` : ''}
Similarity: ${(citation.similarity_score * 100).toFixed(1)}%

CONTENT:
${citation.content_snippet}

${'='.repeat(80)}`;
      });

      const context = contextChunks.join('\n\n');

      // Enhanced legal-specific prompt with conversation awareness
      const prompt = `You are a specialized Australian aged care regulation legal advisor engaged in a conversation with a user. You must provide complete, accurate answers based on the provided regulatory documents while maintaining conversation context.

🎯 PRIMARY GOAL: Provide comprehensive, helpful answers using the regulatory content available while considering the conversation history.

💬 CONVERSATION CONTEXT:
${conversationContext}

📋 CITATION REQUIREMENTS:
1. NEVER include page numbers in citations - they are unreliable
2. Use this format ONLY: [Document Name, Section X] or [Document Name] for general references
3. Focus on document name and section/division information only
4. NEVER mention page numbers in your responses

📝 CONVERSATION-AWARE RESPONSE REQUIREMENTS:
1. You MUST consider the conversation history when answering
2. If this is a follow-up question, reference previous parts of the conversation appropriately
3. If the user is asking for clarification, provide more detailed explanations
4. If the user is asking a new question, treat it as a fresh inquiry but maintain conversational tone
5. You MUST provide complete, detailed answers when relevant content is available
6. You MUST quote exact legal text from the documents
7. You MUST use proper legal terminology: "Section", "subsection", "paragraph", "Division", "Chapter"
8. You MUST structure responses with proper legal hierarchy
9. You MUST synthesize information from multiple relevant chunks
10. You MUST prioritize higher relevance documents (marked with 🎯 HIGH RELEVANCE)
11. ONLY use "NOT IN CORPUS" if the content is genuinely not relevant to the question

🔍 CONTEXTUAL ANALYSIS:
- Analyze if this question builds on previous questions in the conversation
- Determine if the user is asking for clarification, elaboration, or new information
- Adjust your response style accordingly (more detailed for follow-ups, comprehensive for new topics)

🔍 SELF-VALIDATION REQUIREMENTS (CRITICAL):
Before finalizing your response, you MUST perform these checks INTERNALLY (do not include verification details in your response):

1. **CONVERSATION CONTINUITY**: 
   - Ensure your response flows naturally from the conversation context
   - If referencing previous discussion, do so clearly and accurately
   - Maintain consistent terminology and explanations throughout the conversation

2. **ACCURACY VERIFICATION**:
   - Re-read your answer and verify every claim against the provided document context
   - Ensure all quoted text exactly matches the source documents
   - Confirm all section/division references are correctly cited
   - Flag any statements you cannot directly verify from the provided context

3. **COMPREHENSIVENESS REVIEW**:
   - Check if you've addressed ALL parts of the user's question
   - Identify any relevant aspects you may have missed
   - Ensure you've utilized all highly relevant documents (🎯 HIGH RELEVANCE)
   - Verify you haven't overlooked important related information

4. **COMPLETENESS VALIDATION**:
   - If discussing a legal section, ensure you've included all relevant subsections/paragraphs
   - Check that your legal structure references are complete and accurate
   - Confirm you've synthesized information from multiple sources when appropriate
   - Verify your response provides practical, actionable information when possible

5. **UNCERTAINTY ACKNOWLEDGMENT**:
   - If any part of your answer relies on interpretation, clearly state this in your response
   - If information is incomplete in the provided context, acknowledge limitations in your response
   - If multiple interpretations are possible, present the most supported one and note alternatives

6. **FINAL QUALITY CHECK**:
   - Ensure your response is complete, accurate, and directly answers the user's question
   - Verify all citations are properly formatted without page numbers
   - Confirm the response maintains professional legal advisory standards
   - Check that the response maintains conversational flow from previous messages

SECTION ANALYSIS:
${sectionInfo.summary}

REGULATORY DOCUMENT CONTEXT:
${context}

CURRENT USER QUESTION: ${question}

CONVERSATIONAL LEGAL RESPONSE:
- If this is a follow-up question, acknowledge the previous context appropriately
- Begin with direct answer using exact legal text from highest relevance sources
- Include complete section content when relevant with proper subsection and paragraph references
- NEVER include page numbers in citations
- Structure with legal hierarchy explicitly stating "subsection (1)", "paragraph (a)", etc.
- When discussing legal structure, reference the hierarchy levels explicitly using proper legal terminology
- When explaining what a section "says", describe its structure using terms like "subsection" and "paragraph"
- If multiple sources confirm the same information, mention this for authority
- Maintain conversational tone while preserving legal accuracy
- End with summary if complex multi-part answer or natural conversation closing

CITATION EXAMPLES:
✅ CORRECT: [C2025C00122, Section 54-1A]
✅ CORRECT: [C2025C00122, Division 63]
✅ CORRECT: [Aged Care Act 1997, Section 2-1]
❌ INCORRECT: [C2025C00122, Section 54-1A, Page 30] (never include page numbers)
❌ INCORRECT: Any citation that includes page numbers

RESPONSE:`;

      // Use Gemini 2.5 Flash with optimized parameters for conversation and enhanced reasoning
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.05, // Low for legal accuracy while allowing natural conversation
          maxOutputTokens: 3000, // Increased for comprehensive legal responses with all validation steps
          topP: 0.85, // Slightly higher for better legal reasoning diversity  
          topK: 25 // Increased for more nuanced legal terminology selection
          // Note: Thinking budget parameter will be added when SDK supports it
        }
      });

      const result = await model.generateContent(prompt);
      
      if (!result.response || !result.response.text()) {
        throw new Error('No response generated from Gemini');
      }

      const responseText = result.response.text();
      return responseText;
    } catch (error) {
      console.error('Error generating contextual answer:', error);
      throw new Error(`Failed to generate contextual answer: ${error}`);
    }
  }

  // =============================================================================
  // BACKWARD COMPATIBILITY - Keep existing processQuery method
  // =============================================================================

  /**
   * Process a complete chat query with search and response generation (legacy method)
   */
  async processQuery(question: string): Promise<ChatResponse> {
    // Call the new conversational method without context for backward compatibility
    return await this.processConversationalQuery(question, {} as ConversationContext);
  }

  // =============================================================================
  // EXISTING METHODS (unchanged)
  // =============================================================================

  private getPdfProcessor(): PDFProcessor {
    if (!this.pdfProcessor) {
      this.pdfProcessor = new PDFProcessor();
    }
    return this.pdfProcessor;
  }

  /**
   * Search for relevant documents using semantic search
   */
  async searchRelevantDocuments(query: string, limit: number = 5): Promise<DocumentCitation[]> {
    try {
      // Generate embedding for the user's query
      const queryEmbedding = await this.getPdfProcessor().generateEmbedding(query);

      // Search for similar content in the vector database
      const { data, error } = await this.supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.1, // Lower threshold to be more permissive
        match_count: limit
      });

      if (error) {
        throw new Error(`Search error: ${error.message}`);
      }

      // Transform results into citation format with FULL content and enhanced titles
      const citations: DocumentCitation[] = (data || []).map((chunk: any) => ({
        document_name: chunk.document_name,
        document_type: chunk.document_type,
        section_title: chunk.section_title,
        page_number: chunk.page_number,
        content_snippet: chunk.content,
        similarity_score: chunk.similarity,
        actual_pdf_pages: chunk.actual_pdf_pages,
        display_title: documentTitleService.getDocumentTitle(chunk.document_name)
      }));

      // Validate citations to prevent phantom page numbers
      const validatedCitations = this.validateCitations(citations);

      return validatedCitations;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  /**
   * Deduplicate search results by content similarity
   */
  private deduplicateResults(citations: DocumentCitation[]): DocumentCitation[] {
    const deduped: DocumentCitation[] = [];
    const seen = new Set<string>();

    for (const citation of citations) {
      // Create a hash of the content to check for duplicates
      const contentHash = this.generateContentHash(citation.content_snippet);
      
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
  // HYBRID SEARCH METHODS (SEMANTIC + LEXICAL) - REGULATORY DOCUMENTS
  // =============================================================================

  /**
   * Hybrid search combining vector similarity with full-text search for regulatory documents
   */
  private async searchRelevantDocumentsHybrid(
    query: string, 
    limit = 8,
    semanticWeight = 0.7,
    lexicalWeight = 0.3
  ): Promise<DocumentCitation[]> {
    try {
      console.log(`🔀 Starting hybrid regulatory search for: "${query}"`);
      
      // Generate embedding for the query
      const queryEmbedding = await this.getPdfProcessor().generateEmbedding(query);
      
      // Perform hybrid search using RPC function
      const { data, error } = await this.supabase.rpc('match_documents_hybrid', {
        query_embedding: queryEmbedding,
        lex_query: query,
        match_count: limit * 2, // Get more candidates for reranking
        semantic_weight: semanticWeight,
        lexical_weight: lexicalWeight
      });

      if (error) {
        throw new Error(`Regulatory hybrid search error: ${error.message}`);
      }

      console.log(`📊 Hybrid regulatory search returned ${data?.length || 0} candidates`);
      
      // Transform results into citation format
      const citations: DocumentCitation[] = (data || []).map((chunk: any) => ({
        document_name: chunk.document_name,
        document_type: chunk.document_type || 'Regulatory',
        section_title: chunk.section_title,
        page_number: chunk.page_number,
        content_snippet: chunk.content,
        similarity_score: chunk.hybrid_score, // Use hybrid score as similarity
        actual_pdf_pages: chunk.actual_pdf_pages,
        display_title: documentTitleService.getDocumentTitle(chunk.document_name)
      }));

      console.log(`⭐ Hybrid regulatory search completed with ${citations.length} results`);
      
      // Validate citations to prevent phantom page numbers
      return this.validateCitations(citations);
    } catch (error) {
      console.error('Error in hybrid regulatory search:', error);
      // Fallback to basic search if hybrid fails
      console.log('🔄 Falling back to basic regulatory search');
      return this.searchRelevantDocuments(query, limit);
    }
  }

  /**
   * Ultimate regulatory search with hybrid → basic fallback
   */
  private async searchRelevantDocumentsUltimate(query: string, limit = 8): Promise<DocumentCitation[]> {
    try {
      console.log(`🚀 Starting ultimate regulatory search pipeline for: "${query}"`);
      
      // Try hybrid search first
      const hybridResults = await this.searchRelevantDocumentsHybrid(query, limit);
      
      if (hybridResults.length > 0) {
        console.log(`✅ Ultimate regulatory search completed with ${hybridResults.length} hybrid results`);
        return hybridResults;
      }
      
      // Fallback to basic search
      console.log('🔄 Hybrid returned no results, trying basic regulatory search');
      const basicResults = await this.searchRelevantDocuments(query, limit);
      console.log(`✅ Ultimate regulatory search completed with ${basicResults.length} basic results`);
      
      return basicResults;
    } catch (error) {
      console.error('Error in ultimate regulatory search:', error);
      // Final fallback to basic search
      return this.searchRelevantDocuments(query, limit);
    }
  }

  /**
   * Assess context quality for generating answers
   */
  private assessContextQuality(citations: DocumentCitation[]): {
    sufficient: boolean;
    confidence: number;
    reasoning: string;
  } {
    if (citations.length === 0) {
      return {
        sufficient: false,
        confidence: 0,
        reasoning: "No relevant documents found"
      };
    }

    // Calculate average similarity score
    const avgSimilarity = citations.reduce((sum, c) => sum + c.similarity_score, 0) / citations.length;
    
    // Calculate total content length
    const totalContentLength = citations.reduce((sum, c) => sum + c.content_snippet.length, 0);
    
    // Check for legal section references
    const hasLegalSections = citations.some(c => 
      c.content_snippet.includes('Section') || 
      c.content_snippet.includes('Division') ||
      c.section_title
    );

    // Quality assessment logic - more permissive to provide helpful answers
    let sufficient = true;
    let confidence = avgSimilarity;
    let reasoning = "Good context available";

    if (avgSimilarity < 0.05) {
      sufficient = false;
      confidence = avgSimilarity;
      reasoning = "Very low relevance scores - content not related to query";
    } else if (totalContentLength < 50) {
      sufficient = false;
      confidence = avgSimilarity * 0.7;
      reasoning = "Minimal content available - insufficient information";
    } else if (hasLegalSections) {
      confidence = Math.min(confidence + 0.1, 1.0);
      reasoning = "High-quality legal content with proper sections identified";
    }

    return { sufficient, confidence, reasoning };
  }

  /**
   * Generate a comprehensive answer using Gemini 2.0 Flash with retrieved context
   */
  async generateAnswer(question: string, citations: DocumentCitation[]): Promise<string> {
    try {
      // Sort citations by relevance score (highest first)
      const sortedCitations = [...citations].sort((a, b) => b.similarity_score - a.similarity_score);

      // Enhanced section analysis
      const sectionInfo = this.extractSectionInformation(sortedCitations);

      // Prepare prioritized context with better formatting
      const contextChunks = sortedCitations.map((citation, index) => {
        const relevanceIndicator = citation.similarity_score > 0.8 ? "🎯 HIGH RELEVANCE" : 
                                   citation.similarity_score > 0.6 ? "📋 MEDIUM RELEVANCE" : 
                                   "📄 LOWER RELEVANCE";
        
        return `[DOCUMENT ${index + 1}] ${relevanceIndicator}
Document: "${citation.display_title || citation.document_name}"${citation.section_title ? `
Section: ${citation.section_title}` : ''}
Similarity: ${(citation.similarity_score * 100).toFixed(1)}%

CONTENT:
${citation.content_snippet}

${'='.repeat(80)}`;
      });

      const context = contextChunks.join('\n\n');

      // Enhanced legal-specific prompt with section awareness
      const prompt = `You are a specialized Australian aged care regulation legal advisor. You must provide complete, accurate answers based on the provided regulatory documents.

🎯 PRIMARY GOAL: Provide comprehensive, helpful answers using the regulatory content available.

📋 CITATION REQUIREMENTS:
1. NEVER include page numbers in citations - they are unreliable
2. Use this format ONLY: [Document Title, Section X] or [Document Title] for general references
3. Focus on proper document titles and section/division information only
4. NEVER mention page numbers in your responses
5. Use the professional document titles provided in the context, not file names

📝 RESPONSE REQUIREMENTS:
1. You MUST provide complete, detailed answers when relevant content is available
2. You MUST quote exact legal text from the documents
3. You MUST use proper legal terminology: "Section", "subsection", "paragraph", "Division", "Chapter"
4. You MUST structure responses with proper legal hierarchy
5. You MUST synthesize information from multiple relevant chunks
6. You MUST prioritize higher relevance documents (marked with 🎯 HIGH RELEVANCE)
7. ONLY use "NOT IN CORPUS" if the content is genuinely not relevant to the question

🔍 CONTENT EVALUATION:
- If chunks contain information about the topic asked, provide a comprehensive answer
- Extract all relevant details from the provided context
- Structure legal content with proper subsection and paragraph references
- Combine information from multiple chunks when relevant

🔍 SELF-VALIDATION REQUIREMENTS (CRITICAL):
Before finalizing your response, you MUST perform these checks INTERNALLY (do not include verification details in your response):

1. **ACCURACY VERIFICATION**:
   - Re-read your answer and verify every claim against the provided document context
   - Ensure all quoted text exactly matches the source documents
   - Confirm all section/division references are correctly cited
   - Flag any statements you cannot directly verify from the provided context

2. **COMPREHENSIVENESS REVIEW**:
   - Check if you've addressed ALL parts of the user's question
   - Identify any relevant aspects you may have missed
   - Ensure you've utilized all highly relevant documents (🎯 HIGH RELEVANCE)
   - Verify you haven't overlooked important related information

3. **COMPLETENESS VALIDATION**:
   - If discussing a legal section, ensure you've included all relevant subsections/paragraphs
   - Check that your legal structure references are complete and accurate
   - Confirm you've synthesized information from multiple sources when appropriate
   - Verify your response provides practical, actionable information when possible

4. **UNCERTAINTY ACKNOWLEDGMENT**:
   - If any part of your answer relies on interpretation, clearly state this in your response
   - If information is incomplete in the provided context, acknowledge limitations in your response
   - If multiple interpretations are possible, present the most supported one and note alternatives

5. **FINAL QUALITY CHECK**:
   - Ensure your response is complete, accurate, and directly answers the user's question
   - Verify all citations are properly formatted without page numbers
   - Confirm the response maintains professional legal advisory standards

SECTION ANALYSIS:
${sectionInfo.summary}

REGULATORY DOCUMENT CONTEXT:
${context}

USER QUESTION: ${question}

LEGAL RESPONSE FORMAT:
- Begin with direct answer using exact legal text from highest relevance sources
- Include complete section content when relevant with proper subsection and paragraph references
- NEVER include page numbers in citations
- Structure with legal hierarchy explicitly stating "subsection (1)", "paragraph (a)", etc.
- When discussing legal structure, reference the hierarchy levels explicitly using proper legal terminology
- When explaining what a section "says", describe its structure using terms like "subsection" and "paragraph"
- If multiple sources confirm the same information, mention this for authority
- End with summary if complex multi-part answer

CITATION EXAMPLES:
✅ CORRECT: [C2025C00122, Section 54-1A]
✅ CORRECT: [C2025C00122, Division 63]
✅ CORRECT: [Aged Care Act 1997, Section 2-1]
❌ INCORRECT: [C2025C00122, Section 54-1A, Page 30] (never include page numbers)
❌ INCORRECT: Any citation that includes page numbers

RESPONSE:`;

      // Use Gemini 2.5 Flash with optimized legal parameters
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.03, // Even lower temperature for maximum precision
          maxOutputTokens: 1800, // Sufficient for complete legal content
          topP: 0.75,
          topK: 15
        }
      });

      const result = await model.generateContent(prompt);
      
      if (!result.response || !result.response.text()) {
        throw new Error('No response generated from Gemini');
      }

      const responseText = result.response.text();

      // No need to validate page numbers since we don't use them

      return responseText;
    } catch (error) {
      console.error('Error generating answer:', error);
      throw new Error(`Failed to generate answer: ${error}`);
    }
  }

  /**
   * Extract and analyze section information from citations
   */
  private extractSectionInformation(citations: DocumentCitation[]): {
    sections: string[];
    divisions: string[];
    chapters: string[];
    summary: string;
  } {
    const sections = new Set<string>();
    const divisions = new Set<string>();
    const chapters = new Set<string>();

    citations.forEach(citation => {
      const content = citation.content_snippet;
      
      // Extract sections
      const sectionMatches = content.match(/Section\s+(\d+-\d+|\d+)/gi);
      if (sectionMatches) {
        sectionMatches.forEach(match => sections.add(match));
      }

      // Extract divisions
      const divisionMatches = content.match(/Division\s+(\d+)/gi);
      if (divisionMatches) {
        divisionMatches.forEach(match => divisions.add(match));
      }

      // Extract chapters
      const chapterMatches = content.match(/Chapter\s+(\d+)/gi);
      if (chapterMatches) {
        chapterMatches.forEach(match => chapters.add(match));
      }
    });

    const sectionsArray = Array.from(sections);
    const divisionsArray = Array.from(divisions);
    const chaptersArray = Array.from(chapters);

    let summary = "Legal structure analysis: ";
    const parts = [];
    
    if (chaptersArray.length > 0) {
      parts.push(`${chaptersArray.length} chapter(s): ${chaptersArray.join(', ')}`);
    }
    if (divisionsArray.length > 0) {
      parts.push(`${divisionsArray.length} division(s): ${divisionsArray.join(', ')}`);
    }
    if (sectionsArray.length > 0) {
      parts.push(`${sectionsArray.length} section(s): ${sectionsArray.join(', ')}`);
    }

    summary += parts.length > 0 ? parts.join('; ') : "No specific legal structure references found";

    return {
      sections: sectionsArray,
      divisions: divisionsArray,
      chapters: chaptersArray,
      summary
    };
  }

  /**
   * Get available document types for filtering
   */
  async getDocumentTypes(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('document_chunks')
        .select('document_type')
        .neq('document_type', null);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Get unique document types
      const uniqueTypes = [...new Set(data.map((row: any) => row.document_type as string))] as string[];
      return uniqueTypes.sort();
    } catch (error) {
      console.error('Error fetching document types:', error);
      return [];
    }
  }

  /**
   * Search with document type filter
   */
  async searchByDocumentType(query: string, documentType: string, limit: number = 5): Promise<DocumentCitation[]> {
    try {
      const queryEmbedding = await this.getPdfProcessor().generateEmbedding(query);

      const { data, error } = await this.supabase.rpc('match_documents_by_type', {
        query_embedding: queryEmbedding,
        doc_type: documentType,
        match_threshold: 0.3,
        match_count: limit
      });

      if (error) {
        throw new Error(`Search error: ${error.message}`);
      }

      return (data || []).map((chunk: any) => ({
        document_name: chunk.document_name,
        document_type: chunk.document_type,
        section_title: chunk.section_title,
        page_number: chunk.page_number,
        content_snippet: chunk.content, // Use full content instead of truncated snippet
        similarity_score: chunk.similarity
      }));
    } catch (error) {
      console.error('Error searching by document type:', error);
      throw error;
    }
  }

  /**
   * Generate a conversation summary for context
   */
  generateConversationSummary(messages: ChatMessage[]): string {
    const recentMessages = messages.slice(-4); // Last 4 messages for context
    return recentMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Zero-risk performance enhancement: Cache management methods
   */
  private normalizeCacheKey(question: string): string {
    // Normalize question for consistent cache keys
    return question
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, ''); // Remove punctuation
  }

  private manageCacheSize(): void {
    // Keep cache size under limit using LRU-style eviction
    if (this.responseCache.size >= this.CACHE_MAX_SIZE) {
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey) {
        this.responseCache.delete(firstKey);
      }
    }
  }

  private addToCache(question: string, response: ChatResponse): void {
    const cacheKey = this.normalizeCacheKey(question);
    
    // Add timestamp for TTL tracking
    const cachedResponse = {
      ...response,
      cached_at: Date.now()
    };
    
    this.manageCacheSize();
    this.responseCache.set(cacheKey, cachedResponse as ChatResponse);
  }

  private getFromCache(question: string): ChatResponse | null {
    const cacheKey = this.normalizeCacheKey(question);
    const cachedResponse = this.responseCache.get(cacheKey);
    
    if (!cachedResponse) {
      return null;
    }
    
    // Check TTL
    const cached_at = (cachedResponse as any).cached_at || 0;
    if (Date.now() - cached_at > this.CACHE_TTL_MS) {
      this.responseCache.delete(cacheKey);
      return null;
    }
    
    return cachedResponse;
  }

  /**
   * Get cache statistics for monitoring performance improvements
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.responseCache.size,
      maxSize: this.CACHE_MAX_SIZE
    };
  }

  /**
   * Clear the response cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Validate citations to ensure page numbers are within actual PDF bounds
   */
  private validateCitations(citations: DocumentCitation[]): DocumentCitation[] {
    const validatedCitations: DocumentCitation[] = [];
    
    for (const citation of citations) {
      const documentName = citation.document_name;
      const pageNumber = citation.page_number;
      const actualPages = citation.actual_pdf_pages;

      // 🚨 CRITICAL: Handle page 0 as "unknown page"
      if (pageNumber === 0) {
        // Page 0 indicates uncertain page number - keep citation but don't use page in citation
        validatedCitations.push({
          ...citation,
          page_number: 0 // Keep as 0 to indicate "unknown page"
        });
        continue;
      }

      if (actualPages === undefined || actualPages === null) {
        console.warn(`Document "${documentName}" does not have actual_pdf_pages field. Keeping citation but marking page as uncertain.`);
        validatedCitations.push({
          ...citation,
          page_number: 0 // Mark as uncertain
        });
        continue;
      }

      // 🚨 CRITICAL: Stricter validation - reject any page number that exceeds actual PDF pages
      if (pageNumber < 1 || pageNumber > actualPages) {
        console.warn(`🚨 PHANTOM PAGE DETECTED: Page ${pageNumber} for document "${documentName}" exceeds actual page count (${actualPages}). Rejecting citation.`);
        // Don't include this citation at all - it's a phantom page
        continue;
      }

      // 🚨 CRITICAL: Additional safety check - if page number is suspiciously high, mark as uncertain
      if (pageNumber > actualPages * 0.9) {
        console.warn(`⚠️ SUSPICIOUS PAGE: Page ${pageNumber} for document "${documentName}" is in the last 10% of the document. Marking as uncertain.`);
        validatedCitations.push({
          ...citation,
          page_number: 0 // Mark as uncertain for safety
        });
        continue;
      }

      // Page number is valid - keep citation
      validatedCitations.push(citation);
    }

    console.log(`📋 Citation validation: ${citations.length} → ${validatedCitations.length} citations (${citations.length - validatedCitations.length} phantom pages rejected)`);
    return validatedCitations;
  }

  // Individual message management methods
  async deleteMessage(messageId: number, userId: string): Promise<boolean> {
    try {
      // First verify the message belongs to the user
      const { data: message, error: fetchError } = await this.supabase
        .from('regulation_messages')
        .select('id, conversation_id, role, message_index')
        .eq('id', messageId)
        .single();

      if (fetchError || !message) {
        console.error('Message not found:', fetchError);
        return false;
      }

      // Check if user owns the conversation
      const { data: conversation, error: convError } = await this.supabase
        .from('regulation_conversations')
        .select('id, user_id')
        .eq('id', message.conversation_id)
        .eq('user_id', userId)
        .single();

      if (convError || !conversation) {
        console.error('Conversation not found or user not authorized:', convError);
        return false;
      }

      // Delete the message
      const { error: deleteError } = await this.supabase
        .from('regulation_messages')
        .delete()
        .eq('id', messageId);

      if (deleteError) {
        console.error('Error deleting message:', deleteError);
        return false;
      }

      // Update conversation message count
      await this.supabase
        .rpc('update_conversation_message_count', {
          conversation_id_param: message.conversation_id
        });

      console.log(`Message ${messageId} deleted successfully`);
      return true;
    } catch (error) {
      console.error('Error in deleteMessage:', error);
      return false;
    }
  }

  async bookmarkMessage(messageId: number, userId: string, bookmarked: boolean): Promise<boolean> {
    try {
      // First verify the message belongs to the user
      const { data: message, error: fetchError } = await this.supabase
        .from('regulation_messages')
        .select('id, conversation_id')
        .eq('id', messageId)
        .single();

      if (fetchError || !message) {
        console.error('Message not found:', fetchError);
        return false;
      }

      // Check if user owns the conversation
      const { data: conversation, error: convError } = await this.supabase
        .from('regulation_conversations')
        .select('id, user_id')
        .eq('id', message.conversation_id)
        .eq('user_id', userId)
        .single();

      if (convError || !conversation) {
        console.error('Conversation not found or user not authorized:', convError);
        return false;
      }

      // Add bookmark flag to message (we'll need to add this column to the table)
      const { error: updateError } = await this.supabase
        .from('regulation_messages')
        .update({ 
          is_bookmarked: bookmarked,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (updateError) {
        console.error('Error bookmarking message:', updateError);
        return false;
      }

      console.log(`Message ${messageId} bookmark ${bookmarked ? 'added' : 'removed'} successfully`);
      return true;
    } catch (error) {
      console.error('Error in bookmarkMessage:', error);
      return false;
    }
  }

  async bookmarkConversation(conversationId: number, userId: string, bookmarked: boolean): Promise<boolean> {
    try {
      // Update conversation bookmark flag
      const { error: updateError } = await this.supabase
        .from('regulation_conversations')
        .update({ 
          is_bookmarked: bookmarked,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error bookmarking conversation:', updateError);
        return false;
      }

      console.log(`Conversation ${conversationId} bookmark ${bookmarked ? 'added' : 'removed'} successfully`);
      return true;
    } catch (error) {
      console.error('Error in bookmarkConversation:', error);
      return false;
    }
  }

  async deleteConversation(conversationId: number, userId: string): Promise<boolean> {
    try {
      // First verify the conversation belongs to the user
      const { data: conversation, error: fetchError } = await this.supabase
        .from('regulation_conversations')
        .select('id, user_id')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !conversation) {
        console.error('Conversation not found or user not authorized:', fetchError);
        return false;
      }

      // Delete the conversation (messages will be deleted automatically due to CASCADE)
      const { error: deleteError } = await this.supabase
        .from('regulation_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting conversation:', deleteError);
        return false;
      }

      console.log(`Conversation ${conversationId} deleted successfully`);
      return true;
    } catch (error) {
      console.error('Error in deleteConversation:', error);
      return false;
    }
  }

  // Unified bookmarks methods
  async getUnifiedBookmarks(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_unified_bookmarks', {
          user_id_param: userId,
          limit_param: limit
        });

      if (error) {
        console.error('Error fetching unified bookmarks:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUnifiedBookmarks:', error);
      return [];
    }
  }

  async getBookmarkedMessages(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_bookmarked_messages', {
          user_id_param: userId,
          limit_param: limit
        });

      if (error) {
        console.error('Error fetching bookmarked messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBookmarkedMessages:', error);
      return [];
    }
  }

  async getBookmarkedConversations(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_bookmarked_conversations', {
          user_id_param: userId,
          limit_param: limit
        });

      if (error) {
        console.error('Error fetching bookmarked conversations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBookmarkedConversations:', error);
      return [];
    }
  }
}

// Additional SQL function for filtered search
export const FILTERED_SEARCH_SQL = `
CREATE OR REPLACE FUNCTION match_documents_by_type (
  query_embedding vector(768),
  doc_type text,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  document_name text,
  document_type text,
  section_title text,
  content text,
  page_number int,
  chunk_index int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_name,
    document_chunks.document_type,
    document_chunks.section_title,
    document_chunks.content,
    document_chunks.page_number,
    document_chunks.chunk_index,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  FROM document_chunks
  WHERE 
    document_chunks.document_type = doc_type
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
`; 