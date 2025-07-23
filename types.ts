
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
  adminEmail: string;
  adminWhatsapp: string;
  orientationVideoUrl: string;
  callMeBotApiKey: string;
  emailJsServiceId: string;
  emailJsTemplateIdAdmin: string;
  emailJsTemplateIdUser: string;
  emailJsPublicKey: string;
  pixKey: string;
  cnpj: string;
  logoBase64: string;
  pixQrBase64: string;
}

export interface EmailResult {
  success: boolean;
  error?: any;
}

export interface OrderTotals {
    subtotal: number;
    shippingCost: number;
    grandTotal: number;
}
