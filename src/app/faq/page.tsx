'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, ArrowLeft, History, X, Bookmark, Plus, Copy, RotateCcw, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FAQHistoryPanel from '@/components/faq/FAQHistoryPanel';

import { getCurrentUser } from '@/lib/auth';
import { renderMarkdown } from '@/lib/markdownRenderer';
import {
  FAQSearchHistoryItem,
  FAQBookmark,
  UnifiedFAQHistoryItem,
  UnifiedFAQBookmark,
  saveFAQSearchToHistory,
  getFAQSearchHistory,
  getFAQBookmarks,
  getUnifiedFAQHistory,
  getUnifiedFAQBookmarks,
  deleteFAQSearchHistoryItem,
  deleteUnifiedFAQHistoryItem,
  deleteUnifiedFAQBookmark,
  clearFAQSearchHistory,
  clearUnifiedFAQHistory,
  clearUnifiedFAQBookmarks,
  deleteFAQBookmark,
  clearFAQBookmarks,
  saveFAQBookmark,
  isFAQBookmarkNameTaken,
  getFAQBookmarkCount,
  adaptUnifiedFAQHistoryToOld,
  adaptUnifiedFAQBookmarksToOld
} from '@/lib/faqHistory';
import { FAQCitation } from '@/types/faq';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: FAQCitation[];
  isLoading?: boolean;
}

interface ChatResponse {
  message: string;
  citations: FAQCitation[];
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

export default function FAQPage() {
  const router = useRouter();
  
  // Conversation state
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `🤝 Welcome to the Giantash FAQ Assistant!

I'm here to help you learn how to use the Giantash Aged Care Analytics platform effectively. I can provide step-by-step guidance from our user guides:

📋 **Available User Guides:**
• **Home Care** - Search and compare homecare providers
• **Residential Care** - Find and analyze residential aged care facilities  
• **Maps Feature** - Navigate facilities using our interactive map
• **News** - Stay updated with aged care industry news
• **SA2 Analysis** - Understand demographic and statistical data

**How to get started:**
Ask me questions like "How do I search for homecare providers?" or "How do I use the maps feature?" and I'll provide clear, step-by-step instructions with references to the relevant user guides.

💡 **Tip:** Be specific about which feature you need help with for the most accurate guidance!`,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      citations: []
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryPanelVisible, setIsHistoryPanelVisible] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [searchHistory, setSearchHistory] = useState<FAQSearchHistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<FAQBookmark[]>([]);
  const [unifiedHistory, setUnifiedHistory] = useState<UnifiedFAQHistoryItem[]>([]);
  const [unifiedBookmarks, setUnifiedBookmarks] = useState<UnifiedFAQBookmark[]>([]);
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
            getUnifiedFAQHistory(user.id),
            getUnifiedFAQBookmarks(user.id)
          ]);
          
          // Set unified data
          setUnifiedHistory(unifiedHistoryData);
          setUnifiedBookmarks(unifiedBookmarksData);
          
          // Convert to old format for backward compatibility with existing UI
          setSearchHistory(adaptUnifiedFAQHistoryToOld(unifiedHistoryData));
          setBookmarks(adaptUnifiedFAQBookmarksToOld(unifiedBookmarksData));
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
      const response = await fetch('/api/faq/chat?action=get_conversations&limit=20');
      const data = await response.json();
      
      if (data.success) {
        return data.conversations || [];
      } else {
        console.error('Failed to load FAQ conversations:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Error loading FAQ conversations:', error);
      return [];
    }
  };

  // Helper function to refresh unified FAQ data
  const refreshUnifiedFAQData = async () => {
    if (currentUser) {
      const [updatedUnifiedHistory, updatedUnifiedBookmarks] = await Promise.all([
        getUnifiedFAQHistory(currentUser.id),
        getUnifiedFAQBookmarks(currentUser.id)
      ]);
      
      setUnifiedHistory(updatedUnifiedHistory);
      setUnifiedBookmarks(updatedUnifiedBookmarks);
      
      // Update adapted data for backward compatibility
      setSearchHistory(adaptUnifiedFAQHistoryToOld(updatedUnifiedHistory));
      setBookmarks(adaptUnifiedFAQBookmarksToOld(updatedUnifiedBookmarks));
    }
  };

  // Load conversation history
  const loadConversationHistory = async (conversationId: number): Promise<ChatMessage[]> => {
    console.log('📖 FAQ LOAD DEBUG: loadConversationHistory called for conversation:', conversationId);
    try {
      const url = `/api/faq/chat?action=conversation-history&conversation_id=${conversationId}`;
      console.log('📖 FAQ LOAD DEBUG: fetching URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📖 FAQ LOAD DEBUG: API response status:', response.status);
      console.log('📖 FAQ LOAD DEBUG: API response data:', data);
      
      if (data.success) {
        const messages = data.data.map((msg: any) => ({
          id: msg.id.toString(),
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at ? new Date(msg.created_at) : new Date(),
          citations: msg.citations || []
        }));
        
        console.log('✅ FAQ LOAD DEBUG: Successfully mapped', messages.length, 'messages');
        return messages;
      } else {
        console.error('❌ FAQ LOAD DEBUG: Failed to load conversation history:', data.error);
        return [];
      }
    } catch (error) {
      console.error('❌ FAQ LOAD DEBUG: Error loading conversation history:', error);
      return [];
    }
  };

  // Create new conversation
  const createNewConversation = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/faq/chat', {
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
            content: `🤝 Welcome to the Giantash FAQ Assistant!

I'm here to help you learn how to use the Giantash Aged Care Analytics platform effectively. I can provide step-by-step guidance from our user guides:

📋 **Available User Guides:**
• **Home Care** - Search and compare homecare providers
• **Residential Care** - Find and analyze residential aged care facilities  
• **Maps Feature** - Navigate facilities using our interactive map
• **News** - Stay updated with aged care industry news
• **SA2 Analysis** - Understand demographic and statistical data

**How to get started:**
Ask me questions like "How do I search for homecare providers?" or "How do I use the maps feature?" and I'll provide clear, step-by-step instructions with references to the relevant user guides.

💡 **Tip:** Be specific about which feature you need help with for the most accurate guidance!`,
            timestamp: new Date(),
            citations: []
          }
        ]);
        
        // Focus on input
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      } else {
        console.error('Failed to create FAQ conversation:', data.error);
      }
    } catch (error) {
      console.error('Error creating FAQ conversation:', error);
    }
  };

  // Switch to existing conversation
  const switchToConversation = async (conversationId: number) => {
    console.log('🔄 FAQ SWITCH DEBUG: switchToConversation called with ID:', conversationId);
    try {
      const history = await loadConversationHistory(conversationId);
      console.log('📚 FAQ SWITCH DEBUG: loaded history length:', history.length);
      
      if (history.length > 0) {
        setMessages(history);
        console.log('✅ FAQ SWITCH DEBUG: Messages set from history');
      } else {
        console.log('⚠️ FAQ SWITCH DEBUG: No history found, showing welcome message');
        // If no history, show welcome message
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: `🤝 Welcome to the Giantash FAQ Assistant!

I'm here to help you learn how to use the Giantash Aged Care Analytics platform effectively. I can provide step-by-step guidance from our user guides:

📋 **Available User Guides:**
• **Home Care** - Search and compare homecare providers
• **Residential Care** - Find and analyze residential aged care facilities  
• **Maps Feature** - Navigate facilities using our interactive map
• **News** - Stay updated with aged care industry news
• **SA2 Analysis** - Understand demographic and statistical data

**How to get started:**
Ask me questions like "How do I search for homecare providers?" or "How do I use the maps feature?" and I'll provide clear, step-by-step instructions with references to the relevant user guides.

💡 **Tip:** Be specific about which feature you need help with for the most accurate guidance!`,
            timestamp: new Date(),
            citations: []
          }
        ]);
      }
      
      setCurrentConversationId(conversationId);
      console.log('✅ FAQ SWITCH DEBUG: Conversation switched to ID:', conversationId);
    } catch (error) {
      console.error('❌ FAQ SWITCH DEBUG: Error switching to conversation:', error);
    }
  };

  const sendMessage = async (messageOverride?: string) => {
    const messageToSend = messageOverride || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date()
    };

    // Add loading message
    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Searching FAQ guides...',
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
        const createResponse = await fetch('/api/faq/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create-conversation',
            title: messageToSend.slice(0, 50)
          }),
        });

        const createData = await createResponse.json();
        if (createData.success) {
          conversationId = createData.data.conversation_id;
          setCurrentConversationId(conversationId);
        }
      }

      // Send message with conversation context
      const response = await fetch('/api/faq/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'ask',
          question: messageToSend,
          conversation_id: conversationId,
          conversation_history: messages.filter(m => !m.isLoading).slice(-5) // Last 5 messages for context
        }),
      });

      const data = await response.json();

      if (data.success) {
        const chatResponse: ChatResponse = data.data || data;
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
          const documentTypes = [...new Set(chatResponse.citations.map(c => c.guide_category || 'faq'))];
          
          await saveFAQSearchToHistory(
            currentUser.id,
            messageToSend,
            responsePreview,
            chatResponse.citations.length,
            documentTypes,
            chatResponse.processing_time,
            conversationId || undefined
          );

          // Refresh unified search history (matching regulation page)
          const updatedUnifiedHistory = await getUnifiedFAQHistory(currentUser.id);
          console.log('📚 FAQ HISTORY DEBUG: Updated unified history:', updatedUnifiedHistory.map(h => ({ 
            search_term: h.search_term, 
            conversation_id: h.conversation_id,
            source_type: h.source_type 
          })));
          
          setUnifiedHistory(updatedUnifiedHistory);
          setSearchHistory(adaptUnifiedFAQHistoryToOld(updatedUnifiedHistory));
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending FAQ message:', error);
      
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

  const handleSearchSelect = (search: FAQSearchHistoryItem) => {
    console.log('🔍 FAQ CLICK DEBUG: handleSearchSelect called with:', search);
    
    const cid = search.conversation_id;
    if (cid) {
      console.log('✅ FAQ LOADING SAVED CONVERSATION:', cid);
      switchToConversation(Number(cid));
    } else {
      console.log('❌ FAQ NO CONVERSATION_ID - REGENERATING:', search.search_term);
      sendMessage(search.search_term);
    }
  };

  const handleBookmarkSelect = (bookmark: FAQBookmark) => {
    const cid = bookmark.conversation_id;
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
        const success = await deleteUnifiedFAQHistoryItem(currentUser.id, unifiedItem);
        if (success) {
          // Update unified history state
          const updatedUnifiedHistory = unifiedHistory.filter(item => item.id !== itemId);
          setUnifiedHistory(updatedUnifiedHistory);
          
          // Update adapted history state for backward compatibility
          setSearchHistory(adaptUnifiedFAQHistoryToOld(updatedUnifiedHistory));
        }
      } else {
        // Fallback to old method if not found in unified history
        const success = await deleteFAQSearchHistoryItem(currentUser.id, itemId);
        if (success) {
          setSearchHistory(prev => prev.filter(item => item.id !== itemId));
        }
      }
    }
  };

  const handleClearSearchHistory = async () => {
    if (currentUser) {
      const success = await clearUnifiedFAQHistory(currentUser.id);
      if (success) {
        // Reload unified history to get accurate state after clearing
        const updatedUnifiedHistory = await getUnifiedFAQHistory(currentUser.id);
        setUnifiedHistory(updatedUnifiedHistory);
        setSearchHistory(adaptUnifiedFAQHistoryToOld(updatedUnifiedHistory));
      }
    }
  };

  const handleDeleteBookmark = async (bookmarkId: number) => {
    if (currentUser) {
      // Find the unified bookmark item to determine its source type
      const unifiedBookmark = unifiedBookmarks.find(item => item.id === bookmarkId);
      
      if (unifiedBookmark) {
        const success = await deleteUnifiedFAQBookmark(currentUser.id, unifiedBookmark);
        if (success) {
          // Update unified bookmarks state
          const updatedUnifiedBookmarks = unifiedBookmarks.filter(item => item.id !== bookmarkId);
          setUnifiedBookmarks(updatedUnifiedBookmarks);
          
          // Update adapted bookmarks state for backward compatibility
          setBookmarks(adaptUnifiedFAQBookmarksToOld(updatedUnifiedBookmarks));
        }
      } else {
        // Fallback to old method if not found in unified bookmarks
        const success = await deleteFAQBookmark(currentUser.id, bookmarkId);
        if (success) {
          setBookmarks(prev => prev.filter(item => item.id !== bookmarkId));
        }
      }
    }
  };

  const handleClearBookmarks = async () => {
    if (currentUser) {
      const success = await clearUnifiedFAQBookmarks(currentUser.id);
      if (success) {
        // Reload unified bookmarks to get accurate state after clearing
        const updatedUnifiedBookmarks = await getUnifiedFAQBookmarks(currentUser.id);
        setUnifiedBookmarks(updatedUnifiedBookmarks);
        setBookmarks(adaptUnifiedFAQBookmarksToOld(updatedUnifiedBookmarks));
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

  const handleBookmarkFromHistory = (search: FAQSearchHistoryItem) => {
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
    const isTaken = await isFAQBookmarkNameTaken(currentUser.id, bookmarkName.trim());
    if (isTaken) {
      alert('A bookmark with this name already exists. Please choose a different name.');
      return;
    }

    // Check bookmark limit
    const bookmarkCount = await getFAQBookmarkCount(currentUser.id);
    if (bookmarkCount >= 20) {
      alert('You have reached the maximum of 20 bookmarks. Please delete some bookmarks first.');
      return;
    }

    const responsePreview = lastResponse?.message.slice(0, 150);
    const documentTypes = lastResponse ? [...new Set(lastResponse.citations.map(c => c.guide_category || 'faq'))] : [];

    const success = await saveFAQBookmark(
      currentUser.id,
      bookmarkName.trim(),
      lastSearchTerm,
      bookmarkDescription.trim() || undefined,
      responsePreview,
      lastResponse?.citations.length,
      documentTypes,
      currentConversationId || undefined
    );

    if (success) {
      // Refresh FAQ data to include new bookmark
      await refreshUnifiedFAQData();
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
      'homecare': 'bg-blue-100 text-blue-800 border-blue-200',
      'residential': 'bg-green-100 text-green-800 border-green-200',
      'maps': 'bg-purple-100 text-purple-800 border-purple-200',
      'news': 'bg-orange-100 text-orange-800 border-orange-200',
      'sa2': 'bg-red-100 text-red-800 border-red-200',
      'other': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colorMap[type.toLowerCase()] || colorMap['other'];
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const retryMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    setRetryingMessageId(messageId);
    
    // Remove the error message and add a new loading message
    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Retrying FAQ search...',
      timestamp: new Date(),
      isLoading: true
    };

    const newMessages = messages.slice(0, messageIndex).concat([loadingMessage]);
    setMessages(newMessages);

    // Retry the message
    try {
      await sendMessage(userMessage.content);
    } finally {
      setRetryingMessageId(null);
    }
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    return (
      <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-4xl rounded-2xl px-6 py-4 ${
            message.role === 'user'
              ? 'bg-blue-600 text-white ml-12'
              : 'bg-white border border-gray-200 mr-12 shadow-sm'
          }`}
        >
          {message.isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">{message.content}</span>
            </div>
          ) : (
            <div>
              <div 
                className={`prose max-w-none ${
                  message.role === 'user' ? 'prose-invert' : ''
                }`} 
                dangerouslySetInnerHTML={{ 
                  __html: renderMarkdown(message.content) 
                }} 
              />

              {message.role === 'assistant' && !message.isLoading && (
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Copy response"
                  >
                    {copiedMessageId === message.id ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>

                  {message.content.includes('❌') && (
                    <button
                      onClick={() => retryMessage(message.id)}
                      disabled={retryingMessageId === message.id}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                      title="Retry request"
                    >
                      <RotateCcw className={`w-3 h-3 ${retryingMessageId === message.id ? 'animate-spin' : ''}`} />
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Citations */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                📚 Source User Guides:
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
                          📄 {citation.document_name}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getDocumentTypeColor(citation.guide_category || 'other')}`}
                        >
                          {citation.guide_category?.replace(/_/g, ' ').toUpperCase() || 'FAQ GUIDE'}
                        </Badge>
                      </div>
                    </div>
                    
                    {citation.section_title && (
                      <div className="text-xs text-gray-600 mb-2 font-medium">
                        Section: {citation.section_title}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {citation.content_preview}
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-400">
                      Relevance: {Math.round(citation.similarity * 100)}%
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
              ? message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Invalid time'
            }
          </div>
        </div>
      </div>
    );
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
                FAQ History & Bookmarks
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={createNewConversation}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="New FAQ Chat"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setIsHistoryPanelVisible(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Hide FAQ History Panel"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Full FAQ History & Bookmarks Content */}
          <div className="flex-1 overflow-hidden">
            <FAQHistoryPanel
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
              title="Show FAQ History & Bookmarks"
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
                <HelpCircle className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">FAQ (Chatbot)</h1>
              </div>
              
              {/* Back to Main Menu and Actions */}
              <div className="flex items-center gap-2">
                {/* New Chat Button */}
                <button
                  onClick={createNewConversation}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  title="Start New FAQ Chat"
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
              Get step-by-step guidance on using platform features from our user guides
            </p>
            <p className="text-sm text-gray-500 mt-2">
              📚 <strong>User Guides Available:</strong> Home Care, Residential Care, Maps, News, SA2 Analysis
            </p>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-white border-b border-gray-200">
              <CardTitle className="text-xl font-semibold text-gray-900">
                💬 FAQ Chat
              </CardTitle>
              <p className="text-gray-600">
                Ask questions about platform features, navigation, tools, and user guide instructions
              </p>
            </CardHeader>
            
            <CardContent className="p-0">
              {/* Messages Container */}
              <div className="h-[600px] overflow-y-auto bg-white">
                <div className="p-6 space-y-6">
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex space-x-3">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      !currentUser 
                        ? "Please sign in to use the FAQ assistant..." 
                        : "Ask me how to use any feature of the Giantash platform..."
                    }
                    disabled={isLoading || !currentUser}
                    rows={2}
                    className="flex-1 resize-none bg-white border-2 border-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim() || !currentUser}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap"
                  >
                    {isLoading ? '⏳' : '📤'} {isLoading ? 'Searching...' : 'Ask'}
                  </button>
                </form>
                
                {!currentUser && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800 text-sm">
                      🔐 <strong>Sign In Required:</strong> Please sign in to use the FAQ assistant and get personalized help with the Giantash platform.
                    </p>
                  </div>
                )}
                
                <div className="mt-2 text-xs text-gray-500 text-center">
                  💡 Try asking: "How do I search for homecare providers?" or "How do I use the maps feature?"
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Footer */}
          <div className="text-center pb-8 text-sm text-gray-600 mt-8">
            <p>
              🔒 Your questions are processed securely. This assistant provides help with platform features using user guides.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Disclaimer: This FAQ assistant provides guidance about platform features based on user guides. Test features directly to confirm functionality.
            </p>
          </div>
        </div>
      </div>

      {/* Bookmark Modal */}
      {showBookmarkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save FAQ Bookmark</h3>
            
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
                  placeholder="Add notes about this FAQ search..."
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