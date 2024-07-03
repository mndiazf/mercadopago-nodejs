import { getPool, sql } from '../config/database.js';

export const verificarStock = async (items) => {
  const pool = getPool();
  const errores = [];

  for (const item of items) {
    const query = `
      SELECT stock
      FROM producto
      WHERE id_producto = @idProducto;
    `;
    
    const result = await pool.request()
      .input('idProducto', sql.BigInt, item.id)
      .query(query);

    const stockDisponible = result.recordset[0]?.stock;

    if (stockDisponible === undefined) {
      errores.push(`Producto con id ${item.id} no encontrado.`);
    } else if (item.quantity > stockDisponible) {
      errores.push(`Stock insuficiente para el producto ${item.title}. Disponible: ${stockDisponible}, Solicitado: ${item.quantity}`);
    }
  }

  if (errores.length > 0) {
    throw new Error(errores.join(' '));
  }
};

export const actualizarStock = async (idProducto, cantidad) => {
  const pool = getPool();
  const query = `
    UPDATE producto
    SET stock = stock - @cantidad
    WHERE id_producto = @idProducto;
  `;

  await pool.request()
    .input('idProducto', sql.BigInt, idProducto)
    .input('cantidad', sql.Int, cantidad)
    .query(query);
};
