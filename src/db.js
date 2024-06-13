// db.js
import sql from 'mssql';

const config = {
  user: 'sa',
  password: 'Secret123!',
  server: 'localhost',
  database: 'mousecatDB',
  options: {
    encrypt: false, // Si estás utilizando SQL Server en Windows, puede que necesites desactivar el cifrado.
    enableArithAbort: true,
  },
};

const pool = new sql.ConnectionPool(config);

pool.on('error', err => {
  console.error('SQL pool error', err);
});

export const connectToDatabase = async () => {
  try {
    await pool.connect();
    console.log('Connected to SQL Server');
  } catch (err) {
    console.error('Database connection failed', err);
    throw err;
  }
};

export const getPool = () => pool;
export { sql }; // Exportamos sql para poder usarlo en otros archivos
