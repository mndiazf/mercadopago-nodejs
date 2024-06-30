import mercadopago from 'mercadopago';
import { MERCADOPAGO_API_KEY } from '../config.js';

mercadopago.configure({
  access_token: MERCADOPAGO_API_KEY,
});

export default mercadopago;
