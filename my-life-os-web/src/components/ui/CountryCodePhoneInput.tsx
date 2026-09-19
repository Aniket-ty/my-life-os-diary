import React, { useState, useEffect } from 'react'
import { Phone, ChevronDown } from 'lucide-react'

export interface CountryCode {
  code: string
  country: string
  flag: string
  name: string
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States / Canada' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'United Arab Emirates' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+974', country: 'QA', flag: '🇶🇦', name: 'Qatar' },
  { code: '+880', country: 'BD', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+977', country: 'NP', flag: '🇳🇵', name: 'Nepal' },
  { code: '+94', country: 'LK', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+62', country: 'ID', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+64', country: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+41', country: 'CH', flag: '🇨🇭', name: 'Switzerland' },
  { code: '+46', country: 'SE', flag: '🇸🇪', name: 'Sweden' },
  { code: '+27', country: 'ZA', flag: '🇿🇦', name: 'South Africa' },
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: '+52', country: 'MX', flag: '🇲🇽', name: 'Mexico' },
]

interface CountryCodePhoneInputProps {
  label?: string
  value?: string
  onChange: (fullNumber: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export function CountryCodePhoneInput({
  label = 'Phone Number',
  value = '',
  onChange,
  placeholder = '98765 43210',
  disabled = false,
  className = '',
}: CountryCodePhoneInputProps) {
  // Detect country code from initial value if starting with +
  const [selectedCode, setSelectedCode] = useState('+91')
  const [localNumber, setLocalNumber] = useState('')

  useEffect(() => {
    if (!value) {
      setLocalNumber('')
      return
    }
    const clean = value.trim()
    if (clean.startsWith('+')) {
      const match = COUNTRY_CODES.find((c) => clean.startsWith(c.code))
      if (match) {
        setSelectedCode(match.code)
        setLocalNumber(clean.slice(match.code.length).trim())
        return
      }
    }
    setLocalNumber(clean)
  }, [value])

  const handleCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value
    setSelectedCode(newCode)
    const digits = localNumber.replace(/\D/g, '')
    onChange(digits ? `${newCode}${digits}` : '')
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // If user pastes or types a number with +, extract dial code if recognized
    if (raw.trim().startsWith('+')) {
      const match = COUNTRY_CODES.find((c) => raw.trim().startsWith(c.code))
      if (match) {
        setSelectedCode(match.code)
        const rest = raw.trim().slice(match.code.length).replace(/\D/g, '')
        setLocalNumber(rest)
        onChange(rest ? `${match.code}${rest}` : '')
        return
      }
    }

    const digits = raw.replace(/[^\d\s-]/g, '')
    setLocalNumber(digits)
    const cleanDigits = digits.replace(/\D/g, '')
    onChange(cleanDigits ? `${selectedCode}${cleanDigits}` : '')
  }

  const currentCountry = COUNTRY_CODES.find((c) => c.code === selectedCode) || COUNTRY_CODES[0]

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}
      <div className="flex items-center rounded-xl border border-white/10 bg-white/5 focus-within:border-violet-brand/80 transition-all shadow-inner">
        {/* Country Dial Code Dropdown */}
        <div className="relative flex items-center border-r border-white/10 px-2.5 py-2">
          <span className="mr-1.5 text-base select-none">{currentCountry.flag}</span>
          <span className="text-xs font-semibold text-white mr-1">{currentCountry.code}</span>
          <ChevronDown size={13} className="text-slate-400 pointer-events-none" />
          <select
            value={selectedCode}
            onChange={handleCodeChange}
            disabled={disabled}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full bg-slate-900 text-white"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code + c.country} value={c.code} className="bg-slate-900 text-white">
                {c.flag} {c.code} ({c.name})
              </option>
            ))}
          </select>
        </div>

        {/* National Number Input */}
        <div className="relative flex-1 flex items-center">
          <input
            type="tel"
            value={localNumber}
            onChange={handleNumberChange}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          <Phone size={15} className="mr-3 text-slate-500 pointer-events-none" />
        </div>
      </div>
      <p className="text-[11px] text-slate-400">
        Enter phone number with your country code for instant verification, splits, and notifications
      </p>
    </div>
  )
}
