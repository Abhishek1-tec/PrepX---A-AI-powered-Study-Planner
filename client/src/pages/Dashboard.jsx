import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Use useNavigate instead

export default function Dashboard() {
  const navigate = useNavigate(); // ✅ Use this for navigation

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-600 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">
          📚 PrepX Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Timetable Card */}
          <button
            onClick={() => navigate('/dashboard/timetable')} // ✅ Use navigate
            className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 text-left"
          >
            <div className="text-4xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Timetable</h2>
            <p className="text-gray-600">Manage your study schedule with AI-generated timetables</p>
          </button>

          {/* Other cards */}
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics</h2>
            <p className="text-gray-600">Track your study progress and performance</p>
          </div>
        </div>
      </div>
    </div>
  );
}
