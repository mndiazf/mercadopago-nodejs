import mercadopago from 'mercadopago';
import { MERCADOPAGO_API_KEY } from '../config.js';
import { getPool, connectToDatabase, sql } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

// Configurar MercadoPago una vez
mercadopago.configure({
  access_token: MERCADOPAGO_API_KEY,
});

// Variable para almacenar órdenes temporales en memoria
const ordenesTemporales = new Map();

async function verificarStock(items) {
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
}

async function actualizarStock(idProducto, cantidad) {
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
}

async function guardarPagoEnBaseDeDatos(relevantData) {
  const pool = getPool();
  const query = `
    INSERT INTO payment (
      status, status_detail, date_approved, payment_method_id, payment_method_type,
      transaction_amount, payer_email, payer_id, order_id, order_type
    ) VALUES (
      @status, @status_detail, @date_approved, @payment_method_id, @payment_method_type,
      @transaction_amount, @payer_email, @payer_id, @order_id, @order_type
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
    .input('order_id', sql.VarChar, relevantData.order_id) // Cambiado a VarChar
    .input('order_type', sql.VarChar, relevantData.order_type)
    .query(query);

  return result.recordset[0].id;
}

async function guardarOrdenEnBaseDeDatos(userId, items, totalAmount, paymentId) {
  const pool = getPool();
  const orderQuery = `
    INSERT INTO [order] (
      order_date, user_id, total_amount, payment_id, order_status_id
    ) VALUES (
      GETDATE(), @user_id, @total_amount, @payment_id, 1
    );
    SELECT SCOPE_IDENTITY() AS id;
  `;

  const orderResult = await pool.request()
    .input('user_id', sql.BigInt, userId)
    .input('total_amount', sql.Decimal, totalAmount)
    .input('payment_id', sql.BigInt, paymentId)
    .query(orderQuery);

  const orderId = orderResult.recordset[0].id;

  const orderItemQuery = `
    INSERT INTO order_item (
      order_id, producto_id, quantity, price
    ) VALUES (
      @order_id, @producto_id, @quantity, @price
    );
  `;

  for (const item of items) {
    await pool.request()
      .input('order_id', sql.Int, orderId)
      .input('producto_id', sql.BigInt, item.id)
      .input('quantity', sql.Int, item.quantity)
      .input('price', sql.Decimal, item.unit_price)
      .query(orderItemQuery);
  }
}

async function verificarUsuarioExistente(userId) {
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
}

export const createOrder = async (req, res) => {
  try {
    if (!req.body || !req.body.items || !req.body.user_id) {
      return res.status(400).json({ message: 'Items and user_id must be provided' });
    }

    const { items, user_id } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items must be an array' });
    }

    const usuarioExiste = await verificarUsuarioExistente(user_id);

    if (!usuarioExiste) {
      return res.status(400).json({ message: 'El usuario no existe' });
    }

    try {
      await verificarStock(items);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const orderId = uuidv4(); // Generar un UUID para la orden
    ordenesTemporales.set(orderId, { items, user_id });

    const result = await mercadopago.preferences.create({
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        unit_price: item.unit_price,
        currency_id: item.currency_id || 'CLP',
        quantity: item.quantity,
      })),
      notification_url: `https://e370-201-188-214-54.ngrok-free.app/webhook?orderId=${orderId}`,
      back_urls: {
        success: 'http://localhost:4200/',
      },
    });

    res.json(result.body);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something goes wrong' });
  }
};

export const receiveWebhook = async (req, res) => {
  try {
    const { query } = req;
    const { orderId } = query;

    if (query.type === 'payment') {
      const data = await mercadopago.payment.findById(query['data.id']);

      console.log(data.body);

      if (!data.body) {
        console.error('No body found in webhook data');
        return res.sendStatus(204);
      }

      const relevantData = {
        status: data.body.status,
        status_detail: data.body.status_detail,
        date_approved: data.body.date_approved,
        payment_method_id: data.body.payment_method.id,
        payment_method_type: data.body.payment_method.type,
        transaction_amount: data.body.transaction_amount,
        payer_email: data.body.payer.email,
        payer_id: data.body.payer.id,
        order_id: orderId, // Usar el UUID generado
        order_type: data.body.order.type,
      };

      if (data.body.status === 'approved') {
        const orderDetails = ordenesTemporales.get(orderId);

        if (orderDetails) {
          const { items, user_id } = orderDetails;
          const totalAmount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

          for (const item of items) {
            await actualizarStock(item.id, item.quantity);
          }

          const paymentId = await guardarPagoEnBaseDeDatos(relevantData);  // Guardar los datos del pago y obtener el ID del pago
          await guardarOrdenEnBaseDeDatos(user_id, items, totalAmount, paymentId);  // Guardar la orden con el ID del pago
          ordenesTemporales.delete(orderId);
        } else {
          console.error('No order found in memory for the given orderId');
        }
      }

      console.log(relevantData);
      return res.status(200).json({ ...relevantData });
    }

    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something goes wrong' });
  }
};

connectToDatabase().catch(err => console.error('Failed to connect to database', err));
