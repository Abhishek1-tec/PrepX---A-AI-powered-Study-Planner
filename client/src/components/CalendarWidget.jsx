import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns';

const CalendarWidget = ({ onDateSelect, selectedDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day;
      days.push(
        <div
          key={day}
          onClick={() => onDateSelect(cloneDay)}
          className={`h-10 flex items-center justify-center text-sm font-bold rounded-lg cursor-pointer transition-all duration-300 hover:scale-110 ${
            isSameDay(cloneDay, selectedDate)
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg scale-110'
              : isSameMonth(day, monthStart)
              ? 'text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:shadow-md'
              : 'text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/30'
          }`}
        >
          {format(day, 'd')}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div key={`row-${day}`} className="grid grid-cols-7 gap-1">
        {days}
      </div>
    );
    days = [];
  }

  return (
    <div className="w-full max-w-xs rounded-3xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-800/50 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-lg gradient-text">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-300 hover:scale-110"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-300 hover:scale-110"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
            {day.slice(0, 1)}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="space-y-1">
        {rows}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Selected: <span className="font-bold text-gray-900 dark:text-white">{format(selectedDate, 'MMM d, yyyy')}</span>
        </p>
      </div>
    </div>
  );
};

export default CalendarWidget;
