'use client';

import React, { useState } from 'react';
import { SkillMasteryItem } from '../molecules/SkillMasteryItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export type MasteryLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface SkillMasteryData {
  id: string;
  topicName: string;
  mastery: number; // 0-1
  practiceCount: number;
  timeSpent: number; // in seconds
  lastPracticed: Date;
}

interface SkillMasteryListProps {
  skills: SkillMasteryData[];
  onSkillClick?: (skillId: string) => void;
  className?: string;
}

export function SkillMasteryList({ skills, onSkillClick, className }: SkillMasteryListProps) {
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const getMasteryLevel = (mastery: number): MasteryLevel => {
    if (mastery >= 0.9) return 'expert';
    if (mastery >= 0.7) return 'advanced';
    if (mastery >= 0.4) return 'intermediate';
    return 'beginner';
  };

  const filteredSkills = skills.filter((skill) => {
    if (filterLevel === 'all') return true;
    return getMasteryLevel(skill.mastery) === filterLevel;
  });

  // Sort by mastery level (lowest first for focus areas)
  const sortedSkills = [...filteredSkills].sort((a, b) => {
    return a.mastery - b.mastery;
  });

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Skill Mastery</CardTitle>
          <div className="space-y-2 w-full sm:w-auto">
            <Label htmlFor="mastery-filter" className="sr-only">
              Filter by mastery level
            </Label>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger id="mastery-filter" className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedSkills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No skills found matching the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedSkills.map((skill) => (
              <SkillMasteryItem
                key={skill.id}
                topic={skill.topicName}
                mastery={skill.mastery}
                practiceCount={skill.practiceCount}
                timeSpent={skill.timeSpent}
                lastPracticed={skill.lastPracticed}
                onClick={() => onSkillClick?.(skill.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
