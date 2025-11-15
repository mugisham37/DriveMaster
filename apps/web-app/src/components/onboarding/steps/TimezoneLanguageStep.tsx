/**
 * Timezone & Language Step Component
 * 
 * Second step - timezone, language, and country selection
 * Requirements: 2.4, 2.8
 */

"use client";

import React, { useState, useEffect } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, MapPin, Languages } from "lucide-react";

// Common timezones
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

// Common languages
const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "ar", name: "العربية" },
];

// Common countries
const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "CN", name: "China" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "AE", name: "United Arab Emirates" },
];

export function TimezoneLanguageStep() {
  const { formData, setFormData } = useOnboarding();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate on mount and when data changes
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.timezone) {
      newErrors.timezone = "Please select your timezone";
    }
    if (!formData.language) {
      newErrors.language = "Please select your language";
    }
    if (!formData.countryCode) {
      newErrors.countryCode = "Please select your country";
    }

    setErrors(newErrors);
  }, [formData.timezone, formData.language, formData.countryCode]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Location & Language
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Help us customize your experience
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Timezone
          </Label>
          <Select
            value={formData.timezone}
            onValueChange={(value) => setFormData({ timezone: value })}
          >
            <SelectTrigger id="timezone" className={errors.timezone ? "border-red-500" : ""}>
              <SelectValue placeholder="Select your timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.timezone && (
            <p className="text-xs text-gray-500">
              Current time: {new Date().toLocaleTimeString('en-US', { timeZone: formData.timezone })}
            </p>
          )}
          {errors.timezone && (
            <p className="text-sm text-red-500">{errors.timezone}</p>
          )}
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="language" className="flex items-center gap-2">
            <Languages className="w-4 h-4" />
            Language
          </Label>
          <Select
            value={formData.language}
            onValueChange={(value) => setFormData({ language: value })}
          >
            <SelectTrigger id="language" className={errors.language ? "border-red-500" : ""}>
              <SelectValue placeholder="Select your language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.language && (
            <p className="text-sm text-red-500">{errors.language}</p>
          )}
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label htmlFor="country" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Country
          </Label>
          <Select
            value={formData.countryCode}
            onValueChange={(value) => setFormData({ countryCode: value })}
          >
            <SelectTrigger id="country" className={errors.countryCode ? "border-red-500" : ""}>
              <SelectValue placeholder="Select your country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.countryCode && (
            <p className="text-sm text-red-500">{errors.countryCode}</p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 max-w-md mx-auto">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          💡 <strong>Tip:</strong> We've pre-selected your timezone based on your browser settings. 
          You can change it if needed.
        </p>
      </div>
    </div>
  );
}
