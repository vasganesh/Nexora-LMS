import 'dotenv/config';
import { startDatabase } from './lib/db.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth.js';
import academicRoutes from './routes/academic.js';
import courseRoutes from './routes/course.js';
import quizRoutes from './routes/quiz.js';
import assignmentRoutes from './routes/assignment.js';
import progressRoutes from './routes/progress.js';
import tutorRoutes from './routes/tutor.js';
import uploadRoutes from './routes/upload.js';
import liveClassRoutes from './routes/live-class.js';
import notificationRoutes from './routes/notification.js';
import learnerStateRoutes from './routes/learner-state.js';
import interactionRoutes from './routes/interactions.js';
import adaptiveRoutes from './routes/adaptive.js';
import interventionRoutes from './routes/intervention.js';

// Start the database if it is not already running
await startDatabase();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use((req, res, next) => {
  console.log(`[server] [request] ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'eduverse-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api', academicRoutes);
app.use('/api', courseRoutes);
app.use('/api', quizRoutes);
app.use('/api', assignmentRoutes);
app.use('/api', progressRoutes);
app.use('/api', tutorRoutes);
app.use('/api', liveClassRoutes);
app.use('/api', uploadRoutes);
app.use('/api', notificationRoutes);
app.use('/api/learner-state', learnerStateRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/adaptive', adaptiveRoutes);
app.use('/api/interventions', interventionRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`EduVerse API running at http://localhost:${port}/api`);
});
