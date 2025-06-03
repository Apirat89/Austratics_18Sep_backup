'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, ArrowUp, ImagePlus } from 'lucide-react';

interface PromptAreaProps {
  onSubmit?: (message: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PromptArea({ 
  onSubmit, 
  placeholder = "Don't be shy—shoot me your questions, mate.",
  className = ""
}: PromptAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowToolsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = () => {
    if (inputValue.trim() && onSubmit) {
      onSubmit(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`border-t border-gray-200 bg-white p-6 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-4 p-4 border border-gray-300 rounded-full bg-white shadow-sm focus-within:shadow-md focus-within:border-blue-400 transition-all">
            <button 
              className="p-2 hover:bg-blue-100 rounded-full transition-colors"
              onClick={() => setShowToolsDropdown(!showToolsDropdown)}
            >
              <Plus className="h-5 w-5 text-blue-600" />
            </button>
            
            <input
              type="text"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-500"
            />
          </div>
          
          {inputValue.trim() && (
            <button 
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              onClick={handleSubmit}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}

          {/* Tools Dropdown */}
          {showToolsDropdown && (
            <div className="absolute bottom-full left-4 mb-2 bg-white rounded-2xl shadow-lg border border-gray-200 min-w-[280px] z-50">
              <div className="p-2">
                <button 
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                  onClick={() => {
                    setShowToolsDropdown(false);
                    // Handle photo upload here
                  }}
                >
                  <ImagePlus className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-700 font-medium">Add photos and files</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 