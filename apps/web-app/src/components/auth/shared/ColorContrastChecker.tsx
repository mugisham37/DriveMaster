/**
 * Color Contrast Checker Component
 * 
 * Development tool for verifying WCAG 2.1 AA color contrast requirements
 * Displays contrast ratios for all text elements in the authentication system
 * 
 * Requirements: 15.5 (Task 14.5)
 * 
 * Usage: Only include in development builds
 * ```tsx
 * {process.env.NODE_ENV === 'development' && <ColorContrastChecker />}
 * ```
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ContrastResult {
  element: string;
  foreground: string;
  background: string;
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  fontSize: string;
  fontWeight: string;
  location: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert RGB to relative luminance
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
function getContrastRatio(fg: string, bg: string): number {
  const fgLum = getLuminanceFromHex(fg);
  const bgLum = getLuminanceFromHex(bg);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get luminance from hex color
 */
function getLuminanceFromHex(hex: string): number {
  // Remove # if present
  hex = hex.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  return getLuminance(r, g, b);
}

/**
 * Convert RGB string to hex
 */
function rgbToHex(rgb: string): string {
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return '#000000';

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Get computed background color (walking up the DOM tree)
 */
function getBackgroundColor(element: Element): string {
  let current: Element | null = element;

  while (current) {
    const bg = window.getComputedStyle(current).backgroundColor;

    // Check if background is not transparent
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      return rgbToHex(bg);
    }

    current = current.parentElement;
  }

  // Default to white if no background found
  return '#ffffff';
}

// ============================================================================
// Component
// ============================================================================

export function ColorContrastChecker() {
  const [results, setResults] = useState<ContrastResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pass' | 'fail'>('all');

  const checkContrast = () => {
    setIsChecking(true);

    setTimeout(() => {
      const textElements = document.querySelectorAll('p, span, a, button, label, h1, h2, h3, h4, h5, h6, input, textarea');
      const results: ContrastResult[] = [];

      textElements.forEach((element) => {
        // Skip hidden elements
        if (element.offsetParent === null) return;

        // Skip elements without text
        const text = element.textContent?.trim();
        if (!text) return;

        const styles = window.getComputedStyle(element);
        const color = styles.color;
        const fontSize = styles.fontSize;
        const fontWeight = styles.fontWeight;

        // Get background color
        const bgColor = getBackgroundColor(element);
        const fgColor = rgbToHex(color);

        // Calculate contrast ratio
        const ratio = getContrastRatio(fgColor, bgColor);

        // Determine if it passes WCAG requirements
        const isLargeText = (
          parseFloat(fontSize) >= 18 ||
          (parseFloat(fontSize) >= 14 && parseInt(fontWeight) >= 700)
        );

        const passesAA = isLargeText ? ratio >= 3 : ratio >= 4.5;
        const passesAAA = isLargeText ? ratio >= 4.5 : ratio >= 7;

        // Get location
        const location = element.closest('[data-testid]')?.getAttribute('data-testid') ||
          element.closest('[id]')?.getAttribute('id') ||
          element.tagName.toLowerCase();

        results.push({
          element: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          foreground: fgColor,
          background: bgColor,
          ratio: Math.round(ratio * 100) / 100,
          passesAA,
          passesAAA,
          fontSize,
          fontWeight,
          location,
        });
      });

      // Sort by ratio (lowest first - most problematic)
      results.sort((a, b) => a.ratio - b.ratio);

      setResults(results);
      setIsChecking(false);
    }, 100);
  };

  useEffect(() => {
    // Auto-check on mount
    checkContrast();
  }, []);

  const filteredResults = results.filter((result) => {
    if (filter === 'pass') return result.passesAA;
    if (filter === 'fail') return !result.passesAA;
    return true;
  });

  const passCount = results.filter(r => r.passesAA).length;
  const failCount = results.filter(r => !r.passesAA).length;
  const passRate = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0;

  return (
    <Card className="w-full max-w-4xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Color Contrast Checker</CardTitle>
        <CardDescription>
          WCAG 2.1 AA requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="space-y-1">
            <p className="text-sm font-medium">Overall Compliance</p>
            <p className="text-2xl font-bold">{passRate}%</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Passing</p>
              <p className="text-lg font-semibold text-green-600">{passCount}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Failing</p>
              <p className="text-lg font-semibold text-red-600">{failCount}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">{results.length}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={checkContrast} disabled={isChecking}>
            {isChecking ? 'Checking...' : 'Re-check Contrast'}
          </Button>
          <div className="flex gap-1 ml-auto">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'pass' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pass')}
            >
              Pass
            </Button>
            <Button
              variant={filter === 'fail' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('fail')}
            >
              Fail
            </Button>
          </div>
        </div>

        {/* Results Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Element</th>
                  <th className="text-left p-2">Ratio</th>
                  <th className="text-left p-2">Colors</th>
                  <th className="text-left p-2">Size/Weight</th>
                  <th className="text-left p-2">Location</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result, index) => (
                  <tr key={index} className="border-t hover:bg-muted/50">
                    <td className="p-2">
                      {result.passesAA ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </td>
                    <td className="p-2 font-mono text-xs">{result.element}</td>
                    <td className="p-2">
                      <Badge variant={result.passesAA ? 'default' : 'destructive'}>
                        {result.ratio}:1
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2 items-center">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: result.foreground }}
                          title={result.foreground}
                        />
                        <span className="text-xs">on</span>
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: result.background }}
                          title={result.background}
                        />
                      </div>
                    </td>
                    <td className="p-2 text-xs">
                      {result.fontSize} / {result.fontWeight}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {result.location}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>WCAG 2.1 AA Requirements:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Normal text (under 18px or under 14px bold): 4.5:1 minimum</li>
            <li>Large text (18px+ or 14px+ bold): 3:1 minimum</li>
            <li>AAA level (enhanced): 7:1 for normal text, 4.5:1 for large text</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default ColorContrastChecker;
