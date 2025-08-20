'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowLeft, History, X, Bookmark, Plus, Copy, RotateCcw, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import RegulationHistoryPanel from '@/components/regulation/RegulationHistoryPanel';

import { getCurrentUser } from '@/lib/auth';
import { renderMarkdown } from '@/lib/markdownRenderer';
import {
  RegulationSearchHistoryItem,
  RegulationBookmark,
  UnifiedHistoryItem,
  UnifiedBookmark,
  saveRegulationSearchToHistory,
  getRegulationSearchHistory,
  getRegulationBookmarks,
  getUnifiedSearchHistory,
  getUnifiedBookmarks,
  deleteRegulationSearchHistoryItem,
  deleteUnifiedHistoryItem,
  deleteUnifiedBookmark,
  clearRegulationSearchHistory,
  clearUnifiedSearchHistory,
  clearUnifiedBookmarks,
  deleteRegulationBookmark,
  clearRegulationBookmarks,
  saveRegulationBookmark,
  isRegulationBookmarkNameTaken,
  getRegulationBookmarkCount,
  adaptUnifiedHistoryToOld,
  adaptUnifiedBookmarksToOld
} from '@/lib/regulationHistory';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: DocumentCitation[];
  isLoading?: boolean;
}

interface DocumentCitation {
  document_name: string;
  document_type: string;
  section_title?: string;
  page_number: number;
  content_snippet: string;
  similarity_score: number;
  display_title?: string; // Professional document title for display
}

interface ChatResponse {
  message: string;
  citations: DocumentCitation[];
  context_used: number;
  processing_time: number;
  conversation_id?: number;
  message_id?: number;
}

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  status: 'active' | 'archived';
}

export default function RegulationPage() {
  const router = useRouter();
  
  // Conversation state
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Welcome to the Australian Aged Care Regulation Assistant (BETA)!

I can help you find information from:
• **Aged Care Act 2024** (Current & November 2025 versions)
• **Commonwealth Home Support Programme (CHSP)** manuals
• **Home Care Package** operational guides  
• **Residential Aged Care** funding documents
• **Retirement Village Acts** (all Australian states)
• **Support at Home** program handbooks
• **Fee schedules** and regulatory updates

Ask me anything about aged care regulations, compliance requirements, funding, or program details. I'll provide accurate answers with specific document citations.`,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      citations: []
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryPanelVisible, setIsHistoryPanelVisible] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [searchHistory, setSearchHistory] = useState<RegulationSearchHistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<RegulationBookmark[]>([]);
  const [unifiedHistory, setUnifiedHistory] = useState<UnifiedHistoryItem[]>([]);
  const [unifiedBookmarks, setUnifiedBookmarks] = useState<UnifiedBookmark[]>([]);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [bookmarkDescription, setBookmarkDescription] = useState('');
  const [lastSearchTerm, setLastSearchTerm] = useState('');
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);

  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user and data on component mount
  useEffect(() => {
    const loadUserAndData = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        
        if (user) {
                  // Load unified search history and bookmarks
        const [unifiedHistoryData, unifiedBookmarksData] = await Promise.all([
          getUnifiedSearchHistory(user.id),
          getUnifiedBookmarks(user.id)
        ]);
        
        // Set unified data
        setUnifiedHistory(unifiedHistoryData);
        setUnifiedBookmarks(unifiedBookmarksData);
        
        // Convert to old format for backward compatibility with existing UI
        setSearchHistory(adaptUnifiedHistoryToOld(unifiedHistoryData));
        setBookmarks(adaptUnifiedBookmarksToOld(unifiedBookmarksData));
        }
      } catch (error) {
        console.error('Error loading user and data:', error);
      }
    };

    loadUserAndData();
  }, []);

  // Load conversations from API
  const loadConversations = async (): Promise<Conversation[]> => {
    try {
      const response = await fetch('/api/regulation/chat?action=conversations&limit=20');
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        console.error('Failed to load conversations:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  };

  // Helper function to refresh unified data
  const refreshUnifiedData = async () => {
    if (currentUser) {
      const [updatedUnifiedHistory, updatedUnifiedBookmarks] = await Promise.all([
        getUnifiedSearchHistory(currentUser.id),
        getUnifiedBookmarks(currentUser.id)
      ]);
      
      setUnifiedHistory(updatedUnifiedHistory);
      setUnifiedBookmarks(updatedUnifiedBookmarks);
      
      // Update adapted data for backward compatibility
      setSearchHistory(adaptUnifiedHistoryToOld(updatedUnifiedHistory));
      setBookmarks(adaptUnifiedBookmarksToOld(updatedUnifiedBookmarks));
    }
  };

  // Load conversation history
  const loadConversationHistory = async (conversationId: number): Promise<ChatMessage[]> => {
    console.log('📖 LOAD DEBUG: loadConversationHistory called for conversation:', conversationId);
    try {
      const url = `/api/regulation/chat?action=conversation-history&conversation_id=${conversationId}`;
      console.log('📖 LOAD DEBUG: fetching URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📖 LOAD DEBUG: API response status:', response.status);
      console.log('📖 LOAD DEBUG: API response data:', data);
      
      if (data.success) {
        const messages = data.data.map((msg: any) => ({
          id: msg.id.toString(),
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at ? new Date(msg.created_at) : new Date(),
          citations: msg.citations || []
        }));
        
        console.log('✅ LOAD DEBUG: Successfully mapped', messages.length, 'messages');
        return messages;
      } else {
        console.error('❌ LOAD DEBUG: Failed to load conversation history:', data.error);
        return [];
      }
    } catch (error) {
      console.error('❌ LOAD DEBUG: Error loading conversation history:', error);
      return [];
    }
  };

  // Create new conversation
  const createNewConversation = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/regulation/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-conversation',
          title: 'New Chat',
          first_message: 'Hello'
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newConversationId = data.data.conversation_id;
        setCurrentConversationId(newConversationId);
        
        // Reset to welcome message
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: `👋 Welcome to the Australian Aged Care Regulation Assistant!

I can help you find information from:
• **Aged Care Act 2024** (Current & November 2025 versions)
• **Commonwealth Home Support Programme (CHSP)** manuals
• **Home Care Package** operational guides  
• **Residential Aged Care** funding documents
• **Retirement Village Acts** (all Australian states)
• **Support at Home** program handbooks
• **Fee schedules** and regulatory updates

Ask me anything about aged care regulations, compliance requirements, funding, or program details. I'll provide accurate answers with specific document citations.`,
            timestamp: new Date(),
            citations: []
          }
        ]);
        

        
        // Focus on input
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      } else {
        console.error('Failed to create conversation:', data.error);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  // Switch to existing conversation
  const switchToConversation = async (conversationId: number) => {
    console.log('🔄 SWITCH DEBUG: switchToConversation called with ID:', conversationId);
    try {
      const history = await loadConversationHistory(conversationId);
      console.log('📚 SWITCH DEBUG: loaded history length:', history.length);
      console.log('📚 SWITCH DEBUG: history preview:', history.map(m => ({ role: m.role, preview: m.content.substring(0, 50) + '...' })));
      
      if (history.length > 0) {
        setMessages(history);
        console.log('✅ SWITCH DEBUG: Messages set from history');
      } else {
        console.log('⚠️ SWITCH DEBUG: No history found, showing welcome message');
        // If no history, show welcome message
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: `👋 Welcome to the Australian Aged Care Regulation Assistant!

I can help you find information from:
• **Aged Care Act 2024** (Current & November 2025 versions)
• **Commonwealth Home Support Programme (CHSP)** manuals
• **Home Care Package** operational guides  
• **Residential Aged Care** funding documents
• **Retirement Village Acts** (all Australian states)
• **Support at Home** program handbooks
• **Fee schedules** and regulatory updates

Ask me anything about aged care regulations, compliance requirements, funding, or program details. I'll provide accurate answers with specific document citations.`,
            timestamp: new Date(),
            citations: []
          }
        ]);
      }
      
      setCurrentConversationId(conversationId);
      console.log('🔄 SWITCH DEBUG: currentConversationId set to:', conversationId);
    } catch (error) {
      console.error('❌ SWITCH DEBUG: Error switching to conversation:', error);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const messageToSend = messageText || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date()
    };

    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '🤔 Searching through regulation documents...',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputMessage('');
    setIsLoading(true);
    setLastSearchTerm(messageToSend);

    try {
      // If no conversation exists, create one
      let conversationId = currentConversationId;
      if (!conversationId && currentUser) {
        const createResponse = await fetch('/api/regulation/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create-conversation',
            title: messageToSend.slice(0, 50),
            first_message: messageToSend
          }),
        });

        const createData = await createResponse.json();
        if (createData.success) {
          conversationId = createData.data.conversation_id;
          setCurrentConversationId(conversationId);
        }
      }

      // Send message with conversation context
      const response = await fetch('/api/regulation/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: messageToSend,
          conversation_id: conversationId,
          conversation_history: messages.filter(m => !m.isLoading).slice(-5) // Last 5 messages for context
        }),
      });

      const data = await response.json();

      if (data.success) {
        const chatResponse: ChatResponse = data.data;
        setLastResponse(chatResponse);
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: chatResponse.message,
          timestamp: new Date(),
          citations: chatResponse.citations
        };

        setMessages(prev => prev.slice(0, -1).concat([assistantMessage]));

        // Save to search history if user is logged in
        if (currentUser) {
          const responsePreview = chatResponse.message.slice(0, 150);
          const documentTypes = [...new Set(chatResponse.citations.map(c => c.document_type))];
          
          // Save with conversation_id for ChatGPT-like instant loading
          const finalConversationId = chatResponse.conversation_id || conversationId;
          
          await saveRegulationSearchToHistory(
            currentUser.id,
            messageToSend,
            responsePreview,
            chatResponse.citations.length,
            documentTypes,
            chatResponse.processing_time,
            finalConversationId || undefined
          );

          // Refresh unified search history
          const updatedUnifiedHistory = await getUnifiedSearchHistory(currentUser.id);
          console.log('📚 HISTORY DEBUG: Updated unified history:', updatedUnifiedHistory.map(h => ({ 
            search_term: h.search_term, 
            conversation_id: (h as any).conversation_id,
            source_type: h.source_type 
          })));
          
          setUnifiedHistory(updatedUnifiedHistory);
          setSearchHistory(adaptUnifiedHistoryToOld(updatedUnifiedHistory));
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        role: 'assistant',
        content: '❌ Sorry, I encountered an error while processing your question. Please try again or rephrase your question.',
        timestamp: new Date()
      };

      setMessages(prev => prev.slice(0, -1).concat([errorMessage]));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSearchSelect = (search: RegulationSearchHistoryItem) => {
    console.log('🔍 CLICK DEBUG: handleSearchSelect called with:', search);
    console.log('🔍 CLICK DEBUG: search object keys:', Object.keys(search));
    console.log('🔍 CLICK DEBUG: conversation_id value:', (search as any)?.conversation_id);
    
    const cid = (search as any)?.conversation_id;
    if (cid) {
      console.log('✅ LOADING SAVED CONVERSATION:', cid);
      switchToConversation(Number(cid));
    } else {
      console.log('❌ NO CONVERSATION_ID - REGENERATING:', search.search_term);
      sendMessage(search.search_term);
    }
  };

  const handleBookmarkSelect = (bookmark: RegulationBookmark) => {
    const cid = (bookmark as any)?.conversation_id;
    if (cid) {
      // Load saved conversation – NO regeneration  
      switchToConversation(Number(cid));
    } else {
      // Fallback to legacy behavior: re-run the query
      sendMessage(bookmark.search_term);
    }
  };

  const handleDeleteSearchItem = async (itemId: number) => {
    if (currentUser) {
      // Find the unified history item to determine its source type
      const unifiedItem = unifiedHistory.find(item => item.id === itemId);
      
      if (unifiedItem) {
        const success = await deleteUnifiedHistoryItem(currentUser.id, unifiedItem);
        if (success) {
          // Update unified history state
          const updatedUnifiedHistory = unifiedHistory.filter(item => item.id !== itemId);
          setUnifiedHistory(updatedUnifiedHistory);
          
          // Update adapted history state for backward compatibility
          setSearchHistory(adaptUnifiedHistoryToOld(updatedUnifiedHistory));
        }
      } else {
        // Fallback to old method if not found in unified history
        const success = await deleteRegulationSearchHistoryItem(currentUser.id, itemId);
        if (success) {
          setSearchHistory(prev => prev.filter(item => item.id !== itemId));
        }
      }
    }
  };

  const handleClearSearchHistory = async () => {
    if (currentUser) {
      const success = await clearUnifiedSearchHistory(currentUser.id);
      
      if (success) {
        // Reload unified history to get accurate state after clearing
        const updatedUnifiedHistory = await getUnifiedSearchHistory(currentUser.id);
        setUnifiedHistory(updatedUnifiedHistory);
        setSearchHistory(adaptUnifiedHistoryToOld(updatedUnifiedHistory));
      }
    }
  };

  const handleDeleteBookmark = async (bookmarkId: number) => {
    if (currentUser) {
      // Find the unified bookmark item to determine its source type
      const unifiedBookmark = unifiedBookmarks.find(item => item.id === bookmarkId);
      
      if (unifiedBookmark) {
        const success = await deleteUnifiedBookmark(currentUser.id, unifiedBookmark);
        if (success) {
          // Update unified bookmarks state
          const updatedUnifiedBookmarks = unifiedBookmarks.filter(item => item.id !== bookmarkId);
          setUnifiedBookmarks(updatedUnifiedBookmarks);
          
          // Update adapted bookmarks state for backward compatibility
          setBookmarks(adaptUnifiedBookmarksToOld(updatedUnifiedBookmarks));
        }
      } else {
        // Fallback to old method if not found in unified bookmarks
        const success = await deleteRegulationBookmark(currentUser.id, bookmarkId);
        if (success) {
          setBookmarks(prev => prev.filter(item => item.id !== bookmarkId));
        }
      }
    }
  };

  const handleClearBookmarks = async () => {
    if (currentUser) {
      const success = await clearUnifiedBookmarks(currentUser.id);
      if (success) {
        // Reload unified bookmarks to get accurate state after clearing
        const updatedUnifiedBookmarks = await getUnifiedBookmarks(currentUser.id);
        setUnifiedBookmarks(updatedUnifiedBookmarks);
        setBookmarks(adaptUnifiedBookmarksToOld(updatedUnifiedBookmarks));
      }
    }
  };

  const handleCreateBookmark = () => {
    if (!lastSearchTerm) {
      alert('Please ask a question first to create a bookmark.');
      return;
    }
    setShowBookmarkModal(true);
    setBookmarkName('');
    setBookmarkDescription('');
  };

  const handleBookmarkFromHistory = (search: RegulationSearchHistoryItem) => {
    if (!currentUser) {
      alert('User not authenticated');
      return;
    }
    
    // Set the search term and response from the history item
    setLastSearchTerm(search.search_term);
    setLastResponse({
      message: search.response_preview || '',
      citations: [],
      context_used: 0,
      processing_time: search.processing_time || 0
    });
    
    setShowBookmarkModal(true);
    setBookmarkName('');
    setBookmarkDescription('');
  };

  const handleSaveBookmark = async () => {
    if (!currentUser || !lastSearchTerm || !bookmarkName.trim()) {
      return;
    }

    // Check if bookmark name is taken
    const isTaken = await isRegulationBookmarkNameTaken(currentUser.id, bookmarkName.trim());
    if (isTaken) {
      alert('A bookmark with this name already exists. Please choose a different name.');
      return;
    }

    // Check bookmark limit
    const bookmarkCount = await getRegulationBookmarkCount(currentUser.id);
    if (bookmarkCount >= 20) {
      alert('You have reached the maximum of 20 bookmarks. Please delete some bookmarks first.');
      return;
    }

    const responsePreview = lastResponse?.message.slice(0, 150);
    const documentTypes = lastResponse ? [...new Set(lastResponse.citations.map(c => c.document_type))] : [];

    const success = await saveRegulationBookmark(
      currentUser.id,
      bookmarkName.trim(),
      lastSearchTerm,
      bookmarkDescription.trim() || undefined,
      responsePreview,
      lastResponse?.citations.length,
      documentTypes
    );

    if (success) {
      // Refresh unified data to include new bookmark
      await refreshUnifiedData();
      setShowBookmarkModal(false);
      setBookmarkName('');
      setBookmarkDescription('');
    } else {
      alert('Failed to save bookmark. Please try again.');
    }
  };

  const formatDocumentName = (name: string): string => {
    return name.replace(/_/g, ' ').replace(/-/g, ' ').toUpperCase();
  };

  const getDocumentTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      'aged_care_act': 'bg-blue-100 text-blue-800 border-blue-200',
      'chsp_support_at_home': 'bg-green-100 text-green-800 border-green-200',
      'home_care_package': 'bg-purple-100 text-purple-800 border-purple-200',
      'fees_and_subsidies': 'bg-orange-100 text-orange-800 border-orange-200',
      'residential_funding': 'bg-red-100 text-red-800 border-red-200',
      'retirement_village_act': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'support_at_home_program': 'bg-teal-100 text-teal-800 border-teal-200',
      'other': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colorMap[type] || colorMap['other'];
  };

  const handleCopyMessage = async (messageContent: string, messageId: string) => {
    try {
      // Remove HTML formatting for clean copy
      const plainText = messageContent.replace(/<[^>]*>/g, '');
      await navigator.clipboard.writeText(plainText);
      setCopiedMessageId(messageId);
      
      // Clear the copied indicator after 2 seconds
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
      alert('Failed to copy message to clipboard');
    }
  };

  const handleRetryResponse = async (originalQuestion: string, messageId: string) => {
    if (isLoading || retryingMessageId) return;
    
    setRetryingMessageId(messageId);
    
    // Find the message index and create a new loading message
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    const loadingMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '🔄 Regenerating response...',
      timestamp: new Date(),
      isLoading: true
    };

    // Replace the current message with loading message
    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = loadingMessage;
    setMessages(updatedMessages);

    try {
      const response = await fetch('/api/regulation/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: originalQuestion,
          conversation_id: currentConversationId,
          conversation_history: messages.filter(m => !m.isLoading && m.id !== messageId).slice(-5)
        }),
      });

      const data = await response.json();

      if (data.success) {
        const chatResponse: ChatResponse = data.data;
        setLastResponse(chatResponse);
        
        const newAssistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: chatResponse.message,
          timestamp: new Date(),
          citations: chatResponse.citations
        };

        // Replace loading message with new response
        const finalMessages = [...messages];
        finalMessages[messageIndex] = newAssistantMessage;
        setMessages(finalMessages);
      } else {
        throw new Error(data.error || 'Failed to regenerate response');
      }
    } catch (error) {
      console.error('Error regenerating response:', error);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Sorry, I encountered an error while regenerating the response. Please try again.',
        timestamp: new Date()
      };

      // Replace loading message with error message
      const finalMessages = [...messages];
      finalMessages[messageIndex] = errorMessage;
      setMessages(finalMessages);
    } finally {
      setRetryingMessageId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed History & Bookmarks Panel - Always Visible */}
      {isHistoryPanelVisible ? (
        <div className="fixed left-0 top-0 w-80 h-screen bg-white border-r border-gray-200 z-30 flex flex-col">
          {/* Panel Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                History & Bookmarks
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={createNewConversation}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="New Chat"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setIsHistoryPanelVisible(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Hide History Panel"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Full History & Bookmarks Content */}
          <div className="flex-1 overflow-hidden">
            <RegulationHistoryPanel
              searchHistory={searchHistory}
              bookmarks={bookmarks}
              isOpen={true}
              onClose={() => {}}
              onHide={() => setIsHistoryPanelVisible(false)}
              onSearchSelect={handleSearchSelect}
              onBookmarkSelect={handleBookmarkSelect}
              onClearSearchHistory={handleClearSearchHistory}
              onClearBookmarks={handleClearBookmarks}
              onDeleteSearchItem={handleDeleteSearchItem}
              onDeleteBookmark={handleDeleteBookmark}
              onCreateBookmark={handleCreateBookmark}
              onBookmarkFromHistory={handleBookmarkFromHistory}
              currentUser={currentUser}
            />
          </div>
        </div>
      ) : (
        /* Fixed History Tab when hidden */
        <div className="fixed left-0 top-0 w-12 h-screen z-30 transition-all duration-300 bg-white border-r border-gray-200">
          <div className="h-full flex flex-col items-center justify-start pt-6">
            <button
              onClick={() => setIsHistoryPanelVisible(true)}
              className="group p-2 hover:bg-gray-100 transition-colors duration-200 rounded"
              title="Show History & Bookmarks"
            >
              <History className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area with proper left margin */}
      <div className={`min-h-screen transition-all duration-300 ${
        isHistoryPanelVisible ? 'ml-80' : 'ml-12'
      }`}>
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b z-20 transition-all duration-300" style={{
          marginLeft: isHistoryPanelVisible ? '320px' : '48px'
        }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Australian Aged Care Regulation Assistant <span className="text-2xl text-blue-600 font-medium">(BETA)</span></h1>
              </div>
              
              {/* Back to Main Menu and Actions */}
              <div className="flex items-center gap-2">
                {/* New Chat Button */}
                <button
                  onClick={createNewConversation}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  title="Start New Chat"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>

                {/* Back to Main Menu Button */}
                <button
                  onClick={() => router.push('/main')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                  title="Back to Main Menu"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Main Menu
                </button>
              </div>
            </div>
            
            <p className="text-lg text-gray-600">
              Get instant answers about aged care regulations with document citations
            </p>
            <p className="text-sm text-gray-500 mt-2">
              ⚠️ <strong>Important:</strong> AI-generated responses may contain errors. Always verify information with official sources and consult legal professionals for compliance advice.
            </p>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-white border-b border-gray-200">
              <CardTitle className="text-xl font-semibold text-gray-900">
                💬 Regulation Chat
              </CardTitle>
              <p className="text-gray-600">
                Ask questions about aged care acts, CHSP programs, home care packages, and more
              </p>
            </CardHeader>
            
            <CardContent className="p-0">
              {/* Messages Container */}
              <div className="h-[600px] overflow-y-auto bg-white">
                <div className="p-6 space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-50 text-gray-900 border border-gray-200'
                        }`}
                      >
                        {/* Message Content */}
                        <div className="break-words">
                          {message.isLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span>{message.content}</span>
                            </div>
                          ) : (
                            <div 
                              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                              style={{ lineHeight: '1.6' }}
                            />
                          )}
                        </div>

                        {/* Citations */}
                        {message.citations && message.citations.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              📚 Source Documents:
                            </h4>
                            <div className="space-y-3">
                              {message.citations.map((citation, index) => (
                                <div
                                  key={index}
                                  className="bg-white border border-gray-200 rounded-lg p-3 text-sm"
                                >
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900 text-xs mb-1">
                                        📄 {citation.display_title || formatDocumentName(citation.document_name)}
                                      </div>
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${getDocumentTypeColor(citation.document_type)}`}
                                      >
                                        {citation.document_type.replace(/_/g, ' ').toUpperCase()}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  {citation.section_title && (
                                    <div className="text-xs text-gray-600 mb-2 font-medium">
                                      Section: {citation.section_title}
                                    </div>
                                  )}
                                  
                                  <div className="text-xs text-gray-600 leading-relaxed">
                                    {citation.content_snippet}
                                  </div>
                                  
                                  <div className="mt-2 text-xs text-gray-400">
                                    Relevance: {Math.round(citation.similarity_score * 100)}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className={`text-xs mt-2 ${
                          message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                        }`} suppressHydrationWarning>
                          {message.timestamp && !isNaN(message.timestamp.getTime()) 
                            ? message.timestamp.toLocaleTimeString() 
                            : 'Just now'}
                        </div>

                        {/* Action Buttons - Copy, Retry, and Feedback for assistant messages (excluding welcome message) */}
                        {message.role === 'assistant' && !message.isLoading && message.id !== '1' && (
                          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200">
                            {/* Copy Button */}
                            <button
                              onClick={() => handleCopyMessage(message.content, message.id)}
                              disabled={copiedMessageId === message.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300"
                              title="Copy response"
                            >
                              {copiedMessageId === message.id ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span className="hidden sm:inline">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  <span className="hidden sm:inline">Copy</span>
                                </>
                              )}
                            </button>

                            {/* Retry Button */}
                            <button
                              onClick={() => handleRetryResponse(lastSearchTerm, message.id)}
                              disabled={retryingMessageId === message.id || isLoading}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Regenerate response"
                            >
                              <RotateCcw className={`w-4 h-4 ${retryingMessageId === message.id ? 'animate-spin' : ''}`} />
                              <span className="hidden sm:inline">
                                {retryingMessageId === message.id ? 'Retrying...' : 'Retry'}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <div className="flex space-x-3">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about aged care regulations, CHSP requirements, home care packages, fees, or any regulatory question..."
                    className="flex-1 resize-none bg-white border-2 border-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-h-32 shadow-sm"
                    rows={2}
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!inputMessage.trim() || isLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap"
                  >
                    {isLoading ? '⏳' : '📤'} Send
                  </button>
                </div>
                
                <div className="mt-2 text-xs text-gray-500 text-center">
                  💡 Try asking: "What are the new changes in the Aged Care Act 2024?" or "How do CHSP client contributions work?"
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Footer */}
        <div className="text-center pb-8 text-sm text-gray-600">
          <p>
            🔒 Your questions are processed securely. This assistant uses official Australian aged care regulation documents.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Disclaimer: This AI assistant provides information for reference purposes only. Responses may be incomplete or contain errors. Always verify with official sources and seek professional legal advice for compliance matters.
          </p>
          <p className="mt-1 text-xs text-orange-600 font-medium">
            ⚠️ BETA Version: This system is currently in beta testing. Please exercise caution and cross-reference all information with official regulatory sources before making decisions.
          </p>
        </div>
      </div>

      {/* Bookmark Modal */}
      {showBookmarkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Bookmark</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bookmark Name *
                </label>
                <input
                  type="text"
                  value={bookmarkName}
                  onChange={(e) => setBookmarkName(e.target.value)}
                  placeholder="Enter a descriptive name..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={100}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={bookmarkDescription}
                  onChange={(e) => setBookmarkDescription(e.target.value)}
                  placeholder="Add notes about this search..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  maxLength={250}
                />
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <strong>Search:</strong> {lastSearchTerm}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBookmarkModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBookmark}
                disabled={!bookmarkName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Bookmark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 