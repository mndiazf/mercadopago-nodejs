import express from 'express';
import morgan from 'morgan';
import path from 'path';
import cors from 'cors';
import paymentRoutes from './routes/payment.routes.js';
import { connectToDatabase } from './config/database.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json());
app.use(morgan('dev'));
app.use(paymentRoutes);
app.use(express.static(path.resolve('src/public')));

connectToDatabase().catch(err => console.error('Failed to connect to database', err));

app.listen(3000, () => {
  console.log('Server on port', 3000);
});