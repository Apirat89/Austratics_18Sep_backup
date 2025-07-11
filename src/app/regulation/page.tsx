'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
}

interface ChatResponse {
  message: string;
  citations: DocumentCitation[];
  context_used: number;
  processing_time: number;
}

export default function RegulationPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
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
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
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

    try {
      const response = await fetch('/api/regulation/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: inputMessage.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        const chatResponse: ChatResponse = data.data;
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: chatResponse.message,
          timestamp: new Date(),
          citations: chatResponse.citations
        };

        setMessages(prev => prev.slice(0, -1).concat([assistantMessage]));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🏛️ Australian Aged Care Regulation Assistant
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get instant, accurate answers about aged care regulations with precise document citations
          </p>
        </div>

        {/* Chat Interface */}
        <Card className="max-w-6xl mx-auto shadow-2xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-semibold">
              💬 Regulation Chat
            </CardTitle>
            <p className="text-blue-100">
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
                      <div className="whitespace-pre-wrap break-words">
                        {message.isLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span>{message.content}</span>
                          </div>
                        ) : (
                          message.content
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
                                      📄 {formatDocumentName(citation.document_name)}
                                    </div>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${getDocumentTypeColor(citation.document_type)}`}
                                    >
                                      {citation.document_type.replace(/_/g, ' ').toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Page {citation.page_number}
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
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
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
                  className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32"
                  rows={2}
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
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

        {/* Info Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>
            🔒 Your questions are processed securely. This assistant uses official Australian aged care regulation documents.
          </p>
        </div>
      </div>
    </div>
  );
} 