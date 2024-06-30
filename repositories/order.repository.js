import { getPool, sql } from '../config/database.js';
import moment from 'moment-timezone';

export const guardarOrdenEnBaseDeDatos = async (userId, items, totalAmount, paymentId) => {
  const pool = getPool();
  const chileDate = moment.tz('America/Santiago').toDate();  // Convertimos a objeto Date

  const orderQuery = `
    INSERT INTO [order] (order_date, user_id, total_amount, payment_id, order_status_id)
    VALUES (@order_date, @user_id, @total_amount, @payment_id, 1);
    SELECT SCOPE_IDENTITY() AS id;
  `;

  const orderResult = await pool.request()
    .input('order_date', sql.DateTime, chileDate)
    .input('user_id', sql.BigInt, userId)
    .input('total_amount', sql.Decimal, totalAmount)
    .input('payment_id', sql.BigInt, paymentId)
    .query(orderQuery);

  const orderId = orderResult.recordset[0].id;

  const orderItemQuery = `
    INSERT INTO order_item (order_id, producto_id, quantity, price)
    VALUES (@order_id, @producto_id, @quantity, @price);
  `;

  for (const item of items) {
    await pool.request()
      .input('order_id', sql.BigInt, orderId)
      .input('producto_id', sql.BigInt, item.id)
      .input('quantity', sql.Int, item.quantity)
      .input('price', sql.Decimal, item.unit_price)
      .query(orderItemQuery);
  }
};
