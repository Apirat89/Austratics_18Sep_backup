'use client';

import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Settings, 
  User, 
  MessageSquare,
  Map,
  BookOpen,
  BarChart3,
  Building,
  Newspaper
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import PromptArea from '../../components/PromptArea';

interface UserData {
  email: string;
  name: string;
  id: string;
}

export default function MainPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          router.push('/auth/signin');
          return;
        }

        setUser({
          email: currentUser.email || '',
          name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
          id: currentUser.id
        });
      } catch (error) {
        console.error('Error loading user:', error);
        router.push('/auth/signin');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [router]);

  const recentChats = [
    { title: "Kooralbyn 4285", id: 1 },
    { title: "Wollongong", id: 2 },
    { title: "Canberra", id: 3 },
    { title: "Port Adelaide", id: 4 },
    { title: "Darebin", id: 5 }
  ];

  const suggestionCards = [
    {
      title: "Residential",
      icon: Building,
      route: "/residential"
    },
    {
      title: "Maps",
      icon: Map,
      route: "/maps"
    },
    {
      title: "Regulation (BETA)", 
      icon: BookOpen,
      route: "/regulation"
    },
    {
      title: "Insights",
      icon: BarChart3,
      route: "/insights"
    },
    {
      title: "News",
      icon: Newspaper,
      route: "/news"
    }
  ];

  const handleCardClick = (card: { title: string; route: string }) => {
    setNavigating(true);
    router.push(card.route);
  };

  const handlePromptSubmit = (message: string) => {
    console.log('Main prompt submitted:', message);
    // Handle main page queries here
    // You could integrate with an AI service to handle general queries
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-medium text-blue-700">Main</h1>
              </div>
            )}
          </div>
        </div>

        {/* Recent Chats */}
        {!sidebarCollapsed && (
          <div className="flex-1 px-4 pt-6 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Recent</h3>
            <div className="space-y-1">
              {recentChats.map((chat) => (
                <div key={chat.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer group">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700 truncate flex-1">{chat.title}</span>
                  <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity">
                    <span className="text-xs text-gray-400">⋯</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className={`p-4 border-t border-gray-100 ${sidebarCollapsed ? 'space-y-2' : 'space-y-1'}`}>
          {sidebarCollapsed ? (
            <>
              <button className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <User className="h-5 w-5 text-gray-600 mx-auto" />
              </button>
              <button className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="h-5 w-5 text-gray-600 mx-auto" />
              </button>
            </>
          ) : (
            <>
              <button className="w-full flex items-center gap-3 p-2 text-left hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">Settings & help</span>
              </button>
              <div className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">A</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || 'User'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="max-w-3xl w-full">
            {/* Greeting */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-normal mb-2">
                <span 
                  className="bg-clip-text text-transparent font-bold"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #E4002B, #012169)'
                  }}
                >
                  G&apos;Day, Mate!
                </span>
              </h1>
            </div>

            {/* Suggestion Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
              {suggestionCards.map((card, index) => (
                <button
                  key={index}
                  className="p-4 text-left bg-white rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleCardClick(card)}
                  disabled={navigating}
                >
                  <div className="flex items-start gap-3">
                    {navigating ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mt-0.5"></div>
                    ) : (
                      <card.icon className="h-5 w-5 text-gray-500 mt-0.5 group-hover:text-blue-600" />
                    )}
                    <span className="text-sm text-gray-700 group-hover:text-blue-800 leading-relaxed">
                      {card.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>

        {/* Prompt Area */}
        <PromptArea onSubmit={handlePromptSubmit} />
      </div>
    </div>
  );
} 