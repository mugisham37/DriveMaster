'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { GraphicalIcon } from '@/components/common/GraphicalIcon';

type MentorTab = 'workspace' | 'queue' | 'testimonials' | 'automation';

interface MentorHeaderProps {
  selectedTab: MentorTab;
}

interface MentorStats {
  numSolutionsMentored: number;
  satisfactionPercentage?: number;
  inboxSize: number;
  queueSize: number;
  numTestimonials: number;
  numRepresentationsWithoutFeedback: number;
}

export function MentorHeader({ selectedTab }: MentorHeaderProps) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<MentorStats>({
    numSolutionsMentored: 0,
    inboxSize: 0,
    queueSize: 0,
    numTestimonials: 0,
    numRepresentationsWithoutFeedback: 0
  });

  useEffect(() => {
    // In real implementation, fetch mentor stats from API
    fetchMentorStats();
  }, []);

  const fetchMentorStats = async () => {
    try {
      // Mock data - in real implementation, this would be an API call
      setStats({
        numSolutionsMentored: 142,
        satisfactionPercentage: 98,
        inboxSize: 5,
        queueSize: 23,
        numTestimonials: 87,
        numRepresentationsWithoutFeedback: 12
      });
    } catch (error) {
      console.error('Failed to fetch mentor stats:', error);
    }
  };

  const isAutomator = (session?.user as { isAutomator?: boolean })?.isAutomator || false;

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getTabClass = (tab: MentorTab) => {
    return `c-tab-2 ${tab === selectedTab ? 'selected' : ''}`;
  };

  return (
    <nav className="c-mentor-header">
      <div className="lg-container container">
        <div className="top">
          <div className="title">
            <GraphicalIcon icon="mentoring" />
            <span>Mentoring</span>
          </div>
          
          <div className="stats">
            <div className="stat">
              {formatNumber(stats.numSolutionsMentored)} discussions completed
            </div>
            {stats.satisfactionPercentage && (
              <div className="stat">
                {stats.satisfactionPercentage}% satisfaction
              </div>
            )}
          </div>
        </div>
        
        <div className="bottom">
          <div className="tabs">
            <Link 
              href="/mentoring/inbox"
              className={getTabClass('workspace')}
            >
              <GraphicalIcon icon="overview" />
              <span>Your Workspace</span>
              <span className="count">{formatNumber(stats.inboxSize)}</span>
            </Link>
            
            <Link 
              href="/mentoring/queue"
              className={getTabClass('queue')}
            >
              <GraphicalIcon icon="queue" />
              <span>Queue</span>
              <span className="count">{formatNumber(stats.queueSize)}</span>
            </Link>
            
            <Link 
              href="/mentoring/testimonials"
              className={getTabClass('testimonials')}
            >
              <GraphicalIcon icon="testimonials" />
              <span>Testimonials</span>
              <span className="count">{formatNumber(stats.numTestimonials)}</span>
            </Link>
            
            {isAutomator ? (
              <Link 
                href="/mentoring/automation"
                className={getTabClass('automation')}
              >
                <GraphicalIcon icon="automation" />
                <span>Automation</span>
              </Link>
            ) : (
              <div 
                className={`${getTabClass('automation')} locked`}
                aria-label="This tab is locked"
                data-tooltip-type="automation-locked"
                data-endpoint="/tooltips/locked-mentoring-automation"
                data-placement="bottom"
                data-interactive="true"
              >
                <GraphicalIcon icon="automation" />
                <span>Automation</span>
              </div>
            )}
          </div>
          
          <Link 
            href="/docs/mentoring" 
            className="c-tab-2 guides"
          >
            <GraphicalIcon icon="guides" />
            <span>Mentoring Guides</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}