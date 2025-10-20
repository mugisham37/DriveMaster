import { Metadata } from 'next';
import { getServerAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsNav } from '@/components/settings/SettingsNav';

export const metadata: Metadata = {
  title: 'Settings - Exercism',
  description: 'Manage your Exercism account settings'
};

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  const session = await getServerAuthSession();
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/settings');
  }

  return (
    <div className="page-settings">
      <div className="lg-container">
        <div className="container">
          <div className="settings-layout">
            <div className="settings-nav-wrapper">
              <h1 className="text-h2 mb-8">Settings</h1>
              <SettingsNav />
            </div>
            
            <main className="settings-content">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}