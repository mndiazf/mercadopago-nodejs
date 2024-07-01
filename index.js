import express from 'express';
import morgan from 'morgan';
import path from 'path';
import cors from 'cors';
import paymentRoutes from './routes/payment.routes.js';
import { connectToDatabase } from './config/database.js';
import fs from 'fs';
import https from 'https';

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

// Archivos estáticos
app.use(express.static(path.resolve('src/public')));

// Conexión a la base de datos
connectToDatabase().catch(err => console.error('Failed to connect to database', err));

// Opciones para HTTPS
const httpsOptions = {
  key: fs.readFileSync('./mousecat.xyz.key'), // Ruta al archivo de clave en la carpeta raíz
  cert: fs.readFileSync('./mousecat.xyz.cert')  // Ruta al archivo de certificado en la carpeta raíz
};

// Crear servidor HTTPS en el puerto 8444
https.createServer(httpsOptions, app).listen(8444, () => {
  console.log('Servidor HTTPS corriendo en el puerto 8444');
});

// Opcional: redireccionar HTTP a HTTPS
const httpApp = express();
httpApp.use((req, res, next) => {
  if (!req.secure) {
    return res.redirect('https://' + req.headers.host.replace(/:80$/, ':8444') + req.url);
  }
  next();
});

httpApp.listen(80, () => {
  console.log('Servidor HTTP corriendo en el puerto 80 y redirigiendo a HTTPS');
});
