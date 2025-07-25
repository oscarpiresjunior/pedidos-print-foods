

export interface FormData {
  nome: string;
  whatsapp: string;
  email:string;
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
  id: number; // Primary key for Supabase, made required.
  admin_whatsapp: string;
  admin_whatsapp_2: string;
  orientation_video_url: string;
  call_me_bot_api_key: string;
  pix_key: string;
  cnpj: string;
  logo_url: string;
  pix_qr_url: string;
  model_image_url_rect_22x10: string;
  model_image_url_rect_30x14: string;
  model_image_url_quadrada_20x20: string;
  model_image_url_oval_17x25: string;
}

export interface OrderTotals {
    subtotal: number;
    shippingCost: number;
    grandTotal: number;
}

export interface Database {
  public: {
    Tables: {
      products: {
        Row: ProductDetails;
        Insert: ProductDetails;
        Update: Partial<ProductDetails>;
      };
      settings: {
        Row: AdminSettings;
        Insert: AdminSettings;
        Update: Partial<AdminSettings>;
      };
    };
    Views: {
      [_: string]: never;
    };
    Functions: {
      [_: string]: never;
    };
  };
}
