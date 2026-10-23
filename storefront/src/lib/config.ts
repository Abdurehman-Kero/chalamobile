export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '')
  || 'https://chalamob-backend.onrender.com/api';

export const SHOP_PHONE: string = (import.meta.env.VITE_SHOP_PHONE as string | undefined) || '+251911720282';
export const SHOP_NAME = 'Chala Mobile';

// "+251911720282" -> "+251 911 720 282"
export const SHOP_PHONE_DISPLAY = SHOP_PHONE.replace(/^(\+251)(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3 $4');
