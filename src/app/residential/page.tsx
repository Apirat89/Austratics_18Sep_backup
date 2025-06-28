'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building, Star, Phone, Mail, Globe, MapPin, Users, DollarSign, FileText, Activity, Heart, Award, BarChart3, Home, Bookmark, BookmarkCheck, Trash2, History, ArrowLeft, Scale, CheckSquare, Square, Eye, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InlineBoxPlot from '@/components/residential/InlineBoxPlot';

import HistoryPanel from '@/components/residential/HistoryPanel';
import { getCurrentUser } from '../../lib/auth';
import { 
  saveResidentialFacility, 
  getUserSavedResidentialFacilities, 
  deleteSavedResidentialFacility, 
  isResidentialFacilitySaved,
  clearUserSavedResidentialFacilities,
  type SavedResidentialFacility 
} from '../../lib/savedResidentialFacilities';
import {
  saveResidentialSearchToHistory,
  getResidentialSearchHistory,
  clearResidentialSearchHistory,
  saveResidentialComparisonToHistory,
  getResidentialComparisonHistory,
  clearResidentialComparisonHistory,
  addResidentialComparisonSelection,
  removeResidentialComparisonSelection,
  getResidentialComparisonSelections,
  clearResidentialComparisonSelections,
  isResidentialFacilitySelected,
  type ResidentialSearchHistoryItem,
  type ResidentialComparisonHistoryItem,
  type ResidentialComparisonSelection
} from '../../lib/residentialHistory';

interface ResidentialFacility {
  // Enhanced Provider Information
  provider_id?: string;
  "Service Name": string;
  provider_abn?: string;
  provider_name?: string;
  ownership_details?: string;
  last_updated_finance?: string;
  financial_year?: string;
  previous_name?: string;
  
  // Enhanced Location & Contact Information
  overall_rating_stars?: number;
  overall_rating_text?: string;
  compliance_rating?: number;
  quality_measures_rating?: number;
  residents_experience_rating?: number;
  staffing_rating?: number;
  formatted_address?: string;
  address_locality?: string;
  address_state?: string;
  address_postcode?: string;
  address_street?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_website?: string;
  latitude?: number;
  longitude?: number;
  geocoding_status?: string;
  geocoding_timestamp?: string;
  
  // Enhanced Room Information
  specialized_care?: string[];
  features?: string[];
  residential_places?: number;
  last_updated_rooms?: string;
  currently_available?: boolean;
  waitlist_available?: boolean;
  rooms_data?: {
    name: string;
    configuration: string;
    cost_per_day: number;
    room_size: string;
  }[];
  
  // Enhanced Food Information
  food_cost_per_day?: number;
  food_sector_average?: number;
  food_resident_satisfaction?: number;
  food_survey_date?: string;
  
  // Star System Data
  "star_Reporting Period"?: string;
  "star_Provider Name"?: string;
  "star_Service Suburb"?: string;
  "star_Purpose"?: string;
  "star_Aged Care Planning Region"?: string;
  "star_State/Territory"?: string;
  "star_MMM Region"?: string;
  "star_MMM Code"?: string;
  "star_Size"?: string;
  "star_Overall Star Rating"?: number;
  rating_updated?: string;
  
  // Star ratings for compliance
  "star_Compliance rating"?: number;
  "star_[C] Decision type"?: string;
  "star_[C] Date Decision Applied"?: string;
  "star_[C] Date Decision Ends"?: string;
  
  // Quality measures
  "star_Quality Measures rating"?: number;
  "star_[QM] Pressure injuries*"?: number;
  "star_[QM] Restrictive practices"?: number;
  "star_[QM] Unplanned weight loss*"?: number;
  "star_[QM] Falls and major injury - falls*"?: number;
  "star_[QM] Falls and major injury - major injury from a fall*"?: number;
  "star_[QM] Medication management - polypharmacy"?: number;
  "star_[QM] Medication management - antipsychotic"?: number;
  
  // Residents' Experience (all 44 fields)
  "star_Residents' Experience rating"?: number;
  "star_[RE] Interview Year"?: number;
  "star_[RE] Food - Always"?: number;
  "star_[RE] Food - Most of the time"?: number;
  "star_[RE] Food - Some of the time"?: number;
  "star_[RE] Food - Never"?: number;
  "star_[RE] Safety - Always"?: number;
  "star_[RE] Safety - Most of the time"?: number;
  "star_[RE] Safety - Some of the time"?: number;
  "star_[RE] Safety - Never"?: number;
  "star_[RE] Operation - Always"?: number;
  "star_[RE] Operation - Most of the time"?: number;
  "star_[RE] Operation - Some of the time"?: number;
  "star_[RE] Operation - Never"?: number;
  "star_[RE] Care Need - Always"?: number;
  "star_[RE] Care Need - Most of the time"?: number;
  "star_[RE] Care Need - Some of the time"?: number;
  "star_[RE] Care Need - Never"?: number;
  "star_[RE] Competent - Always"?: number;
  "star_[RE] Competent - Most of the time"?: number;
  "star_[RE] Competent - Some of the time"?: number;
  "star_[RE] Competent - Never"?: number;
  "star_[RE] Independent - Always"?: number;
  "star_[RE] Independent - Most of the time"?: number;
  "star_[RE] Independent - Some of the time"?: number;
  "star_[RE] Independent - Never"?: number;
  "star_[RE] Explain - Always"?: number;
  "star_[RE] Explain - Most of the time"?: number;
  "star_[RE] Explain - Some of the time"?: number;
  "star_[RE] Explain - Never"?: number;
  "star_[RE] Respect - Always"?: number;
  "star_[RE] Respect - Most of the time"?: number;
  "star_[RE] Respect - Some of the time"?: number;
  "star_[RE] Respect - Never"?: number;
  "star_[RE] Follow Up - Always"?: number;
  "star_[RE] Follow Up - Most of the time"?: number;
  "star_[RE] Follow Up - Some of the time"?: number;
  "star_[RE] Follow Up - Never"?: number;
  "star_[RE] Caring - Always"?: number;
  "star_[RE] Caring - Most of the time"?: number;
  "star_[RE] Caring - Some of the time"?: number;
  "star_[RE] Caring - Never"?: number;
  "star_[RE] Voice - Always"?: number;
  "star_[RE] Voice - Most of the time"?: number;
  "star_[RE] Voice - Some of the time"?: number;
  "star_[RE] Voice - Never"?: number;
  "star_[RE] Home - Always"?: number;
  "star_[RE] Home - Most of the time"?: number;
  "star_[RE] Home - Some of the time"?: number;
  "star_[RE] Home - Never"?: number;
  
  // Staffing
  "star_Staffing rating"?: number;
  "star_[S] Registered Nurse Care Minutes - Target"?: number;
  "star_[S] Registered Nurse Care Minutes - Actual"?: number;
  "star_[S] Registered Nurse Care Minutes - % Achievement"?: number;
  "star_[S] Total Care Minutes - Target"?: number;
  "star_[S] Total Care Minutes - Actual"?: number;
  "star_[S] Total Care Minutes - % Achievement"?: number;
  
  // NEW: Enhanced Financial Structure
  financials?: {
    expenditure: {
      total_per_day: {
        value: number;
        sector_average: number;
        variance_percentage: number;
      };
      care_nursing: {
        total: {
          value: number;
          sector_average: number;
          variance_percentage: number;
        };
        breakdown: {
          registered_nurses: { value: number; sector_average: number; };
          enrolled_nurses: { value: number; sector_average: number; };
          personal_care_workers: { value: number; sector_average: number; };
          care_management_staff: { value: number; sector_average: number; };
          allied_health: { value: number; sector_average: number; };
          lifestyle_recreation: { value: number; sector_average: number; };
          other_care_expenses: { value: number; sector_average: number; };
        };
      };
      administration: {
        value: number;
        sector_average: number | null;
        variance_percentage: number;
      };
      cleaning_laundry: {
        total: {
          value: number;
          sector_average: number;
          variance_percentage: number;
        };
        breakdown: {
          cleaning: { value: number; sector_average: number; };
          laundry: { value: number; sector_average: number; };
          covid_infection_control: { value: number; sector_average: number; };
          other_related: { value: number; sector_average: number; };
        };
      };
      accommodation_maintenance: {
        total: {
          value: number;
          sector_average: number;
          variance_percentage: number;
        };
        breakdown: {
          accommodation: { value: number; sector_average: number; };
          maintenance: { value: number; sector_average: number; };
        };
      };
      food_catering: {
        value: number;
        sector_average: number | null;
        variance_percentage: number;
      };
    };
    income: {
      total_per_day: {
        value: number;
        sector_average: number;
        variance_percentage: number;
      };
      residents_contribution: {
        value: number;
        sector_average: number | null;
        variance_percentage: number;
      };
      government_funding: {
        value: number;
        sector_average: number | null;
        variance_percentage: number;
      };
      other: {
        value: number;
        sector_average: number | null;
        variance_percentage: number;
      };
    };
    budget_surplus_deficit_per_day: {
      value: number;
      sector_average: number;
    };
    care_staff_last_quarter: {
      quarter_period: string;
      total: {
        value: number;
        sector_average: number | null;
        variance_percentage: number | null;
      };
      breakdown: {
        registered_nurses: { value: number; sector_average: number; };
        enrolled_nurses: { value: number; sector_average: number; };
        personal_care_workers: { value: number; sector_average: number; };
        care_management_staff: { value: number; sector_average: number; };
        physiotherapists: { value: number; sector_average: number; };
        occupational_therapists: { value: number; sector_average: number; };
        speech_pathologists: { value: number; sector_average: number; };
        podiatrists: { value: number; sector_average: number; };
        dietetics: { value: number; sector_average: number; };
        allied_health_assistants: { value: number; sector_average: number; };
        other_allied_health: { value: number; sector_average: number; };
        lifestyle_recreation: { value: number; sector_average: number; };
      };
    };
  };
  
  // DEPRECATED: Old flat financial fields (for compatibility during transition)
  expenditure_total_per_day?: number;
  expenditure_care_nursing?: number;
  expenditure_administration?: number;
  expenditure_cleaning_laundry?: number;
  expenditure_accommodation_maintenance?: number;
  expenditure_food_catering?: number;
  income_total_per_day?: number;
  income_residents_contribution?: number;
  income_government_funding?: number;
  income_other?: number;
  budget_surplus_per_day?: number;
  care_staff_spending_last_quarter?: number;
}

// Remove the old SavedFacility interface - we'll use SavedResidentialFacility from the service

export default function ResidentialPage() {
  const router = useRouter();
  const [facilities, setFacilities] = useState<ResidentialFacility[]>([]);
  const [filteredFacilities, setFilteredFacilities] = useState<ResidentialFacility[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<ResidentialFacility | null>(null);
  
  // Saved facilities state - now using Supabase
  const [savedFacilities, setSavedFacilities] = useState<SavedResidentialFacility[]>([]);
  const [showSavedFacilities, setShowSavedFacilities] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  
  // Statistical data for inline box plots
  const [statisticsData, setStatisticsData] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedScope, setSelectedScope] = useState<'nationwide' | 'state' | 'postcode' | 'locality'>('nationwide');
  const [showBoxPlots, setShowBoxPlots] = useState(true);

  // NEW: Comparison functionality state
  const [selectedForComparison, setSelectedForComparison] = useState<ResidentialFacility[]>([]);
  const [showSelectedList, setShowSelectedList] = useState(false);
  
  // NEW: Supabase-backed history state
  const [recentComparisons, setRecentComparisons] = useState<ResidentialComparisonHistoryItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<ResidentialSearchHistoryItem[]>([]);
  const [isHistoryPanelVisible, setIsHistoryPanelVisible] = useState(true);
  
  // NEW: Persistent comparison selections state
  const [persistentSelections, setPersistentSelections] = useState<ResidentialComparisonSelection[]>([]);
  const [selectionSyncLoading, setSelectionSyncLoading] = useState(false);

  // Load current user, saved facilities, and history from Supabase on component mount
  useEffect(() => {
    const loadUserAndData = async () => {
      try {
        // Get current user
        const user = await getCurrentUser();
        setCurrentUser(user);
        
        if (user) {
          // Load saved facilities from Supabase
          const result = await getUserSavedResidentialFacilities(user.id);
          setSavedFacilities(result.facilities);
          
          // Load search history from Supabase
          const searches = await getResidentialSearchHistory(user.id, 10);
          setSearchHistory(searches);
          
          // Load comparison history from Supabase
          const comparisons = await getResidentialComparisonHistory(user.id, 10);
          setRecentComparisons(comparisons);
          
          // Load persistent comparison selections from Supabase
          const selections = await getResidentialComparisonSelections(user.id);
          setPersistentSelections(selections);
          
          // Sync selectedForComparison with persistent selections
          const selectedFacilities = selections.map(selection => selection.facility_data);
          setSelectedForComparison(selectedFacilities);
        }
      } catch (error) {
        console.error('Error loading user and data:', error);
      } finally {
        setUserLoading(false);
      }
    };
    
    loadUserAndData();
  }, []);

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const response = await fetch('/maps/abs_csv/Residential_May2025_ExcludeMPS_updated_with_finance.json');
        const data = await response.json();
        setFacilities(data);
        setFilteredFacilities([]); // Start with empty list
      } catch (error) {
        console.error('Error loading facilities:', error);
      } finally {
        setLoading(false);
      }
    };

    const loadStatistics = async () => {
      try {
        const response = await fetch('/maps/abs_csv/Residential_Statistics_Analysis.json');
        const data = await response.json();
        setStatisticsData(data);
      } catch (error) {
        console.error('Error loading statistics:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadFacilities();
    loadStatistics();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredFacilities([]); // Show no facilities when search is empty
    } else {
      const filtered = facilities.filter(facility =>
        facility["Service Name"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.formatted_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.address_locality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.provider_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFacilities(filtered);
    }
  }, [searchTerm, facilities]);

  // Toggle save facility function (save/unsave) - now using Supabase with search history
  const toggleSaveFacility = async (facility: ResidentialFacility) => {
    console.log('toggleSaveFacility called:', {
      currentUser: currentUser ? { id: currentUser.id, email: currentUser.email } : null,
      facilityName: facility["Service Name"]
    });

    if (!currentUser) {
      alert('Please sign in to save facilities');
      router.push('/auth/signin');
      return;
    }

    // Save search to history when user saves a facility (user interaction trigger)
    if (searchTerm.trim().length > 0) {
      await addToSearchHistory(searchTerm);
    }

    const facilityId = `${facility["Service Name"]}_${facility.provider_abn || Date.now()}`;
    
    // Check if facility is already saved
    const isAlreadySaved = savedFacilities.some(saved => saved.facility_id === facilityId);
    
    if (isAlreadySaved) {
      // Unsave the facility
      const savedFacility = savedFacilities.find(saved => saved.facility_id === facilityId);
      if (savedFacility?.id) {
        const result = await deleteSavedResidentialFacility(currentUser.id, savedFacility.id);
        if (result.success) {
          setSavedFacilities(prev => prev.filter(saved => saved.facility_id !== facilityId));
        } else {
          alert(`Failed to remove facility: ${result.message}`);
        }
      }
    } else {
      // Save the facility
      const result = await saveResidentialFacility(
        currentUser.id,
        facilityId,
        facility["Service Name"],
        facility
      );

      if (result.success) {
        // Reload saved facilities to get the new one with proper ID
        const updatedResult = await getUserSavedResidentialFacilities(currentUser.id);
        setSavedFacilities(updatedResult.facilities);
      } else {
        alert(`Failed to save facility: ${result.message}`);
      }
    }
  };

  // Delete saved facility function - now using Supabase
  const deleteSavedFacility = async (facilityDbId: number) => {
    if (!currentUser) return;
    
    if (confirm('Are you sure you want to delete this saved facility?')) {
      const result = await deleteSavedResidentialFacility(currentUser.id, facilityDbId);
      if (result.success) {
        setSavedFacilities(prev => prev.filter(saved => saved.id !== facilityDbId));
      } else {
        alert(`Failed to delete facility: ${result.message}`);
      }
    }
  };

  // Check if facility is saved
  const isFacilitySaved = (facility: ResidentialFacility) => {
    const facilityId = `${facility["Service Name"]}_${facility.provider_abn || Date.now()}`;
    return savedFacilities.some(saved => saved.facility_id === facilityId);
  };

  // NEW: Enhanced comparison functionality helpers with persistent storage
  const toggleFacilitySelection = async (facility: ResidentialFacility) => {
    if (!currentUser) {
      alert('Please sign in to use comparison features');
      return;
    }

    setSelectionSyncLoading(true);
    
    try {
      const facilityId = `${facility["Service Name"]}_${facility.provider_abn || Date.now()}`;
      const isSelected = selectedForComparison.some(f => f["Service Name"] === facility["Service Name"]);
      
      if (isSelected) {
        // Remove from selection - both local state and Supabase
        const success = await removeResidentialComparisonSelection(currentUser.id, facilityId);
        if (success) {
          setSelectedForComparison(prev => prev.filter(f => f["Service Name"] !== facility["Service Name"]));
          setPersistentSelections(prev => prev.filter(s => s.facility_id !== facilityId));
        }
      } else {
        // Add to selection - max 5 facilities
        if (selectedForComparison.length < 5) {
          const success = await addResidentialComparisonSelection(
            currentUser.id,
            facilityId,
            facility["Service Name"],
            facility
          );
          if (success) {
            setSelectedForComparison(prev => [...prev, facility]);
            // Reload persistent selections to get the complete data with IDs
            const updatedSelections = await getResidentialComparisonSelections(currentUser.id);
            setPersistentSelections(updatedSelections);
          }
        } else {
          alert('Maximum 5 facilities can be selected for comparison');
        }
      }
    } catch (error) {
      console.error('Error toggling facility selection:', error);
      alert('Error updating selection. Please try again.');
    } finally {
      setSelectionSyncLoading(false);
    }
  };

  const isFacilitySelected = (facility: ResidentialFacility) => {
    return selectedForComparison.some(f => f["Service Name"] === facility["Service Name"]);
  };

  const startComparison = async () => {
    if (selectedForComparison.length >= 2 && currentUser) {
      // Add comparison to recent comparisons when "View Comparison" is pressed
      const comparisonName = selectedForComparison.map(f => f["Service Name"]).join(" vs ");
      const facilityNames = selectedForComparison.map(f => f["Service Name"]);
      
      // Save to Supabase
      const saved = await saveResidentialComparisonToHistory(currentUser.id, comparisonName, facilityNames);
      if (saved) {
        // Reload comparison history from Supabase
        const updatedComparisons = await getResidentialComparisonHistory(currentUser.id, 10);
        setRecentComparisons(updatedComparisons);
      }
      
      // Navigate to dedicated comparison page with facility names as URL parameters
      const encodedFacilityNames = facilityNames.join(',');
      router.push(`/residential/compare?facilities=${encodeURIComponent(encodedFacilityNames)}`);
    }
  };

  const addToSearchHistory = async (term: string) => {
    if (term.trim() && currentUser) {
      // Save to Supabase
      const saved = await saveResidentialSearchToHistory(currentUser.id, term.trim());
      if (saved) {
        // Reload search history from Supabase
        const updatedSearches = await getResidentialSearchHistory(currentUser.id, 10);
        setSearchHistory(updatedSearches);
      }
    }
  };

  // Handle search term changes (no history tracking here)
  const handleSearchChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
  };

  // Handle viewing facility details (track search history here)
  const handleViewDetails = async (facility: ResidentialFacility) => {
    // Save search to history when user views details (user interaction trigger)
    if (searchTerm.trim().length > 0 && currentUser) {
      await addToSearchHistory(searchTerm);
    }
    setSelectedFacility(facility);
  };

  // Handle clicking on a recent comparison to navigate directly to comparison page
  const handleComparisonSelect = (comparison: ResidentialComparisonHistoryItem) => {
    // Use the stored facility names from the comparison history item
    const facilityNames = comparison.facility_names;
    
    // Navigate directly to comparison page
    const encodedFacilityNames = facilityNames.join(',');
    router.push(`/residential/compare?facilities=${encodeURIComponent(encodedFacilityNames)}`);
  };

  // Handle clicking on a recent search to populate search field
  const handleSearchSelect = (search: ResidentialSearchHistoryItem) => {
    setSearchTerm(search.search_term);
  };

  // Clear all saved facilities
  const handleClearSavedFacilities = async () => {
    if (!currentUser) return;
    
    if (confirm('Are you sure you want to clear all saved facilities? This action cannot be undone.')) {
      try {
        const result = await clearUserSavedResidentialFacilities(currentUser.id);
        if (result.success) {
          setSavedFacilities([]);
          alert('All saved facilities have been cleared successfully.');
        } else {
          alert(result.message || 'Failed to clear saved facilities.');
        }
      } catch (error) {
        console.error('Error clearing saved facilities:', error);
        alert('An error occurred while clearing saved facilities.');
      }
    }
  };

  // Clear all comparison selections
  const handleClearComparisonSelections = async () => {
    if (!currentUser) return;
    
    if (confirm('Are you sure you want to clear all selected facilities for comparison? This action cannot be undone.')) {
      try {
        const success = await clearResidentialComparisonSelections(currentUser.id);
        if (success) {
          setSelectedForComparison([]);
          setShowSelectedList(false);
          alert('All comparison selections have been cleared successfully.');
        } else {
          alert('Failed to clear comparison selections.');
        }
      } catch (error) {
        console.error('Error clearing comparison selections:', error);
        alert('An error occurred while clearing comparison selections.');
      }
    }
  };

  const renderStarRating = (rating?: number) => {
    if (!rating) return <span className="text-gray-400">No rating</span>;
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  // Helper function to get statistics for current scope
  const getStatisticsForScope = () => {
    if (!statisticsData) return null;
    
    switch (selectedScope) {
      case 'nationwide':
        return statisticsData.nationwide;
      case 'state':
        return statisticsData.byState?.find((s: any) => s.groupName === selectedFacility?.address_state);
      case 'postcode':
        return statisticsData.byPostcode?.find((p: any) => p.groupName === selectedFacility?.address_postcode);
      case 'locality':
        return statisticsData.byLocality?.find((l: any) => l.groupName === selectedFacility?.address_locality);
      default:
        return statisticsData.nationwide;
    }
  };

  const renderField = (label: string, value: any, fieldName?: string) => {
    if (value === null || value === undefined || value === '') return null;
    
    // Check if this is a numeric field that can have inline statistics
    const isNumeric = typeof value === 'number';
    const scopeStats = getStatisticsForScope();
    const fieldStats = fieldName && scopeStats ? scopeStats.fields?.[fieldName] : null;
    
    return (
      <div className="mb-3">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="text-gray-900 flex items-center">
          {value}
          {showBoxPlots && isNumeric && fieldName && !statsLoading && fieldStats && (
            <InlineBoxPlot
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

  const renderPercentageField = (label: string, value: number, fieldName: string) => {
    if (value === null || value === undefined) return null;
    
    const scopeStats = getStatisticsForScope();
    const fieldStats = scopeStats ? scopeStats.fields?.[fieldName] : null;
    
    return (
      <div className="mb-3">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="text-gray-900 flex items-center">
          {value}%
          {showBoxPlots && !statsLoading && fieldStats && (
            <InlineBoxPlot
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

  const formatCurrency = (amount?: number) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  // NEW: Helper function to format variance percentage with color coding
  const formatVariancePercentage = (variance?: number | null) => {
    if (variance === null || variance === undefined) return null;
    
    const isPositive = variance > 0;
    const isNeutral = Math.abs(variance) < 2; // Within 2% is neutral
    
    let colorClass = isNeutral ? 'text-gray-600' : 
                     isPositive ? 'text-red-600' : 'text-green-600';
    
    return (
      <span className={`text-xs font-medium ${colorClass}`}>
        {isPositive ? '+' : ''}{variance.toFixed(1)}%
      </span>
    );
  };

  // NEW: Helper function to render enhanced financial field with sector comparison
  const renderFinancialField = (
    label: string, 
    financialData: { 
      value: number; 
      sector_average?: number | null; 
      variance_percentage?: number | null;
    } | null,
    fieldPath?: string
  ) => {
    if (!financialData || financialData.value === null || financialData.value === undefined) {
      return null;
    }

    return (
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <dt className="text-sm font-medium text-gray-900 mb-1">{label}</dt>
        <dd className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(financialData.value)}
            </span>
            {financialData.variance_percentage !== null && financialData.variance_percentage !== undefined && (
              <div className="flex items-center gap-1">
                {formatVariancePercentage(financialData.variance_percentage)}
                <span className="text-xs text-gray-500">vs sector</span>
              </div>
            )}
          </div>
          
          {financialData.sector_average !== null && financialData.sector_average !== undefined && (
            <div className="text-sm text-gray-600">
              Sector Average: {formatCurrency(financialData.sector_average)}
            </div>
          )}
          
          {fieldPath && showBoxPlots && !statsLoading && (() => {
            const scopeStats = getStatisticsForScope();
            const fieldStats = scopeStats ? scopeStats.fields?.[fieldPath] : null;
            return fieldStats ? (
              <InlineBoxPlot
                fieldName={fieldPath}
                currentValue={financialData.value}
                statistics={fieldStats}
                scope={selectedScope}
              />
            ) : null;
          })()}
        </dd>
      </div>
    );
  };

  // NEW: Helper function to render breakdown components
  const renderBreakdown = (
    title: string,
    breakdown: Record<string, { value: number; sector_average?: number; }> | null,
    pathPrefix: string
  ) => {
    if (!breakdown) return null;

    return (
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h5 className="text-sm font-medium text-blue-900 mb-3">{title}</h5>
        <div className="space-y-2">
          {Object.entries(breakdown).map(([key, data]) => {
            const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const fieldPath = `${pathPrefix}.breakdown.${key}.value`;
            
            return (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{displayKey}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatCurrency(data.value)}
                  </span>
                  {data.sector_average !== undefined && (
                    <span className="text-xs text-gray-500">
                      (avg: {formatCurrency(data.sector_average)})
                    </span>
                  )}
                  {showBoxPlots && !statsLoading && (() => {
                    const scopeStats = getStatisticsForScope();
                    const fieldStats = scopeStats ? scopeStats.fields?.[fieldPath] : null;
                    return fieldStats ? (
                      <InlineBoxPlot
                        fieldName={fieldPath}
                        currentValue={data.value}
                        statistics={fieldStats}
                        scope={selectedScope}
                      />
                    ) : null;
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Helper function to render field with bold label and currency formatting
  const renderFieldWithBoldLabel = (label: string, value: any, fieldName?: string, isCurrency: boolean = false) => {
    if (value === null || value === undefined || value === '') return null;
    
    // Check if this is a numeric field that can have inline statistics
    const isNumeric = typeof value === 'number';
    const scopeStats = getStatisticsForScope();
    const fieldStats = fieldName && scopeStats ? scopeStats.fields?.[fieldName] : null;
    
    // Format the display value
    const displayValue = isCurrency && isNumeric ? formatCurrency(value) : value;
    
    return (
      <div className="mb-3">
        <dt className="text-sm font-semibold text-gray-900">{label}</dt>
        <dd className="text-gray-900 flex items-center">
          {displayValue}
          {showBoxPlots && isNumeric && fieldName && !statsLoading && fieldStats && (
            <InlineBoxPlot
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

  const hasValidValue = (value: any): boolean => {
    return value !== null && value !== undefined && value > 0;
  };

  const hasValidValueForExperience = (value: any): boolean => {
    return value !== null && value !== undefined && typeof value === 'number';
  };

  const renderEnhancedQualityField = (title: string, description: string, value: any, fieldName?: string) => {
    if (value === null || value === undefined) return null;
    
    return (
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <dt className="text-sm font-semibold text-gray-900 mb-2">{title}</dt>
        <dd className="text-gray-900 flex items-center mb-3">
          <span className="text-lg font-medium">{typeof value === 'number' ? `${value}%` : value}</span>
          {showBoxPlots && !statsLoading && fieldName && (() => {
            const scopeStats = getStatisticsForScope();
            const fieldStats = scopeStats ? scopeStats.fields?.[fieldName] : null;
            return fieldStats ? (
              <InlineBoxPlot
                fieldName={fieldName}
                currentValue={value}
                statistics={fieldStats}
                scope={selectedScope}
              />
            ) : null;
          })()}
        </dd>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    );
  };

  const renderSurveyQuestion = (
    questionNumber: number,
    questionText: string,
    always: number | undefined,
    mostTime: number | undefined,
    someTime: number | undefined,
    never: number | undefined,
    alwaysFieldName: string,
    mostTimeFieldName: string,
    someTimeFieldName: string,
    neverFieldName: string
  ) => {
    // Check if we have any valid data (including 0 values for experience)
    const hasData = hasValidValueForExperience(always) || hasValidValueForExperience(mostTime) || hasValidValueForExperience(someTime) || hasValidValueForExperience(never);
    if (!hasData) return null;

    return (
      <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Question Header */}
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Question {questionNumber}</h4>
          <p className="text-base text-gray-800">{questionText}</p>
        </div>

        {/* Response Grid */}
        <div className="grid grid-cols-4 gap-4">
          {/* Always */}
          {hasValidValueForExperience(always) && (
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl mb-2">😊</div>
              <div className="font-semibold text-green-800 mb-1">Always</div>
                             <div className="text-2xl font-bold text-green-900 mb-2">{always}%</div>
               {showBoxPlots && !statsLoading && (() => {
                 const scopeStats = getStatisticsForScope();
                 const fieldStats = scopeStats ? scopeStats.fields?.[alwaysFieldName] : null;
                 return fieldStats ? (
                   <InlineBoxPlot
                     fieldName={alwaysFieldName}
                     currentValue={always!}
                     statistics={fieldStats}
                     scope={selectedScope}
                   />
                 ) : null;
               })()}
            </div>
          )}

          {/* Most of the Time */}
          {hasValidValueForExperience(mostTime) && (
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-3xl mb-2">🙂</div>
              <div className="font-semibold text-yellow-800 mb-1">Most of the Time</div>
                             <div className="text-2xl font-bold text-yellow-900 mb-2">{mostTime}%</div>
               {showBoxPlots && !statsLoading && (() => {
                 const scopeStats = getStatisticsForScope();
                 const fieldStats = scopeStats ? scopeStats.fields?.[mostTimeFieldName] : null;
                 return fieldStats ? (
                   <InlineBoxPlot
                     fieldName={mostTimeFieldName}
                     currentValue={mostTime!}
                     statistics={fieldStats}
                     scope={selectedScope}
                   />
                 ) : null;
               })()}
             </div>
           )}

           {/* Some of the Time */}
           {hasValidValueForExperience(someTime) && (
             <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
               <div className="text-3xl mb-2">😐</div>
               <div className="font-semibold text-orange-800 mb-1">Some of the Time</div>
               <div className="text-2xl font-bold text-orange-900 mb-2">{someTime}%</div>
               {showBoxPlots && !statsLoading && (() => {
                 const scopeStats = getStatisticsForScope();
                 const fieldStats = scopeStats ? scopeStats.fields?.[someTimeFieldName] : null;
                 return fieldStats ? (
                   <InlineBoxPlot
                     fieldName={someTimeFieldName}
                     currentValue={someTime!}
                     statistics={fieldStats}
                     scope={selectedScope}
                   />
                 ) : null;
               })()}
             </div>
           )}

           {/* Never */}
           {hasValidValueForExperience(never) && (
             <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
               <div className="text-3xl mb-2">😞</div>
               <div className="font-semibold text-red-800 mb-1">Never</div>
               <div className="text-2xl font-bold text-red-900 mb-2">{never}%</div>
               {showBoxPlots && !statsLoading && (() => {
                 const scopeStats = getStatisticsForScope();
                 const fieldStats = scopeStats ? scopeStats.fields?.[neverFieldName] : null;
                 return fieldStats ? (
                   <InlineBoxPlot
                     fieldName={neverFieldName}
                     currentValue={never!}
                     statistics={fieldStats}
                     scope={selectedScope}
                   />
                 ) : null;
               })()}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading residential facilities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed History Panel with Hide/Show functionality */}
      {isHistoryPanelVisible ? (
        <div className="fixed left-0 top-0 w-80 h-screen bg-white border-r border-gray-200 z-30 transition-all duration-300 flex flex-col">
          {/* Panel Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">History</h3>
              <button
                onClick={() => setIsHistoryPanelVisible(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Hide History Panel"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Scrollable Panel Content */}
          <div className="flex-1 overflow-y-auto">
            <HistoryPanel
              searchHistory={searchHistory}
              comparisonHistory={recentComparisons}
              isOpen={true}
              onClose={() => {}}
              onHide={() => setIsHistoryPanelVisible(false)}
              onSearchSelect={handleSearchSelect}
              onComparisonSelect={handleComparisonSelect}
              onClearSearchHistory={async () => {
                if (currentUser) {
                  const cleared = await clearResidentialSearchHistory(currentUser.id);
                  if (cleared) {
                    setSearchHistory([]);
                  }
                }
              }}
              onClearComparisonHistory={async () => {
                if (currentUser) {
                  const cleared = await clearResidentialComparisonHistory(currentUser.id);
                  if (cleared) {
                    setRecentComparisons([]);
                  }
                }
              }}
            />
          </div>
        </div>
      ) : (
        /* Fixed History Tab when hidden */
        <div className="fixed left-0 top-0 w-12 h-screen z-30 transition-all duration-300 bg-white border-r border-gray-200">
          <div className="h-full flex flex-col items-center justify-start pt-6">
            <button
              onClick={() => setIsHistoryPanelVisible(true)}
              className="group p-2 hover:bg-gray-100 transition-colors duration-200 rounded"
              title="Show History Panel"
            >
              <History className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area with proper left margin */}
      <div className={`min-h-screen transition-all duration-300 ${
        isHistoryPanelVisible ? 'ml-80' : 'ml-12'
      }`}>
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Residential Aged Care Facilities</h1>
            </div>
            
            {/* Back to Main Menu and Comparison Counter */}
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
              
              {/* Toggle between Search and Saved */}
              <button
                onClick={() => setShowSavedFacilities(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  !showSavedFacilities
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Search className="w-4 h-4" />
                Search Facilities
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSavedFacilities(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    showSavedFacilities
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <History className="w-4 h-4" />
                  Saved Facilities ({savedFacilities.length})
                </button>
                
                {/* Clear Saved Facilities Button */}
                {savedFacilities.length > 0 && (
                  <button
                    onClick={handleClearSavedFacilities}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
                    title="Clear all saved facilities"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear All
                  </button>
                )}
              </div>
              
              {/* Comparison Counter */}
              <div className="relative">
                <button
                  onClick={() => selectedForComparison.length > 0 ? setShowSelectedList(!showSelectedList) : undefined}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedForComparison.length > 0
                      ? 'bg-orange-100 text-orange-700 border border-orange-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  Compare ({selectedForComparison.length})
                </button>
                
                {/* Selected Facilities Dropdown */}
                {showSelectedList && selectedForComparison.length > 0 && (
                  <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Selected for Comparison</h3>
                        <button
                          onClick={handleClearComparisonSelections}
                          className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                          title="Clear all selected facilities"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {selectedForComparison.map((facility, index) => (
                        <div key={index} className="p-3 border-b border-gray-100 last:border-b-0 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{facility["Service Name"]}</p>
                            <p className="text-xs text-gray-500">{facility.formatted_address}</p>
                          </div>
                          <button
                            onClick={() => toggleFacilitySelection(facility)}
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
          
          {!showSavedFacilities && (
            <>
              {/* Search Bar */}
              <div className="relative max-w-2xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by facility name, address, locality, or provider..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <p className="mt-2 text-sm text-gray-600">
                {searchTerm.trim() === '' 
                  ? `Search through ${facilities.length} residential facilities using the search bar above`
                  : `Showing ${filteredFacilities.length} of ${facilities.length} facilities`
                }
              </p>
            </>
          )}
          
          {showSavedFacilities && (
            <p className="text-sm text-gray-600">
              {savedFacilities.length === 0 
                ? 'No saved facilities yet. Search and save facilities to view them here.'
                : `Viewing ${savedFacilities.length} saved facilities`
              }
            </p>
          )}
        </div>
      </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedFacility ? (
          /* Facility List */
          <div>
            {!showSavedFacilities ? (
              /* Search Results */
              <div>
                {searchTerm.trim() === '' ? (
                  /* Empty State - No Search */
                  <div className="text-center py-12">
                    <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Search Residential Facilities</h3>
                    <p className="text-gray-600 mb-4">
                      Use the search bar above to find residential aged care facilities by name, address, locality, or provider.
                    </p>
                    <p className="text-sm text-gray-500">
                      {facilities.length} facilities available to search through
                    </p>
                  </div>
                ) : filteredFacilities.length > 0 ? (
                  /* Facility Results */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFacilities.map((facility, index) => (
                      <Card key={index} className={`hover:shadow-lg transition-shadow relative ${
                        isFacilitySelected(facility) 
                          ? 'ring-2 ring-orange-400 bg-orange-50' 
                          : ''
                      }`}>
                        
                        {/* Always-visible Comparison Selection Checkbox */}
                        <div className="absolute top-2 right-2 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFacilitySelection(facility);
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-colors ${
                              isFacilitySelected(facility)
                                ? 'bg-orange-600 border-orange-600 text-white'
                                : 'bg-white border-gray-300 text-gray-400 hover:border-orange-400 hover:text-orange-600'
                            }`}
                            title="Select for comparison"
                          >
                            {isFacilitySelected(facility) ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                          {isFacilitySelected(facility) && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {selectedForComparison.findIndex(f => f["Service Name"] === facility["Service Name"]) + 1}
                              </span>
                            </div>
                          )}
                        </div>

                        <CardHeader>
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {facility["Service Name"]}
                          </CardTitle>
                          {facility.formatted_address && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4" />
                              {facility.formatted_address}
                            </div>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {facility.overall_rating_stars && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Overall Rating</p>
                                {renderStarRating(facility.overall_rating_stars)}
                              </div>
                            )}
                            
                            {facility.rooms_data && facility.rooms_data.length > 0 && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Users className="w-4 h-4" />
                                {facility.rooms_data.length} room types available
                              </div>
                            )}
                            
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleViewDetails(facility);
                                }}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                View Details
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSaveFacility(facility);
                                }}
                                className={`p-2 rounded-lg transition-colors ${
                                  isFacilitySaved(facility)
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={isFacilitySaved(facility) ? 'Remove from saved' : 'Save facility'}
                              >
                                {isFacilitySaved(facility) ? (
                                  <BookmarkCheck className="w-4 h-4" />
                                ) : (
                                  <Bookmark className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  /* No Results */
                  <div className="text-center py-12">
                    <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No facilities found</h3>
                    <p className="text-gray-600 mb-4">
                      No residential facilities match your search criteria.
                    </p>
                    <p className="text-sm text-gray-500">
                      Try adjusting your search terms or browse all {facilities.length} available facilities.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Saved Facilities */
              <div>
                {savedFacilities.length === 0 ? (
                  /* Empty State - No Saved */
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Saved Facilities</h3>
                    <p className="text-gray-600 mb-4">
                      You haven't saved any facilities yet. Search for facilities and save them to view here.
                    </p>
                    <button
                      onClick={() => setShowSavedFacilities(false)}
                      className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start Searching
                    </button>
                  </div>
                ) : (
                  /* Saved Facility Results */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedFacilities.map((savedItem) => (
                      <Card key={savedItem.id} className={`hover:shadow-lg transition-shadow flex flex-col h-full relative ${
                        isFacilitySelected(savedItem.facility_data) 
                          ? 'ring-2 ring-orange-400 bg-orange-50' 
                          : ''
                      }`}>
                        
                        {/* Comparison Checkbox - Top Right */}
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isFacilitySelected(savedItem.facility_data)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleFacilitySelection(savedItem.facility_data);
                              }}
                              className="w-4 h-4 text-orange-600 bg-white border-2 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                              title="Select for comparison"
                            />
                            {isFacilitySelected(savedItem.facility_data) && (
                              <span className="ml-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                                {selectedForComparison.findIndex(f => f["Service Name"] === savedItem.facility_data["Service Name"]) + 1}
                              </span>
                            )}
                          </div>
                          
                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (savedItem.id) {
                                deleteSavedFacility(savedItem.id);
                              }
                            }}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded bg-white shadow-sm border border-gray-200"
                            title="Delete saved facility"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <CardHeader className="flex-shrink-0 pr-16">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg font-semibold text-gray-900">
                                {savedItem.facility_data["Service Name"]}
                              </CardTitle>
                              {savedItem.facility_data.formatted_address && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                  <MapPin className="w-4 h-4" />
                                  {savedItem.facility_data.formatted_address}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            Saved: {savedItem.created_at ? new Date(savedItem.created_at).toLocaleDateString() : 'Unknown'} at {savedItem.created_at ? new Date(savedItem.created_at).toLocaleTimeString() : 'Unknown'}
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-grow">
                          <div className="space-y-3 flex-grow">
                            {savedItem.facility_data.overall_rating_stars && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Overall Rating</p>
                                {renderStarRating(savedItem.facility_data.overall_rating_stars)}
                              </div>
                            )}
                            
                            {savedItem.facility_data.rooms_data && savedItem.facility_data.rooms_data.length > 0 && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Users className="w-4 h-4" />
                                {savedItem.facility_data.rooms_data.length} room types available
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleViewDetails(savedItem.facility_data);
                            }}
                            className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                          >
                            View Details
                          </button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Facility Details */
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setSelectedFacility(null)}
              className="mb-6 text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to facilities list
            </button>
            
            <div className="bg-white rounded-lg shadow-lg">
              {/* Header */}
              <div className="p-6 border-b space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {selectedFacility["Service Name"]}
                    </h1>
                    {selectedFacility.formatted_address && (
                      <div className="flex items-center gap-2 text-gray-600 mt-2">
                        <MapPin className="w-4 h-4" />
                        {selectedFacility.formatted_address}
                      </div>
                    )}
                  </div>
                  
                  {/* Save Button */}
                  <button
                    onClick={() => toggleSaveFacility(selectedFacility)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFacilitySaved(selectedFacility)
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
                    }`}
                    title={isFacilitySaved(selectedFacility) ? 'Remove from saved' : 'Save this facility'}
                  >
                    {isFacilitySaved(selectedFacility) ? (
                      <>
                        <BookmarkCheck className="w-4 h-4" />
                        Unsave
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        Save Facility
                      </>
                    )}
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
                        { key: 'postcode', label: 'Postcode', icon: MapPin },
                        { key: 'locality', label: 'Locality', icon: Home }
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
                  <TabsTrigger value="rooms">Rooms & Costs</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                  <TabsTrigger value="quality">Quality Measures</TabsTrigger>
                  <TabsTrigger value="experience">Residents' Experience</TabsTrigger>
                  <TabsTrigger value="staffing">Staffing</TabsTrigger>
                  <TabsTrigger value="finance">Finance & Operations</TabsTrigger>
                </TabsList>

                {/* Tab 1: Main */}
                <TabsContent value="main">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="w-5 h-5" />
                          Facility Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2">
                          {renderField("Service Name", selectedFacility["Service Name"])}
                          {renderField("Provider ABN", selectedFacility.provider_abn)}
                          {renderField("Ownership Details", selectedFacility.ownership_details)}
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="w-5 h-5" />
                          Ratings
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedFacility.overall_rating_stars && (
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Overall Rating</p>
                            <div className="flex items-center">
                              {renderStarRating(selectedFacility.overall_rating_stars)}
                              {showBoxPlots && !statsLoading && (() => {
                                const scopeStats = getStatisticsForScope();
                                const fieldStats = scopeStats ? scopeStats.fields?.["overall_rating_stars"] : null;
                                return fieldStats ? (
                                  <InlineBoxPlot
                                    fieldName="overall_rating_stars"
                                    currentValue={selectedFacility.overall_rating_stars}
                                    statistics={fieldStats}
                                    scope={selectedScope}
                                  />
                                ) : null;
                              })()}
                            </div>
                            {selectedFacility.overall_rating_text && (
                              <p className="text-sm text-gray-600">({selectedFacility.overall_rating_text})</p>
                            )}
                          </div>
                        )}
                        {renderField("Compliance Rating", selectedFacility.compliance_rating, "compliance_rating")}
                        {renderField("Quality Measures Rating", selectedFacility.quality_measures_rating, "quality_measures_rating")}
                        {renderField("Residents Experience Rating", selectedFacility.residents_experience_rating, "residents_experience_rating")}
                        {renderField("Staffing Rating", selectedFacility.staffing_rating, "staffing_rating")}
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
                          {renderField("Address", selectedFacility.formatted_address)}
                          {selectedFacility.contact_phone && (
                            <div className="mb-3">
                              <dt className="text-sm font-medium text-gray-500">Phone</dt>
                              <dd>
                                <a href={`tel:${selectedFacility.contact_phone}`} 
                                   className="text-blue-600 hover:text-blue-800">
                                  {selectedFacility.contact_phone}
                                </a>
                              </dd>
                            </div>
                          )}
                          {selectedFacility.contact_email && (
                            <div className="mb-3">
                              <dt className="text-sm font-medium text-gray-500">Email</dt>
                              <dd>
                                <a href={`mailto:${selectedFacility.contact_email}`} 
                                   className="text-blue-600 hover:text-blue-800">
                                  {selectedFacility.contact_email}
                                </a>
                              </dd>
                            </div>
                          )}
                          {selectedFacility.contact_website && (
                            <div className="mb-3">
                              <dt className="text-sm font-medium text-gray-500">Website</dt>
                              <dd>
                                <a href={selectedFacility.contact_website} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                  <Globe className="w-4 h-4" />
                                  Visit Website
                                </a>
                              </dd>
                            </div>
                          )}
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Heart className="w-5 h-5" />
                          Care & Features
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedFacility.specialized_care && selectedFacility.specialized_care.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-500 mb-2">Specialized Care</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedFacility.specialized_care.map((care, index) => (
                                <span key={index} className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-900">{care}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedFacility.features && selectedFacility.features.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-2">Features</p>
                            <div className="space-y-1">
                              {selectedFacility.features.map((feature, index) => (
                                <p key={index} className="text-sm text-gray-600">• {feature}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tab 2: Rooms */}
                <TabsContent value="rooms">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        Rooms & Costs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderField("Service Name", selectedFacility["Service Name"])}
                      {renderField("Residential Places", selectedFacility.residential_places, "residential_places")}
                      
                      {selectedFacility.rooms_data && selectedFacility.rooms_data.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-lg font-semibold mb-4">Available Room Types</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedFacility.rooms_data.map((room, index) => (
                              <div key={index} className="border rounded-lg p-4">
                                {renderField("Room Name", room.name)}
                                {renderField("Configuration", room.configuration)}
                                <div className="mb-3">
                                  <dt className="text-sm font-medium text-gray-500">Cost per Day</dt>
                                  <dd className="text-gray-900 flex items-center">
                                    {formatCurrency(room.cost_per_day)}
                                    {showBoxPlots && !statsLoading && (() => {
                                      const scopeStats = getStatisticsForScope();
                                      const fieldStats = scopeStats ? scopeStats.fields?.["room_cost_median"] : null;
                                      return fieldStats ? (
                                        <InlineBoxPlot
                                          fieldName="room_cost_median"
                                          currentValue={room.cost_per_day}
                                          statistics={fieldStats}
                                          scope={selectedScope}
                                        />
                                      ) : null;
                                    })()}
                                  </dd>
                                </div>
                                {renderField("Room Size", room.room_size)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 3: Compliance */}
                <TabsContent value="compliance">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Compliance Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        {renderField("Service Name", selectedFacility["Service Name"])}
                        {renderField("Compliance Rating", selectedFacility["star_Compliance rating"], "star_Compliance rating")}
                        {renderField("Decision Type", selectedFacility["star_[C] Decision type"])}
                        {renderField("Date Decision Applied", selectedFacility["star_[C] Date Decision Applied"])}
                        {renderField("Date Decision Ends", selectedFacility["star_[C] Date Decision Ends"])}
                      </dl>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 4: Quality Measures */}
                <TabsContent value="quality">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Quality Measures
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {renderField("Service Name", selectedFacility["Service Name"])}
                        {renderField("Quality Measures Rating", selectedFacility["star_Quality Measures rating"], "star_Quality Measures rating")}
                        
                        {renderEnhancedQualityField(
                          "Pressure injuries (% residents experienced pressure injuries)",
                          "Pressure injuries are areas of damage to the skin and the tissues underneath. They are caused by pressure, friction or both, and often occur over bony areas like the tailbone, elbows, heels or hips. Developing a pressure injury can affect quality of life, particularly if the injury becomes severe. Pressure injuries are very painful, can be difficult to heal, and can make it difficult to move.",
                          selectedFacility["star_[QM] Pressure injuries*"],
                          "star_[QM] Pressure injuries*"
                        )}
                        
                        {renderEnhancedQualityField(
                          "Restrictive practices (% of residents were subject to restrictive practices)",
                          "Restrictive practices are any practice or intervention restricting a person's right or freedom of movement. High use of restrictive practices is an indicator of poor quality of care and it can lead to negative outcomes such as physical and mental harm. Restrictive practices should only be used as a last resort to protect the safety of the person in care.",
                          selectedFacility["star_[QM] Restrictive practices"],
                          "star_[QM] Restrictive practices"
                        )}
                        
                        {renderEnhancedQualityField(
                          "Unplanned Weight Loss (% of residents experienced unplanned weight loss)",
                          "Unplanned weight loss happens when a person does not eat enough food to meet their daily needs and loses a significant amount of weight unintentionally. It can contribute to serious health issues such as hip fracture, poor wound healing, malnutrition, as well as decreased quality of life. Aged care homes should monitor the weight of the person in care and address changes as early as possible.",
                          selectedFacility["star_[QM] Unplanned weight loss*"],
                          "star_[QM] Unplanned weight loss*"
                        )}
                        
                        {renderEnhancedQualityField(
                          "Falls and Major Injury – Falls (% of residents experienced one or more falls)",
                          "A fall is an event resulting in a person coming to rest inadvertently on the ground, floor or other lower level and may suffer from an injury as a result of a fall.",
                          selectedFacility["star_[QM] Falls and major injury - falls*"],
                          "star_[QM] Falls and major injury - falls*"
                        )}
                        
                        {renderEnhancedQualityField(
                          "Falls and Major Injury - Major Injury (% of residents experienced a major injury from a fall)",
                          "Falls can reduce physical functioning, decrease independence, cause minor and major injury, psychological impacts and occasionally death.",
                          selectedFacility["star_[QM] Falls and major injury - major injury from a fall*"],
                          "star_[QM] Falls and major injury - major injury from a fall*"
                        )}
                        
                        {renderEnhancedQualityField(
                          "Medication Management – Polypharmacy (% of residents were prescribed nine or more medications)",
                          "Polypharmacy is the prescription of nine or more medications to a care recipient. Regular monitoring of polypharmacy is important as polypharmacy can lead to a reduced quality of life, side effects, hospitalisation, and impact memory, thinking and decision making.",
                          selectedFacility["star_[QM] Medication management - polypharmacy"],
                          "star_[QM] Medication management - polypharmacy"
                        )}
                        
                        {renderEnhancedQualityField(
                          "Medication Management - Antipsychotic (% of residents received antipsychotic medication that was not for a diagnosed condition of psychosis)",
                          "Antipsychotics are medications prescribed for the treatment of a diagnosed condition of psychosis. Regular monitoring of the use of antipsychotics is important because inappropriate use has been shown to be associated with poor health outcomes.",
                          selectedFacility["star_[QM] Medication management - antipsychotic"],
                          "star_[QM] Medication management - antipsychotic"
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 5: Residents' Experience */}
                <TabsContent value="experience">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="w-5 h-5" />
                        Residents' Experience
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {renderField("Service Name", selectedFacility["Service Name"])}
                        {renderField("Residents' Experience Rating", selectedFacility["star_Residents' Experience rating"], "star_Residents' Experience rating")}
                        {renderField("Interview Year", selectedFacility["star_[RE] Interview Year"])}
                        


                        {/* Respect Experience */}
                        {renderSurveyQuestion(
                          1,
                          "Do staff treat you with respect?",
                          selectedFacility["star_[RE] Respect - Always"],
                          selectedFacility["star_[RE] Respect - Most of the time"],
                          selectedFacility["star_[RE] Respect - Some of the time"],
                          selectedFacility["star_[RE] Respect - Never"],
                          "star_[RE] Respect - Always",
                          "star_[RE] Respect - Most of the time",
                          "star_[RE] Respect - Some of the time",
                          "star_[RE] Respect - Never"
                        )}

                        {/* Safety Experience */}
                        {renderSurveyQuestion(
                          2,
                          "Do you feel safe here?",
                          selectedFacility["star_[RE] Safety - Always"],
                          selectedFacility["star_[RE] Safety - Most of the time"],
                          selectedFacility["star_[RE] Safety - Some of the time"],
                          selectedFacility["star_[RE] Safety - Never"],
                          "star_[RE] Safety - Always",
                          "star_[RE] Safety - Most of the time",
                          "star_[RE] Safety - Some of the time",
                          "star_[RE] Safety - Never"
                        )}

                        {/* Operation Experience */}
                        {renderSurveyQuestion(
                          3,
                          "Is this place well run?",
                          selectedFacility["star_[RE] Operation - Always"],
                          selectedFacility["star_[RE] Operation - Most of the time"],
                          selectedFacility["star_[RE] Operation - Some of the time"],
                          selectedFacility["star_[RE] Operation - Never"],
                          "star_[RE] Operation - Always",
                          "star_[RE] Operation - Most of the time",
                          "star_[RE] Operation - Some of the time",
                          "star_[RE] Operation - Never"
                        )}

                        {/* Care Need Experience */}
                        {renderSurveyQuestion(
                          4,
                          "Do you get the care you need?",
                          selectedFacility["star_[RE] Care Need - Always"],
                          selectedFacility["star_[RE] Care Need - Most of the time"],
                          selectedFacility["star_[RE] Care Need - Some of the time"],
                          selectedFacility["star_[RE] Care Need - Never"],
                          "star_[RE] Care Need - Always",
                          "star_[RE] Care Need - Most of the time",
                          "star_[RE] Care Need - Some of the time",
                          "star_[RE] Care Need - Never"
                        )}

                        {/* Competent Experience */}
                        {renderSurveyQuestion(
                          5,
                          "Do staff know what they are doing?",
                          selectedFacility["star_[RE] Competent - Always"],
                          selectedFacility["star_[RE] Competent - Most of the time"],
                          selectedFacility["star_[RE] Competent - Some of the time"],
                          selectedFacility["star_[RE] Competent - Never"],
                          "star_[RE] Competent - Always",
                          "star_[RE] Competent - Most of the time",
                          "star_[RE] Competent - Some of the time",
                          "star_[RE] Competent - Never"
                        )}

                        {/* Independence Experience */}
                        {renderSurveyQuestion(
                          6,
                          "Are you encouraged to do as much as possible for yourself?",
                          selectedFacility["star_[RE] Independent - Always"],
                          selectedFacility["star_[RE] Independent - Most of the time"],
                          selectedFacility["star_[RE] Independent - Some of the time"],
                          selectedFacility["star_[RE] Independent - Never"],
                          "star_[RE] Independent - Always",
                          "star_[RE] Independent - Most of the time",
                          "star_[RE] Independent - Some of the time",
                          "star_[RE] Independent - Never"
                        )}

                        {/* Explanation Experience */}
                        {renderSurveyQuestion(
                          7,
                          "Do staff explain things to you?",
                          selectedFacility["star_[RE] Explain - Always"],
                          selectedFacility["star_[RE] Explain - Most of the time"],
                          selectedFacility["star_[RE] Explain - Some of the time"],
                          selectedFacility["star_[RE] Explain - Never"],
                          "star_[RE] Explain - Always",
                          "star_[RE] Explain - Most of the time",
                          "star_[RE] Explain - Some of the time",
                          "star_[RE] Explain - Never"
                        )}

                        {/* Food Experience */}
                        {renderSurveyQuestion(
                          8,
                          "Do you like the food here?",
                          selectedFacility["star_[RE] Food - Always"],
                          selectedFacility["star_[RE] Food - Most of the time"],
                          selectedFacility["star_[RE] Food - Some of the time"],
                          selectedFacility["star_[RE] Food - Never"],
                          "star_[RE] Food - Always",
                          "star_[RE] Food - Most of the time",
                          "star_[RE] Food - Some of the time",
                          "star_[RE] Food - Never"
                        )}

                        {/* Follow Up Experience */}
                        {renderSurveyQuestion(
                          9,
                          "Do staff follow up when you raise things with them?",
                          selectedFacility["star_[RE] Follow Up - Always"],
                          selectedFacility["star_[RE] Follow Up - Most of the time"],
                          selectedFacility["star_[RE] Follow Up - Some of the time"],
                          selectedFacility["star_[RE] Follow Up - Never"],
                          "star_[RE] Follow Up - Always",
                          "star_[RE] Follow Up - Most of the time",
                          "star_[RE] Follow Up - Some of the time",
                          "star_[RE] Follow Up - Never"
                        )}

                        {/* Caring Experience */}
                        {renderSurveyQuestion(
                          10,
                          "Are staff kind and caring?",
                          selectedFacility["star_[RE] Caring - Always"],
                          selectedFacility["star_[RE] Caring - Most of the time"],
                          selectedFacility["star_[RE] Caring - Some of the time"],
                          selectedFacility["star_[RE] Caring - Never"],
                          "star_[RE] Caring - Always",
                          "star_[RE] Caring - Most of the time",
                          "star_[RE] Caring - Some of the time",
                          "star_[RE] Caring - Never"
                        )}

                        {/* Voice Experience */}
                        {renderSurveyQuestion(
                          11,
                          "Do you have a say in your daily activities?",
                          selectedFacility["star_[RE] Voice - Always"],
                          selectedFacility["star_[RE] Voice - Most of the time"],
                          selectedFacility["star_[RE] Voice - Some of the time"],
                          selectedFacility["star_[RE] Voice - Never"],
                          "star_[RE] Voice - Always",
                          "star_[RE] Voice - Most of the time",
                          "star_[RE] Voice - Some of the time",
                          "star_[RE] Voice - Never"
                        )}

                        {/* Home Experience */}
                        {renderSurveyQuestion(
                          12,
                          "How likely are you to recommend this residential aged care home to someone?",
                          selectedFacility["star_[RE] Home - Always"],
                          selectedFacility["star_[RE] Home - Most of the time"],
                          selectedFacility["star_[RE] Home - Some of the time"],
                          selectedFacility["star_[RE] Home - Never"],
                          "star_[RE] Home - Always",
                          "star_[RE] Home - Most of the time",
                          "star_[RE] Home - Some of the time",
                          "star_[RE] Home - Never"
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 6: Staffing */}
                <TabsContent value="staffing">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Staffing
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        {renderField("Service Name", selectedFacility["Service Name"])}
                        {renderField("Staffing Rating", selectedFacility["star_Staffing rating"], "star_Staffing rating")}
                        {renderField("Registered Nurse Care Minutes - Target", selectedFacility["star_[S] Registered Nurse Care Minutes - Target"], "star_[S] Registered Nurse Care Minutes - Target")}
                        {renderField("Registered Nurse Care Minutes - Actual", selectedFacility["star_[S] Registered Nurse Care Minutes - Actual"], "star_[S] Registered Nurse Care Minutes - Actual")}
                        {selectedFacility["star_[S] Registered Nurse Care Minutes - % Achievement"] !== null && 
                         selectedFacility["star_[S] Registered Nurse Care Minutes - % Achievement"] !== undefined && (
                          <div className="mb-3">
                            <dt className="text-sm font-medium text-gray-500">Registered Nurse Care Minutes - % Achievement</dt>
                            <dd className="text-gray-900 flex items-center">
                              {selectedFacility["star_[S] Registered Nurse Care Minutes - % Achievement"]?.toFixed(1)}%
                              {showBoxPlots && !statsLoading && (() => {
                                const scopeStats = getStatisticsForScope();
                                const fieldStats = scopeStats ? scopeStats.fields?.["star_[S] Registered Nurse Care Minutes - % Achievement"] : null;
                                return fieldStats ? (
                                  <InlineBoxPlot
                                    fieldName="star_[S] Registered Nurse Care Minutes - % Achievement"
                                    currentValue={selectedFacility["star_[S] Registered Nurse Care Minutes - % Achievement"]}
                                    statistics={fieldStats}
                                    scope={selectedScope}
                                  />
                                ) : null;
                              })()}
                            </dd>
                          </div>
                        )}
                        {renderField("Total Care Minutes - Target", selectedFacility["star_[S] Total Care Minutes - Target"], "star_[S] Total Care Minutes - Target")}
                        {renderField("Total Care Minutes - Actual", selectedFacility["star_[S] Total Care Minutes - Actual"], "star_[S] Total Care Minutes - Actual")}
                        {selectedFacility["star_[S] Total Care Minutes - % Achievement"] !== null && 
                         selectedFacility["star_[S] Total Care Minutes - % Achievement"] !== undefined && (
                          <div className="mb-3">
                            <dt className="text-sm font-medium text-gray-500">Total Care Minutes - % Achievement</dt>
                            <dd className="text-gray-900 flex items-center">
                              {selectedFacility["star_[S] Total Care Minutes - % Achievement"]?.toFixed(1)}%
                              {showBoxPlots && !statsLoading && (() => {
                                const scopeStats = getStatisticsForScope();
                                const fieldStats = scopeStats ? scopeStats.fields?.["star_[S] Total Care Minutes - % Achievement"] : null;
                                return fieldStats ? (
                                  <InlineBoxPlot
                                    fieldName="star_[S] Total Care Minutes - % Achievement"
                                    currentValue={selectedFacility["star_[S] Total Care Minutes - % Achievement"]}
                                    statistics={fieldStats}
                                    scope={selectedScope}
                                  />
                                ) : null;
                              })()}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 7: Finance & Operations */}
                <TabsContent value="finance">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Finance & Operations
                      </CardTitle>
                      {selectedFacility.financial_year && (
                        <p className="text-sm text-gray-600">Financial Year: {selectedFacility.financial_year}</p>
                      )}
                      {selectedFacility.last_updated_finance && (
                        <p className="text-xs text-gray-500">Last Updated: {selectedFacility.last_updated_finance}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {/* Enhanced Financial Structure */}
                      {selectedFacility.financials && 
                       selectedFacility.financials.expenditure && 
                       selectedFacility.financials.income ? (
                        <div className="space-y-6">
                          {/* Basic Info */}
                          {renderField("Service Name", selectedFacility["Service Name"])}
                          {selectedFacility.financial_year && renderField("Financial Year", selectedFacility.financial_year)}
                          {selectedFacility.last_updated_finance && renderField("Last Updated", selectedFacility.last_updated_finance)}

                          {/* Expenditure Section */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">💰 Expenditure</h3>
                            
                            {/* Main Expenditure */}
                            {renderFieldWithBoldLabel("Total Expenditure per Day", selectedFacility.financials.expenditure.total_per_day?.value, "financials.expenditure.total_per_day.value", true)}
                            
                            {/* Care & Nursing */}
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h4 className="font-semibold text-blue-900 mb-3">Care & Nursing</h4>
                              {renderField("Care & Nursing Total", selectedFacility.financials.expenditure.care_nursing?.total?.value, "financials.expenditure.care_nursing.total.value")}
                              {selectedFacility.financials.expenditure.care_nursing?.breakdown && (
                                <div className="ml-4 space-y-2 mt-3">
                                  {renderField("Registered Nurses", selectedFacility.financials.expenditure.care_nursing.breakdown.registered_nurses?.value, "financials.expenditure.care_nursing.breakdown.registered_nurses.value")}
                                  {renderField("Enrolled Nurses", selectedFacility.financials.expenditure.care_nursing.breakdown.enrolled_nurses?.value, "financials.expenditure.care_nursing.breakdown.enrolled_nurses.value")}
                                  {renderField("Personal Care Workers", selectedFacility.financials.expenditure.care_nursing.breakdown.personal_care_workers?.value, "financials.expenditure.care_nursing.breakdown.personal_care_workers.value")}
                                  {renderField("Care Management Staff", selectedFacility.financials.expenditure.care_nursing.breakdown.care_management_staff?.value, "financials.expenditure.care_nursing.breakdown.care_management_staff.value")}
                                  {renderField("Allied Health", selectedFacility.financials.expenditure.care_nursing.breakdown.allied_health?.value, "financials.expenditure.care_nursing.breakdown.allied_health.value")}
                                  {renderField("Lifestyle & Recreation", selectedFacility.financials.expenditure.care_nursing.breakdown.lifestyle_recreation?.value, "financials.expenditure.care_nursing.breakdown.lifestyle_recreation.value")}
                                  {renderField("Other Care Expenses", selectedFacility.financials.expenditure.care_nursing.breakdown.other_care_expenses?.value, "financials.expenditure.care_nursing.breakdown.other_care_expenses.value")}
                                </div>
                              )}
                            </div>
                            
                            {/* Administration */}
                            {renderFieldWithBoldLabel("Administration", selectedFacility.financials.expenditure.administration?.value, "financials.expenditure.administration.value", true)}
                            
                            {/* Cleaning & Laundry */}
                            <div className="bg-green-50 p-4 rounded-lg">
                              <h4 className="font-semibold text-green-900 mb-3">Cleaning & Laundry</h4>
                              {renderField("Cleaning & Laundry Total", selectedFacility.financials.expenditure.cleaning_laundry?.total?.value, "financials.expenditure.cleaning_laundry.total.value")}
                              {selectedFacility.financials.expenditure.cleaning_laundry?.breakdown && (
                                <div className="ml-4 space-y-2 mt-3">
                                  {renderField("Cleaning", selectedFacility.financials.expenditure.cleaning_laundry.breakdown.cleaning?.value, "financials.expenditure.cleaning_laundry.breakdown.cleaning.value")}
                                  {renderField("Laundry", selectedFacility.financials.expenditure.cleaning_laundry.breakdown.laundry?.value, "financials.expenditure.cleaning_laundry.breakdown.laundry.value")}
                                  {renderField("COVID Infection Control", selectedFacility.financials.expenditure.cleaning_laundry.breakdown.covid_infection_control?.value, "financials.expenditure.cleaning_laundry.breakdown.covid_infection_control.value")}
                                  {renderField("Other Related", selectedFacility.financials.expenditure.cleaning_laundry.breakdown.other_related?.value, "financials.expenditure.cleaning_laundry.breakdown.other_related.value")}
                                </div>
                              )}
                            </div>
                            
                            {/* Accommodation & Maintenance */}
                            <div className="bg-yellow-50 p-4 rounded-lg">
                              <h4 className="font-semibold text-yellow-900 mb-3">Accommodation & Maintenance</h4>
                              {renderField("Accommodation & Maintenance Total", selectedFacility.financials.expenditure.accommodation_maintenance?.total?.value, "financials.expenditure.accommodation_maintenance.total.value")}
                              {selectedFacility.financials.expenditure.accommodation_maintenance?.breakdown && (
                                <div className="ml-4 space-y-2 mt-3">
                                  {renderField("Accommodation", selectedFacility.financials.expenditure.accommodation_maintenance.breakdown.accommodation?.value, "financials.expenditure.accommodation_maintenance.breakdown.accommodation.value")}
                                  {renderField("Maintenance", selectedFacility.financials.expenditure.accommodation_maintenance.breakdown.maintenance?.value, "financials.expenditure.accommodation_maintenance.breakdown.maintenance.value")}
                                </div>
                              )}
                            </div>
                            
                            {/* Food & Catering */}
                            {renderFieldWithBoldLabel("Food & Catering", selectedFacility.financials.expenditure.food_catering?.value, "financials.expenditure.food_catering.value", true)}
                          </div>

                          {/* Income Section */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">💵 Income</h3>
                            {renderFieldWithBoldLabel("Total Income per Day", selectedFacility.financials.income.total_per_day?.value, "financials.income.total_per_day.value", true)}
                            {renderFieldWithBoldLabel("Residents' Contribution", selectedFacility.financials.income.residents_contribution?.value, "financials.income.residents_contribution.value", true)}
                            {renderFieldWithBoldLabel("Government Funding", selectedFacility.financials.income.government_funding?.value, "financials.income.government_funding.value", true)}
                            {renderFieldWithBoldLabel("Other Income", selectedFacility.financials.income.other?.value, "financials.income.other.value", true)}
                          </div>

                          {/* Budget Summary */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">📊 Budget Summary</h3>
                            {renderFieldWithBoldLabel("Budget Surplus/Deficit per Day", selectedFacility.financials.budget_surplus_deficit_per_day?.value, "financials.budget_surplus_deficit_per_day.value", true)}
                          </div>

                          {/* Care Staff Spending */}
                          {selectedFacility.financials.care_staff_last_quarter && (
                            <div className="space-y-4">
                              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                👥 Care Staff Spending ({selectedFacility.financials.care_staff_last_quarter.quarter_period || 'Last Quarter'})
                              </h3>
                              
                              {renderFieldWithBoldLabel("Total Care Staff Spending", selectedFacility.financials.care_staff_last_quarter.total?.value, "financials.care_staff_last_quarter.total.value", true)}
                              
                              {selectedFacility.financials.care_staff_last_quarter.breakdown && (
                                <div className="bg-purple-50 p-4 rounded-lg">
                                  <h4 className="font-semibold text-purple-900 mb-3">Staff Category Breakdown</h4>
                                  <div className="ml-4 space-y-2">
                                    {renderField("Registered Nurses", selectedFacility.financials.care_staff_last_quarter.breakdown.registered_nurses?.value, "financials.care_staff_last_quarter.breakdown.registered_nurses.value")}
                                    {renderField("Enrolled Nurses", selectedFacility.financials.care_staff_last_quarter.breakdown.enrolled_nurses?.value, "financials.care_staff_last_quarter.breakdown.enrolled_nurses.value")}
                                    {renderField("Personal Care Workers", selectedFacility.financials.care_staff_last_quarter.breakdown.personal_care_workers?.value, "financials.care_staff_last_quarter.breakdown.personal_care_workers.value")}
                                    {renderField("Care Management Staff", selectedFacility.financials.care_staff_last_quarter.breakdown.care_management_staff?.value, "financials.care_staff_last_quarter.breakdown.care_management_staff.value")}
                                    {renderField("Physiotherapists", selectedFacility.financials.care_staff_last_quarter.breakdown.physiotherapists?.value, "financials.care_staff_last_quarter.breakdown.physiotherapists.value")}
                                    {renderField("Occupational Therapists", selectedFacility.financials.care_staff_last_quarter.breakdown.occupational_therapists?.value, "financials.care_staff_last_quarter.breakdown.occupational_therapists.value")}
                                    {renderField("Speech Pathologists", selectedFacility.financials.care_staff_last_quarter.breakdown.speech_pathologists?.value, "financials.care_staff_last_quarter.breakdown.speech_pathologists.value")}
                                    {renderField("Podiatrists", selectedFacility.financials.care_staff_last_quarter.breakdown.podiatrists?.value, "financials.care_staff_last_quarter.breakdown.podiatrists.value")}
                                    {renderField("Dietetics", selectedFacility.financials.care_staff_last_quarter.breakdown.dietetics?.value, "financials.care_staff_last_quarter.breakdown.dietetics.value")}
                                    {renderField("Allied Health Assistants", selectedFacility.financials.care_staff_last_quarter.breakdown.allied_health_assistants?.value, "financials.care_staff_last_quarter.breakdown.allied_health_assistants.value")}
                                    {renderField("Other Allied Health", selectedFacility.financials.care_staff_last_quarter.breakdown.other_allied_health?.value, "financials.care_staff_last_quarter.breakdown.other_allied_health.value")}
                                    {renderField("Lifestyle & Recreation", selectedFacility.financials.care_staff_last_quarter.breakdown.lifestyle_recreation?.value, "financials.care_staff_last_quarter.breakdown.lifestyle_recreation.value")}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                          /* Legacy Financial Data Fallback */
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Expenditure (per day)</h4>
                              <dl className="space-y-2">
                                {renderField("Service Name", selectedFacility["Service Name"])}
                                {selectedFacility.expenditure_total_per_day && (
                                  <div className="mb-3">
                                    <dt className="text-sm font-medium text-gray-500">Total Expenditure</dt>
                                    <dd className="text-gray-900 flex items-center">
                                      {formatCurrency(selectedFacility.expenditure_total_per_day)}
                                      {showBoxPlots && !statsLoading && (() => {
                                        const scopeStats = getStatisticsForScope();
                                        const fieldStats = scopeStats ? scopeStats.fields?.["expenditure_total_per_day"] : null;
                                        return fieldStats ? (
                                          <InlineBoxPlot
                                            fieldName="expenditure_total_per_day"
                                            currentValue={selectedFacility.expenditure_total_per_day}
                                            statistics={fieldStats}
                                            scope={selectedScope}
                                          />
                                        ) : null;
                                      })()}
                                    </dd>
                                  </div>
                                )}
                                {/* Additional legacy fields would continue here */}
                              </dl>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Income (per day)</h4>
                              <dl className="space-y-2">
                                {selectedFacility.income_total_per_day && (
                                  <div className="mb-3">
                                    <dt className="text-sm font-medium text-gray-500">Total Income</dt>
                                    <dd className="text-gray-900 flex items-center">
                                      {formatCurrency(selectedFacility.income_total_per_day)}
                                      {showBoxPlots && !statsLoading && (() => {
                                        const scopeStats = getStatisticsForScope();
                                        const fieldStats = scopeStats ? scopeStats.fields?.["income_total_per_day"] : null;
                                        return fieldStats ? (
                                          <InlineBoxPlot
                                            fieldName="income_total_per_day"
                                            currentValue={selectedFacility.income_total_per_day}
                                            statistics={fieldStats}
                                            scope={selectedScope}
                                          />
                                        ) : null;
                                      })()}
                                    </dd>
                                  </div>
                                )}
                                {/* Additional legacy fields would continue here */}
                              </dl>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
        

        </div>
      
      {/* End Main Content Area */}
      </div>
      
      {/* End Main Flex Container */}
    </div>
  );
} 