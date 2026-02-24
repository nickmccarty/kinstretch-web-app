import { Link, useLocation } from 'react-router-dom';

const tabs = [
  { label: 'Dashboard', path: '/' },
  { label: 'Webcam', path: '/webcam' },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="h-14 bg-surface-light border-b border-surface-lighter flex items-center px-6 shrink-0">
      <Link to="/" className="text-brand-400 font-bold text-lg tracking-tight mr-8">
        KINSTRETCH
      </Link>
      <nav className="flex gap-1">
        {tabs.map((tab) => {
          const active = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                active
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-surface-lighter'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white">
          D
        </div>
      </div>
    </header>
  );
}
