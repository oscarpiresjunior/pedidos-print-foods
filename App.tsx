
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AdminSettings, FormData, ProductDetails } from './types';
import OrderForm from './OrderForm';
import SuccessPage from './SuccessPage';
import AdminPanel from './AdminPanel';
import { ADMIN_USERNAME, ADMIN_PASSWORD, SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// Função utilitária para enviar WhatsApp via CallMeBot
const sendWhatsAppViaCallMeBot = async (message: string, phoneNumber: string, apiKey: string): Promise<void> => {
  if (!apiKey || !phoneNumber) {
    throw new Error("CallMeBot API Key ou número de telefone não configurado.");
  }
  const phoneNumberOnlyDigits = phoneNumber.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumberOnlyDigits}&text=${encodedMessage}&apikey=${apiKey}`;

  try {
    await fetch(url, { method: 'GET', mode: 'no-cors' });
    console.log(`Tentativa de envio de mensagem do WhatsApp para ${phoneNumber} efetuada.`);
  } catch (error) {
    console.error("Erro de rede ao tentar enviar mensagem via CallMeBot:", error);
    throw new Error(`Erro de rede ao enviar notificação para ${phoneNumber}.`);
  }
};

const App: React.FC = () => {
  const [editableProduct, setEditableProduct] = useState<ProductDetails>({
    id: 'etiquetas_comestiveis',
    name: 'Etiquetas Comestíveis Personalizadas',
    description: 'Etiquetas personalizadas com o sabor à sua escolha para aplicar nos seus crepes.\nDesconto exclusivo de 20% para alunas do curso Minha Fábrica de Crepes.',
    price: 25.21,
  });
  
  const [formData, setFormData] = useState<FormData>({
    nome: '', whatsapp: '', email: '',
    cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '',
    model: '',
    quantity: 500,
    flavorDetails: [],
  });

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting'>('idle');
  
  const [isAdminView, setIsAdminView] = useState<boolean>(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);
  const [adminCredentials, setAdminCredentials] = useState({ username: '', password: '' });
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    adminWhatsapp: '5522997146538',
    adminWhatsapp2: '',
    orientationVideoUrl: '',
    callMeBotApiKey: '',
    pixKey: 'beaf7a1f-df15-4695-aa30-593c46629de7',
    cnpj: '',
    logoUrl: '',
    pixQrUrl: '',
    modelImageUrlRect22x10: '',
    modelImageUrlRect30x14: '',
    modelImageUrlQuadrada20x20: '',
    modelImageUrlOval17x25: '',
  });

  useEffect(() => {
    // Inicializa o cliente Supabase com credenciais do arquivo de configuração
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      setSupabase(client);
    } else {
      console.warn("Supabase URL e Chave Anon não estão configuradas no arquivo config.ts. A sincronização de dados estará desativada.");
    }
  }, []);
  
  useEffect(() => {
    // Carrega dados do Supabase assim que o cliente estiver pronto
    const loadDataFromSupabase = async () => {
      if (!supabase) return;
      
      console.log("Cliente Supabase pronto. Carregando dados...");

      // Carrega configurações
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (settingsError) {
        console.error("Erro ao carregar configurações do Supabase:", settingsError.message);
      } else if (settingsData) {
        console.log("Configurações carregadas do Supabase.");
        setAdminSettings(settingsData as AdminSettings);
      }

      // Carrega produto
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', 'etiquetas_comestiveis')
        .single();
        
      if (productError) {
        console.error("Erro ao carregar produto do Supabase:", productError.message);
      } else if (productData) {
        console.log("Produto carregado do Supabase.");
        setEditableProduct(productData as ProductDetails);
      }
    };
    
    loadDataFromSupabase();
  }, [supabase]);

  const subtotal = useMemo(() => (formData.quantity / 100) * editableProduct.price, [formData.quantity, editableProduct.price]);
  const shippingCost = useMemo(() => {
    if (!formData.estado) return 0;
    const specialStates = ['RJ', 'SP', 'MG', 'ES'];
    return specialStates.includes(formData.estado) ? 25 : 35;
  }, [formData.estado]);
  const grandTotal = useMemo(() => subtotal + shippingCost, [subtotal, shippingCost]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmissionStatus('submitting');
    setIsSubmitted(true);
  };

  const sendNotifications = useCallback(async () => {
    const { quantity, flavorDetails, nome, whatsapp, cep, logradouro, numero, bairro, cidade, estado, model } = formData;
    const { callMeBotApiKey, adminWhatsapp, adminWhatsapp2, pixKey, cnpj } = adminSettings;
    const { name: productName } = editableProduct;

    const saboresList = flavorDetails.map(f => `  - ${f.quantity}x de ${f.name || 'Sabor não definido'}`).join('\n');
    const fullAddress = `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${estado}, CEP: ${cep}`;

    const adminMessage = `*Novo Pedido Print Foods*
*Cliente:* ${nome}
*Contato:* ${whatsapp}
*Modelo:* ${model}
*Pedido:* ${quantity}x ${productName}
*Sabores:*
${saboresList}
*Total:* R$ ${grandTotal.toFixed(2)}
*Endereço:* ${fullAddress}`;

    if (!callMeBotApiKey || (!adminWhatsapp && !adminWhatsapp2)) {
      console.error("Notificação por WhatsApp não configurada.");
      return;
    }
    
    const adminPromises = [];
    if (adminWhatsapp) adminPromises.push(sendWhatsAppViaCallMeBot(adminMessage, adminWhatsapp, callMeBotApiKey));
    if (adminWhatsapp2) adminPromises.push(sendWhatsAppViaCallMeBot(adminMessage, adminWhatsapp2, callMeBotApiKey));
    
    try {
      await Promise.all(adminPromises.map(p => p.catch(e => e)));
      console.log("Tentativas de notificação para administradores concluídas.");
    } catch (error) {
       console.error("Erro ao enviar notificações para administradores:", error);
    }

    try {
      if(whatsapp && callMeBotApiKey){
          const pixInfo = pixKey || cnpj || "Chave PIX não configurada";
          const clientMessage = `Olá, ${nome}! Seu pedido na Print Foods foi recebido com sucesso! 🎉\n\n*Resumo do seu pedido:*\n- *Produto:* ${productName}\n- *Quantidade:* ${quantity} unidades\n- *Valor Total:* R$ ${grandTotal.toFixed(2)}\n\nPara agilizar, você pode efetuar o pagamento via PIX e nos enviar o comprovante.\n\n*Nossa chave PIX:* ${pixInfo}\n\nEm breve nossa equipe entrará em contato. Obrigado!`;
          await sendWhatsAppViaCallMeBot(clientMessage, whatsapp, callMeBotApiKey);
      }
    } catch (clientError) {
      console.error("Falha ao enviar confirmação para o cliente:", clientError);
    }
  }, [formData, adminSettings, grandTotal, editableProduct]);

  useEffect(() => {
    if (isSubmitted) {
      sendNotifications();
    }
  }, [isSubmitted, sendNotifications]);

  const handleNewRegistration = () => {
    setFormData({
        nome: '', whatsapp: '', email: '',
        cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '',
        model: '',
        quantity: 500, 
        flavorDetails: [],
    });
    setIsSubmitted(false);
    setSubmissionStatus('idle');
  };
  
  const handleAdminLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (adminCredentials.username === ADMIN_USERNAME && adminCredentials.password === ADMIN_PASSWORD) {
      setIsAdminView(true);
      setShowAdminLoginModal(false);
      setAdminLoginError(null);
      setAdminCredentials({ username: '', password: '' });
    } else {
      setAdminLoginError('Usuário ou senha inválidos.');
    }
  };

  const handleTestWhatsapp = async (): Promise<{ success: boolean; error?: string }> => {
    const { callMeBotApiKey, adminWhatsapp, adminWhatsapp2 } = adminSettings;
    const testMessage = "Esta é uma mensagem de teste do sistema de pedidos da Print Foods.";
    
    if (!callMeBotApiKey) return { success: false, error: "API Key do CallMeBot não configurada." };
    if (!adminWhatsapp && !adminWhatsapp2) return { success: false, error: "Nenhum WhatsApp do administrador configurado." };

    try {
        const promises = [];
        if (adminWhatsapp) promises.push(sendWhatsAppViaCallMeBot(testMessage, adminWhatsapp, callMeBotApiKey));
        if (adminWhatsapp2) promises.push(sendWhatsAppViaCallMeBot(testMessage, adminWhatsapp2, callMeBotApiKey));
        
        await Promise.all(promises);
        return { success: true };
    } catch (error) {
        const msg = (error instanceof Error) ? error.message : 'Ocorreu um erro desconhecido.';
        return { success: false, error: msg };
    }
  };

  if (isAdminView) {
    return (
      <AdminPanel
        adminSettings={adminSettings}
        setAdminSettings={setAdminSettings}
        editableProduct={editableProduct}
        setEditableProduct={setEditableProduct}
        onTestWhatsapp={handleTestWhatsapp}
        onExitAdmin={() => setIsAdminView(false)}
        supabase={supabase}
      />
    );
  }

  if (isSubmitted) {
    return (
      <SuccessPage
        formData={formData}
        adminSettings={adminSettings}
        orderTotals={{ subtotal, shippingCost, grandTotal }}
        productName={editableProduct.name}
        onNewOrder={handleNewRegistration}
      />
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-sans">
      <OrderForm
        formData={formData}
        setFormData={setFormData}
        editableProduct={editableProduct}
        orderTotals={{ subtotal, shippingCost, grandTotal }}
        handleSubmit={handleSubmit}
        submissionStatus={submissionStatus}
        adminSettings={adminSettings}
      />
      <footer className="text-center mt-8">
        <button onClick={() => setShowAdminLoginModal(true)} className="text-sm text-gray-400 hover:text-blue-600 transition-colors">
          Acesso Administrativo
        </button>
      </footer>
      
      {showAdminLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Login Administrativo</h2>
            <form onSubmit={handleAdminLoginSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">Usuário</label>
                <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="username" type="text" name="username" value={adminCredentials.username} onChange={e => setAdminCredentials({...adminCredentials, username: e.target.value})} />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Senha</label>
                <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" id="password" type="password" name="password" value={adminCredentials.password} onChange={e => setAdminCredentials({...adminCredentials, password: e.target.value})} />
                {adminLoginError && <p className="text-red-500 text-xs italic">{adminLoginError}</p>}
              </div>
              <div className="flex items-center justify-between">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="submit">Entrar</button>
                <button className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800" type="button" onClick={() => setShowAdminLoginModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
