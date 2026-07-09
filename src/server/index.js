import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { connectDB } from '../db/connection.js';
import apiRouter from './routes/api.js';

config();

process.on('unhandledRejection', (err) => {
  console.warn('Unhandled rejection (caught):', err.message);
});
process.on('uncaughtException', (err) => {
  console.warn('Uncaught exception (caught):', err.message);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('web-dashboard'));

app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'web-dashboard' });
});

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`QRNG Dashboard: http://localhost:${PORT}`);
    console.log(`API:            http://localhost:${PORT}/api`);
    console.log(`Status:         http://localhost:${PORT}/api/status`);
  });
}

start();

export default app;
