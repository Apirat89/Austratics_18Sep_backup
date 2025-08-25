'use client';

import React, { useState, useEffect } from 'react';
import { 
  Map,
  BookOpen,
  BarChart3,
  Building,
  Home,
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

  const suggestionCards = [
    {
      title: "Maps",
      icon: Map,
      route: "/maps"
    },
    {
      title: "Residential",
      icon: Building,
      route: "/residential"
    },
    {
      title: "Homecare",
      icon: Home,
      route: "/homecare"
    },
    {
      title: "SA2 Insights",
      icon: BarChart3,
      route: "/insights"
    },
    {
      title: "News",
      icon: Newspaper,
      route: "/news"
    },
    {
      title: "Regulation (BETA)", 
      icon: BookOpen,
      route: "/regulation"
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-6xl w-full">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
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

        {/* Prompt Area */}
        <PromptArea onSubmit={handlePromptSubmit} />
      </div>
    </div>
  );
} 