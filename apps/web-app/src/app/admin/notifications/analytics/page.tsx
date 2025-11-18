import { Metadata } from 'next';
import { NotificationAnalyticsPageContent } from './NotificationAnalyticsPageContent';

export const metadata: Metadata = {
  title: 'Notification Analytics | Admin',
  description: 'Comprehensive notification performance analytics',
};

export default function NotificationAnalyticsPage() {
  return <NotificationAnalyticsPageContent />;
}
