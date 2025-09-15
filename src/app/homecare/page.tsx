'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Home, Phone, Globe, MapPin, DollarSign, FileText, Activity, Heart, Award, BarChart3, BookmarkCheck, Trash2, ArrowLeft, Scale, X, Save, Building2, Building, Filter, ExternalLink, ChevronDown, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HomecareInlineBoxPlot from '@/components/homecare/HomecareInlineBoxPlot';
import { trackApiCall } from '@/lib/usageTracking';

import { getCurrentUser, signOut } from '../../lib/auth';
import { 
  saveHomecareProvider, 
  getUserSavedHomecareProviders, 
  deleteSavedHomecareProvider, 
  isHomecareProviderSaved,
  clearUserSavedHomecareProviders,
  type SavedHomecareProvider 
} from '../../lib/savedHomecareFacilities';
import {
  saveHomecareSearchToHistory,
  getHomecareSearchHistory,
  clearHomecareSearchHistory,
  deleteHomecareSearchHistoryItem,
  saveHomecareComparisonToHistory,
  getHomecareComparisonHistory,
  clearHomecareComparisonHistory,
  deleteHomecareComparisonHistoryItem,
  addHomecareComparisonSelection,
  removeHomecareComparisonSelection,
  getHomecareComparisonSelections,
  clearHomecareComparisonSelections,
  isHomecareProviderSelected,
  type HomecareSearchHistoryItem,
  type HomecareComparisonHistoryItem,
  type HomecareComparisonSelection
} from '../../lib/homecareHistory';
import {
  getUserSavedSA2Searches,
  type SavedSA2Search
} from '../../lib/savedSA2Searches';
import HomecareHistoryPanel from '../../components/homecare/HistoryPanel';
import { getLocationByName } from '../../lib/mapSearchService';
import { 
  filterFacilitiesByRadius, 
  sortFacilitiesByDistance, 
  addDistanceToFacilities,
  calculateDistance 
} from '../../lib/spatialUtils';
import type { 
  HomecareProvider, 
  HomecareAPIResponse, 
  HomecareFilters 
} from '@/types/homecare';
import { getMapDataUrl } from '../../lib/supabaseStorage';

interface UserData {
  email: string;
  name: string;
  id: string;
}

// Loading component for Suspense fallback
function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Homecare Providers</h2>
        <p className="text-gray-600">Please wait while we load the homecare providers...</p>
      </div>
    </div>
  );
}

// Client component that uses search params
function HomecarePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState<HomecareProvider[]>([]);
  const urlParamProcessedRef = useRef(false);
  const [filteredProviders, setFilteredProviders] = useState<HomecareProvider[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<HomecareProvider | null>(null);
  
  // Saved providers state - using Supabase
  const [savedProviders, setSavedProviders] = useState<SavedHomecareProvider[]>([]);
  const [showSavedProviders, setShowSavedProviders] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  
  // Maps-style authentication states
  const [user, setUser] = useState<UserData | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  
  // Comparison functionality state
  const [selectedForComparison, setSelectedForComparison] = useState<HomecareProvider[]>([]);
  const [showSelectedList, setShowSelectedList] = useState(false);
  const [showSavedProvidersDropdown, setShowSavedProvidersDropdown] = useState(false);
  
  // Supabase-backed history state
  const [recentComparisons, setRecentComparisons] = useState<HomecareComparisonHistoryItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<HomecareSearchHistoryItem[]>([]);
  const [isHistoryPanelVisible, setIsHistoryPanelVisible] = useState(true);
  
  // Persistent comparison selections state
  const [persistentSelections, setPersistentSelections] = useState<HomecareComparisonSelection[]>([]);

  // Filtering state
  const [filters, setFilters] = useState<HomecareFilters>({});

  // Statistical data for inline box plots - NEW
  const [statisticsData, setStatisticsData] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedScope, setSelectedScope] = useState<'nationwide' | 'state' | 'locality' | 'service_region'>('nationwide');
  const [showBoxPlots, setShowBoxPlots] = useState(true);

  // Spatial search state - like residential
  const [searchCoordinates, setSearchCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationSearchActive, setIsLocationSearchActive] = useState(false);
  const [isTextEnhanced, setIsTextEnhanced] = useState(false);
  const [locationSearchContext, setLocationSearchContext] = useState('');
  const [searchRadius, setSearchRadius] = useState(0.18); // ~20km like residential
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);

  // SA2 Region Filtering state - like residential
  const [savedSA2Regions, setSavedSA2Regions] = useState<SavedSA2Search[]>([]);
  const [showSA2Dropdown, setShowSA2Dropdown] = useState(false);
  const [selectedSA2Filter, setSelectedSA2Filter] = useState<SavedSA2Search | null>(null);
  const [sa2LoadingError, setSA2LoadingError] = useState<string | null>(null);

  // Utility functions (currently unused but kept for future use)
  const _isHomecareProviderSaved = (
    provider: HomecareProvider,
    savedProviders: any[]
  ): boolean => {
    return savedProviders.some(saved => saved.provider_name === provider.provider_info?.provider_name || saved.provider_id === provider.provider_info?.provider_id);
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const result = await signOut();
      
      if (result.success) {
        router.push('/auth/signin');
      } else {
        console.error('Sign out failed:', result.error);
        setSigningOut(false);
      }
    } catch (error) {
      console.error('Sign out error:', error);
      setSigningOut(false);
    }
  };

  // Get user initials for avatar
  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Load user and their data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          router.push('/auth/signin');
          return;
        }

        setCurrentUser(currentUser);
        
        // Set Maps-style user data
        setUser({
          email: currentUser.email || '',
          name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
          id: currentUser.id
        });
        
        if (currentUser?.id) {
          // Load saved providers
          const savedData = await getUserSavedHomecareProviders(currentUser.id);
          setSavedProviders(savedData);
          
          // Track Supabase read operation
          trackApiCall({
            userId: currentUser.id,
            page: '/homecare',
            service: 'supabase',
            action: 'select',
            endpoint: 'savedHomecareProviders',
            method: 'select',
            meta: { count: savedData.length }
          });
          
          // Load search history
          const historyData = await getHomecareSearchHistory(currentUser.id);
          setSearchHistory(historyData);
          
          // Load comparison history
          const comparisonData = await getHomecareComparisonHistory(currentUser.id);
          setRecentComparisons(comparisonData);
          
          // Load persistent selections
          const selectionsData = await getHomecareComparisonSelections(currentUser.id);
          setPersistentSelections(selectionsData);
          
          // Load saved SA2 regions from Supabase
          try {
            const sa2Result = await getUserSavedSA2Searches(currentUser.id);
            setSavedSA2Regions(sa2Result.searches);
          } catch (error) {
            console.error('Error loading saved SA2 regions:', error);
            setSA2LoadingError('Failed to load saved SA2 regions');
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        router.push('/auth/signin');
      } finally {
        setUserLoading(false);
      }
    };

    loadUser();
  }, [router]);

  // Handle SA2 URL parameter for direct navigation from insights page (only on initial load)
  useEffect(() => {
    if (!searchParams || urlParamProcessedRef.current) return;
    
    const sa2Param = searchParams.get('sa2');
    if (sa2Param) {
      // Always populate the search bar with the SA2 name from URL
      setSearchTerm(sa2Param);
      console.log('🏠 HOMECARE: Auto-populated search bar from URL:', sa2Param);
      
      // If we have saved SA2 regions, try to find and apply the filter
      if (savedSA2Regions.length > 0 && !selectedSA2Filter) {
        const matchingSA2 = savedSA2Regions.find(region => 
          region.sa2_name.toLowerCase() === sa2Param.toLowerCase()
        );
        
        if (matchingSA2) {
          setSelectedSA2Filter(matchingSA2);
          console.log('🗺️ HOMECARE: Auto-selected SA2 filter from URL:', matchingSA2.sa2_name);
        } else {
          console.log('🏠 HOMECARE: SA2 region not in saved searches, but search bar populated:', sa2Param);
        }
      }
      
      urlParamProcessedRef.current = true; // Mark as processed
    }
  }, [searchParams, savedSA2Regions.length, selectedSA2Filter]); // Use .length for stable dependency

  // Handle address URL parameter for direct navigation from maps page
  useEffect(() => {
    if (!searchParams || urlParamProcessedRef.current) return;
    
    const addressParam = searchParams.get('address');
    if (addressParam) {
      // Always populate the search bar with the facility address from URL
      setSearchTerm(addressParam);
      console.log('🏠 HOMECARE: Auto-populated search bar from address URL:', addressParam);
      
      urlParamProcessedRef.current = true; // Mark as processed
    }
  }, [searchParams]);

  // DEBUG: Monitor selectedForComparison state changes
  useEffect(() => {
    console.log('🔍 COMPARISON STATE CHANGE DETECTED');
    console.log('📊 selectedForComparison length:', selectedForComparison.length);
    console.log('📝 Selected providers:', selectedForComparison.map(p => 
      `${p.provider_info.provider_name} (ID: ${p.provider_id})`
    ));
    console.log('🔢 Provider IDs:', selectedForComparison.map(p => p.provider_id));
  }, [selectedForComparison]);

  // Restore comparison selections from persistent state when providers are loaded
  useEffect(() => {
    const restoreComparisonSelections = async () => {
      if (providers.length > 0 && persistentSelections.length > 0 && currentUser) {
        console.log('🔄 PERSISTENCE: Restoring comparison selections...');
        console.log('📋 Persistent selections to restore:', persistentSelections.length);
        
        // Find providers that match persistent selections
        const restoredProviders = providers.filter(provider => 
          persistentSelections.some(selection => selection.provider_id === provider.provider_id)
        );
        
        console.log('✅ PERSISTENCE: Found', restoredProviders.length, 'providers to restore');
        console.log('📝 PERSISTENCE: Restored providers:', restoredProviders.map(p => p.provider_info.provider_name));
        
        setSelectedForComparison(restoredProviders);
      }
    };

    restoreComparisonSelections();
  }, [providers, persistentSelections, currentUser]);

  // Load homecare providers - CLIENT-SIDE like residential
  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);
        
        // Use Supabase URL instead of local path
        const supabaseUrl = getMapDataUrl('merged_homecare_providers.json');
        const response = await fetch(supabaseUrl);
        if (!response.ok) {
          throw new Error(`Failed to load homecare data: ${response.status}`);
        }
        
        const data = await response.json();
        setProviders(data);
        setFilteredProviders([]); // Start with empty list like residential
        
        console.log(`Loaded ${data.length} homecare providers`);
        
      } catch (error) {
        console.error('Error loading homecare providers:', error);
        setProviders([]);
        setFilteredProviders([]);
      } finally {
        setLoading(false);
      }
    };

    const loadStatistics = async () => {
      try {
        // Use Supabase URL instead of local path
        const supabaseUrl = getMapDataUrl('homecare_statistics_analysis.json');
        const response = await fetch(supabaseUrl);
        if (!response.ok) {
          throw new Error(`Failed to load statistics: ${response.status}`);
        }
        const data = await response.json();
        setStatisticsData(data);
        console.log('✅ Loaded homecare statistics data for box plots');
      } catch (error) {
        console.error('❌ Error loading homecare statistics:', error);
        // Don't block the page if statistics fail to load
        setStatisticsData(null);
      } finally {
        setStatsLoading(false);
      }
    };

    loadProviders();
    loadStatistics();
  }, []); // Only load once, not dependent on search or filters

  // SEARCH HELPER FUNCTIONS - defined outside useEffect for reusability
  const filterBySearchTerm = (providers: HomecareProvider[], term: string) => {
    return providers.filter(provider => {
      const info = provider.provider_info;
      return (
        info.provider_name?.toLowerCase().includes(term.toLowerCase()) ||
        info.service_area?.toLowerCase().includes(term.toLowerCase()) ||
        info.address?.locality?.toLowerCase().includes(term.toLowerCase()) ||
        info.address?.state?.toLowerCase().includes(term.toLowerCase()) ||
        info.address?.postcode?.includes(term) ||
        info.services_offered?.some(service => 
          service?.toLowerCase().includes(term.toLowerCase())
        ) ||
        info.specialized_care?.some(care => 
          care?.toLowerCase().includes(term.toLowerCase())
        ) ||
        info.summary?.toLowerCase().includes(term.toLowerCase())
      );
    });
  };

  const filterByLocation = (providers: HomecareProvider[], coordinates: { lat: number; lng: number }) => {
    console.log(`🗺️ Filtering ${providers.length} providers by location:`, coordinates);
    
    // Map homecare providers to spatial utility format
    const mappedProviders = providers
      .filter(p => p.provider_info.coordinates?.latitude && p.provider_info.coordinates?.longitude)
      .map(provider => ({
        ...provider,
        latitude: provider.provider_info.coordinates!.latitude,
        longitude: provider.provider_info.coordinates!.longitude
      }));
    
    const radiusResults = filterFacilitiesByRadius(mappedProviders, coordinates.lat, coordinates.lng, searchRadius);
    const sortedResults = sortFacilitiesByDistance(radiusResults, coordinates.lat, coordinates.lng);
    const resultsWithDistance = addDistanceToFacilities(sortedResults, coordinates.lat, coordinates.lng);
    
    console.log(`📍 Found ${resultsWithDistance.length} providers within ~20km of coordinates [${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}]`);
    return resultsWithDistance as HomecareProvider[];
  };

  const hybridSearch = (providers: HomecareProvider[], term: string, coordinates: { lat: number; lng: number } | null) => {
    let textResults: HomecareProvider[] = [];
    let locationEnhancedResults: HomecareProvider[] = [];

    // PRIMARY: Always perform text search first
    if (term.trim() !== '') {
      textResults = filterBySearchTerm(providers, term);
      console.log(`🔍 TEXT-FIRST: Text search for "${term}" found ${textResults.length} results`);
    }

    // ENHANCEMENT: Get location-based results if coordinates are available
    if (coordinates) {
      const searchType = isTextEnhanced ? 'TEXT-ENHANCED' : 'LOCATION-FALLBACK';
      console.log(`🗺️ ${searchType}: Using coordinates for radius enhancement:`, coordinates);
      locationEnhancedResults = filterByLocation(providers, coordinates);
      console.log(`📍 ${searchType}: Found ${locationEnhancedResults.length} providers within radius`);
    }

    // Combine results, prioritizing TEXT MATCHES first, then adding unique location-enhanced results
    const combinedResults = [...textResults]; // Start with text matches (highest priority)
    const existingIds = new Set(textResults.map(p => p.provider_info.provider_name));

    // Add location-enhanced results that aren't already in text results
    for (const locationResult of locationEnhancedResults) {
      if (!existingIds.has(locationResult.provider_info.provider_name)) {
        combinedResults.push(locationResult);
      }
    }

    const uniqueLocationResults = locationEnhancedResults.filter(l => !existingIds.has(l.provider_info.provider_name)).length;
    console.log(`🔍 FINAL RESULTS: ${textResults.length} text matches + ${uniqueLocationResults} unique location-enhanced = ${combinedResults.length} total`);
    
    return combinedResults;
  };

  // SOPHISTICATED SEARCH SYSTEM - like residential
  useEffect(() => {

         // Perform sophisticated search with location resolution AND HISTORY SAVING
     const performTextFirstSearch = async (term: string) => {
       if (!term.trim()) {
         setSearchCoordinates(null);
         setIsLocationSearchActive(false);
         setLocationSearchContext('');
         setIsTextEnhanced(false);
         setFilteredProviders([]);
         return;
       }

       setLocationSearchLoading(true);
       
       try {
         console.log('🔍 TEXT-FIRST: Starting text search for:', term);
         
         // PRIMARY: Always perform text search first
         const textResults = filterBySearchTerm(providers, term);
         console.log(`🔍 TEXT-FIRST: Found ${textResults.length} text matches`);
         
         if (textResults.length > 0) {
           // Use coordinates from first text result for location enhancement
           const firstResult = textResults[0];
           const coordinates = firstResult.provider_info.coordinates;
           
           if (coordinates?.latitude && coordinates?.longitude) {
             console.log('📍 ✅ TEXT-ENHANCED: Using coordinates from first text result for radius enhancement');
             setSearchCoordinates({ 
               lat: coordinates.latitude, 
               lng: coordinates.longitude 
             });
             setIsLocationSearchActive(true);
             setIsTextEnhanced(true);
             setLocationSearchContext(`Found ${textResults.length} matches for "${term}", showing providers within ~20km of search area`);
           } else {
             console.log('⚠️ TEXT-FIRST: First result missing coordinates, no location enhancement available');
             setSearchCoordinates(null);
             setIsLocationSearchActive(false);
             setIsTextEnhanced(false);
             setLocationSearchContext('');
           }
         } else {
                     console.log('🔍 TEXT-FIRST: No text matches found, falling back to location resolution...');
          
          // FALLBACK: Only use getLocationByName when text search yields no results
          try {
            const locationResult = await getLocationByName(term);
            
            if (locationResult && locationResult.center) {
              console.log('🗺️ FALLBACK: Location resolved:', locationResult);
              setSearchCoordinates({ 
                lat: locationResult.center[1], 
                lng: locationResult.center[0] 
              });
              setIsLocationSearchActive(true);
              setIsTextEnhanced(false); // Pure location search, not text-enhanced
              setLocationSearchContext(`Showing providers within ~20km of ${locationResult.name}`);
            } else {
              console.log('❌ FALLBACK: No location found either');
              setSearchCoordinates(null);
              setIsLocationSearchActive(false);
              setLocationSearchContext('');
            }
          } catch (locationError) {
            console.warn('Location search unavailable:', locationError);
            setSearchCoordinates(null);
             setIsLocationSearchActive(false);
             setIsTextEnhanced(false);
             setLocationSearchContext('');
           }
         }


         
       } catch (error) {
         console.error('❌ Search resolution error:', error);
         setSearchCoordinates(null);
         setIsLocationSearchActive(false);
         setIsTextEnhanced(false);
         setLocationSearchContext('');
       } finally {
         setLocationSearchLoading(false);
       }
     };

    // Debounce search resolution to avoid excessive operations
    const timeoutId = setTimeout(() => {
      performTextFirstSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchRadius, providers]);

  // CLIENT-SIDE FILTERING - like residential with SA2 support
  useEffect(() => {
    let filtered = providers;

    // Apply SA2 region filtering first - exactly like residential page
    if (selectedSA2Filter && selectedSA2Filter.sa2_data) {
      if (!selectedSA2Filter.sa2_data.postcode_data) {
        filtered = [];
      } else {
        const sa2Postcodes = selectedSA2Filter.sa2_data.postcode_data.map((pc: any) => pc.Post_Code);
        const sa2Localities = selectedSA2Filter.sa2_data.postcode_data.map((pc: any) => pc.Locality?.toLowerCase());

        filtered = filtered.filter(provider => {
          const providerPostcode = provider.provider_info.address?.postcode;
          const providerLocality = provider.provider_info.address?.locality?.toLowerCase();
          
          return (providerPostcode && sa2Postcodes.includes(providerPostcode)) ||
                 (providerLocality && sa2Localities.includes(providerLocality));
        });
      }
      console.log(`🗺️ SA2 FILTER: Found ${filtered.length} providers in region "${selectedSA2Filter.sa2_name}"`);
    }

    // Apply hybrid search (location + text) if search term is provided
    if (searchTerm.trim() !== '') {
      filtered = hybridSearch(filtered, searchTerm, searchCoordinates);
    }

    // Show results based on filters applied
    if (searchTerm.trim() === '' && !selectedSA2Filter) {
      setFilteredProviders([]);
    } else {
      setFilteredProviders(filtered);
    }
    
    // Helper function for hybrid search (defined here to access state)
    function hybridSearch(providers: HomecareProvider[], term: string, coordinates: { lat: number; lng: number } | null) {
      let textResults: HomecareProvider[] = [];
      let locationEnhancedResults: HomecareProvider[] = [];

      // PRIMARY: Always perform text search first
      if (term.trim() !== '') {
        textResults = providers.filter(provider => {
          const info = provider.provider_info;
          return (
            info.provider_name?.toLowerCase().includes(term.toLowerCase()) ||
            info.service_area?.toLowerCase().includes(term.toLowerCase()) ||
            info.address?.locality?.toLowerCase().includes(term.toLowerCase()) ||
            info.address?.state?.toLowerCase().includes(term.toLowerCase()) ||
            info.address?.postcode?.includes(term) ||
            info.services_offered?.some(service => 
              service?.toLowerCase().includes(term.toLowerCase())
            ) ||
            info.specialized_care?.some(care => 
              care?.toLowerCase().includes(term.toLowerCase())
            ) ||
            info.summary?.toLowerCase().includes(term.toLowerCase())
          );
        });
      }

      // ENHANCEMENT: Get location-based results if coordinates are available
      if (coordinates) {
        // Map homecare providers to spatial utility format
        const mappedProviders = providers
          .filter(p => p.provider_info.coordinates?.latitude && p.provider_info.coordinates?.longitude)
          .map(provider => ({
            ...provider,
            latitude: provider.provider_info.coordinates!.latitude,
            longitude: provider.provider_info.coordinates!.longitude
          }));
          
        const radiusResults = filterFacilitiesByRadius(mappedProviders, coordinates.lat, coordinates.lng, searchRadius);
        const sortedResults = sortFacilitiesByDistance(radiusResults, coordinates.lat, coordinates.lng);
        locationEnhancedResults = addDistanceToFacilities(sortedResults, coordinates.lat, coordinates.lng) as HomecareProvider[];
      }

      // Combine results, prioritizing TEXT MATCHES first
      const combinedResults = [...textResults];
      const existingIds = new Set(textResults.map(p => p.provider_info.provider_name));

      // Add unique location-enhanced results
      for (const locationResult of locationEnhancedResults) {
        if (!existingIds.has(locationResult.provider_info.provider_name)) {
          combinedResults.push(locationResult);
        }
      }
      
      return combinedResults;
    }
     }, [searchTerm, providers, searchCoordinates, searchRadius, isTextEnhanced, selectedSA2Filter]);



  // Handle search change (simple state update)
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // 💾 USER INTERACTION-BASED HISTORY SAVING - like residential
  const addToSearchHistory = async (term: string) => {
    if (term.trim() && currentUser) {
      // Enhanced search term with location context for history
      const enhancedTerm = isLocationSearchActive && locationSearchContext 
        ? `${term} (${locationSearchContext})`
        : term.trim();
      
      console.log(`💾 Adding search to history: "${enhancedTerm}"`);
      
      // Save to Supabase with enhanced context
      const saved = await saveHomecareSearchToHistory(
        currentUser.id, 
        enhancedTerm,
        locationSearchContext || term,
        isLocationSearchActive ? 20 : undefined,
        filters,
        filteredProviders.length
      );
      
      if (saved) {
        // Reload search history from Supabase
        const updatedSearches = await getHomecareSearchHistory(currentUser.id, 10);
        setSearchHistory(updatedSearches);
        console.log(`✅ Search history updated`);
      }
    }
  };

  // Handle provider save/unsave
  const handleToggleSave = async (provider: HomecareProvider) => {
    if (!currentUser?.id) return;

    // 💾 Save search to history when user saves a provider (user interaction trigger)
    if (searchTerm.trim().length > 0) {
      await addToSearchHistory(searchTerm);
    }

    try {
      const isCurrentlySaved = provider.isSaved;
      
      if (isCurrentlySaved) {
        await deleteSavedHomecareProvider(currentUser.id, provider.provider_id);
        // Update local state
        setSavedProviders(prev => prev.filter(p => p.provider_id !== provider.provider_id));
        setProviders(prev => prev.map(p => 
          p.provider_id === provider.provider_id ? { ...p, isSaved: false } : p
        ));
        setFilteredProviders(prev => prev.map(p => 
          p.provider_id === provider.provider_id ? { ...p, isSaved: false } : p
        ));
      } else {
        const savedProvider = await saveHomecareProvider(
          currentUser.id,
          provider.provider_id,
          provider.provider_info.provider_name,
          provider.provider_info.service_area,
          provider.provider_info.organization_type,
          provider.provider_info.address.locality,
          provider.provider_info.address.state,
          provider.provider_info.address.postcode,
          provider.provider_info.contact.phone,
          provider.provider_info.contact.email || undefined
        );
        
        // Update local state
        setSavedProviders(prev => [savedProvider, ...prev]);
        setProviders(prev => prev.map(p => 
          p.provider_id === provider.provider_id ? { ...p, isSaved: true } : p
        ));
        setFilteredProviders(prev => prev.map(p => 
          p.provider_id === provider.provider_id ? { ...p, isSaved: true } : p
        ));
        
        // Track Supabase write operation
        trackApiCall({
          userId: currentUser.id,
          page: '/homecare',
          service: 'supabase',
          action: 'insert',
          endpoint: 'savedHomecareProviders',
          method: 'insert',
          meta: { 
            provider_id: provider.provider_id,
            provider_name: provider.provider_info.provider_name
          }
        });
      }
    } catch (error) {
      console.error('Error toggling save status:', error);
    }
  };

  // History panel handlers
  const handleSearchHistoryClick = (item: HomecareSearchHistoryItem) => {
    console.log('🔄 RESTORING: Recent homecare search clicked:', item.search_term);
    
    // Parse enhanced search term to extract original search term and detect location context
    const searchTermToRestore = item.search_term;
    
    // Check if this is an enhanced location-based search (contains location context in parentheses)
    const locationContextMatch = searchTermToRestore.match(/^(.+?)\s*\((.+)\)$/);
    
    if (locationContextMatch) {
      // This was a location-based search - extract original term
      const originalTerm = locationContextMatch[1].trim();
      const savedContext = locationContextMatch[2];
      
      console.log('🗺️ RESTORING: Location-based search detected');
      console.log('📍 RESTORING: Original term:', originalTerm);
      console.log('📍 RESTORING: Saved context:', savedContext);
      
      // Set the clean search term (this will trigger location resolution via useEffect)
      setSearchTerm(originalTerm);
      
      // The location resolution useEffect will handle:
      // - Setting searchCoordinates
      // - Setting isLocationSearchActive
      // - Setting locationSearchContext
      // - Setting isTextEnhanced
      // - Filtering and displaying results
    } else {
      // This is a simple text search - restore as normal
      console.log('📝 RESTORING: Text-only search');
      setSearchTerm(searchTermToRestore);
    }
    
    // Restore filters if they were applied
    if (item.filters_applied) {
      // Convert the stored filter format to our current filter format
      const convertedFilters: HomecareFilters = {
        packageLevels: item.filters_applied.package_levels,
        organizationTypes: item.filters_applied.organization_types,
        serviceTypes: item.filters_applied.service_types,
        costRange: item.filters_applied.cost_range
      };
      setFilters(convertedFilters);
      console.log('🎛️ RESTORING: Filters applied:', convertedFilters);
    }
  };

  const handleComparisonHistoryClick = (item: HomecareComparisonHistoryItem) => {
    // Load comparison - will implement when comparison system is ready
    console.log('Load comparison:', item);
  };

  const handleDeleteSearchHistory = async (itemId: string) => {
    if (!currentUser?.id) return;
    try {
      await deleteHomecareSearchHistoryItem(currentUser.id, itemId);
      const historyData = await getHomecareSearchHistory(currentUser.id);
      setSearchHistory(historyData);
    } catch (error) {
      console.error('Error deleting search history item:', error);
    }
  };

  const handleDeleteComparisonHistory = async (itemId: string) => {
    if (!currentUser?.id) return;
    try {
      await deleteHomecareComparisonHistoryItem(currentUser.id, itemId);
      const comparisonData = await getHomecareComparisonHistory(currentUser.id);
      setRecentComparisons(comparisonData);
    } catch (error) {
      console.error('Error deleting comparison history item:', error);
    }
  };

  const handleClearSearchHistory = async () => {
    if (!currentUser?.id) return;
    try {
      await clearHomecareSearchHistory(currentUser.id);
      setSearchHistory([]);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  const handleClearComparisonHistory = async () => {
    if (!currentUser?.id) return;
    try {
      await clearHomecareComparisonHistory(currentUser.id);
      setRecentComparisons([]);
    } catch (error) {
      console.error('Error clearing comparison history:', error);
    }
  };

  // Clear saved providers
  const handleClearSavedProviders = async () => {
    if (!currentUser?.id) return;
    try {
      await clearUserSavedHomecareProviders(currentUser.id);
      setSavedProviders([]);
      // Update provider states
      setProviders(prev => prev.map(p => ({ ...p, isSaved: false })));
      setFilteredProviders(prev => prev.map(p => ({ ...p, isSaved: false })));
    } catch (error) {
      console.error('Error clearing saved providers:', error);
    }
  };

  const deleteSavedProvider = async (providerId: string) => {
    if (!currentUser?.id) return;
    try {
      await deleteSavedHomecareProvider(currentUser.id, providerId);
      setSavedProviders(prev => prev.filter(p => p.provider_id !== providerId));
      // Update provider states
      setProviders(prev => prev.map(p => 
        p.provider_id === providerId ? { ...p, isSaved: false } : p
      ));
      setFilteredProviders(prev => prev.map(p => 
        p.provider_id === providerId ? { ...p, isSaved: false } : p
      ));
    } catch (error) {
      console.error('Error deleting saved provider:', error);
    }
  };

  // Handle view details for saved providers
  const handleViewDetails = async (providerData: any) => {
    // 💾 Save search to history when user views details (user interaction trigger)
    if (searchTerm.trim().length > 0 && currentUser) {
      await addToSearchHistory(searchTerm);
    }
    setSelectedProvider(providerData);
  };

  // Comparison functionality with 5-provider limit and persistence
  const toggleProviderSelection = async (provider: HomecareProvider) => {
    console.log('🔄 COMPARISON DEBUG: toggleProviderSelection called');
    console.log('📋 Provider being toggled:', provider.provider_info.provider_name, 'ID:', provider.provider_id);
    
    setSelectedForComparison(prev => {
      console.log('📊 Current selection state before toggle:', prev.length, 'providers');
      console.log('📝 Current providers:', prev.map(p => p.provider_info.provider_name));
      
      const isSelected = prev.some(p => p.provider_id === provider.provider_id);
      console.log('🔍 Provider already selected?', isSelected);
      
      if (isSelected) {
        // Remove from persistent storage if user is logged in
        if (currentUser) {
          removeHomecareComparisonSelection(currentUser.id, provider.provider_id)
            .then(() => {
              console.log('💾 PERSISTENCE: Removed from database');
              // Update persistent selections state
              setPersistentSelections(prev => 
                prev.filter(selection => selection.provider_id !== provider.provider_id)
              );
            })
            .catch(error => console.error('❌ PERSISTENCE ERROR (remove):', error));
        }
        
        const newState = prev.filter(p => p.provider_id !== provider.provider_id);
        console.log('❌ REMOVING provider. New count:', newState.length);
        console.log('📝 Remaining providers:', newState.map(p => p.provider_info.provider_name));
        return newState;
      } else {
        // Add 5-provider limit like residential page
        if (prev.length < 5) {
          // Save to persistent storage if user is logged in
          if (currentUser) {
            addHomecareComparisonSelection(
              currentUser.id,
              provider.provider_id,
              provider.provider_info.provider_name,
              provider.provider_info.service_area || '',
              provider.provider_info.organization_type || ''
            )
              .then((newSelection) => {
                console.log('💾 PERSISTENCE: Saved to database');
                // Update persistent selections state
                setPersistentSelections(prev => [...prev, newSelection]);
              })
              .catch(error => console.error('❌ PERSISTENCE ERROR (add):', error));
          }
          
          const newState = [...prev, provider];
          console.log('✅ ADDING provider. New count:', newState.length);
          console.log('📝 All providers:', newState.map(p => p.provider_info.provider_name));
          return newState;
        } else {
          console.log('🚫 LIMIT REACHED: Cannot add more than 5 providers');
          alert('Maximum 5 providers can be selected for comparison');
          return prev;
        }
      }
    });
  };

  const isProviderSelected = (provider: HomecareProvider) => {
    return selectedForComparison.some(p => p.provider_id === provider.provider_id);
  };

  // SA2 Region selection and filtering handlers - like residential
  const handleSA2RegionSelect = (sa2Region: SavedSA2Search) => {
    setSelectedSA2Filter(sa2Region);
    setShowSA2Dropdown(false);
    // Clear search term when SA2 filter is applied to avoid confusion
    setSearchTerm('');
  };

  const handleClearSA2Filter = () => {
    setSelectedSA2Filter(null);
    setSearchTerm(''); // Also clear the search bar
    // Remove the SA2 parameter from URL to prevent re-applying the filter
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('sa2');
    router.replace(newUrl.pathname + newUrl.search);
  };

  const handleToggleSA2Dropdown = () => {
    if (savedSA2Regions.length > 0) {
      setShowSA2Dropdown(!showSA2Dropdown);
    }
  };

  // Handle navigate to insights page
  const handleGoToInsights = () => {
    router.push('/insights');
  };

  const handleClearComparisonSelections = async () => {
    console.log('🗑️ PERSISTENCE: Clearing all comparison selections');
    
    // Clear persistent storage if user is logged in
    if (currentUser) {
      try {
        await clearHomecareComparisonSelections(currentUser.id);
        console.log('💾 PERSISTENCE: Cleared database selections');
        
        // Reload persistent selections from database
        const updatedSelections = await getHomecareComparisonSelections(currentUser.id);
        setPersistentSelections(updatedSelections);
      } catch (error) {
        console.error('❌ PERSISTENCE ERROR (clear):', error);
      }
    }
    
    setSelectedForComparison([]);
  };

  const startComparison = async () => {
    console.log('🚀 COMPARISON DEBUG: startComparison called');
    console.log('📊 Current selectedForComparison length:', selectedForComparison.length);
    console.log('📝 Selected providers:', selectedForComparison.map(p => p.provider_info.provider_name));
    console.log('👤 Current user:', currentUser ? 'Logged in' : 'Anonymous');
    
    if (selectedForComparison.length >= 2) {
      console.log('✅ COMPARISON CONDITION MET: >= 2 providers selected');
      
      const comparisonName = selectedForComparison.map(p => p.provider_info.provider_name).join(" vs ");
      const providerNames = selectedForComparison.map(p => p.provider_info.provider_name);
      const providerIds = selectedForComparison.map(p => p.provider_id);
      
      console.log('📋 Comparison name:', comparisonName);
      console.log('📝 Provider names for URL:', providerNames);
      console.log('🆔 Provider IDs:', providerIds);
      
      // Save to history only if user is logged in
      if (currentUser) {
        console.log('💾 SAVING TO DATABASE: User is logged in');
        try {
          const saved = await saveHomecareComparisonToHistory(currentUser.id, comparisonName, providerIds, providerNames);
          console.log('✅ Database save result:', saved ? 'SUCCESS' : 'FAILED');
          if (saved) {
            // Reload comparison history from Supabase
            const updatedComparisons = await getHomecareComparisonHistory(currentUser.id);
            setRecentComparisons(updatedComparisons);
            console.log('🔄 Updated comparison history loaded');
          }
        } catch (dbError) {
          console.error('❌ DATABASE ERROR:', dbError);
        }
      } else {
        console.log('⚠️ SKIPPING DATABASE: User not logged in');
      }
      
      // Navigate to dedicated comparison page with provider names as URL parameters
      const encodedProviderNames = providerNames.join(',');
      const comparisonURL = `/homecare/compare?providers=${encodeURIComponent(encodedProviderNames)}`;
      console.log('🧭 NAVIGATION: Attempting to navigate to:', comparisonURL);
      
      try {
        router.push(comparisonURL);
        console.log('✅ NAVIGATION: router.push() called successfully');
        
        // Don't clear selections immediately - let user return and maintain state
        // Only clear when they explicitly clear or start a new search
        console.log('🔄 PERSISTENCE: Keeping selections for potential return navigation');
      } catch (navError) {
        console.error('❌ NAVIGATION ERROR:', navError);
      }
    } else {
      console.log('❌ COMPARISON CONDITION NOT MET: Only', selectedForComparison.length, 'provider(s) selected (need >= 2)');
    }
  };

  // Helper function to get statistics for current scope - NEW
  const getStatisticsForScope = () => {
    if (!statisticsData) return null;
    
    switch (selectedScope) {
      case 'nationwide':
        return statisticsData.nationwide;
      case 'state':
        return statisticsData.byState?.find((s: any) => s.groupName === selectedProvider?.provider_info?.address?.state);
      case 'locality':
        return statisticsData.byLocality?.find((l: any) => l.groupName === selectedProvider?.provider_info?.address?.locality);
      case 'service_region':
        return statisticsData.byServiceRegion?.find((r: any) => r.groupName === selectedProvider?.cost_info?.service_region);
      default:
        return statisticsData.nationwide;
    }
  };

  // Helper function to render fields with optional box plots - UPDATED
  const renderField = (label: string, value: any, fieldName?: string) => {
    if (value === null || value === undefined || value === '') return null;

    // Check if this is a numeric field that can have inline statistics
    const isNumeric = typeof value === 'number';
    const scopeStats = getStatisticsForScope();
    
    // Support both formats: { fields: { "<key>": {...} } } OR { "<key>": {...} }
    const fieldStats = fieldName && scopeStats ? 
      ((scopeStats as any).fields ?? scopeStats)?.[fieldName] : null;

    // Debug logging (temporary)
    if (showBoxPlots && fieldName && !statsLoading) {
      if (!isNumeric) {
        console.debug(`[boxplot] Non-numeric value for ${fieldName}:`, value);
      } else if (!fieldStats) {
        const availableKeys = Object.keys(((scopeStats as any)?.fields ?? scopeStats) ?? {});
        console.debug(`[boxplot] No stats for ${fieldName} in scope ${selectedScope}. Available keys sample:`, availableKeys.slice(0, 10));
      } else {
        console.debug(`[boxplot] ✅ Found stats for ${fieldName}:`, fieldStats);
      }
    }

    // Handle object values that can't be rendered directly by React
    const renderValue = () => {
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      if (typeof value === 'number' && fieldName && (
        /(cost|finance|income|expenditure|rate|hourly|surplus|deficit|budget|payment|fee|price|dollar|pay|financial)/i.test(fieldName) ||
        /(\$|aud|amount)/i.test(fieldName)
      )) {
        return formatCurrency(value);
      }
      return value;
    };

    return (
      <div className="mb-3">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="text-gray-900 flex items-center">
          {renderValue()}
          {showBoxPlots && isNumeric && fieldName && !statsLoading && fieldStats && (
            <HomecareInlineBoxPlot
              fieldName={fieldName}
              currentValue={value}
              statistics={fieldStats}
              scope={selectedScope}
            />
          )}
        </dd>
      </div>
    );
  };

  // Helper function to format currency - NEW
  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined) return 'N/A';
    
    // Large amounts (over 1000) don't need decimal places
    // Smaller amounts (under 1000) like daily rates need decimal places
    const minimumFractionDigits = amount >= 1000 ? 0 : 2;
    const maximumFractionDigits = amount >= 1000 ? 0 : 2;
    
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits,
      maximumFractionDigits
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* History Panel - Fixed Left Sidebar */}
      <HomecareHistoryPanel
        isVisible={isHistoryPanelVisible}
        onToggle={() => setIsHistoryPanelVisible(!isHistoryPanelVisible)}
        searchHistory={searchHistory}
        comparisonHistory={recentComparisons}
        onSearchHistoryClick={handleSearchHistoryClick}
        onComparisonHistoryClick={handleComparisonHistoryClick}
        onDeleteSearchHistory={handleDeleteSearchHistory}
        onDeleteComparisonHistory={handleDeleteComparisonHistory}
        onClearSearchHistory={handleClearSearchHistory}
        onClearComparisonHistory={handleClearComparisonHistory}
      />

      {/* Main Content Area with proper left margin */}
      <div className={`min-h-screen transition-all duration-300 ${
        isHistoryPanelVisible ? 'ml-80' : 'ml-12'
      }`}>
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Home className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Homecare Providers</h1>
            </div>
            
            {/* Back to Main Menu and Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Back to Main Menu Button */}
              <button
                onClick={() => router.push('/main')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Back to Main Menu"
              >
                <ArrowLeft className="w-4 h-4" />
                Main Menu
              </button>
              
              {/* Search Providers Button */}
              <button
                onClick={() => setShowSavedProviders(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  !showSavedProviders
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Search className="w-4 h-4" />
                Search Providers
              </button>
              
              {/* Saved Providers Dropdown */}
              <div className="relative saved-providers-dropdown-container">
                <button
                  onClick={() => savedProviders.length > 0 ? setShowSavedProvidersDropdown(!showSavedProvidersDropdown) : undefined}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    savedProviders.length > 0
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  Saved ({savedProviders.length})
                </button>
                
                {/* Saved Providers Dropdown */}
                {showSavedProvidersDropdown && savedProviders.length > 0 && (
                  <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Saved Providers</h3>
                        <button
                          onClick={handleClearSavedProviders}
                          className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                          title="Clear all saved providers"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {savedProviders.map((savedProvider, index) => (
                        <div key={index} className="p-3 border-b border-gray-100 last:border-b-0 flex justify-between items-center">
                          <div className="cursor-pointer" onClick={() => {
                            setShowSavedProvidersDropdown(false);
                            handleViewDetails(savedProvider);
                          }}>
                            <p className="font-medium text-gray-900 text-sm">{savedProvider.provider_name}</p>
                            <p className="text-xs text-gray-500">{savedProvider.address_locality}, {savedProvider.address_state}</p>
                          </div>
                          <button
                            onClick={() => deleteSavedProvider(savedProvider.provider_id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Remove from saved"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="p-3 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setShowSavedProvidersDropdown(false);
                          setShowSavedProviders(true);
                        }}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        View Saved Providers
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Comparison Counter */}
              <div className="relative comparison-dropdown-container">
                <button
                  onClick={() => selectedForComparison.length > 0 ? setShowSelectedList(!showSelectedList) : undefined}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedForComparison.length > 0
                      ? 'bg-orange-100 text-orange-700 border border-orange-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  Compare ({selectedForComparison.length}/5 selected)
                </button>
                
                {/* Selected Providers Dropdown */}
                {showSelectedList && selectedForComparison.length > 0 && (
                  <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Selected for Comparison</h3>
                        <button
                          onClick={handleClearComparisonSelections}
                          className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                          title="Clear all selected providers"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {selectedForComparison.map((provider, index) => (
                        <div key={index} className="p-3 border-b border-gray-100 last:border-b-0 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{provider.provider_info.provider_name}</p>
                            <p className="text-xs text-gray-500">{provider.provider_info.address.locality}, {provider.provider_info.address.state}</p>
                          </div>
                          <button
                            onClick={async () => await toggleProviderSelection(provider)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Remove from comparison"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {selectedForComparison.length >= 2 && (
                      <div className="p-3 border-t border-gray-200">
                        <button
                          onClick={() => {
                            console.log('🖱️ COMPARISON DEBUG: View Comparison button clicked!');
                            console.log('📊 Current state when button clicked:', selectedForComparison.length, 'providers selected');
                            setShowSelectedList(false);
                            startComparison();
                          }}
                          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          View Comparison
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {!showSavedProviders && (
            <>
              {/* Search Bar and SA2 Filter */}
              <div className="flex gap-4 items-start">
                <div className="relative flex-1 max-w-2xl">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by location (e.g., Sydney CBD) or provider name, address, services..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* SA2 Region Filter Button */}
                <div className="relative sa2-dropdown-container">
                  <button
                    onClick={handleToggleSA2Dropdown}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors min-w-48 ${
                      selectedSA2Filter
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : savedSA2Regions.length > 0
                        ? 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    }`}
                    disabled={savedSA2Regions.length === 0}
                    title={savedSA2Regions.length === 0 ? 'No saved SA2 regions available' : 'Filter by saved SA2 region'}
                  >
                    <Filter className="w-4 h-4" />
                    {selectedSA2Filter ? (
                      <span className="truncate">{selectedSA2Filter.sa2_name}</span>
                    ) : (
                      <span>SA2 Regions ({savedSA2Regions.length})</span>
                    )}
                    {selectedSA2Filter && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearSA2Filter();
                        }}
                        className="text-green-700 hover:text-green-900 ml-1 cursor-pointer"
                        title="Clear SA2 filter"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                  
                  {/* SA2 Dropdown */}
                  {showSA2Dropdown && savedSA2Regions.length > 0 && (
                    <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="p-3 border-b border-gray-200 flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">Saved SA2 Regions</h3>
                          <p className="text-xs text-gray-500">Filter providers by saved ABS SA2 regions</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGoToInsights();
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Go to Insights page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {savedSA2Regions.map((sa2Region, index) => (
                          <div key={index} className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                               onClick={() => handleSA2RegionSelect(sa2Region)}>
                            <p className="font-medium text-gray-900 text-sm">{sa2Region.sa2_name}</p>
                            <p className="text-xs text-gray-500">
                              {sa2Region.sa2_data?.postcode_data?.length || 0} postcodes/localities
                            </p>
                            <p className="text-xs text-gray-400">
                              Saved {new Date(sa2Region.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-2 text-sm text-gray-600">
                <p>
                  {searchTerm.trim() === '' && !selectedSA2Filter
                    ? `Search through ${providers.length} homecare providers using the search bar above`
                    : selectedSA2Filter && searchTerm.trim() === ''
                    ? `Showing ${filteredProviders.length} of ${providers.length} providers in "${selectedSA2Filter.sa2_name}" region`
                    : selectedSA2Filter && searchTerm.trim() !== ''
                    ? `Showing ${filteredProviders.length} providers matching "${searchTerm}" in "${selectedSA2Filter.sa2_name}" region`
                    : `Showing ${filteredProviders.length} of ${providers.length} providers matching "${searchTerm}"`
                  }
                </p>
                {selectedSA2Filter && (
                  <p className="text-xs text-green-600 mt-1">
                    🗺️ Filtering by SA2 region: {selectedSA2Filter.sa2_name} 
                    <button 
                      onClick={handleClearSA2Filter}
                      className="ml-2 text-green-700 hover:text-green-900 underline"
                    >
                      Clear filter
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
          
          {showSavedProviders && (
            <p className="text-sm text-gray-600">
              {savedProviders.length === 0 
                ? 'No saved providers yet. Search and save providers to view them here.'
                : `Viewing ${savedProviders.length} saved providers`
              }
            </p>
          )}
        </div>
      </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedProvider ? (
          /* Provider List */
          <div>
            {!showSavedProviders ? (
              /* Search Results */
              <div>
                {(searchTerm.trim() === '' && !selectedSA2Filter) ? (
                  /* Empty State - No Search */
                  <div className="text-center py-12">
                    <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Search Homecare Providers</h3>
                    <p className="text-gray-600 mb-4">
                      Use the search bar above to find homecare providers by name, address, services, or location.
                    </p>
                    <p className="text-sm text-gray-500">
                      {providers.length} providers available
                    </p>
                  </div>
                ) : filteredProviders.length > 0 ? (
                  /* Provider Results */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProviders.map((provider, index) => (
                      <Card key={index} className={`hover:shadow-lg transition-shadow relative ${
                        isProviderSelected(provider) 
                          ? 'ring-2 ring-orange-400 bg-orange-50' 
                          : ''
                      }`}>
                        
                        {/* Always-visible Comparison Selection - Scale Icon like residential */}
                        <div className="absolute top-2 right-2 z-10">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await toggleProviderSelection(provider);
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-colors ${
                              isProviderSelected(provider)
                                ? 'bg-orange-600 border-orange-600 text-white'
                                : 'bg-white border-gray-300 text-gray-400 hover:border-orange-400 hover:text-orange-600'
                            }`}
                            title="Select for comparison"
                          >
                            <Scale className={`w-5 h-5 ${
                              isProviderSelected(provider) ? 'text-white' : 'text-gray-400'
                            }`} />
                          </button>
                          {isProviderSelected(provider) && (
                            <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                              {selectedForComparison.findIndex(p => p.provider_info.provider_name === provider.provider_info.provider_name) + 1}
                            </span>
                          )}
                        </div>

                        <CardHeader>
                          <div className="flex items-start justify-between pr-12">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{provider.provider_info.provider_name}</CardTitle>
                              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                <div className="flex items-center space-x-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>{provider.provider_info.service_area}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Building2 className="w-4 h-4" />
                                  <span>{provider.provider_info.organization_type}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          <div className="grid grid-cols-1 gap-4">
                            {/* Location Info */}
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                              <p className="text-sm text-gray-600">
                                {provider.provider_info.address.street}<br />
                                {provider.provider_info.address.locality}, {provider.provider_info.address.state} {provider.provider_info.address.postcode}
                              </p>
                            </div>
                            
                            {/* Package Level Indicators */}
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Care Packages</h4>
                              <div className="flex space-x-1">
                                {Object.entries(provider.provider_info.home_care_packages).map(([level, available]) => (
                                  available && (
                                    <span
                                      key={level}
                                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                    >
                                      Level {level.replace('level_', '')}
                                    </span>
                                  )
                                ))}
                              </div>
                            </div>
                            
                            {/* Services Offered */}
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Services</h4>
                              <div className="flex flex-wrap gap-1">
                                {provider.provider_info.services_offered.slice(0, 4).map((service, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                  >
                                    {service}
                                  </span>
                                ))}
                                {provider.provider_info.services_offered.length > 4 && (
                                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                    +{provider.provider_info.services_offered.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={async () => {
                                // 💾 Save search to history when user views details (user interaction trigger)
                                if (searchTerm.trim().length > 0 && currentUser) {
                                  await addToSearchHistory(searchTerm);
                                }
                                setSelectedProvider(provider);
                              }}
                              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              View Details
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSave(provider);
                              }}
                              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                                provider.isSaved
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  /* No Results */
                  <div className="text-center py-12">
                    <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No providers found</h3>
                    <p className="text-gray-600 mb-4">
                      No homecare providers match your search criteria.
                    </p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFilters({});
                      }}
                      className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Clear Search
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Saved Providers View */
              <div>
                {savedProviders.length === 0 ? (
                  <div className="text-center py-12">
                    <BookmarkCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved providers</h3>
                    <p className="text-gray-600 mb-4">
                      Save providers from search results to see them here.
                    </p>
                    <button
                      onClick={() => setShowSavedProviders(false)}
                      className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Search Providers
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {savedProviders.map((savedProvider) => (
                      <div key={savedProvider.provider_id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900">
                              {savedProvider.provider_name}
                            </h3>
                            <div className="text-sm text-gray-600 mt-1">
                              {savedProvider.service_area} • {savedProvider.organization_type}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {savedProvider.address_locality}, {savedProvider.address_state} {savedProvider.address_postcode}
                            </div>
                            {savedProvider.contact_phone && (
                              <div className="text-sm text-gray-600 mt-1">
                                📞 {savedProvider.contact_phone}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                              Saved on {new Date(savedProvider.saved_at).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteSavedProvider(savedProvider.provider_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Provider Details View */
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setSelectedProvider(null)}
              className="mb-6 text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to providers list
            </button>
            
            <div className="bg-white rounded-lg shadow-lg">
              {/* Header */}
              <div className="p-6 border-b space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {selectedProvider.provider_info.provider_name}
                    </h1>
                    <div className="flex items-center gap-2 text-gray-600 mt-2">
                      <MapPin className="w-4 h-4" />
                      {selectedProvider.provider_info.address.street}, {selectedProvider.provider_info.address.locality}, {selectedProvider.provider_info.address.state} {selectedProvider.provider_info.address.postcode}
                    </div>
                  </div>
                  
                  {/* Save Button */}
                  <button
                    onClick={() => handleToggleSave(selectedProvider)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedProvider.isSaved
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
                    }`}
                    title={selectedProvider.isSaved ? 'Remove from saved' : 'Save this provider'}
                  >
                    <Save className="w-4 h-4" />
                    {selectedProvider.isSaved ? 'Unsave' : 'Save Provider'}
                  </button>
                </div>
                
                {/* Controls Row */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">Statistical Comparison:</span>
                    <div className="flex items-center gap-2">
                      {[
                        { key: 'nationwide', label: 'Nationwide', icon: Globe },
                        { key: 'state', label: 'State', icon: Building },
                        { key: 'locality', label: 'Locality', icon: Home },
                        { key: 'service_region', label: 'Region', icon: MapPin }
                      ].map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => setSelectedScope(key as any)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            selectedScope === key
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Box Plot Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBoxPlots}
                      onChange={(e) => setShowBoxPlots(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Show Box Plots</span>
                  </label>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="main" className="p-6">
                <TabsList className="grid grid-cols-7 gap-2 mb-6">
                  <TabsTrigger value="main">Main</TabsTrigger>
                  <TabsTrigger value="costs">Package Costs</TabsTrigger>
                  <TabsTrigger value="service-costs">Service Costs</TabsTrigger>
                  <TabsTrigger value="services">Services</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                  <TabsTrigger value="coverage">Coverage</TabsTrigger>
                  <TabsTrigger value="finance">Finance</TabsTrigger>
                </TabsList>

                {/* Tab 1: Main */}
                <TabsContent value="main">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="w-5 h-5" />
                          Provider Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2">
                          {renderField("Provider ID", selectedProvider.provider_id)}
                          {renderField("Provider Name", selectedProvider.provider_info.provider_name)}
                          {renderField("Service Area", selectedProvider.provider_info.service_area)}
                          {renderField("Organization Type", selectedProvider.provider_info.organization_type)}
                          {renderField("Compliance Status", selectedProvider.provider_info.compliance_status)}
                          {renderField("Last Updated", selectedProvider.provider_info.last_updated)}
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Phone className="w-5 h-5" />
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2">
                          {selectedProvider.provider_info.contact.phone && (
                            <div className="mb-3">
                              <dt className="text-sm font-medium text-gray-500">Phone</dt>
                              <dd>
                                <a href={`tel:${selectedProvider.provider_info.contact.phone}`} 
                                   className="text-blue-600 hover:text-blue-800">
                                  {selectedProvider.provider_info.contact.phone}
                                </a>
                              </dd>
                            </div>
                          )}
                          {selectedProvider.provider_info.contact.email && (
                            <div className="mb-3">
                              <dt className="text-sm font-medium text-gray-500">Email</dt>
                              <dd>
                                <a href={`mailto:${selectedProvider.provider_info.contact.email}`} 
                                   className="text-blue-600 hover:text-blue-800">
                                  {selectedProvider.provider_info.contact.email}
                                </a>
                              </dd>
                            </div>
                          )}
                          {renderField("Address", `${selectedProvider.provider_info.address.street}, ${selectedProvider.provider_info.address.locality}, ${selectedProvider.provider_info.address.state} ${selectedProvider.provider_info.address.postcode}`)}
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Heart className="w-5 h-5" />
                          Package Coverage
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-gray-500 mb-2">Available Package Levels</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[1, 2, 3, 4].map(level => (
                              <div key={level} className={`p-2 rounded-lg border text-center ${
                                selectedProvider.provider_info.home_care_packages[`level_${level}` as keyof typeof selectedProvider.provider_info.home_care_packages]
                                  ? 'bg-green-50 border-green-200 text-green-700'
                                  : 'bg-gray-50 border-gray-200 text-gray-500'
                              }`}>
                                <span className="text-sm font-medium">Level {level}</span>
                                <div className="text-xs">
                                  {selectedProvider.provider_info.home_care_packages[`level_${level}` as keyof typeof selectedProvider.provider_info.home_care_packages] ? 'Available' : 'Not Available'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="w-5 h-5" />
                          Services Offered
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedProvider.provider_info.services_offered && selectedProvider.provider_info.services_offered.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-500 mb-2">Services</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedProvider.provider_info.services_offered.map((service, index) => (
                                <span key={index} className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-900">{service}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedProvider.provider_info.specialized_care && selectedProvider.provider_info.specialized_care.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-2">Specialized Care</p>
                            <div className="space-y-1">
                              {selectedProvider.provider_info.specialized_care.map((care, index) => (
                                <p key={index} className="text-sm text-gray-600">• {care}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tab 2: Package Costs */}
                <TabsContent value="costs">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Care Management Costs
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <dl className="space-y-2">
                            {renderField("Level 1 (Fortnightly)", selectedProvider.cost_info?.management_costs?.care_management?.level_1_fortnightly, "management_costs_care_management_level_1_fortnightly")}
                            {renderField("Level 2 (Fortnightly)", selectedProvider.cost_info?.management_costs?.care_management?.level_2_fortnightly, "management_costs_care_management_level_2_fortnightly")}
                            {renderField("Level 3 (Fortnightly)", selectedProvider.cost_info?.management_costs?.care_management?.level_3_fortnightly, "management_costs_care_management_level_3_fortnightly")}
                            {renderField("Level 4 (Fortnightly)", selectedProvider.cost_info?.management_costs?.care_management?.level_4_fortnightly, "management_costs_care_management_level_4_fortnightly")}
                          </dl>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Package Management Costs
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <dl className="space-y-2">
                            {renderField("Level 1 (Fortnightly)", selectedProvider.cost_info?.management_costs?.package_management?.level_1_fortnightly, "management_costs_package_management_level_1_fortnightly")}
                            {renderField("Level 2 (Fortnightly)", selectedProvider.cost_info?.management_costs?.package_management?.level_2_fortnightly, "management_costs_package_management_level_2_fortnightly")}
                            {renderField("Level 3 (Fortnightly)", selectedProvider.cost_info?.management_costs?.package_management?.level_3_fortnightly, "management_costs_package_management_level_3_fortnightly")}
                            {renderField("Level 4 (Fortnightly)", selectedProvider.cost_info?.management_costs?.package_management?.level_4_fortnightly, "management_costs_package_management_level_4_fortnightly")}
                          </dl>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5" />
                            Package Budgets
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <dl className="space-y-2">
                            {renderField("Level 1 Package (Fortnightly)", selectedProvider.cost_info?.package_budget?.hcp_level_1_fortnightly, "package_budget_hcp_level_1_fortnightly")}
                            {renderField("Charges Basic Daily Fee", selectedProvider.cost_info?.package_budget?.charges_basic_daily_fee ? "Yes" : "No")}
                            {renderField("Self Management Available", selectedProvider.cost_info?.management_costs?.offers_self_management ? "Yes" : "No")}
                          </dl>
                        </CardContent>
                      </Card>
                    </div>

                  </div>
                </TabsContent>

                {/* Tab 3: Service Costs */}
                <TabsContent value="service-costs">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="w-5 h-5" />
                          Service Costs
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Personal Care */}
                          <div>
                            <h4 className="font-semibold mb-3 text-blue-900">Personal Care</h4>
                            <dl className="space-y-2">
                              {renderField("Standard Hours", selectedProvider.cost_info?.service_costs?.personal_care?.standard_hours, "service_costs_personal_care_standard_hours")}
                              {renderField("Non-Standard Hours", selectedProvider.cost_info?.service_costs?.personal_care?.non_standard_hours, "service_costs_personal_care_non_standard_hours")}
                              {renderField("Saturday", selectedProvider.cost_info?.service_costs?.personal_care?.saturday, "service_costs_personal_care_saturday")}
                              {renderField("Sunday", selectedProvider.cost_info?.service_costs?.personal_care?.sunday, "service_costs_personal_care_sunday")}
                              {renderField("Public Holidays", selectedProvider.cost_info?.service_costs?.personal_care?.public_holidays, "service_costs_personal_care_public_holidays")}
                            </dl>
                          </div>
                          
                          {/* Nursing */}
                          <div>
                            <h4 className="font-semibold mb-3 text-green-900">Nursing</h4>
                            <dl className="space-y-2">
                              {renderField("Standard Hours", selectedProvider.cost_info?.service_costs?.nursing?.standard_hours, "service_costs_nursing_standard_hours")}
                              {renderField("Non-Standard Hours", selectedProvider.cost_info?.service_costs?.nursing?.non_standard_hours, "service_costs_nursing_non_standard_hours")}
                              {renderField("Saturday", selectedProvider.cost_info?.service_costs?.nursing?.saturday, "service_costs_nursing_saturday")}
                              {renderField("Sunday", selectedProvider.cost_info?.service_costs?.nursing?.sunday, "service_costs_nursing_sunday")}
                              {renderField("Public Holidays", selectedProvider.cost_info?.service_costs?.nursing?.public_holidays, "service_costs_nursing_public_holidays")}
                            </dl>
                          </div>
                          
                          {/* Cleaning & Household */}
                          <div>
                            <h4 className="font-semibold mb-3 text-purple-900">Cleaning & Household</h4>
                            <dl className="space-y-2">
                              {renderField("Standard Hours", selectedProvider.cost_info?.service_costs?.cleaning_household?.standard_hours, "service_costs_cleaning_household_standard_hours")}
                              {renderField("Non-Standard Hours", selectedProvider.cost_info?.service_costs?.cleaning_household?.non_standard_hours, "service_costs_cleaning_household_non_standard_hours")}
                              {renderField("Saturday", selectedProvider.cost_info?.service_costs?.cleaning_household?.saturday, "service_costs_cleaning_household_saturday")}
                              {renderField("Sunday", selectedProvider.cost_info?.service_costs?.cleaning_household?.sunday, "service_costs_cleaning_household_sunday")}
                              {renderField("Public Holidays", selectedProvider.cost_info?.service_costs?.cleaning_household?.public_holidays, "service_costs_cleaning_household_public_holidays")}
                            </dl>
                          </div>
                        </div>
                        
                        {/* Travel Costs */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-semibold mb-3 text-orange-900">Travel Costs</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <dl className="space-y-2">
                              {renderField("Per KM Rate", selectedProvider.cost_info?.travel_costs?.per_km_rate, "travel_costs_per_km_rate")}
                              {renderField("Special Conditions", selectedProvider.cost_info?.travel_costs?.special_conditions)}
                            </dl>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tab 4: Services */}
                <TabsContent value="services">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="w-5 h-5" />
                          Services Offered
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedProvider.provider_info.services_offered && selectedProvider.provider_info.services_offered.length > 0 ? (
                          <div className="space-y-2">
                            {selectedProvider.provider_info.services_offered.map((service, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                <span className="text-sm text-gray-700">{service}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No services information available</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Heart className="w-5 h-5" />
                          Specialized Care
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedProvider.provider_info.specialized_care && selectedProvider.provider_info.specialized_care.length > 0 ? (
                          <div className="space-y-2">
                            {selectedProvider.provider_info.specialized_care.map((care, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                <span className="text-sm text-gray-700">{care}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No specialized care information available</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tab 4: Compliance */}
                <TabsContent value="compliance">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Compliance Assessment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2">
                          {renderField("Current Status", selectedProvider.compliance_info?.compliance_assessment?.current_status)}
                          {renderField("Current Issues", selectedProvider.compliance_info?.compliance_assessment?.current_issues)}
                          {renderField("Past Issues", selectedProvider.compliance_info?.compliance_assessment?.past_issues)}
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Heart className="w-5 h-5" />
                          Service Feedback
                        </CardTitle>
                      </CardHeader>
                                             <CardContent>
                         <dl className="space-y-2">
                           {renderField("Most Compliments", selectedProvider.compliance_info?.service_feedback?.most_compliments?.join(", "))}
                           {renderField("Most Concerns", selectedProvider.compliance_info?.service_feedback?.most_concerns?.join(", "))}
                           {renderField("Improvement Focus", selectedProvider.compliance_info?.improvement_focus?.join(", "))}
                         </dl>
                       </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tab 5: Coverage */}
                <TabsContent value="coverage">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Service Coverage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        {renderField("Service Region", selectedProvider.cost_info?.service_region)}
                        {renderField("Service Area", selectedProvider.provider_info.service_area)}
                        {renderField("Primary Address", `${selectedProvider.provider_info.address.street}, ${selectedProvider.provider_info.address.locality}, ${selectedProvider.provider_info.address.state} ${selectedProvider.provider_info.address.postcode}`)}
                        {selectedProvider.provider_info.coordinates && (
                          <div className="mb-3">
                            <dt className="text-sm font-medium text-gray-500">Coordinates</dt>
                            <dd className="text-gray-900">
                              {selectedProvider.provider_info.coordinates.latitude?.toFixed(6)}, {selectedProvider.provider_info.coordinates.longitude?.toFixed(6)}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 6: Finance */}
                <TabsContent value="finance">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5" />
                          Financial Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <dl className="space-y-2">
                            {renderField("Financial Year", selectedProvider.finance_info?.financial_year)}
                            {renderField("Provider ABN", selectedProvider.finance_info?.provider_abn)}
                            {renderField("Ownership Details", selectedProvider.finance_info?.ownership_details)}
                          </dl>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          Financial Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <h4 className="font-semibold mb-3 text-red-900">Total Expenditure</h4>
                            <dl className="space-y-2">
                              {renderField("Total Expenditure", selectedProvider.finance_info?.financials?.expenditure?.total, "finance_info_financials_expenditure_total")}
                            </dl>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-3 text-green-900">Total Income</h4>
                            <dl className="space-y-2">
                              {renderField("Total Income", selectedProvider.finance_info?.financials?.income?.total, "finance_info_financials_income_total")}
                            </dl>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-3 text-blue-900">Budget Surplus/Deficit</h4>
                            <dl className="space-y-2">
                              {renderField("Surplus/Deficit", selectedProvider.finance_info?.financials?.budget_surplus_deficit?.value, "finance_info_financials_budget_surplus_deficit_value")}
                            </dl>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="w-5 h-5" />
                          Staff Pay Rates
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <h4 className="font-semibold mb-3 text-blue-900">Registered Nurse</h4>
                            <dl className="space-y-2">
                              {renderField("Hourly Rate", selectedProvider.finance_info?.financials?.staff_pay_rates?.registered_nurse?.hourly_rate, "finance_info_financials_staff_pay_rates_registered_nurse_hourly_rate")}
                              {renderField("Sector Average", selectedProvider.finance_info?.financials?.staff_pay_rates?.registered_nurse?.sector_average, "finance_info_financials_staff_pay_rates_registered_nurse_sector_average")}
                            </dl>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-3 text-green-900">Enrolled Nurse</h4>
                            <dl className="space-y-2">
                              {renderField("Hourly Rate", selectedProvider.finance_info?.financials?.staff_pay_rates?.enrolled_nurse?.hourly_rate, "finance_info_financials_staff_pay_rates_enrolled_nurse_hourly_rate")}
                              {renderField("Sector Average", selectedProvider.finance_info?.financials?.staff_pay_rates?.enrolled_nurse?.sector_average, "finance_info_financials_staff_pay_rates_enrolled_nurse_sector_average")}
                            </dl>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-3 text-purple-900">Home Care Worker</h4>
                            <dl className="space-y-2">
                              {renderField("Hourly Rate", selectedProvider.finance_info?.financials?.staff_pay_rates?.home_care_worker?.hourly_rate, "finance_info_financials_staff_pay_rates_home_care_worker_hourly_rate")}
                              {renderField("Sector Average", selectedProvider.finance_info?.financials?.staff_pay_rates?.home_care_worker?.sector_average, "finance_info_financials_staff_pay_rates_home_care_worker_sector_average")}
                            </dl>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
      </div>
      
      {/* Username Display - Bottom Left */}
      {user && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-3 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={signingOut}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {getInitials(user?.name || '')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'User'}
                </p>
              </div>
              <ChevronDown 
                className={`h-4 w-4 text-gray-500 transition-transform ${
                  userDropdownOpen ? 'rotate-180' : ''
                }`} 
              />
            </button>

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setUserDropdownOpen(false)}
                />
                {/* Sign-out Popup - Opens Above Button */}
                <div className="absolute left-0 bottom-full mb-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogOut className="h-4 w-4 text-red-500" />
                      {signingOut ? 'Signing out...' : 'Sign out'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main page component with Suspense boundary
export default function HomecarePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <HomecarePageContent />
    </Suspense>
  );
}

 