import { getPool, sql } from '../config/database.js';

export const verificarUsuarioExistente = async (userId) => {
  const pool = getPool();
  const query = `
    SELECT id
    FROM dbo.[user]
    WHERE id = @userId;
  `;

  const result = await pool.request()
    .input('userId', sql.BigInt, userId)
    .query(query);

  return result.recordset.length > 0;
};
