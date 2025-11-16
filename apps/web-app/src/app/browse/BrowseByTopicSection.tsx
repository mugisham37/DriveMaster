'use client';

/**
 * BrowseByTopicSection Component
 * 
 * Displays topic categories for browsing
 * Requirements: 8.5
 */

import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Car, 
  MapPin, 
  AlertTriangle, 
  Shield, 
  Gauge, 
  Users,
  BookOpen,
  FileText,
} from 'lucide-react';

interface BrowseByTopicSectionProps {
  onTopicClick: (topic: string) => void;
}

// Topic categories with icons and descriptions
const topicCategories = [
  {
    id: 'road-signs',
    name: 'Road Signs',
    description: 'Learn to recognize and understand traffic signs',
    icon: MapPin,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'traffic-rules',
    name: 'Traffic Rules',
    description: 'Master the rules of the road',
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'safety',
    name: 'Safety',
    description: 'Essential safety practices and procedures',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  {
    id: 'vehicle-operation',
    name: 'Vehicle Operation',
    description: 'Learn how to operate your vehicle safely',
    icon: Car,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'hazard-awareness',
    name: 'Hazard Awareness',
    description: 'Identify and respond to road hazards',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    id: 'speed-limits',
    name: 'Speed Limits',
    description: 'Understand speed regulations and limits',
    icon: Gauge,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  {
    id: 'right-of-way',
    name: 'Right of Way',
    description: 'Learn priority rules at intersections',
    icon: Users,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  {
    id: 'theory',
    name: 'Theory',
    description: 'Comprehensive driving theory knowledge',
    icon: BookOpen,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
];

export function BrowseByTopicSection({ onTopicClick }: BrowseByTopicSectionProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Browse by Topic</h2>
        <p className="text-muted-foreground">
          Explore content organized by subject area
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {topicCategories.map((topic) => {
          const Icon = topic.icon;
          return (
            <Card
              key={topic.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
              onClick={() => onTopicClick(topic.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onTopicClick(topic.id);
                }
              }}
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${topic.bgColor} flex items-center justify-center mb-3`}>
                  <Icon className={`w-6 h-6 ${topic.color}`} />
                </div>
                <CardTitle className="text-lg">{topic.name}</CardTitle>
                <CardDescription className="text-sm">
                  {topic.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
