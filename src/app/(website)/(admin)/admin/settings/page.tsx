import { Metadata } from 'next';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { getSettings } from '@/app/actions/public/settings';

export const metadata: Metadata = {
  title: 'Settings - Admin',
};

export default async function SettingsPage() {
  const initialSettings = await getSettings();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tighter text-text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
          Site Settings
        </h1>
        <p className="mt-1 text-text-muted">
          Configure global site settings, reading preferences, SEO, and advertisements.
        </p>
      </div>

      <SettingsForm initialSettings={initialSettings} />
    </div>
  );
}
