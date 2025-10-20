'use client';

import Link from 'next/link';
import { TrackIcon } from '@/components/common/TrackIcon';

interface Track {
  id: number;
  slug: string;
  title: string;
  iconUrl: string;
}

interface DocsTrackListProps {
  tracks?: Track[];
  docCounts?: Record<number, number>;
}

// Default tracks data (this would normally come from an API)
const DEFAULT_TRACKS: Track[] = [
  { id: 1, slug: 'javascript', title: 'JavaScript', iconUrl: '/icons/javascript.svg' },
  { id: 2, slug: 'python', title: 'Python', iconUrl: '/icons/python.svg' },
  { id: 3, slug: 'java', title: 'Java', iconUrl: '/icons/java.svg' },
  { id: 4, slug: 'csharp', title: 'C#', iconUrl: '/icons/csharp.svg' },
  { id: 5, slug: 'ruby', title: 'Ruby', iconUrl: '/icons/ruby.svg' },
  { id: 6, slug: 'go', title: 'Go', iconUrl: '/icons/go.svg' },
  { id: 7, slug: 'rust', title: 'Rust', iconUrl: '/icons/rust.svg' },
  { id: 8, slug: 'typescript', title: 'TypeScript', iconUrl: '/icons/typescript.svg' },
  { id: 9, slug: 'cpp', title: 'C++', iconUrl: '/icons/cpp.svg' },
  { id: 10, slug: 'php', title: 'PHP', iconUrl: '/icons/php.svg' },
];

const DEFAULT_DOC_COUNTS: Record<number, number> = {
  1: 15, 2: 12, 3: 18, 4: 14, 5: 10, 6: 8, 7: 6, 8: 13, 9: 16, 10: 9
};

export function DocsTrackList({ 
  tracks = DEFAULT_TRACKS, 
  docCounts = DEFAULT_DOC_COUNTS 
}: DocsTrackListProps) {
  
  // Sort tracks by title
  const sortedTracks = [...tracks].sort((a, b) => a.title.localeCompare(b.title));

  const pluralize = (count: number, singular: string) => {
    return count === 1 ? `${count} ${singular}` : `${count} ${singular}s`;
  };

  return (
    <div className="c-docs-tracks-list">
      <div className="tracks">
        {sortedTracks.map((track) => (
          <Link
            key={track.slug}
            href={`/tracks/${track.slug}/docs`}
            className="track"
          >
            <TrackIcon 
              iconUrl={track.iconUrl} 
              title={track.title}
              size="medium"
            />
            <div className="title">{track.title}</div>
            <div className="count">
              {pluralize(docCounts[track.id] || 0, 'doc')}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}