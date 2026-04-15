import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  IconHome,
  IconDashboard,
  IconTimetable,
  IconNotes,
  IconAnalytics,
  IconReminder,
  IconQuiz,
  IconFriends,
  IconSettings,
  IconLogout,
} from '../components/NavIcons';

function getInitials(fullName) {
  if (!fullName || typeof fullName !== 'string') return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

const nav = [
  { to: 'home', label: 'Home', Icon: IconHome },
  { to: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: 'timetable', label: 'Timetable', Icon: IconTimetable },
  { to: 'notes', label: 'Notes & PYQs', Icon: IconNotes },
  { to: 'analytics', label: 'Analytics', Icon: IconAnalytics },
  { to: 'reminder', label: 'Reminder', Icon: IconReminder },
  { to: 'quiz', label: 'Quiz', Icon: IconQuiz },
  { to: 'friends', label: 'Join Friends', Icon: IconFriends },
];

const bottomNav = [
  { to: 'settings', label: 'Settings', Icon: IconSettings },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col transition-all duration-200`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          {sidebarOpen && <span className="font-semibold text-indigo-600 dark:text-indigo-400">PrepX</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">≡</button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === 'home'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`
              }
            >
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 [&>svg]:shrink-0">
                <item.Icon />
              </span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 dark:border-gray-700 p-2 space-y-1">
          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`
              }
            >
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 [&>svg]:shrink-0">
                <item.Icon />
              </span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-4">
          <div />
          <div className="flex items-center gap-3">
            <NavLink to="/app/home" className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Home">
              <IconHome />
            </NavLink>
            <NavLink to="/app/account" className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center justify-center hover:ring-2 hover:ring-indigo-500 transition-all" title="Account">
              {getInitials(user?.fullName)}
            </NavLink>
            <button
              onClick={toggle}
              className="relative flex-shrink-0 w-12 h-7 rounded-full bg-gray-300 dark:bg-gray-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title={dark ? 'Switch to light' : 'Switch to dark'}
              aria-label="Toggle theme"
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center transition-all duration-300 ${dark ? 'left-1' : 'left-6'}`}>
                {dark ? (
                  <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                )}
              </span>
            </button>
            <button onClick={handleLogout} className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Logout">
              <IconLogout />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
