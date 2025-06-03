'use client';

import React from 'react';
import { validatePassword, PasswordValidationResult } from '../lib/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showDetails?: boolean;
}

export default function PasswordStrengthIndicator({ password, showDetails = true }: PasswordStrengthIndicatorProps) {
  const validation: PasswordValidationResult = validatePassword(password);

  if (!password) return null;

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'weak': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getProgressColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'weak': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getProgressWidth = (score: number) => {
    return Math.min((score / 5) * 100, 100);
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(validation.strength)}`}
            style={{ width: `${getProgressWidth(validation.score)}%` }}
          ></div>
        </div>
        <span className={`text-sm font-medium capitalize ${getStrengthColor(validation.strength)}`}>
          {validation.strength}
        </span>
      </div>

      {/* Password Requirements */}
      {showDetails && (
        <div className="text-xs space-y-1">
          <div className="grid grid-cols-1 gap-1">
            <RequirementItem 
              met={password.length >= 8} 
              text="At least 8 characters" 
            />
            <RequirementItem 
              met={/[A-Z]/.test(password)} 
              text="One uppercase letter" 
            />
            <RequirementItem 
              met={/[a-z]/.test(password)} 
              text="One lowercase letter" 
            />
            <RequirementItem 
              met={/\d/.test(password)} 
              text="One number" 
            />
            <RequirementItem 
              met={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)} 
              text="One special character" 
            />
          </div>

          {/* Error Messages */}
          {validation.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {validation.errors.map((error, index) => (
                <div key={index} className="text-red-600 text-xs flex items-center">
                  <span className="mr-1">⚠</span>
                  {error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface RequirementItemProps {
  met: boolean;
  text: string;
}

function RequirementItem({ met, text }: RequirementItemProps) {
  return (
    <div className={`flex items-center space-x-2 ${met ? 'text-green-600' : 'text-gray-500'}`}>
      <span className="text-xs">
        {met ? '✓' : '○'}
      </span>
      <span className="text-xs">{text}</span>
    </div>
  );
} 