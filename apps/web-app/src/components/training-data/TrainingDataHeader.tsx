'use client';

import Link from 'next/link';
import { GraphicalIcon } from '@/components/common/GraphicalIcon';

interface TrainingDataHeaderProps {
  selectedTab: 'tags';
}

export function TrainingDataHeader({ selectedTab }: TrainingDataHeaderProps) {
  return (
    <nav className="c-mentor-header">
      <div className="lg-container container">
        <div className="top">
          <div className="title">
            <GraphicalIcon icon="mentoring" hex={true} />
            <span>Training Data</span>
          </div>
        </div>
        
        <div className="bottom">
          <div className="tabs">
            <Link 
              href="/training-data"
              className={`c-tab-2 ${selectedTab === 'tags' ? 'selected' : ''}`}
            >
              <GraphicalIcon icon="overview" />
              <span>Tags</span>
            </Link>
          </div>
          
          <Link 
            href="/docs/mentoring" 
            className="c-tab-2 guides"
          >
            <GraphicalIcon icon="guides" />
            <span>Tagging Guides</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}