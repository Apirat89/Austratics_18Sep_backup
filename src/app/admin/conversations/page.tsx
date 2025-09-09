'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { MessageSquare, Clock, User, Search, Filter, ChevronRight, Calendar, Users } from 'lucide-react';

interface Conversation {
  id: string;
  user_id: string;
  feature: string;
  created_at: string;
  closed_at?: string;
  title: string;
  summary?: string;
  message_count: number;
  is_active: boolean;
  metadata?: any;
  user_email?: string;
}

interface ConversationMessage {
  id: string;
  convo_id: string;
  role: 'user' | 'assistant';
  ts: string;
  content: string;
  tokens_used?: number;
  processing_time_ms?: number;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const features = ['all', 'faq', 'regulation', 'map', 'homecare', 'residential', 'insights'];

  useEffect(() => {
    fetchConversations();
  }, [filter, featureFilter]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      let url = `/api/admin/conversations?`;
      
      if (filter !== 'all') {
        url += `status=${filter}&`;
      }
      if (featureFilter !== 'all') {
        url += `feature=${featureFilter}&`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      setMessagesLoading(true);
      const response = await fetch(`/api/admin/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    fetchMessages(conversationId);
  };

  const filteredConversations = conversations.filter(conv => {
    if (searchTerm) {
      return conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             conv.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             conv.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFeatureBadgeColor = (feature: string) => {
    const colors: { [key: string]: string } = {
      faq: 'bg-blue-100 text-blue-800',
      regulation: 'bg-purple-100 text-purple-800',
      map: 'bg-green-100 text-green-800',
      homecare: 'bg-orange-100 text-orange-800',
      residential: 'bg-pink-100 text-pink-800',
      insights: 'bg-indigo-100 text-indigo-800',
      default: 'bg-gray-100 text-gray-800'
    };
    return colors[feature] || colors.default;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
          <p className="text-gray-600 mt-2">Manage user conversations and chat history</p>
        </div>
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-indigo-600" />
          <span className="text-sm font-medium text-gray-700">
            {conversations.length} total conversations
          </span>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations, users, or summaries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>

            {/* Feature Filter */}
            <select
              value={featureFilter}
              onChange={(e) => setFeatureFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {features.map(feature => (
                <option key={feature} value={feature}>
                  {feature === 'all' ? 'All Features' : feature.charAt(0).toUpperCase() + feature.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversations ({filteredConversations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No conversations found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation === conversation.id ? 'bg-indigo-50 border-r-4 border-indigo-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`text-xs ${getFeatureBadgeColor(conversation.feature)}`}>
                              {conversation.feature}
                            </Badge>
                            <Badge variant={conversation.is_active ? 'default' : 'secondary'} className="text-xs">
                              {conversation.is_active ? 'Active' : 'Closed'}
                            </Badge>
                          </div>
                          
                          <h3 className="font-medium text-gray-900 truncate mb-1">
                            {conversation.title || `Conversation ${conversation.id.slice(0, 8)}`}
                          </h3>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {conversation.user_email || `User ${conversation.user_id.slice(0, 8)}`}
                          </p>
                          
                          {conversation.summary && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                              {conversation.summary}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {conversation.message_count} messages
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(conversation.created_at)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Messages Panel */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedConversation ? 'Conversation Messages' : 'Select a Conversation'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedConversation ? (
              <div className="text-center text-gray-500 py-12">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>Select a conversation from the list to view messages</p>
              </div>
            ) : messagesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No messages found</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-blue-50 border border-blue-200 ml-4' 
                          : 'bg-gray-50 border border-gray-200 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={message.role === 'user' ? 'default' : 'secondary'} className="text-xs">
                          {message.role === 'user' ? 'User' : 'Assistant'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(message.ts)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {message.content}
                      </div>
                      {message.tokens_used && (
                        <div className="mt-2 text-xs text-gray-400">
                          Tokens: {message.tokens_used} | Processing: {message.processing_time_ms}ms
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 