

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
  model: string;
  quantity: number;
  flavorDetails: { name: string; quantity: number }[];
}

export interface ProductDetails {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface AdminSettings {
  id?: number; // Primary key for Supabase
  adminWhatsapp: string;
  adminWhatsapp2: string;
  orientationVideoUrl: string;
  callMeBotApiKey: string;
  pixKey: string;
  cnpj: string;
  logoUrl: string;
  pixQrUrl: string;
  modelImageUrlRect22x10: string;
  modelImageUrlRect30x14: string;
  modelImageUrlQuadrada20x20: string;
  modelImageUrlOval17x25: string;
}

export interface OrderTotals {
    subtotal: number;
    shippingCost: number;
    grandTotal: number;
}
