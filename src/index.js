import express from "express";
import morgan from "morgan";
import path from "path";
import cors from 'cors';
import paymentRoutes from "./routes/payment.routes.js";

const app = express();



app.use(cors({
  origin: 'http://localhost:4200', // Permite solicitudes desde tu servidor Angular
  methods: ['GET', 'POST'],
}));


// Middleware para parsear JSON
app.use(express.json());

// Middleware para registrar peticiones
app.use(morgan("dev"));

// Rutas
app.use(paymentRoutes);

// Servir archivos estáticos
app.use(express.static(path.resolve("src/public")));

app.listen(3000, () => {
  console.log("Server on port", 3000);
});
