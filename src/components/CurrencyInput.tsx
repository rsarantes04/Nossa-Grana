import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ 
  value, 
  onChange, 
  className, 
  placeholder = "R$ 0,00",
  autoFocus,
  disabled = false
}) => {
  const [error, setError] = useState<string | null>(null);

  const formatDisplay = (val: string) => {
    if (!val) return '';
    return val.replace('.', ',');
  };

  const validateAndNormalize = (input: string, isTyping: boolean = false) => {
    // Allow only digits, comma or dot
    let normalized = input.replace(/[^0-9,.]/g, '');
    
    // Normalize dot to comma for display/logic
    normalized = normalized.replace(/\./g, ',');

    // Ensure only one comma
    const parts = normalized.split(',');
    if (parts.length > 2) {
      normalized = parts[0] + ',' + parts.slice(1).join('');
    }

    // Block more than 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      if (isTyping) return null; // Block typing
      normalized = parts[0] + ',' + parts[1].slice(0, 2);
    }

    return normalized;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const normalized = validateAndNormalize(input, true);
    if (normalized === null) return; // Block the character
    onChange(normalized.replace(',', '.'));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const normalized = validateAndNormalize(pastedText);
    
    // Check if it was truncated
    const parts = pastedText.replace(/\./g, ',').split(',');
    if (parts.length === 2 && parts[1].length > 2) {
      setError("Valor ajustado para 2 casas decimais.");
      setTimeout(() => setError(null), 3000);
    }
    
    onChange(normalized.replace(',', '.'));
  };

  return (
    <div className="space-y-1">
      <input
        type="text"
        inputMode="decimal"
        autoFocus={autoFocus}
        value={formatDisplay(value)}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-2xl font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal",
          error && "border-red-brick focus:ring-red-brick",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      />
      {error && (
        <p className="text-[10px] text-red-brick font-bold uppercase animate-pulse">
          {error}
        </p>
      )}
    </div>
  );
};
