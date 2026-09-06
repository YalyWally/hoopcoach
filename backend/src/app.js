// The core Express app — no listen()/timer here so it can be reused by both
// the local dev entrypoint (server.js) and the Netlify serverless function
// (netlify/functions/api.js). Routes are mounted at their bare paths (no
// leading /api); whichever entrypoint loads this app is responsible for
// putting it behind an /api prefix (see server.js and the Netlify function).
import 'express-async-errors'; // makes Express 4 forward rejected promises from async handlers to the error middleware
import express from 'express';
import cors from 'cors';
import playersRouter from './routes/players.js';
import assessmentRouter from './routes/assessment.js';
import workoutsRouter from './routes/workouts.js';
import nutritionRouter from './routes/nutrition.js';
import chatRouter from './routes/chat.js';
import mealplanRouter from './routes/mealplan.js';
import groceryRouter from './routes/grocery.js';
import scanRouter from './routes/scan.js';
import calendarRouter from './routes/calendar.js';
import pushRouter from './routes/push.js';
import foodRouter from './routes/food.js';
import { aiEnabled } from './lib/claude.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

app.get('/health', (req, res) => res.json({ ok: true, aiEnabled }));

app.use('/players', playersRouter);
app.use('/', assessmentRouter);
app.use('/', workoutsRouter);
app.use('/', nutritionRouter);
app.use('/', chatRouter);
app.use('/', mealplanRouter);
app.use('/', groceryRouter);
app.use('/', scanRouter);
app.use('/', calendarRouter);
app.use('/', pushRouter);
app.use('/', foodRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'internal error' });
});

export default app;
