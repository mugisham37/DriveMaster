import { redirect } from 'next/navigation';

export default function SettingsPage() {
  // Redirect to profile settings as the default
  redirect('/settings/profile');
}