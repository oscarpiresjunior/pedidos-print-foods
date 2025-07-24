
export interface FormData {
  nome: string;
  whatsapp: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  quantity: number;
  sabores: string[];
}

export interface ProductDetails {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface AdminSettings {
  adminWhatsapp: string;
  adminWhatsapp2: string;
  orientationVideoUrl: string;
  callMeBotApiKey: string;
  pixKey: string;
  cnpj: string;
  logoBase64: string;
  pixQrBase64: string;
}

export interface OrderTotals {
    subtotal: number;
    shippingCost: number;
    grandTotal: number;
}