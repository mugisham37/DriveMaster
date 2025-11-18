import { Metadata } from 'next';
import { NotificationSettingsPageContent } from './NotificationSettingsPageContent';

export const metadata: Metadata = {
  title: 'Notification Settings | Learning Platform',
  description: 'Configure your notification preferences',
};

export default function NotificationSettingsPage() {
  return <NotificationSettingsPageContent />;
}
