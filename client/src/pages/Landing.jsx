import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  { title: 'AI Timetable', desc: 'Smart daily schedule with weak-topic rescheduling' },
  { title: 'Smart Focus Mode', desc: 'Fullscreen study with violation detection' },
  { title: 'Topic Tests', desc: 'MCQs and AI-evaluated short answers' },
  { title: 'Parent Monitoring', desc: 'Read-only analytics and weekly email reports' },
  { title: 'Analytics', desc: 'Study hours, focus score trend, consistency' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">PrepX</h1>
          <nav className="flex gap-4">
            <Link to="/login" className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Login</Link>
            <Link to="/signup" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Sign Up</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-16">
        <section className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">PrepX</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            Exam-focused, discipline-oriented study platform with parent monitoring. No feature is usable without login.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/signup" className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700">Get Started</Link>
            <Link to="/login" className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Login</Link>
          </div>
        </section>
        <section>
          <h3 className="text-2xl font-semibold mb-6 text-center">Features</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">{f.title}</h4>
                <p className="text-gray-600 dark:text-gray-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
        <p className="text-center text-gray-500 dark:text-gray-400 mt-12">English · Hindi (expandable)</p>
      </main>
    </div>
  );
}
