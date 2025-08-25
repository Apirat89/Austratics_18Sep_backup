'use client';

import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';

interface PromptAreaProps {
  onSubmit?: (message: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PromptArea({ 
  onSubmit, 
  placeholder = "Need a hand? Ask me anything, mate. (Ask FAQ)",
  className = ""
}: PromptAreaProps) {
  const [inputValue, setInputValue] = useState('');

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
    <div className={`p-6 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <div className="flex items-center gap-4 p-4 border border-gray-300 rounded-full bg-white shadow-sm focus-within:shadow-md focus-within:border-blue-400 transition-all">
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
        </div>
      </div>
    </div>
  );
} 