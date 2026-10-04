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
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-text-primary">
          Settings
        </h1>
        <p className="mt-2 text-sm md:text-base text-text-secondary">
          Configure global site settings, reading preferences, SEO, and advertisements.
        </p>
      </div>

      <SettingsForm initialSettings={initialSettings} />
    </div>
  );
}
