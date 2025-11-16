import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse & Search',
  description: 'Search and discover driving lessons, practice questions, and learning materials. Filter by topic, difficulty, and more.',
};

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
