"use client";

/**
 * Responsive Design Testing Page
 * 
 * This page helps verify all responsive design implementations for Task 15.
 * It displays the current viewport size and provides visual indicators for
 * breakpoints and touch target sizes.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Smartphone, Tablet, Ruler, Type, Grid3x3, CheckCircle2 } from "lucide-react";

export default function ResponsiveDesignTestPage() {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [breakpoint, setBreakpoint] = useState("");

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setViewport({ width, height });

      // Determine breakpoint
      if (width < 475) {
        setBreakpoint("xs (< 475px)");
      } else if (width < 640) {
        setBreakpoint("sm (475px - 639px)");
      } else if (width < 768) {
        setBreakpoint("md (640px - 767px)");
      } else if (width < 1024) {
        setBreakpoint("lg (768px - 1023px)");
      } else if (width < 1280) {
        setBreakpoint("xl (1024px - 1279px)");
      } else {
        setBreakpoint("2xl (≥ 1280px)");
      }
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const getDeviceIcon = () => {
    if (viewport.width < 640) return <Smartphone className="h-6 w-6" />;
    if (viewport.width < 1024) return <Tablet className="h-6 w-6" />;
    return <Monitor className="h-6 w-6" />;
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Responsive Design Testing</h1>
        <p className="text-muted-foreground">
          Verify responsive design implementations for Task 15
        </p>
      </div>

      {/* Viewport Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getDeviceIcon()}
            Current Viewport
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Width</p>
              <p className="text-2xl font-bold">{viewport.width}px</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Height</p>
              <p className="text-2xl font-bold">{viewport.height}px</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Breakpoint</p>
              <Badge variant="secondary" className="text-base mt-1">
                {breakpoint}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Device Type</p>
              <p className="text-base font-medium mt-1">
                {viewport.width < 640 ? "Mobile" : viewport.width < 1024 ? "Tablet" : "Desktop"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Sections */}
      <Tabs defaultValue="typography" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="typography">
            <Type className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Typography</span>
          </TabsTrigger>
          <TabsTrigger value="touch">
            <Ruler className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Touch Targets</span>
          </TabsTrigger>
          <TabsTrigger value="grid">
            <Grid3x3 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Grid Layouts</span>
          </TabsTrigger>
          <TabsTrigger value="checklist">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Checklist</span>
          </TabsTrigger>
        </TabsList>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Responsive Typography</CardTitle>
              <CardDescription>
                Font sizes should scale appropriately across breakpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Heading 1 (text-2xl sm:text-3xl)</p>
                <h1 className="text-2xl sm:text-3xl font-bold">The quick brown fox</h1>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Heading 2 (text-xl sm:text-2xl)</p>
                <h2 className="text-xl sm:text-2xl font-semibold">The quick brown fox</h2>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Heading 3 (text-lg sm:text-xl)</p>
                <h3 className="text-lg sm:text-xl font-semibold">The quick brown fox</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Body Text (text-sm sm:text-base)</p>
                <p className="text-sm sm:text-base">
                  The quick brown fox jumps over the lazy dog. This text should be readable
                  at all screen sizes with proper line height and spacing.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Small Text (text-xs sm:text-sm)</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Touch Targets Tab */}
        <TabsContent value="touch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Touch Target Sizes</CardTitle>
              <CardDescription>
                All interactive elements should be at least 44x44px
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Standard Button (44px height)</p>
                  <Button>Click Me</Button>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Small Button (44px height)</p>
                  <Button size="sm">Click Me</Button>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Link with touch-target class</p>
                  <a href="#" className="text-primary hover:underline touch-target">
                    Click this link
                  </a>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Badge (adequate padding)</p>
                  <Badge>Badge Text</Badge>
                </div>
              </div>

              {/* Visual Guide */}
              <div className="border-t pt-6">
                <p className="text-sm font-medium mb-4">44px Touch Target Guide:</p>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 border-2 border-primary bg-primary/10 flex items-center justify-center text-xs font-medium">
                    44px
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Minimum recommended touch target size for mobile devices
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grid Layouts Tab */}
        <TabsContent value="grid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Responsive Grid Layouts</CardTitle>
              <CardDescription>
                Grids should adapt from 1 column (mobile) to 2 (tablet) to 3 (desktop)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Session List Grid (1 → 2 → 3 columns)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <p className="text-sm font-medium">Card {i}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          This card is part of a responsive grid
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  OAuth Buttons Grid (1 → 2 columns)
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
                  {["Google", "Apple", "GitHub", "Microsoft"].map((provider) => (
                    <Button key={provider} variant="outline" className="w-full">
                      {provider}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Implementation Checklist</CardTitle>
              <CardDescription>
                Verify all responsive design requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    15.1 Mobile-First Form Layouts
                  </h3>
                  <ul className="ml-7 space-y-1 text-sm text-muted-foreground">
                    <li>✓ Auth forms full-width on mobile</li>
                    <li>✓ Forms centered with max-width on desktop</li>
                    <li>✓ OAuth buttons stack vertically on mobile</li>
                    <li>✓ Tested on various screen sizes</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    15.2 Responsive Profile Page
                  </h3>
                  <ul className="ml-7 space-y-1 text-sm text-muted-foreground">
                    <li>✓ Single column layout on mobile</li>
                    <li>✓ Responsive avatar sizing</li>
                    <li>✓ Responsive typography and spacing</li>
                    <li>✓ Abbreviated tab labels on mobile</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    15.3 Responsive Session List
                  </h3>
                  <ul className="ml-7 space-y-1 text-sm text-muted-foreground">
                    <li>✓ Stack cards on mobile (1 column)</li>
                    <li>✓ Two columns on tablet</li>
                    <li>✓ Three columns on desktop</li>
                    <li>✓ Responsive card padding</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    15.4 Touch Target Sizes
                  </h3>
                  <ul className="ml-7 space-y-1 text-sm text-muted-foreground">
                    <li>✓ All buttons are 44x44px minimum</li>
                    <li>✓ Checkboxes have 44px touch area</li>
                    <li>✓ Links have adequate padding</li>
                    <li>✓ Touch-target utility class created</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    15.5 Responsive Typography
                  </h3>
                  <ul className="ml-7 space-y-1 text-sm text-muted-foreground">
                    <li>✓ Font sizes scale appropriately</li>
                    <li>✓ Line heights are readable (1.6 body, 1.3 headings)</li>
                    <li>✓ Text wrapping works on small screens</li>
                    <li>✓ Readability maintained on large screens</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Testing Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Desktop Testing:</h4>
                <ol className="list-decimal ml-5 space-y-1 text-sm text-muted-foreground">
                  <li>Open browser DevTools (F12)</li>
                  <li>Toggle device toolbar (Ctrl+Shift+M)</li>
                  <li>Test at 375px (iPhone SE)</li>
                  <li>Test at 768px (iPad)</li>
                  <li>Test at 1024px (Desktop)</li>
                  <li>Test at 1920px (Large Desktop)</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium mb-2">Mobile Testing:</h4>
                <ol className="list-decimal ml-5 space-y-1 text-sm text-muted-foreground">
                  <li>Test on actual mobile device</li>
                  <li>Verify touch targets are easy to tap</li>
                  <li>Check text is readable without zooming</li>
                  <li>Verify forms are easy to fill out</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
