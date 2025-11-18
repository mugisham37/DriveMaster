import { Metadata } from 'next';
import { NotificationsPageContent } from './NotificationsPageContent';

export const metadata: Metadata = {
  title: 'Notifications | Learning Platform',
  description: 'View and manage your notifications',
};

export default function NotificationsPage() {
  return <NotificationsPageContent />;
}
