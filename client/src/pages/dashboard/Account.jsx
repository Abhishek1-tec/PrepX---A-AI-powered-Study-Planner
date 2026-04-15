import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

function getInitials(fullName) {
  if (!fullName || typeof fullName !== 'string') return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

const Row = ({ icon, label, value }) => (
  <div className="flex items-start gap-4 py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
      {icon}
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-gray-900 dark:text-gray-100 font-medium mt-0.5">{value || '—'}</p>
    </div>
  </div>
);

const IconUser = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>);
const IconMail = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>);
const IconUsers = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>);
const IconBook = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>);
const IconBadge = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>);
const IconCamera = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const IconEdit = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>);

export default function Account() {
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [isEditingEducation, setIsEditingEducation] = useState(false);
  const [educationData, setEducationData] = useState({
    class: user?.class || '',
    preparationType: user?.preparationType || '',
    subjectNames: user?.subjectNames?.join(', ') || '',
  });

  if (!user) return null;

  const isStudent = user.role === 'student';
  const subjectsText = (user.subjectNames && user.subjectNames.length) ? user.subjectNames.join(', ') : null;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
        // TODO: Send to backend to save
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEducationChange = (field, value) => {
    setEducationData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEducation = async () => {
    try {
      const subjects = educationData.subjectNames
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class: educationData.class,
          preparationType: educationData.preparationType,
          subjectNames: subjects,
        }),
      });
      
      if (response.ok) {
        setIsEditingEducation(false);
        window.location.reload(); // Refresh to show updated data
      }
    } catch (error) {
      console.error('Failed to update education details:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10 animate-fade-in-up">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 gradient-text">⚙️ Account Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">Manage your profile and study information</p>
      </div>

      {/* Profile Card */}
      <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-800/50 p-8 shadow-lg mb-8 animate-scale-in">
        <div className="text-center">
          <div className="relative inline-flex w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-4xl font-bold items-center justify-center shadow-2xl ring-4 ring-indigo-200 dark:ring-indigo-900/50 mb-6">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(user.fullName)
            )}
            <label className="absolute bottom-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg rounded-full p-3 cursor-pointer transition-all duration-300 hover:scale-110 btn-glow">
              <IconCamera />
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">{user.fullName || 'Account'}</h2>
          {isStudent && user.uniqueId && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-600"></span>
              User ID: <span className="font-bold text-indigo-600 dark:text-indigo-400">{user.uniqueId}</span>
            </p>
          )}
        </div>
      </div>

      {/* Personal Info */}
      <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">👤 Personal Information</h3>
        </div>
        <div className="px-6 divide-y divide-gray-100 dark:divide-gray-700">
          <Row icon={<IconUser />} label="Full name" value={user.fullName} />
          <Row icon={<IconMail />} label="Email address" value={user.email} />
        </div>
      </div>

      {/* Parent Info */}
      {isStudent && (
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden mb-8 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">👨‍👩‍👦 Parent / Guardian</h3>
          </div>
          <div className="px-6 divide-y divide-gray-100 dark:divide-gray-700">
            <Row icon={<IconUsers />} label="Parent name" value={user.parentName} />
            <Row icon={<IconMail />} label="Parent email" value={user.parentEmail} />
          </div>
        </div>
      )}

      {/* Education Info */}
      {isStudent && (
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden mb-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">📚 Study Details</h3>
            {!isEditingEducation && (
              <button 
                onClick={() => setIsEditingEducation(true)} 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 text-sm btn-glow"
              >
                <IconEdit /> Edit
              </button>
            )}
          </div>
          <div className="px-6 divide-y divide-gray-100 dark:divide-gray-700">
            {!isEditingEducation ? (
              <>
                <Row icon={<IconBook />} label="Class/Grade" value={user.class} />
                <Row icon={<IconBadge />} label="Preparation Type" value={user.preparationType} />
                <Row icon={<IconBook />} label="Subjects" value={subjectsText} />
              </>
            ) : (
              <div className="py-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">📖 Class/Grade</label>
                  <input 
                    type="text" 
                    value={educationData.class} 
                    onChange={(e) => handleEducationChange('class', e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="e.g., 12th Grade"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">🎯 Preparation Type</label>
                  <select 
                    value={educationData.preparationType} 
                    onChange={(e) => handleEducationChange('preparationType', e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select preparation type</option>
                    <option value="Board">Board</option>
                    <option value="JEE">JEE</option>
                    <option value="JEE Advanced">JEE Advanced</option>
                    <option value="NEET">NEET</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">📚 Subjects (comma-separated)</label>
                  <textarea 
                    value={educationData.subjectNames} 
                    onChange={(e) => handleEducationChange('subjectNames', e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    rows="3"
                    placeholder="e.g., Physics, Chemistry, Mathematics"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <button 
                    onClick={() => setIsEditingEducation(false)} 
                    className="px-5 py-2.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveEducation} 
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 btn-glow"
                  >
                    ✓ Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* More Settings Link */}
      <div className="text-center animate-fade-in-up" style={{ animationDelay: '250ms' }}>
        <Link 
          to="/app/settings" 
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105 btn-glow"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Language & Theme Settings
        </Link>
      </div>
    </div>
  );
}
