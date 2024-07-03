import { getPool, sql } from '../config/database.js';

export const guardarPagoEnBaseDeDatos = async (relevantData) => {
  const pool = getPool();
  const query = `
    INSERT INTO payment (
      status, status_detail, date_approved, payment_method_id, payment_method_type,
      transaction_amount, payer_email, payer_id, operation_id, order_id, order_type
    ) VALUES (
      @status, @status_detail, @date_approved, @payment_method_id, @payment_method_type,
      @transaction_amount, @payer_email, @payer_id, @operation_id, @order_id, @order_type
    );
    SELECT SCOPE_IDENTITY() AS id;
  `;

  const result = await pool.request()
    .input('status', sql.VarChar, relevantData.status)
    .input('status_detail', sql.VarChar, relevantData.status_detail)
    .input('date_approved', sql.DateTime, relevantData.date_approved)
    .input('payment_method_id', sql.VarChar, relevantData.payment_method_id)
    .input('payment_method_type', sql.VarChar, relevantData.payment_method_type)
    .input('transaction_amount', sql.Decimal, relevantData.transaction_amount)
    .input('payer_email', sql.VarChar, relevantData.payer_email)
    .input('payer_id', sql.VarChar, relevantData.payer_id)
    .input('order_id', sql.VarChar, relevantData.order_id)
    .input('operation_id', sql.VarChar, relevantData.operation_id.toString())
    .input('order_type', sql.VarChar, relevantData.order_type)
    .query(query);

  return result.recordset[0].id;
};
