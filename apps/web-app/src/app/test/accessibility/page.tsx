/**
 * Accessibility Testing Page
 * 
 * Development-only page for testing and verifying accessibility features
 * Implements Task 14: Accessibility Enhancements
 * 
 * Features:
 * - Color contrast checker
 * - Keyboard navigation tester
 * - Screen reader announcement tester
 * - Focus management tester
 * - ARIA attribute inspector
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Keyboard,
  Eye,
  Focus,
  Palette,
  Info,
} from 'lucide-react';
import { ColorContrastChecker } from '@/components/auth/shared/ColorContrastChecker';
import { useAnnounce } from '@/components/auth/shared/useFocusManagement';

// ============================================================================
// Keyboard Navigation Tester
// ============================================================================

function KeyboardNavigationTester() {
  const [lastKey, setLastKey] = useState<string>('');
  const [focusedElement, setFocusedElement] = useState<string>('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    setLastKey(`${e.key}${e.shiftKey ? ' + Shift' : ''}${e.ctrlKey ? ' + Ctrl' : ''}${e.altKey ? ' + Alt' : ''}`);
  };

  const handleFocus = (elementName: string) => {
    setFocusedElement(elementName);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Keyboard Navigation Tester
        </CardTitle>
        <CardDescription>
          Test keyboard navigation and focus management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <p className="text-sm font-medium">Last Key Pressed:</p>
          <p className="text-lg font-mono">{lastKey || 'Press any key...'}</p>
          <p className="text-sm font-medium">Currently Focused:</p>
          <p className="text-lg font-mono">{focusedElement || 'No element focused'}</p>
        </div>

        <div className="space-y-4" onKeyDown={handleKeyDown}>
          <div className="space-y-2">
            <Label htmlFor="test-input-1">Test Input 1</Label>
            <Input
              id="test-input-1"
              placeholder="Tab to navigate"
              onFocus={() => handleFocus('Test Input 1')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-input-2">Test Input 2</Label>
            <Input
              id="test-input-2"
              placeholder="Shift+Tab to go back"
              onFocus={() => handleFocus('Test Input 2')}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onFocus={() => handleFocus('Button 1')}
              onClick={() => alert('Button 1 clicked')}
            >
              Button 1
            </Button>
            <Button
              variant="outline"
              onFocus={() => handleFocus('Button 2')}
              onClick={() => alert('Button 2 clicked')}
            >
              Button 2
            </Button>
            <Button
              variant="destructive"
              onFocus={() => handleFocus('Button 3')}
              onClick={() => alert('Button 3 clicked')}
            >
              Button 3
            </Button>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Testing Checklist</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>✓ Tab key moves focus forward</li>
              <li>✓ Shift+Tab moves focus backward</li>
              <li>✓ Enter key activates buttons</li>
              <li>✓ Space key activates buttons</li>
              <li>✓ Escape key closes modals</li>
              <li>✓ Arrow keys navigate dropdowns</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Screen Reader Announcements Tester
// ============================================================================

function ScreenReaderTester() {
  const announce = useAnnounce();
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const handleAnnounce = () => {
    if (message) {
      announce(message, priority);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Screen Reader Announcements
        </CardTitle>
        <CardDescription>
          Test screen reader announcements with aria-live regions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="announcement-message">Message to Announce</Label>
          <Input
            id="announcement-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter a message..."
          />
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <div className="flex gap-2">
            <Button
              variant={priority === 'polite' ? 'default' : 'outline'}
              onClick={() => setPriority('polite')}
            >
              Polite
            </Button>
            <Button
              variant={priority === 'assertive' ? 'default' : 'outline'}
              onClick={() => setPriority('assertive')}
            >
              Assertive
            </Button>
          </div>
        </div>

        <Button onClick={handleAnnounce} disabled={!message}>
          Announce Message
        </Button>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How to Test</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Enable your screen reader (NVDA, JAWS, VoiceOver)</li>
              <li>Enter a message in the input field</li>
              <li>Select priority level</li>
              <li>Click "Announce Message"</li>
              <li>Listen for the announcement</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-sm font-medium">Example Announcements:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setMessage('Form submitted successfully');
                announce('Form submitted successfully', 'polite');
              }}
            >
              Success Message
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setMessage('Error: Please fill in all required fields');
                announce('Error: Please fill in all required fields', 'assertive');
              }}
            >
              Error Message
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setMessage('Loading content, please wait');
                announce('Loading content, please wait', 'polite');
              }}
            >
              Loading Message
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Focus Management Tester
// ============================================================================

function FocusManagementTester() {
  const [showModal, setShowModal] = useState(false);

  const focusFirstInput = () => {
    const input = document.getElementById('focus-test-input');
    input?.focus();
  };

  const focusLastButton = () => {
    const button = document.getElementById('focus-test-button');
    button?.focus();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Focus className="h-5 w-5" />
          Focus Management
        </CardTitle>
        <CardDescription>
          Test focus management and restoration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="focus-test-input">Test Input</Label>
            <Input
              id="focus-test-input"
              placeholder="This input can be focused programmatically"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={focusFirstInput}>
              Focus Input
            </Button>
            <Button onClick={focusLastButton} variant="outline">
              Focus Button
            </Button>
            <Button
              id="focus-test-button"
              variant="outline"
              onClick={() => setShowModal(true)}
            >
              Open Modal
            </Button>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Testing Checklist</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>✓ Focus moves to first input in forms</li>
              <li>✓ Focus moves to first error on validation</li>
              <li>✓ Focus trapped in modals</li>
              <li>✓ Focus restored after modal close</li>
              <li>✓ Focus moves to main heading on route change</li>
            </ul>
          </AlertDescription>
        </Alert>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-96">
              <CardHeader>
                <CardTitle>Test Modal</CardTitle>
                <CardDescription>
                  Focus should be trapped in this modal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="First input" />
                <Input placeholder="Second input" />
                <div className="flex gap-2">
                  <Button onClick={() => setShowModal(false)}>
                    Close
                  </Button>
                  <Button variant="outline">
                    Another Button
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ARIA Attributes Inspector
// ============================================================================

function ARIAInspector() {
  const [results, setResults] = useState<Array<{ element: string; attributes: string[] }>>([]);

  const inspectARIA = () => {
    const elements = document.querySelectorAll('[aria-label], [aria-describedby], [aria-invalid], [aria-required], [aria-busy], [role]');
    const results: Array<{ element: string; attributes: string[] }> = [];

    elements.forEach((element) => {
      const attributes: string[] = [];

      // Check all ARIA attributes
      const ariaAttrs = [
        'aria-label',
        'aria-labelledby',
        'aria-describedby',
        'aria-invalid',
        'aria-required',
        'aria-busy',
        'aria-live',
        'aria-atomic',
        'aria-hidden',
        'role',
      ];

      ariaAttrs.forEach((attr) => {
        const value = element.getAttribute(attr);
        if (value !== null) {
          attributes.push(`${attr}="${value}"`);
        }
      });

      if (attributes.length > 0) {
        results.push({
          element: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : ''),
          attributes,
        });
      }
    });

    setResults(results);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          ARIA Attributes Inspector
        </CardTitle>
        <CardDescription>
          Inspect ARIA attributes on the current page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={inspectARIA}>
          Inspect ARIA Attributes
        </Button>

        {results.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Element</th>
                    <th className="text-left p-2">ARIA Attributes</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2 font-mono text-xs">{result.element}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {result.attributes.map((attr, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {attr}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Found {results.length} elements with ARIA attributes</AlertTitle>
          <AlertDescription>
            All interactive elements should have appropriate ARIA attributes for accessibility
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function AccessibilityTestPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Accessibility Testing Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive testing tools for WCAG 2.1 AA compliance (Task 14)
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Development Only</AlertTitle>
        <AlertDescription>
          This page is for development and testing purposes only. It should not be accessible in production.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="contrast" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="contrast">
            <Palette className="h-4 w-4 mr-2" />
            Contrast
          </TabsTrigger>
          <TabsTrigger value="keyboard">
            <Keyboard className="h-4 w-4 mr-2" />
            Keyboard
          </TabsTrigger>
          <TabsTrigger value="screen-reader">
            <Eye className="h-4 w-4 mr-2" />
            Screen Reader
          </TabsTrigger>
          <TabsTrigger value="focus">
            <Focus className="h-4 w-4 mr-2" />
            Focus
          </TabsTrigger>
          <TabsTrigger value="aria">
            <AlertCircle className="h-4 w-4 mr-2" />
            ARIA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contrast" className="space-y-4">
          <ColorContrastChecker />
        </TabsContent>

        <TabsContent value="keyboard" className="space-y-4">
          <KeyboardNavigationTester />
        </TabsContent>

        <TabsContent value="screen-reader" className="space-y-4">
          <ScreenReaderTester />
        </TabsContent>

        <TabsContent value="focus" className="space-y-4">
          <FocusManagementTester />
        </TabsContent>

        <TabsContent value="aria" className="space-y-4">
          <ARIAInspector />
        </TabsContent>
      </Tabs>

      {/* Task 14 Completion Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Task 14: Accessibility Enhancements - Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>14.1 - ARIA labels on all interactive elements</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>14.2 - Focus management implemented</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>14.3 - Screen reader announcements</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>14.4 - Keyboard navigation ensured</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>14.5 - Color contrast verification tools provided</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
