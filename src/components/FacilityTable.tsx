'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLongPress } from 'react-use';
import { FacilityData } from '../app/maps/page';
import { FacilityTableActions } from './FacilityTableActions';

interface FacilityTableProps {
  facilities: FacilityData[];
  onFacilityDetails: (facility: FacilityData) => void;
  onSaveFacility: (facility: FacilityData) => Promise<{ success: boolean; error?: string; isSaved?: boolean }>;
  onClose: () => void;
  isVisible: boolean;
  userId?: string;
  isLoading?: boolean;
  markerGroup?: string;
}

// ⚡ ENHANCED: Improved types with readonly constraints
type Pos = Readonly<{ x: number; y: number }>;
type Constraints = { maxX: number; maxY: number }; // Mutable for ref updates

interface DragState {
  isDragging: boolean;
  initialMouseX: number;
  initialMouseY: number;
  initialPosition: Pos;
}

// Utility function to get facility type display name
const getFacilityTypeName = (facilityType: string): string => {
  switch (facilityType) {
    case 'residential': return 'Residential Care';
    case 'mps': return 'Multi-Purpose Service';
    case 'home': return 'Home Care';
    case 'retirement': return 'Retirement Living';
    default: return facilityType;
  }
};

// Utility function to get facility type color
const getFacilityTypeColor = (facilityType: string): string => {
  switch (facilityType) {
    case 'residential': return 'bg-red-100 text-red-800 border-red-200';
    case 'mps': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'home': return 'bg-green-100 text-green-800 border-green-200';
    case 'retirement': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Utility function to format capacity
const formatCapacity = (facility: FacilityData): string => {
  const residential = facility.Residential_Places || 0;
  const homeMax = facility.Home_Care_Max_Places || 0;
  const restorative = facility.Restorative_Care_Places || 0;
  
  if (residential > 0) return `${residential} residential`;
  if (homeMax > 0) return `${homeMax} home care`;
  if (restorative > 0) return `${restorative} restorative`;
  return 'Not specified';
};

// Utility function to format full address
const formatAddress = (facility: FacilityData): string => {
  return `${facility.Physical_Address}, ${facility.Physical_Suburb}, ${facility.Physical_State} ${facility.Physical_Post_Code}`;
};

const FacilityTable: React.FC<FacilityTableProps> = ({
  facilities,
  onFacilityDetails,
  onSaveFacility,
  onClose,
  isVisible,
  markerGroup,
  userId,
  isLoading = false,
}) => {
  // ⚡ OPTIMIZED: Drag state management with enhanced types
  const [position, setPosition] = useState<Pos>({ x: 0, y: 0 });
  const dragRef = useRef<DragState>({
    isDragging: false,
    initialMouseX: 0,
    initialMouseY: 0,
    initialPosition: { x: 0, y: 0 },
  });
  const tableRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  
  // ⚡ PERFORMANCE: Use refs for position during drag to avoid React re-renders
  const positionRef = useRef<Pos>({ x: 0, y: 0 });
  const constraintsRef = useRef<Constraints>({ maxX: 0, maxY: 0 });
  const animationFrameRef = useRef<number | null>(null);
  
  // ⚡ PERFORMANCE: Initialize position ref when component mounts
  useEffect(() => {
    if (!isVisible) return;
    
    positionRef.current = { x: position.x, y: position.y };
  }, [isVisible, position]);

  // Reset position when modal opens
  useEffect(() => {
    if (!isVisible) return;
    
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
    // Reset constraints when modal opens
    constraintsRef.current = { maxX: 0, maxY: 0 };
  }, [isVisible]);
  
  // ⚡ PERFORMANCE: Calculate constraints only when they change (drag start + window resize)
  const calculateConstraints = useCallback(() => {
    if (!tableRef.current) return;
    
    // Get table's natural dimensions (not current position)
    const rect = tableRef.current.getBoundingClientRect();
    const tableWidth = rect.width;
    const tableHeight = rect.height;
    
    // Calculate constraints based on viewport and table dimensions
    // Allow table to move anywhere within viewport with 20px padding
    constraintsRef.current = {
      maxX: window.innerWidth - tableWidth - 20,
      maxY: window.innerHeight - tableHeight - 20,
    };
    
    // Ensure minimum constraints (prevent negative values)
    constraintsRef.current.maxX = Math.max(20, constraintsRef.current.maxX);
    constraintsRef.current.maxY = Math.max(20, constraintsRef.current.maxY);
  }, []);

  // ⚡ PERFORMANCE: Ultra-fast DOM updates with no React re-renders during drag
  const updateTablePosition = useCallback((x: number, y: number) => {
    if (!tableRef.current) return;
    
    // Apply constraints using cached values
    // Allow movement from -50% of screen to +50% of screen (full viewport)
    const constrainedX = Math.max(-constraintsRef.current.maxX, Math.min(x, constraintsRef.current.maxX));
    const constrainedY = Math.max(-constraintsRef.current.maxY, Math.min(y, constraintsRef.current.maxY));
    
    // ⚡ INSTANT: Direct DOM transform for immediate visual feedback
    tableRef.current.style.transform = `translate(${constrainedX}px, ${constrainedY}px)`;
    
    // Store position in ref for drag end
    positionRef.current = { x: constrainedX, y: constrainedY };
  }, []);

  // ⚡ PERFORMANCE: Listen for window resize to recalculate constraints
  useEffect(() => {
    if (!isVisible) return;
    
    const handleResize = () => {
      calculateConstraints();
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isVisible, calculateConstraints]);

  // ⚡ PHASE 1: Centralized drag start function
  const startDrag = useCallback((startX: number, startY: number) => {
    if (!tableRef.current) return;
    
    dragRef.current = {
      isDragging: true,
      initialMouseX: startX,
      initialMouseY: startY,
      initialPosition: positionRef.current,
    };
    tableRef.current.classList.add('no-transition');
    
    // ⚡ PERFORMANCE: Calculate constraints only once at drag start
    calculateConstraints();
  }, [calculateConstraints]);

  // ⚡ ENHANCEMENT: Long-press to drag for touch-friendly interaction
  const handleLongPressStart = useCallback((e: MouseEvent | TouchEvent) => {
    if (!tableRef.current || !isVisible) return;
    
    // Handle both touch and mouse events
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    startDrag(clientX, clientY);
  }, [isVisible, startDrag]);

  // ⚡ ENHANCEMENT: Configure long-press hook with correct options  
  const longPressBinding = useLongPress(
    handleLongPressStart,
    {
      delay: 200 // 200ms press to activate drag
    }
  );

  // ⚡ OPTIMIZED: High-performance drag handlers with modern pointer events
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!tableRef.current) return;
    
    // 🛡️ SAFETY: Prevent drag if not visible
    if (!isVisible) return;
    
    // 🛡️ SAFETY: One-time safety checks at drag start
    if (!tableRef.current.classList.contains('bg-white')) return;
    if (!tableRef.current.style) return;
    
    e.preventDefault();
    
    // ⚡ MODERN: Use pointer capture for better drag handling
    e.currentTarget.setPointerCapture(e.pointerId);
    
    startDrag(e.clientX, e.clientY);
  }, [isVisible, startDrag]);

  // ⚡ FALLBACK: Mouse event handler with long-press support
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!tableRef.current) return;
    
    // 🛡️ SAFETY: Prevent drag if not visible
    if (!isVisible) return;
    
    // 🛡️ SAFETY: One-time safety checks at drag start
    if (!tableRef.current.classList.contains('bg-white')) return;
    if (!tableRef.current.style) return;
    
    e.preventDefault();
    
    startDrag(e.clientX, e.clientY);
  }, [isVisible, startDrag]);

  // ⚡ OPTIMIZED: Touch event handlers with long-press support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!tableRef.current) return;
    
    // 🛡️ SAFETY: Prevent drag if not visible
    if (!isVisible) return;
    
    // 🛡️ SAFETY: One-time safety checks at drag start
    if (!tableRef.current.classList.contains('bg-white')) return;
    if (!tableRef.current.style) return;
    
    e.preventDefault();
    
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, [isVisible, startDrag]);

  // Native event handlers for direct DOM events
  const handleNativePointerMove = useCallback((e: PointerEvent) => {
    if (!dragRef.current.isDragging || !isVisible) return;
    
    // ⚡ WORKING: Delta-based positioning (from popup solution)
    const deltaX = e.clientX - dragRef.current.initialMouseX;
    const deltaY = e.clientY - dragRef.current.initialMouseY;
    
    const newX = dragRef.current.initialPosition.x + deltaX;
    const newY = dragRef.current.initialPosition.y + deltaY;
    
    // ⚡ PERFORMANCE: Direct DOM manipulation for instant feedback
    updateTablePosition(newX, newY);
  }, [updateTablePosition, isVisible]);

  const handleNativePointerUp = useCallback((e: PointerEvent) => {
    if (!dragRef.current.isDragging) return;
    
    // ⚡ MODERN: Release pointer capture
    if (tableRef.current) {
      tableRef.current.releasePointerCapture(e.pointerId);
      
      // ⚡ PERFORMANCE: Remove no-transition class
      tableRef.current.classList.remove('no-transition');
    }
    
    // ⚡ ENHANCEMENT: Snap-back animation if out of bounds
    const { x, y } = positionRef.current;
    const { maxX, maxY } = constraintsRef.current;
    
    // Calculate valid position within constraints
    const validX = Math.max(-maxX, Math.min(x, maxX));
    const validY = Math.max(-maxY, Math.min(y, maxY));
    
    // If position needs adjustment, animate back to valid position
    if (x !== validX || y !== validY) {
      const finalPosition = { x: validX, y: validY };
      
      // ⚡ PERFORMANCE: Commit final position to React state
      setPosition(finalPosition);
      
      // ⚡ POLISH: Smooth snap-back animation
      if (tableRef.current) {
        tableRef.current.style.transition = 'transform 160ms ease-out';
        tableRef.current.style.transform = `translate(${validX}px, ${validY}px)`;
        
        // Dispatch custom event for position tracking
        tableRef.current.dispatchEvent(new CustomEvent('facilityTableMoved', { 
          detail: finalPosition 
        }));
        
        // Remove transition after animation completes
        setTimeout(() => {
          if (tableRef.current) {
            tableRef.current.style.transition = '';
          }
        }, 160);
      }
      
      // Update position ref
      positionRef.current = finalPosition;
    } else {
      // Position is valid, just commit to React state
      setPosition(positionRef.current);
      
      // Dispatch custom event for position tracking
      if (tableRef.current) {
        tableRef.current.dispatchEvent(new CustomEvent('facilityTableMoved', { 
          detail: positionRef.current 
        }));
      }
    }
    
    dragRef.current = { ...dragRef.current, isDragging: false };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.isDragging || !isVisible) return;
    
    e.preventDefault();
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragRef.current.initialMouseX;
    const deltaY = touch.clientY - dragRef.current.initialMouseY;
    
    const newX = dragRef.current.initialPosition.x + deltaX;
    const newY = dragRef.current.initialPosition.y + deltaY;
    
    // ⚡ PERFORMANCE: Direct DOM manipulation for instant feedback
    updateTablePosition(newX, newY);
  }, [updateTablePosition, isVisible]);

  const handleTouchEnd = useCallback(() => {
    if (!dragRef.current.isDragging) return;
    
    // ⚡ PERFORMANCE: Remove no-transition class
    if (tableRef.current) {
      tableRef.current.classList.remove('no-transition');
    }
    
    // ⚡ ENHANCEMENT: Snap-back animation if out of bounds
    const { x, y } = positionRef.current;
    const { maxX, maxY } = constraintsRef.current;
    
    // Calculate valid position within constraints
    const validX = Math.max(-maxX, Math.min(x, maxX));
    const validY = Math.max(-maxY, Math.min(y, maxY));
    
    // If position needs adjustment, animate back to valid position
    if (x !== validX || y !== validY) {
      const finalPosition = { x: validX, y: validY };
      
      // ⚡ PERFORMANCE: Commit final position to React state
      setPosition(finalPosition);
      
      // ⚡ POLISH: Smooth snap-back animation
      if (tableRef.current) {
        tableRef.current.style.transition = 'transform 160ms ease-out';
        tableRef.current.style.transform = `translate(${validX}px, ${validY}px)`;
        
        // Dispatch custom event for position tracking
        tableRef.current.dispatchEvent(new CustomEvent('facilityTableMoved', { 
          detail: finalPosition 
        }));
        
        // Remove transition after animation completes
        setTimeout(() => {
          if (tableRef.current) {
            tableRef.current.style.transition = '';
          }
        }, 160);
      }
      
      // Update position ref
      positionRef.current = finalPosition;
    } else {
      // Position is valid, just commit to React state
      setPosition(positionRef.current);
      
      // Dispatch custom event for position tracking
      if (tableRef.current) {
        tableRef.current.dispatchEvent(new CustomEvent('facilityTableMoved', { 
          detail: positionRef.current 
        }));
      }
    }
    
    dragRef.current = { ...dragRef.current, isDragging: false };
  }, []);

  // ⚡ ENHANCED: Event listeners with passive flags for better mobile performance
  useEffect(() => {
    if (!isVisible || !tableRef.current) return;
    
    const el = tableRef.current;
    
    // ⚡ PERFORMANCE: Add passive listeners for better mobile performance
    el.addEventListener('pointermove', handleNativePointerMove, { passive: true });
    document.addEventListener('pointerup', handleNativePointerUp, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('pointermove', handleNativePointerMove);
      document.removeEventListener('pointerup', handleNativePointerUp);
      document.removeEventListener('touchend', handleTouchEnd);
      
      // Cleanup animation frame on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [handleNativePointerMove, handleNativePointerUp, handleTouchEnd, isVisible]);

  // ⚡ PERFORMANCE: Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Keyboard event handler (ESC to close)
  useEffect(() => {
    if (!isVisible) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);

  // Backdrop click handler
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);
  
  // 🛡️ SAFETY: Defensive visibility check
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={tableRef}
        className={`bg-white rounded-lg shadow-xl w-full max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col transition-all duration-200 ${
          dragRef.current.isDragging ? 'shadow-2xl scale-105' : ''
        }`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: dragRef.current.isDragging ? 'grabbing' : 'default',
          willChange: dragRef.current.isDragging ? 'transform' : 'auto',
          backfaceVisibility: 'hidden',
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Table Header with Drag Handle and Close Button */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div
            ref={dragHandleRef}
            className="flex items-center gap-2 cursor-grab active:cursor-grabbing flex-1 sm:cursor-grab"
            onPointerDown={handlePointerDown}
            title="Drag to move table"
            {...longPressBinding}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Facility Information</h3>
              {markerGroup && facilities.length > 1 && (
                <p className="text-xs sm:text-sm text-gray-600 truncate">{facilities.length} facilities at {markerGroup}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
            title="Close table"
            aria-label="Close facility table"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-6 sm:p-8">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm sm:text-base text-gray-600">Loading facilities...</span>
              </div>
            </div>
          ) : facilities.length === 0 ? (
            <div className="flex items-center justify-center p-6 sm:p-8">
              <div className="text-center">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm sm:text-base text-gray-500">No facilities to display</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-700 border-b">Service Name</th>
                    <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-700 border-b">Type</th>
                    <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-700 border-b md:table-cell hidden">Address</th>
                    <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-700 border-b md:table-cell hidden">Capacity</th>
                    <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-700 border-b lg:table-cell hidden">Provider</th>
                    <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-700 border-b lg:table-cell hidden">Phone</th>
                    <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-700 border-b xl:table-cell hidden">Planning Region</th>
                    <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-700 border-b xl:table-cell hidden">Remoteness</th>
                    <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-700 border-b xl:table-cell hidden">SA2 Area</th>
                    <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-700 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {facilities.map((facility, index) => (
                    <tr 
                      key={facility.OBJECTID} 
                      className={`hover:bg-gray-50 transition-colors ${
                        facilities.length > 1 && index % 2 === 0 ? 'bg-gray-25' : ''
                      }`}
                    >
                      <td className="p-2 sm:p-3 border-b">
                        <div className="font-medium text-gray-900 text-sm sm:text-base">{facility.Service_Name}</div>
                        <div className="text-xs sm:text-sm text-gray-500 md:hidden">{formatAddress(facility)}</div>
                      </td>
                      <td className="p-2 sm:p-3 border-b">
                        <span className={`inline-flex px-1.5 sm:px-2 py-1 rounded-full text-xs font-medium border ${getFacilityTypeColor(facility.facilityType)}`}>
                          {getFacilityTypeName(facility.facilityType)}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3 border-b md:table-cell hidden">
                        <div className="text-xs sm:text-sm text-gray-900">{formatAddress(facility)}</div>
                      </td>
                      <td className="p-2 sm:p-3 border-b md:table-cell hidden">
                        <div className="text-xs sm:text-sm text-gray-900">{formatCapacity(facility)}</div>
                      </td>
                      <td className="p-2 sm:p-3 border-b lg:table-cell hidden">
                        <div className="text-xs sm:text-sm text-gray-900">{facility.Provider_Name}</div>
                      </td>
                      <td className="p-2 sm:p-3 border-b lg:table-cell hidden">
                        <div className="text-xs sm:text-sm text-gray-900">{facility.Phone || 'Not provided'}</div>
                      </td>
                      <td className="p-2 sm:p-3 border-b xl:table-cell hidden">
                        <div className="text-xs sm:text-sm text-gray-900">{facility.F2019_Aged_Care_Planning_Region}</div>
                      </td>
                      <td className="p-2 sm:p-3 border-b xl:table-cell hidden">
                        <div className="text-xs sm:text-sm text-gray-900">{facility.ABS_Remoteness}</div>
                      </td>
                      <td className="p-2 sm:p-3 border-b xl:table-cell hidden">
                        <div className="text-xs sm:text-sm text-gray-900">{facility.F2016_SA2_Name}</div>
                      </td>
                      <td className="p-2 sm:p-3 border-b">
                        <FacilityTableActions 
                          facility={facility} 
                          userId={userId}
                          isLoading={isLoading}
                          onSaveFacility={onSaveFacility}
                          onFacilityDetails={onFacilityDetails}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacilityTable; 