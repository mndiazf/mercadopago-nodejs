import { verificarUsuarioExistente } from '../repositories/user.repository.js';
import { verificarStock, actualizarStock } from '../repositories/product.repository.js';
import { guardarOrdenEnBaseDeDatos } from '../repositories/order.repository.js';
import { guardarPagoEnBaseDeDatos } from '../repositories/payment.repository.js';
import mercadopago from '../config/mercadopago.js';

const ordenesTemporales = new Map();

export const createOrder = async (items, user_id) => {
  const usuarioExiste = await verificarUsuarioExistente(user_id);

  if (!usuarioExiste) {
    throw new Error('El usuario no existe');
  }

  await verificarStock(items);

  const tempOrderId = `temp_order_${Date.now()}`;
  ordenesTemporales.set(tempOrderId, { items, user_id });

  // Configurar MercadoPago una vez
mercadopago.configure({
  access_token: "APP_USR-7135415648466462-061015-475f0b3cb50e927e7dfcfbd11ae0bc55-1850638629",
});

  const result = await mercadopago.preferences.create({
    items: items.map(item => ({
      id: item.id,
      title: item.title,
      unit_price: item.unit_price,
      currency_id: item.currency_id || 'CLP',
      quantity: item.quantity,
    })),
    notification_url: `https://mousecat.xyz:8444/webhook?orderId=${tempOrderId}`,
    back_urls: {
      success: 'https://gentle-dune-082b8f81e.5.azurestaticapps.net/#/home/',
    },
  });

  return result.body;
};

export const handleWebhook = async (query) => {
  const { orderId: tempOrderId } = query;

  if (query.type === 'payment') {
    const data = await mercadopago.payment.findById(query['data.id']);

    if (!data.body) {
      console.error('No body found in webhook data');
      return;
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
      order_id: tempOrderId,
      operation_id: data.body.id,
      order_type: data.body.order.type,
    };

    if (data.body.status === 'approved') {
      const orderDetails = ordenesTemporales.get(tempOrderId);

      if (orderDetails) {
        const { items, user_id } = orderDetails;
        const totalAmount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

        for (const item of items) {
          await actualizarStock(item.id, item.quantity);
        }

        const paymentId = await guardarPagoEnBaseDeDatos(relevantData);
        await guardarOrdenEnBaseDeDatos(user_id, items, totalAmount, paymentId);
        ordenesTemporales.delete(tempOrderId);
      } else {
        console.error('No order found in memory for the given orderId');
      }

      console.log('Payment approved:', relevantData);
      return relevantData;
    } else {
      console.log('Payment status is not approved:', relevantData);
    }
  } else {
    console.error('Unhandled webhook event:', query.type);
  }
};
