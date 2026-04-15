# PrepX

Exam-focused, discipline-oriented study platform with parent monitoring.

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, React Router, Recharts, Axios, React Hot Toast
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT (email + password; Student & Parent roles)
- **Storage:** Firebase Storage (optional) or local `server/uploads`
- **AI:** OpenAI API (evaluation, quiz/topic test generation, parent remark)
- **Email:** Nodemailer (weekly parent report on Sunday)

## Features

- **Landing:** Intro, feature highlights, Login / Sign Up (no feature without login)
- **Auth:** 2-step signup (profile + class/subjects), login with role (Student / Parent)
- **Student dashboard:** Home, Dashboard, Timetable, Notes & PYQs, Analytics, Reminder, Quiz, Join Friends, Settings
- **Timetable:** Card-based slots; Start → Smart Focus Mode
- **Smart Focus Mode:** Fullscreen, no right-click, sidebar disabled; violations (tab switch, blur, fullscreen exit) → warning then session reset; focus score 0–100
- **Topic completion test:** MCQs + AI-evaluated short answers; ≥65% = complete; optional after each focus session
- **Weak topic auto-replan:** Incomplete / &lt;65% topics get higher priority and revision slots in timetable
- **Streak:** Increases only with min study time + test submitted + ≤1 violation; break after 2 days no study; 1 grace day per month
- **Quiz:** Subject / chapter / topic / difficulty → AI-generated exam-pattern questions
- **Notes & PYQs:** Upload PDF/images, topic tagging; sharing only with accepted friends; “Shared with Me”; view/download
- **Friends:** Unique ID, send/accept requests; no chat
- **Analytics:** Daily/weekly hours, subject performance, focus trend; parent read-only overview
- **Weekly parent email:** Every Sunday: study hours, complete/incomplete sessions, weak subjects, focus score, AI remark
- **i18n:** English; Hindi (expandable via Settings)

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- (Optional) OpenAI API key, Firebase project, SMTP for email

## Environment Setup

1. Copy `.env.example` to `.env` in the project root.
2. Set at minimum:
   - `MONGODB_URI` – e.g. `mongodb://localhost:27017/prepx`
   - `JWT_SECRET` – strong secret for production
   - `OPENAI_API_KEY` – for AI evaluation and quiz/topic test generation
3. Optional: Firebase Storage vars, SMTP vars for weekly parent email.

## Run Instructions

### Install dependencies

```bash
npm run install:all
```

This installs root, client, and server dependencies.

### Development

Terminal 1 (API):

```bash
npm run server
```

Server runs at `http://localhost:5000`. Uses `--watch` for reload.

Terminal 2 (frontend):

```bash
npm run client
```

Client runs at `http://localhost:5173` and proxies `/api` to the server.

Or run both with:

```bash
npm run dev
```

### Production build

```bash
npm run build
npm start
```

Serve the client build (e.g. from `client/dist`) with any static host; point it to the same API origin or set `CLIENT_URL` and CORS accordingly.

## API Routes (overview)

| Area        | Method | Path (prefix `/api`) |
|------------|--------|-----------------------|
| Auth       | POST   | `/auth/signup/step1`, `/auth/signup/step2`, `/auth/login` |
| Users      | GET    | `/users/me` |
| Users      | PATCH  | `/users/me` (student) |
| Users      | GET    | `/users/linked-students` (parent) |
| Timetable  | GET    | `/timetable?date=` |
| Timetable  | PATCH  | `/timetable/:id/slots/:slotIndex/complete` |
| Timetable  | POST   | `/timetable/regenerate` |
| Focus      | POST   | `/focus/start`, `/focus/:id/violation`, `/focus/:id/end` |
| Focus      | GET    | `/focus/sessions`, `/focus/focus-score/weekly` |
| Tests      | GET    | `/tests/generate?subject=&topic=` |
| Tests      | POST   | `/tests` |
| Tests      | GET    | `/tests` (list) |
| Quiz       | POST   | `/quiz/generate`, `/quiz/:id/submit` |
| Quiz       | GET    | `/quiz`, `/quiz/:id` |
| Notes      | POST   | `/notes/upload` (multipart) |
| Notes      | GET    | `/notes`, `/notes/shared-with-me` |
| Notes      | POST   | `/notes/:id/share`, `/notes/shared/:refId/save` |
| Notes      | DELETE | `/notes/:id` |
| Friends    | GET    | `/friends/my-id`, `/friends/requests`, `/friends/list` |
| Friends    | POST   | `/friends/send-request`, `/friends/accept/:id` |
| Reminders  | GET/POST | `/reminders` |
| Reminders  | PATCH  | `/reminders/:id/complete` |
| Reminders  | DELETE | `/reminders/:id` |
| Analytics  | GET    | `/analytics/me`, `/analytics/student/:id` (parent) |
| Streak     | GET    | `/streak` |

## Database (MongoDB)

Collections (Mongoose models in `server/src/models/`):

- **User** – email, password (hashed), role (student/parent), profile, parent link, uniqueId (student)
- **Timetable** – userId, date, slots (subject, topic, duration, priority, completed)
- **FocusSession** – userId, subject, topic, violations, focusScore, status (active/completed/incomplete/reset)
- **Test** – userId, focusSessionId, subject, topic, mcqs, shortAnswers, percentage, topicComplete
- **Quiz** – userId, subject, chapter, topic, questions, submittedAt
- **Note** – userId, title, fileUrl, subject, topic, sharedWith
- **SharedNoteRef** – ownerId, noteId, sharedWithUserId
- **Friend** – fromUserId, toUserId, status (pending/accepted)
- **Streak** – userId, currentStreak, longestStreak, lastStudyDate, graceDaysUsedThisMonth
- **Reminder** – userId, title, dueAt, completed

## Security & privacy

- Passwords hashed with bcrypt.
- JWT for API auth; parent has read-only access to linked students.
- Sharing only between accepted friends; only Notes & PYQs (no chat/links/videos).
- No placeholder or fake logic; production-ready structure with env-based config.

## License

Private / educational use as desired.
