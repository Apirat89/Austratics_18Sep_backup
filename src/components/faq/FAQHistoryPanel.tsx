'use client';

import React, { useState } from 'react';
import { Search, History, Bookmark, Clock, X, Eye, Trash2, Edit3, Star, Plus, BookmarkPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FAQSearchHistoryItem, 
  FAQBookmark,
  deleteFAQSearchHistoryItem,
  clearFAQSearchHistory,
  deleteFAQBookmark,
  clearFAQBookmarks,
  updateFAQBookmarkUsage
} from '@/lib/faqHistory';
import { renderMarkdown } from '@/lib/markdownRenderer';

interface FAQHistoryPanelProps {
  searchHistory: FAQSearchHistoryItem[];
  bookmarks: FAQBookmark[];
  isOpen: boolean;
  onClose: () => void;
  onHide?: () => void;
  onSearchSelect: (search: FAQSearchHistoryItem) => void;
  onBookmarkSelect: (bookmark: FAQBookmark) => void;
  onClearSearchHistory: () => void | Promise<void>;
  onClearBookmarks: () => void | Promise<void>;
  onDeleteSearchItem: (itemId: number) => void | Promise<void>;
  onDeleteBookmark: (bookmarkId: number) => void | Promise<void>;
  onEditBookmark?: (bookmark: FAQBookmark) => void;
  onCreateBookmark?: () => void;
  onBookmarkFromHistory?: (search: FAQSearchHistoryItem) => void;
  currentUser?: { id: string } | null;
}

const FAQHistoryPanel: React.FC<FAQHistoryPanelProps> = ({
  searchHistory,
  bookmarks,
  isOpen,
  onClose,
  onHide,
  onSearchSelect,
  onBookmarkSelect,
  onClearSearchHistory,
  onClearBookmarks,
  onDeleteSearchItem,
  onDeleteBookmark,
  onEditBookmark,
  onCreateBookmark,
  onBookmarkFromHistory,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'bookmarks'>('history');
  const [searchFilter, setSearchFilter] = useState('');

  const filteredHistory = searchHistory.filter(item =>
    item.search_term.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.response_preview.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredBookmarks = bookmarks.filter(bookmark =>
    bookmark.bookmark_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    bookmark.search_term.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (bookmark.description && bookmark.description.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleBookmarkClick = async (bookmark: FAQBookmark) => {
    if (currentUser) {
      await updateFAQBookmarkUsage(currentUser.id, bookmark.id);
    }
    onBookmarkSelect(bookmark);
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search FAQ history..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <History className="w-4 h-4" />
            <span>History</span>
            <Badge variant="outline" className="ml-1 text-xs">
              {filteredHistory.length}
            </Badge>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'bookmarks'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Bookmark className="w-4 h-4" />
            <span>Bookmarks</span>
            <Badge variant="outline" className="ml-1 text-xs">
              {filteredBookmarks.length}
            </Badge>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'history' && (
          <div className="p-4 space-y-3">
            {/* Header with Clear Button */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-700">FAQ Search History</h4>
              {filteredHistory.length > 0 && (
                <button
                  onClick={() => onClearSearchHistory()}
                  className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                >
                  Clear All
                </button>
              )}
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No FAQ searches yet</p>
                <p className="text-xs text-gray-400 mt-1">Ask questions about platform features to build your history</p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="group p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all"
                  onClick={() => onSearchSelect(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium text-gray-900 truncate mb-1">
                        {item.search_term}
                      </h5>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {item.response_preview}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(item.created_at)}</span>
                        {item.citation_count > 0 && (
                          <>
                            <span>•</span>
                            <span>{item.citation_count} citations</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{item.processing_time}ms</span>
                      </div>
                      
                      {item.document_types && item.document_types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.document_types.slice(0, 2).map((type, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs px-2 py-0.5"
                            >
                              {type.replace(/_/g, ' ').toLowerCase()}
                            </Badge>
                          ))}
                          {item.document_types.length > 2 && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              +{item.document_types.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSearchSelect(item);
                        }}
                        className="p-1 hover:bg-blue-100 rounded text-blue-600"
                        title="Reload search"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      {onBookmarkFromHistory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookmarkFromHistory(item);
                          }}
                          className="p-1 hover:bg-yellow-100 rounded text-yellow-600"
                          title="Bookmark this search"
                        >
                          <BookmarkPlus className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSearchItem(item.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                        title="Delete search"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="p-4 space-y-3">
            {/* Header with Clear and Add Buttons */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-700">FAQ Bookmarks</h4>
              <div className="flex items-center gap-2">
                {onCreateBookmark && (
                  <button
                    onClick={onCreateBookmark}
                    className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                )}
                {filteredBookmarks.length > 0 && (
                  <button
                    onClick={() => onClearBookmarks()}
                    className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {filteredBookmarks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No FAQ bookmarks saved</p>
                <p className="text-xs text-gray-400 mt-1">Bookmark helpful FAQ responses for quick access</p>
              </div>
            ) : (
              filteredBookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="group p-3 border border-gray-200 rounded-lg hover:border-yellow-300 hover:shadow-sm cursor-pointer transition-all"
                  onClick={() => handleBookmarkClick(bookmark)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <h5 className="text-sm font-medium text-gray-900 truncate">
                          {bookmark.bookmark_name}
                        </h5>
                      </div>
                      
                      <p className="text-xs text-gray-700 font-medium mb-1 truncate">
                        Search: {bookmark.search_term}
                      </p>
                      
                      {bookmark.response_preview && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {bookmark.response_preview}
                        </p>
                      )}
                      
                      {bookmark.description && (
                        <p className="text-xs text-blue-600 mb-2 italic">
                          Note: {bookmark.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(bookmark.created_at)}</span>
                        {bookmark.use_count > 0 && (
                          <>
                            <span>•</span>
                            <span>Used {bookmark.use_count}x</span>
                          </>
                        )}
                        {bookmark.citation_count > 0 && (
                          <>
                            <span>•</span>
                            <span>{bookmark.citation_count} citations</span>
                          </>
                        )}
                      </div>
                      
                      {bookmark.document_types && bookmark.document_types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {bookmark.document_types.slice(0, 2).map((type, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs px-2 py-0.5"
                            >
                              {type.replace(/_/g, ' ').toLowerCase()}
                            </Badge>
                          ))}
                          {bookmark.document_types.length > 2 && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              +{bookmark.document_types.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookmarkClick(bookmark);
                        }}
                        className="p-1 hover:bg-yellow-100 rounded text-yellow-600"
                        title="Load bookmarked search"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      {onEditBookmark && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditBookmark(bookmark);
                          }}
                          className="p-1 hover:bg-blue-100 rounded text-blue-600"
                          title="Edit bookmark"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBookmark(bookmark.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                        title="Delete bookmark"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 p-4">
        <div className="text-xs text-gray-500 text-center">
          FAQ Assistant History
        </div>
        {currentUser && (
          <div className="text-xs text-gray-400 text-center mt-1">
            User: {currentUser.id.substring(0, 8)}...
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQHistoryPanel; 