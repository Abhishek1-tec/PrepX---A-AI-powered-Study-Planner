import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DashboardLayout from './layout/DashboardLayout';
import Home from './pages/dashboard/Home';
import Dashboard from './pages/dashboard/Dashboard';
import Timetable from './pages/dashboard/Timetable';
import Notes from './pages/dashboard/Notes';
import Analytics from './pages/dashboard/Analytics';
import Reminder from './pages/dashboard/Reminder';
import Quiz from './pages/dashboard/Quiz';
import Friends from './pages/dashboard/Friends';
import Settings from './pages/dashboard/Settings';
import Account from './pages/dashboard/Account';
import ParentDashboard from './pages/ParentDashboard';
import ErrorBoundary from './components/ErrorBoundary';

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'parent' ? '/parent' : '/'} replace />;
  return children;
}

export default function App() {
  const { dark } = useTheme();
  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/parent" element={<PrivateRoute role="parent"><ParentDashboard /></PrivateRoute>} />
        <Route path="/app" element={<PrivateRoute role="student"><DashboardLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="notes" element={<Notes />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reminder" element={<ErrorBoundary><Reminder /></ErrorBoundary>} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="friends" element={<Friends />} />
          <Route path="account" element={<Account />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
