'use client';

import { useState, useEffect } from 'react';
import { DownloadCloud, Info, ChevronRight, HardDrive, ExternalLink, ArrowLeft } from 'lucide-react';
import { AndroidDownloadQueueView } from './AndroidDownloadQueueView';
import { Browser } from '@capacitor/browser';
import packageJson from '../../../package.json';
import { nativeUserId } from '@/components/native/NativeInitializer';

export function AndroidMoreView() {
  const [currentScreen, setCurrentScreen] = useState<'main' | 'downloads' | 'storage' | 'about'>('main');

  useEffect(() => {
    const onBackPress = (e: Event) => {
      if (currentScreen !== 'main') {
        e.preventDefault();
        setCurrentScreen('main');
      }
    };
    document.addEventListener('hardwareBackPress', onBackPress);
    return () => document.removeEventListener('hardwareBackPress', onBackPress);
  }, [currentScreen]);

  if (currentScreen === 'downloads') {
    return <AndroidDownloadQueueView onBack={() => setCurrentScreen('main')} />;
  }

  if (currentScreen === 'storage') {
    return <AndroidStorageView onBack={() => setCurrentScreen('main')} />;
  }

  if (currentScreen === 'about') {
    return <AboutView onBack={() => setCurrentScreen('main')} />;
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#0B0D10] pt-[env(safe-area-inset-top,0px)] text-gray-100">
      <header className="flex h-14 items-center justify-between px-4 border-b border-white/5 bg-[#0B0D10]/95 backdrop-blur-md">
        <h1 className="text-[22px] font-black tracking-tight leading-none uppercase">
          <span className="text-[#E5092F]">RED</span><span className="text-white">BEARD</span>
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        
        <div className="flex flex-col items-center justify-center pt-2 pb-1">
           <span className="text-[10px] font-bold tracking-[0.25em] text-[#E5092F] uppercase">Read • Explore • Enjoy</span>
        </div>

        <div>
          <h2 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 ml-1">Library & Storage</h2>
          <div className="rounded-2xl border border-white/5 bg-[#141517] shadow-lg overflow-hidden">
            <MoreItem icon={<DownloadCloud className="h-[22px] w-[22px]" />} label="Download Queue" onClick={() => setCurrentScreen('downloads')} />
            <div className="h-[1px] w-full bg-white/5 ml-[60px]" />
            <MoreItem icon={<HardDrive className="h-[22px] w-[22px]" />} label="Storage" onClick={() => setCurrentScreen('storage')} />
          </div>
        </div>

        <div>
          <h2 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 ml-1">About</h2>
          <div className="rounded-2xl border border-white/5 bg-[#141517] shadow-lg overflow-hidden">
            <MoreItem icon={<Info className="h-[22px] w-[22px]" />} label="About REDBEARD" onClick={() => setCurrentScreen('about')} />
            <div className="h-[1px] w-full bg-white/5 ml-[60px]" />
            <MoreItem 
              icon={<ExternalLink className="h-[22px] w-[22px]" />} 
              label="Website" 
              onClick={async () => {
                await Browser.open({ url: 'https://redbeard.store' });
              }} 
            />
          </div>
        </div>

      </div>
    </div>
  );
}

import { AndroidStorageView } from './AndroidStorageView';

function AboutView({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#0B0D10] pt-[env(safe-area-inset-top,0px)] pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
      <header className="flex h-14 items-center gap-4 px-4 border-b border-white/5 bg-[#0B0D10]/95 backdrop-blur-md">
        <button onClick={onBack} className="rounded-full p-2 -ml-2 active:bg-neutral-800 transition-colors">
          <ArrowLeft className="h-6 w-6 text-white" />
        </button>
        <h1 className="text-[20px] font-bold text-white tracking-tight">About</h1>
      </header>
      <div className="flex-1 p-8 flex flex-col items-center justify-center -mt-20">
         <h1 className="text-[40px] font-black uppercase tracking-tighter leading-none mb-3">
            <span className="text-[#E5092F]">RED</span><span className="text-white">BEARD</span>
         </h1>
         <span className="px-3 py-1 bg-[#141517] border border-white/5 rounded-full text-[12px] font-bold text-neutral-400 tracking-wider mb-6 shadow-md">
           VERSION {packageJson.version}
         </span>
         <p className="text-neutral-500 text-sm text-center max-w-[260px] leading-relaxed">
            The premium destination for manga and manhwa reading.
         </p>
      </div>
    </div>
  );
}

function MoreItem({ 
  icon, 
  label, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full text-left flex items-center justify-between p-4 hover:bg-[#1A1C1F] active:bg-[#1C1D20] transition-colors group">
      <div className="flex items-center gap-4">
        <div className="text-neutral-400 group-active:text-[#E5092F] transition-colors flex items-center justify-center h-10 w-10 rounded-full bg-[#1C1D20] group-active:bg-[#E5092F]/10">{icon}</div>
        <span className="font-semibold text-[16px] text-white group-active:text-[#E5092F] transition-colors">{label}</span>
      </div>
      <ChevronRight className="h-5 w-5 text-neutral-600 group-active:text-[#E5092F] transition-colors" />
    </button>
  );
}
