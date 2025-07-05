import React from 'react';
import { NewsItem } from '../../types/news';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, ExternalLink, User, Calendar } from 'lucide-react';

interface NewsCardProps {
  news: NewsItem;
}

export function NewsCard({ news }: NewsCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getCategoryColor = (category: string) => {
    // Use consistent blue styling for both aged care sources
    return 'bg-blue-100 text-blue-800';
  };

  const handleCardClick = () => {
    window.open(news.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleCardClick}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
              {news.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(news.publishedAt)}</span>
              </div>
              {news.author && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{news.author}</span>
                </div>
              )}
            </div>
          </div>
          
          {news.imageUrl && (
            <div className="ml-4 flex-shrink-0">
              <img
                src={news.imageUrl}
                alt={news.title}
                className="w-24 h-24 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
        
        <p className="text-gray-700 mb-4 line-clamp-3">
          {news.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${getCategoryColor(news.source.category)}`}>
              {news.source.name}
            </Badge>
            {news.categories && news.categories.slice(0, 2).map((category, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {category}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <span>Read more</span>
            <ExternalLink className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Card>
  );
} 