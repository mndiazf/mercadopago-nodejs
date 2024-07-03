import express from 'express';
import morgan from 'morgan';
import path from 'path';
import cors from 'cors';
import paymentRoutes from './routes/payment.routes.js';
import { connectToDatabase } from './config/database.js';

// Crea una instancia de Express
const app = express();

// Configura CORS para aceptar cualquier origen
app.use(cors({
  origin: '*',  // Permite cualquier origen
  methods: ['GET', 'POST'],
}));

// Middlewares
app.use(express.json());
app.use(morgan('dev'));

// Rutas
app.use(paymentRoutes);


// Conexión a la base de datos
connectToDatabase().catch(err => console.error('Failed to connect to database', err));

// Escuchar HTTP en el puerto 3000
app.listen(3000, () => {
  console.log('Servidor HTTP corriendo en el puerto 3000');
});
