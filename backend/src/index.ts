import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import './db'; // Initialize DB + seed admin
import authRoutes     from './routes/auth';
import accountRoutes  from './routes/accounts';
import campaignRoutes from './routes/campaigns';
import adminRoutes    from './routes/admin';
import leadsRoutes    from './routes/leads';
import inboxRoutes    from './routes/inbox';
import sendRoutes     from './routes/send';
import dashboardRoutes from './routes/dashboard';

import { startCronService } from './cron';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',      authRoutes);
app.use('/api/accounts',  accountRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/leads',     leadsRoutes);
app.use('/api/inbox',     inboxRoutes);
app.use('/api/send',      sendRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.listen(port, () => {
  console.log(`MailSender API running on port ${port}`);
  startCronService(); // Start the background scheduler
});
