import { createOrder, handleWebhook } from '../services/order.service.js';

export const createOrderController = async (req, res) => {
  try {
    if (!req.body || !req.body.items || !req.body.user_id) {
      return res.status(400).json({ message: 'Items and user_id must be provided' });
    }

    const { items, user_id } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items must be an array' });
    }

    const result = await createOrder(items, user_id);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something goes wrong' });
  }
};

export const receiveWebhookController = async (req, res) => {
  try {
    const result = await handleWebhook(req.query);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something goes wrong' });
  }
};
