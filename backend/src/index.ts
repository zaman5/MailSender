import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MailSender API is running' });
});

// Future routes will be mounted here
// app.use('/api/auth', authRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
