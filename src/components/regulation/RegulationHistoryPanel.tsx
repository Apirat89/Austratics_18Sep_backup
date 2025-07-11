'use client';

import React, { useState } from 'react';
import { Search, History, Bookmark, Clock, X, Eye, Trash2, Edit3, Star, Plus, BookmarkPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  RegulationSearchHistoryItem, 
  RegulationBookmark,
  deleteRegulationSearchHistoryItem,
  clearRegulationSearchHistory,
  deleteRegulationBookmark,
  clearRegulationBookmarks,
  updateRegulationBookmarkUsage
} from '@/lib/regulationHistory';
import { renderMarkdown } from '@/lib/markdownRenderer';

interface RegulationHistoryPanelProps {
  searchHistory: RegulationSearchHistoryItem[];
  bookmarks: RegulationBookmark[];
  isOpen: boolean;
  onClose: () => void;
  onHide?: () => void;
  onSearchSelect: (search: RegulationSearchHistoryItem) => void;
  onBookmarkSelect: (bookmark: RegulationBookmark) => void;
  onClearSearchHistory: () => void | Promise<void>;
  onClearBookmarks: () => void | Promise<void>;
  onDeleteSearchItem: (itemId: number) => void | Promise<void>;
  onDeleteBookmark: (bookmarkId: number) => void | Promise<void>;
  onEditBookmark?: (bookmark: RegulationBookmark) => void;
  onCreateBookmark?: () => void;
  currentUser?: { id: string } | null;
}

const RegulationHistoryPanel: React.FC<RegulationHistoryPanelProps> = ({
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
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'bookmarks'>('history');

  // Handle clear all with confirmation
  const handleClearSearchHistory = () => {
    if (confirm('Are you sure you want to clear all search history? This action cannot be undone.')) {
      onClearSearchHistory();
    }
  };

  const handleClearBookmarks = () => {
    if (confirm('Are you sure you want to clear all bookmarks? This action cannot be undone.')) {
      onClearBookmarks();
    }
  };

  // Handle individual item deletion (no confirmation needed)
  const handleDeleteSearchItem = (e: React.MouseEvent, itemId: number) => {
    e.stopPropagation(); // Prevent triggering onSearchSelect
    onDeleteSearchItem(itemId);
  };

  const handleDeleteBookmark = (e: React.MouseEvent, bookmarkId: number) => {
    e.stopPropagation(); // Prevent triggering onBookmarkSelect
    onDeleteBookmark(bookmarkId);
  };

  const handleEditBookmark = (e: React.MouseEvent, bookmark: RegulationBookmark) => {
    e.stopPropagation(); // Prevent triggering onBookmarkSelect
    if (onEditBookmark) {
      onEditBookmark(bookmark);
    }
  };

  const handleBookmarkClick = async (bookmark: RegulationBookmark) => {
    // Update usage count
    if (currentUser && bookmark.id) {
      await updateRegulationBookmarkUsage(currentUser.id, bookmark.id);
    }
    onBookmarkSelect(bookmark);
  };

  const formatDocumentTypes = (types?: string[]) => {
    if (!types || types.length === 0) return null;
    
    const typeLabels: Record<string, string> = {
      'aged_care_act': 'Act',
      'chsp_support_at_home': 'CHSP',
      'home_care_package': 'HCP',
      'fees_and_subsidies': 'Fees',
      'residential_funding': 'Funding',
      'retirement_village_act': 'RV Act',
      'support_at_home_program': 'SAH',
      'other': 'Other'
    };
    
    return types.slice(0, 2).map(type => typeLabels[type] || type.replace(/_/g, ' '));
  };

  const getDocumentTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'aged_care_act': 'bg-blue-100 text-blue-700 border-blue-200',
      'chsp_support_at_home': 'bg-green-100 text-green-700 border-green-200',
      'home_care_package': 'bg-purple-100 text-purple-700 border-purple-200',
      'fees_and_subsidies': 'bg-orange-100 text-orange-700 border-orange-200',
      'residential_funding': 'bg-red-100 text-red-700 border-red-200',
      'retirement_village_act': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'support_at_home_program': 'bg-teal-100 text-teal-700 border-teal-200',
      'other': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colorMap[type] || colorMap['other'];
  };

  if (!isOpen) return null;

  return (
    <div className="h-full bg-white">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <History className="w-4 h-4" />
              Recent Searches
            </div>
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'bookmarks'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Bookmark className="w-4 h-4" />
              Bookmarks ({bookmarks.length}/20)
            </div>
          </button>
        </div>
      </div>

      {/* Content - Takes remaining height */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                Recent Searches (2 weeks)
              </h3>
              {searchHistory.length > 0 && (
                <button
                  onClick={handleClearSearchHistory}
                  className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
              
            {searchHistory.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-2">No recent searches</p>
                <p className="text-xs text-gray-400">Ask regulation questions to see them here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchHistory.map((search, index) => (
                  <div
                    key={search.id || index}
                    className="p-3 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors border border-blue-200"
                    onClick={() => onSearchSelect(search)}
                  >
                    <div className="flex items-start gap-2">
                      <Search className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 leading-relaxed break-words font-medium">
                          {search.search_term}
                        </p>
                        
                        {search.response_preview && (
                          <div 
                            className="text-xs text-gray-600 mt-1 line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(search.response_preview) }}
                          />
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {search.updated_at ? new Date(search.updated_at).toLocaleDateString() : 'Recently searched'}
                          </span>
                          
                          {search.citations_count !== undefined && search.citations_count > 0 && (
                            <Badge variant="outline" className="text-xs bg-white">
                              {search.citations_count} citations
                            </Badge>
                          )}
                          
                          {search.document_types && search.document_types.length > 0 && (
                            <div className="flex gap-1">
                              {formatDocumentTypes(search.document_types)?.map((type, i) => (
                                <Badge 
                                  key={i} 
                                  variant="outline" 
                                  className={`text-xs ${getDocumentTypeColor(search.document_types![i])}`}
                                >
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {search.id && (
                        <button
                          onClick={(e) => handleDeleteSearchItem(e, search.id!)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors flex-shrink-0"
                          title="Delete this search"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-orange-600" />
                Saved Bookmarks
              </h3>
              <div className="flex items-center gap-2">
                {onCreateBookmark && bookmarks.length < 20 && (
                  <button
                    onClick={onCreateBookmark}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    title="Create new bookmark"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                )}
                {bookmarks.length > 0 && (
                  <button
                    onClick={handleClearBookmarks}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>
              
            {bookmarks.length === 0 ? (
              <div className="text-center py-8">
                <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-2">No saved bookmarks</p>
                <p className="text-xs text-gray-400">Save frequently used searches for quick access</p>
                {onCreateBookmark && (
                  <button
                    onClick={onCreateBookmark}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    Create your first bookmark
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {bookmarks.map((bookmark, index) => (
                  <div
                    key={bookmark.id || index}
                    className="p-3 bg-orange-50 rounded-lg hover:bg-orange-100 cursor-pointer transition-colors border border-orange-200"
                    onClick={() => handleBookmarkClick(bookmark)}
                  >
                    <div className="flex items-start gap-2">
                      <Bookmark className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm text-gray-900 font-semibold">
                            {bookmark.bookmark_name}
                          </p>
                          {bookmark.usage_count !== undefined && bookmark.usage_count > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span className="text-xs text-gray-500">{bookmark.usage_count}</span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-600 leading-relaxed break-words">
                          {bookmark.search_term}
                        </p>
                        
                        {bookmark.description && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            {bookmark.description}
                          </p>
                        )}
                        
                        {bookmark.response_preview && (
                          <div 
                            className="text-xs text-gray-600 mt-1 line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(bookmark.response_preview) }}
                          />
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {bookmark.created_at ? new Date(bookmark.created_at).toLocaleDateString() : 'Recently saved'}
                          </span>
                          
                          {bookmark.citations_count !== undefined && bookmark.citations_count > 0 && (
                            <Badge variant="outline" className="text-xs bg-white">
                              {bookmark.citations_count} citations
                            </Badge>
                          )}
                          
                          {bookmark.document_types && bookmark.document_types.length > 0 && (
                            <div className="flex gap-1">
                              {formatDocumentTypes(bookmark.document_types)?.map((type, i) => (
                                <Badge 
                                  key={i} 
                                  variant="outline" 
                                  className={`text-xs ${getDocumentTypeColor(bookmark.document_types![i])}`}
                                >
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        {onEditBookmark && (
                          <button
                            onClick={(e) => handleEditBookmark(e, bookmark)}
                            className="text-gray-400 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50 transition-colors flex-shrink-0"
                            title="Edit bookmark"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                        {bookmark.id && (
                          <button
                            onClick={(e) => handleDeleteBookmark(e, bookmark.id!)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors flex-shrink-0"
                            title="Delete bookmark"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {bookmarks.length >= 20 && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-800">
                  📚 You've reached the maximum of 20 bookmarks. Delete some to add new ones.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-1">💡 Tips</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            {activeTab === 'history' ? (
              <>
                <li>• Search history is kept for 2 weeks</li>
                <li>• Click any search to re-run it</li>
                <li>• History syncs across your devices</li>
              </>
            ) : (
              <>
                <li>• Save up to 20 frequently used searches</li>
                <li>• Give bookmarks custom names for easy finding</li>
                <li>• Usage count shows your most popular searches</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RegulationHistoryPanel; 