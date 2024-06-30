const express = require('express');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');

// Para importar archivos locales, asegúrate de especificar la extensión .js si es necesario y usar require
const paymentRoutes = require('./routes/payment.routes.js');
const { connectToDatabase } = require('./config/database.js');


const app = express();

app.use(cors({
  origin: 'http://localhost:4200',
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
