'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import BackToMainButton from '../../components/BackToMainButton';
import PromptArea from '../../components/PromptArea';
import InsightsCanvas from '../../components/insights/InsightsCanvas';
import AnalysisSidebar from '../../components/insights/AnalysisSidebar';
import { EnhancedChartConfiguration } from '../../components/insights/InsightsDataService';
import { BarChart3, Settings, User } from 'lucide-react';

interface UserData {
  email: string;
  name: string;
  id: string;
}

export default function InsightsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<EnhancedChartConfiguration[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<EnhancedChartConfiguration[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        // 🚀 DEVELOPMENT MODE: Temporarily bypass auth for testing
        // TODO: Re-enable authentication for production
        if (!currentUser) {
          // router.push('/auth/signin');
          // return;
          
          // Set a mock user for development testing
          setUser({
            email: 'dev@test.com',
            name: 'Development User',
            id: 'dev-user-123'
          });
        } else {
          setUser({
            email: currentUser.email || '',
            name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
            id: currentUser.id
          });
        }
      } catch (error) {
        console.error('Error loading user:', error);
        // router.push('/auth/signin');
        
        // Set a mock user for development testing
        setUser({
          email: 'dev@test.com',
          name: 'Development User',
          id: 'dev-user-123'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [router]);

  useEffect(() => {
    // Load saved and recent analyses from localStorage
    loadAnalyses();
  }, []);

  const loadAnalyses = () => {
    try {
      const saved = localStorage.getItem('insights-saved-analyses');
      const recent = localStorage.getItem('insights-recent-analyses');
      
      if (saved) {
        setSavedAnalyses(JSON.parse(saved).map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt)
        })));
      }
      
      if (recent) {
        setRecentAnalyses(JSON.parse(recent).map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt)
        })));
      }
    } catch (error) {
      console.error('Error loading analyses:', error);
    }
  };

  const saveAnalyses = (saved: EnhancedChartConfiguration[], recent: EnhancedChartConfiguration[]) => {
    try {
      localStorage.setItem('insights-saved-analyses', JSON.stringify(saved));
      localStorage.setItem('insights-recent-analyses', JSON.stringify(recent));
    } catch (error) {
      console.error('Error saving analyses:', error);
    }
  };

  const handleSaveAnalysis = (config: EnhancedChartConfiguration) => {
    const updatedSaved = [...savedAnalyses, config];
    setSavedAnalyses(updatedSaved);
    saveAnalyses(updatedSaved, recentAnalyses);
  };

  const handleLoadAnalysis = (config: EnhancedChartConfiguration) => {
    // Add to recent analyses if not already there
    const existingIndex = recentAnalyses.findIndex(a => a.id === config.id);
    let updatedRecent = [...recentAnalyses];
    
    if (existingIndex >= 0) {
      // Move to front
      updatedRecent.splice(existingIndex, 1);
    }
    
    updatedRecent.unshift({
      ...config,
      createdAt: new Date(),
      isSaved: false
    });
    
    // Keep only last 10 recent analyses
    updatedRecent = updatedRecent.slice(0, 10);
    
    setRecentAnalyses(updatedRecent);
    saveAnalyses(savedAnalyses, updatedRecent);
  };

  const handleDeleteAnalysis = (id: string) => {
    const updatedSaved = savedAnalyses.filter(a => a.id !== id);
    const updatedRecent = recentAnalyses.filter(a => a.id !== id);
    
    setSavedAnalyses(updatedSaved);
    setRecentAnalyses(updatedRecent);
    saveAnalyses(updatedSaved, updatedRecent);
  };

  const handleRenameAnalysis = (id: string, newName: string) => {
    const updateAnalysis = (analysis: EnhancedChartConfiguration) => 
      analysis.id === id ? { ...analysis, name: newName } : analysis;
    
    const updatedSaved = savedAnalyses.map(updateAnalysis);
    const updatedRecent = recentAnalyses.map(updateAnalysis);
    
    setSavedAnalyses(updatedSaved);
    setRecentAnalyses(updatedRecent);
    saveAnalyses(updatedSaved, updatedRecent);
  };

  const handlePromptSubmit = (message: string) => {
    console.log('Insights prompt submitted:', message);
    // TODO: Integrate with AI service to interpret analytics queries
    // This could suggest chart types or variable combinations based on the query
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
        {/* Header with Back to Main Button */}
        <BackToMainButton 
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          pageTitle="Insights"
        />

        {/* Sidebar Content */}
        {!sidebarCollapsed && (
          <div className="flex-1 px-4 pt-6 overflow-y-auto">
            <AnalysisSidebar
              savedAnalyses={savedAnalyses}
              recentAnalyses={recentAnalyses}
              onLoadAnalysis={handleLoadAnalysis}
              onDeleteAnalysis={handleDeleteAnalysis}
              onRenameAnalysis={handleRenameAnalysis}
              sidebarCollapsed={sidebarCollapsed}
            />
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
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-semibold text-gray-900">Analytics & Insights</h1>
          </div>
        </div>

        {/* Main Content Area - Canvas */}
        <InsightsCanvas
          onSaveAnalysis={handleSaveAnalysis}
          savedAnalyses={savedAnalyses}
          onLoadAnalysis={handleLoadAnalysis}
          onDeleteAnalysis={handleDeleteAnalysis}
        />

        {/* Prompt Area */}
        <PromptArea 
          onSubmit={handlePromptSubmit}
          placeholder="Ask me to create charts, analyze trends, or suggest visualizations..."
        />
      </div>
    </div>
  );
} 