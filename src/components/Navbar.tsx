import React from 'react';
import { Home, FolderDown, Cloud, Settings } from 'lucide-react';

export type TabType = 'home' | 'downloads' | 'drive' | 'settings';

interface NavbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  downloadCount: number;
  driveConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  downloadCount,
  driveConnected,
}) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    {
      id: 'downloads' as TabType,
      label: 'Downloads',
      icon: FolderDown,
      badge: downloadCount > 0 ? downloadCount : undefined,
    },
    {
      id: 'drive' as TabType,
      label: 'Drive',
      icon: Cloud,
      dot: driveConnected,
    },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl bg-[#080a10]/85 border-t border-white/[0.08] px-4 py-2 pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-transform duration-200 ${
                    isActive ? 'scale-110 drop-shadow-[0_2px_10px_rgba(59,130,246,0.6)]' : ''
                  }`}
                />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {tab.badge}
                  </span>
                )}
                {tab.dot && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#080a10]" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 w-8 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
