import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search & Browse | Learning Platform',
  description: 'Search and browse learning content, lessons, and practice materials',
};

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
