import { ChevronRight, Download, Database, Palette, Settings, Info, HelpCircle } from 'lucide-react';

export function SettingsScreen() {
  const menuItems = [
    { icon: Download, label: 'Downloads' },
    { icon: Database, label: 'Storage' },
    { icon: Palette, label: 'Appearance' },
    { icon: Settings, label: 'Settings' },
  ];

  const helpItems = [
    { icon: Info, label: 'About' },
    { icon: HelpCircle, label: 'Support' },
  ];

  return (
    <div className="flex flex-col h-full bg-brand-bg text-brand-text pt-safe overflow-y-auto">
      <div className="px-4 py-3 h-14">
        <h1 className="text-xl font-semibold tracking-wide">More</h1>
      </div>
      
      <div className="flex-1 flex flex-col gap-6 p-4">
        
        {/* Main Settings Group */}
        <div className="flex flex-col bg-brand-surface rounded-2xl overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button key={item.label} className={`flex items-center justify-between p-4 active:bg-white/5 transition-colors ${index !== menuItems.length - 1 ? 'border-b border-white/5' : ''}`}>
                <div className="flex items-center gap-3 text-brand-text">
                  <Icon size={20} className="text-brand-secondary" />
                  <span className="text-[15px]">{item.label}</span>
                </div>
                <ChevronRight size={20} className="text-brand-secondary" />
              </button>
            );
          })}
        </div>

        {/* Info Group */}
        <div className="flex flex-col bg-brand-surface rounded-2xl overflow-hidden">
          {helpItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button key={item.label} className={`flex items-center justify-between p-4 active:bg-white/5 transition-colors ${index !== helpItems.length - 1 ? 'border-b border-white/5' : ''}`}>
                <div className="flex items-center gap-3 text-brand-text">
                  <Icon size={20} className="text-brand-secondary" />
                  <span className="text-[15px]">{item.label}</span>
                </div>
                <ChevronRight size={20} className="text-brand-secondary" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 mb-12 flex flex-col items-center justify-center text-center opacity-80">
          <div className="flex items-center gap-2 mb-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary">
              <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
            </svg>
            <span className="text-lg font-bold tracking-widest uppercase">REDBEARD</span>
          </div>
          <p className="text-xs text-brand-secondary">Read More. Anywhere.</p>
          <p className="text-[10px] text-brand-secondary mt-1">v1.0.0</p>
        </div>

      </div>
    </div>
  );
}
