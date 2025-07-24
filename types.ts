

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
  adminWhatsapp: string;
  adminWhatsapp2: string;
  orientationVideoUrl: string;
  callMeBotApiKey: string;
  pixKey: string;
  cnpj: string;
  logoBase64: string;
  pixQrBase64: string;
  modelImageRect22x10: string;
  modelImageRect30x14: string;
  modelImageQuadrada20x20: string;
  modelOval17x25: string;
  // Campos para sincronização com JSONBin.io
  jsonBinApiKey?: string;
  jsonBinBinId?: string;
}

export interface OrderTotals {
    subtotal: number;
    shippingCost: number;
    grandTotal: number;
}