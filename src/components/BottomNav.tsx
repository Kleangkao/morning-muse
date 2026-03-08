import { NavLink, useLocation } from 'react-router-dom';
import { Sun, Bookmark, Settings } from 'lucide-react';

const tabs = [
  { to: '/', icon: Sun, label: 'Today' },
  { to: '/saved', icon: Bookmark, label: 'Saved' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.5} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
