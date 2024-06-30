import sql from 'mssql';

const config = {
  user: 'admin_mousecat',
  password: 'Holap12321x#',
  server: 'mousecat-server.database.windows.net',
  database: 'mousecat_database',
  options: {
    encrypt: false,
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
export { sql };
