import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

const DifficultyBadge = ({ level }) => {
  const colors = {
    easy: 'from-green-400 to-green-600',
    medium: 'from-amber-400 to-amber-600',
    hard: 'from-red-400 to-red-600',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${colors[level] || colors.medium}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
};

export default function Quiz() {
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !chapter.trim() || !topic.trim()) {
      toast.error('Fill subject, chapter, topic');
      return;
    }
    setLoading(true);
    try {
      const q = await api.post('/quiz/generate', { subject, chapter, topic, difficulty, count: 8 });
      const questions = q.questions || [];
      if (questions.length === 0) {
        toast.error('No questions were generated. Ensure OPENAI_API_KEY is set in server .env.');
        return;
      }
      setQuiz(q);
      setAnswers(questions.map(() => null));
      setSubmitted(null);
    } catch (err) {
      toast.error(err.message || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!quiz) return;
    try {
      const result = await api.post(`/quiz/${quiz._id}/submit`, { answers });
      setSubmitted(result);
      toast.success('Submitted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (submitted) {
    const percentage = ((submitted.obtainedMarks / submitted.totalMarks) * 100).toFixed(1);
    const isPassed = percentage >= 60;
    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 gradient-text">🎉 Quiz Result</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">Your performance summary</p>
        </div>

        {/* Result Card */}
        <div className={`rounded-3xl border-2 p-8 shadow-lg mb-8 animate-scale-in bg-gradient-to-br ${
          isPassed 
            ? 'border-green-300 dark:border-green-700 from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10' 
            : 'border-amber-300 dark:border-amber-700 from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10'
        }`}>
          <div className="text-center">
            <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {percentage}%
            </div>
            <div className="space-y-2 mb-6">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {submitted.obtainedMarks} / {submitted.totalMarks} Marks
              </p>
              <p className={`text-lg font-semibold ${isPassed ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isPassed ? '✓ PASSED' : '⏳ TRY AGAIN'}
              </p>
            </div>
            
            {/* Feedback Message */}
            <div className={`p-4 rounded-xl text-sm font-medium ${
              isPassed 
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' 
                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
            }`}>
              {isPassed 
                ? '🎊 Excellent! You have mastered this topic!' 
                : '💪 Keep practicing! You\'re getting better.'}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => { setQuiz(null); setSubmitted(null); }} 
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 animate-fade-in-up"
        >
          ← Take Another Quiz
        </button>
      </div>
    );
  }

  if (quiz?.questions?.length) {
    const answered = answers.filter(a => a !== null).length;
    return (
      <div className="max-w-3xl mx-auto">
        {/* Quiz Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white gradient-text">📝 {quiz.subject}</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">{quiz.topic}</p>
            </div>
            <DifficultyBadge level={difficulty} />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
            <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              {answered}/{quiz.questions.length} Answered
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 rounded-full h-2 bg-gray-200 dark:bg-gray-700 overflow-hidden animate-fade-in-up">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
            style={{ width: `${(answered / quiz.questions.length) * 100}%` }}
          />
        </div>

        {/* Questions */}
        <div className="space-y-6 mb-8">
          {quiz.questions.map((q, i) => (
            <div 
              key={i} 
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-md hover:shadow-lg transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {i + 1}
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white flex-1">{q.question}</p>
              </div>
              <div className="space-y-3 ml-12">
                {(q.options || []).map((opt, j) => (
                  <label 
                    key={j} 
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${
                      answers[i] === j
                        ? 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 border-2 border-blue-500 dark:border-blue-400'
                        : 'bg-gray-50 dark:bg-gray-700/30 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name={`q${i}`} 
                      checked={answers[i] === j} 
                      onChange={() => {
                        const a = [...answers];
                        a[i] = j;
                        setAnswers(a);
                      }}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <span className="text-gray-900 dark:text-white font-medium">{opt.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <button 
          onClick={submit} 
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:shadow-lg transition-all duration-300 hover:scale-105 animate-fade-in-up"
        >
          ✓ Submit Quiz ({answered}/{quiz.questions.length} answered)
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 gradient-text">🧠 AI Quiz Generator</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">Generate exam-pattern questions to test your knowledge</p>
      </div>

      {/* Info Card */}
      <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 animate-fade-in-up">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong className="block mb-2">⚙️ Setup Required:</strong>
          Configure <code className="bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">OPENAI_API_KEY</code> in your server environment to use AI-powered quiz generation.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={generate} className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-lg animate-scale-in">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quiz Parameters</h2>
        
        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Subject</label>
            <input 
              placeholder="e.g., Physics, Mathematics, Chemistry" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Chapter</label>
            <input 
              placeholder="e.g., Chapter 2: Motion" 
              value={chapter} 
              onChange={(e) => setChapter(e.target.value)} 
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Topic</label>
            <input 
              placeholder="e.g., Newton's Laws" 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)} 
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Difficulty Level</label>
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)} 
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="easy">🟢 Easy</option>
              <option value="medium">🟡 Medium</option>
              <option value="hard">🔴 Hard</option>
            </select>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed btn-glow"
        >
          {loading ? '⚙️ Generating...' : '🚀 Generate Quiz'}
        </button>
      </form>
    </div>
  );
}
