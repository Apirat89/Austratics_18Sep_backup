'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import BackToMainButton from '../../components/BackToMainButton';
import AustralianMap, { AustralianMapRef } from '../../components/AustralianMap';
import MapSearchBar from '../../components/MapSearchBar';
import MapSettings from '../../components/MapSettings';
import DataLayers from '../../components/DataLayers';
import ActiveLayers from '../../components/ActiveLayers';
import { Map, Settings, User, ChevronDown, Check, Menu } from 'lucide-react';

interface UserData {
  email: string;
  name: string;
  id: string;
}

interface FacilityTypes {
  residential: boolean;
  home: boolean;
  retirement: boolean;
}

type GeoLayerType = 'sa2' | 'sa3' | 'sa4' | 'lga' | 'postcode' | 'locality';
type MapStyleType = 'basic' | 'topo' | 'satellite' | 'terrain' | 'streets';

export default function MapsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Facility types state (keeping for backwards compatibility)
  const [facilityTypes, setFacilityTypes] = useState<FacilityTypes>({
    residential: true,
    home: true,
    retirement: true
  });
  const [selectedGeoLayer, setSelectedGeoLayer] = useState<GeoLayerType>('sa2');
  const [selectedMapStyle, setSelectedMapStyle] = useState<MapStyleType>('basic');
  
  // Track highlighted features from the map
  const [highlightedFeature, setHighlightedFeature] = useState<string | null>(null);
  const [highlightedFeatureName, setHighlightedFeatureName] = useState<string | null>(null);
  
  // Map navigation state
  const [mapNavigation, setMapNavigation] = useState<{
    center?: [number, number];
    bounds?: [number, number, number, number];
    zoom?: number;
    searchResult?: any;
  } | null>(null);
  
  // Map reference for calling map methods
  const mapRef = useRef<AustralianMapRef>(null);
  
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

  const toggleFacilityType = useCallback((type: keyof FacilityTypes) => {
    setFacilityTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  }, []);

  const handleSearch = (searchTerm: string, navigation?: { 
    center: [number, number], 
    bounds?: [number, number, number, number],
    searchResult?: any
  }) => {
    console.log('Map search submitted:', searchTerm);
    
    if (navigation) {
      // Auto-switch geo layer based on search result type
      if (navigation.searchResult) {
        const { type } = navigation.searchResult;
        
        // Handle facility searches
        if (type === 'facility') {
          const { facilityType } = navigation.searchResult;
          
          // Enable the appropriate facility type if it's not already enabled
          if (facilityType && facilityType in facilityTypes && !facilityTypes[facilityType as keyof FacilityTypes]) {
            console.log(`Auto-enabling ${facilityType} facility type for facility search`);
            setFacilityTypes(prev => ({
              ...prev,
              [facilityType]: true
            }));
          }
        }
        // Handle boundary searches
        else if (type === 'postcode' && selectedGeoLayer !== 'postcode') {
          console.log('Auto-switching to postcode layer for postcode search');
          setSelectedGeoLayer('postcode');
        } else if (type === 'locality' && selectedGeoLayer !== 'locality') {
          console.log('Auto-switching to locality layer for locality search');
          setSelectedGeoLayer('locality');
        } else if (type === 'lga' && selectedGeoLayer !== 'lga') {
          console.log('Auto-switching to LGA layer for LGA search');
          setSelectedGeoLayer('lga');
        } else if (type === 'sa2' && selectedGeoLayer !== 'sa2') {
          console.log('Auto-switching to SA2 layer for SA2 search');
          setSelectedGeoLayer('sa2');
        } else if (type === 'sa3' && selectedGeoLayer !== 'sa3') {
          console.log('Auto-switching to SA3 layer for SA3 search');
          setSelectedGeoLayer('sa3');
        } else if (type === 'sa4' && selectedGeoLayer !== 'sa4') {
          console.log('Auto-switching to SA4 layer for SA4 search');
          setSelectedGeoLayer('sa4');
        }
      }
      
      // Set navigation state to move map to the location
      setMapNavigation({
        center: navigation.center,
        bounds: navigation.bounds,
        zoom: navigation.searchResult?.type === 'facility' ? 15 : (navigation.bounds ? undefined : 10), // Higher zoom for facilities
        searchResult: navigation.searchResult
      });
    } else {
      // Reset navigation state for general searches
      setMapNavigation(null);
    }
  };

  const handleClearHighlight = useCallback(() => {
    // Clear state in main component
    setHighlightedFeature(null);
    setHighlightedFeatureName(null);
    
    // Clear highlight on the map
    if (mapRef.current) {
      mapRef.current.clearHighlight();
    }
  }, []);

  const handleHighlightFeature = useCallback((feature: string | null, featureName: string | null) => {
    setHighlightedFeature(feature);
    setHighlightedFeatureName(featureName);
  }, []);

  const handleClearSearchResult = useCallback(() => {
    console.log('🗺️ Clearing search result due to manual map interaction');
    setMapNavigation(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-80'
      } flex flex-col`}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          {!sidebarCollapsed && (
            <>
              <Map className="h-6 w-6 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">Maps</h1>
            </>
          )}
        </div>

        {/* Back Button */}
        <div className="p-4 border-b border-gray-100">
          <BackToMainButton sidebarCollapsed={sidebarCollapsed} />
        </div>

        {/* Content - Only show when sidebar is not collapsed */}
        {!sidebarCollapsed && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {/* Map Settings */}
              <MapSettings
                selectedMapStyle={selectedMapStyle}
                onMapStyleChange={setSelectedMapStyle}
                selectedGeoLayer={selectedGeoLayer}
                onGeoLayerChange={setSelectedGeoLayer}
                facilityTypes={facilityTypes}
                onToggleFacilityType={toggleFacilityType}
                className="border-b border-gray-200"
              />

              {/* Data Layers - Removed from sidebar, now positioned on map */}

              {/* Empty row between Map Settings and Active Layers */}
              <div className="py-4 border-b border-gray-100"></div>

              {/* Active Layers - Bottom section */}
              <ActiveLayers
                facilityTypes={facilityTypes}
                selectedGeoLayer={selectedGeoLayer}
                selectedMapStyle={selectedMapStyle}
                highlightedFeature={highlightedFeature}
                highlightedFeatureName={highlightedFeatureName}
                onClearHighlight={handleClearHighlight}
              />
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
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Map className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Interactive Australian Map</h1>
            </div>
            <div className="text-sm text-gray-500">
              <p className="text-xs text-gray-500">
                {Object.values(facilityTypes).filter(Boolean).length} facility type(s) • 1 boundary layer • {selectedMapStyle} style
              </p>
            </div>
          </div>
        </div>

        {/* Main Map Area */}
        <main className="flex-1 relative overflow-hidden">
          {/* Search Bar - Top Left */}
          <MapSearchBar
            userId={user.id}
            onSearch={handleSearch}
            className="absolute top-4 left-4 z-50 w-80"
          />

          {/* Data Layers Overlay - Bottom Left */}
          <DataLayers className="absolute bottom-4 left-4 z-40 w-64" />

          {/* Map Container - Full screen now */}
          <div className="absolute inset-0">
            <AustralianMap
              ref={mapRef}
              className="w-full h-full"
              facilityTypes={facilityTypes}
              selectedGeoLayer={selectedGeoLayer}
              selectedMapStyle={selectedMapStyle}
              mapNavigation={mapNavigation}
              onHighlightFeature={handleHighlightFeature}
              onClearSearchResult={handleClearSearchResult}
            />
          </div>
        </main>
      </div>
    </div>
  );
} 