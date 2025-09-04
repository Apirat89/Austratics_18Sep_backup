import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  label: string;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function PasswordInput({
  name,
  value,
  onChange,
  placeholder,
  label,
  required = true,
  className = "w-full resize-none overflow-hidden rounded-xl text-[#0d141c] focus:outline-0 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 border border-gray-200 bg-blue-50/30 focus:bg-white focus:border-blue-500 h-14 placeholder:text-[#49719c] p-4 pr-12 text-base font-normal leading-normal transition-all duration-200",
  style
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex flex-col">
      <label className="text-[#0d141c] text-sm font-medium mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={className}
          style={style}
          required={required}
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-blue-500 transition-colors duration-200"
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff size={20} />
          ) : (
            <Eye size={20} />
          )}
        </button>
      </div>
    </div>
  );
} 