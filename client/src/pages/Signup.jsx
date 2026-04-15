import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const PREP_TYPES = ['Board', 'JEE', 'JEE Advanced', 'NEET'];

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [step1, setStep1] = useState({ fullName: '', email: '', parentName: '', parentEmail: '', password: '' });
  const [step2, setStep2] = useState({ class: '', preparationType: 'Board', subjectNames: ['', '', '', '', ''] });

  const handleStep1 = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { token, user } = await api.post('/auth/signup/step1', step1);
      login(token, user);
      setStep(2);
    } catch (err) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    const subjects = Array.isArray(step2.subjectNames)
  ? step2.subjectNames
      .map(s => String(s || '').trim())
      .filter(Boolean)
  : [];
    if (subjects.length < 1) {
      toast.error('Enter at least one subject');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/signup/step2', { class: step2.class, preparationType: step2.preparationType, subjectNames: subjects });
      const me = await api.get('/users/me');
      const token = localStorage.getItem('token');
      login(token, me);
      navigate('/app/home', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">Sign Up</h1>
        <p className="text-center text-sm text-gray-500 mb-6">Step {step} of 2</p>
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <input placeholder="Full Name" value={step1.fullName} onChange={(e) => setStep1({ ...step1, fullName: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" required />
            <input type="email" placeholder="Email" value={step1.email} onChange={(e) => setStep1({ ...step1, email: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" required />
            <input placeholder="Parent Name" value={step1.parentName} onChange={(e) => setStep1({ ...step1, parentName: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" required />
            <input type="email" placeholder="Parent Email (must be different)" value={step1.parentEmail} onChange={(e) => setStep1({ ...step1, parentEmail: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" required />
            <input type="password" placeholder="Password (min 6)" value={step1.password} onChange={(e) => setStep1({ ...step1, password: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" required minLength={6} />
            <button type="submit" disabled={loading} className="w-full py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50">Next</button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <input placeholder="Class" value={step2.class} onChange={(e) => setStep2({ ...step2, class: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" required />
            <div>
              <label className="block text-sm font-medium mb-1">Preparation Type</label>
              <select value={step2.preparationType} onChange={(e) => setStep2({ ...step2, preparationType: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                {PREP_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subjects (up to 5)</label>
              {[0, 1, 2, 3, 4].map((i) => (
                <input key={i} placeholder={`Subject ${i + 1}`} value={step2.subjectNames[i] || ''} onChange={(e) => {
                  const arr = [...step2.subjectNames];
                  arr[i] = e.target.value;
                  setStep2({ ...step2, subjectNames: arr });
                }} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 mt-1" />
              ))}
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50">Complete Sign Up</button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
