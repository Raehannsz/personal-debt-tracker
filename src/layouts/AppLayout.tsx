import { useEffect, useState, memo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ToastContainer, ConfirmDialogHost } from '../components/Feedback';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faMoneyBillWave,
  faUsers,
  faNetworkWired,
  faGear
} from '@fortawesome/free-solid-svg-icons';

// PERBAIKAN: Pisahkan useOnlineStatus ke komponen terpisah agar tidak re-render seluruh layout
function OnlineStatusBadge() {
  const [online, setOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;
  return (
    <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
      Offline
    </span>
  );
}

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: faChartLine, end: true },
  { to: '/hutang', label: 'Hutang', icon: faMoneyBillWave },
  { to: '/orang', label: 'Orang', icon: faUsers },
  { to: '/jaringan', label: 'Jaringan', icon: faNetworkWired },
  { to: '/settings', label: 'Settings', icon: faGear },
];

// PERBAIKAN: Memoize sidebar dan bottom nav agar tidak re-render saat state berubah
const Sidebar = memo(function Sidebar() {
  return (
    <aside className="hidden sm:flex sm:flex-col w-56 border-r border-slate-200 bg-white shrink-0">
      <div className="px-5 py-5 border-b border-slate-100">
        <h1 className="font-bold text-slate-800 leading-tight">
          Personal Debt <br /> Tracker
        </h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-400'
              }`
            }
          >
            <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
});

const BottomNav = memo(function BottomNav() {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-stretch">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
              isActive ? 'text-indigo-600' : 'text-slate-500'
            }`
          }
        >
          <FontAwesomeIcon icon={item.icon} className="text-base" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
});

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sm:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between">
          <h1 className="font-bold text-slate-800">Personal Debt Tracker</h1>
          <OnlineStatusBadge />
        </header>
        <main className="flex-1 pb-20 sm:pb-6">
          <div className="max-w-4xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
      <ToastContainer />
      <ConfirmDialogHost />
    </div>
  );
}