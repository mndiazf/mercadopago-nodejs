import { Router } from 'express';
import { createOrderController, receiveWebhookController } from '../controllers/payment.controller.js';

const router = Router();

router.post('/create-order', createOrderController);
router.post('/webhook', receiveWebhookController);
router.get('/success', (req, res) => res.send('Success'));

export default router;
