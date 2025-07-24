import React, { useState, useMemo, useEffect } from 'react';
import { AdminSettings, FormData, ProductDetails } from './types';
import OrderForm from './OrderForm';
import SuccessPage from './SuccessPage';
import AdminPanel from './AdminPanel';
import { ADMIN_USERNAME, ADMIN_PASSWORD } from './config';

// Função utilitária para enviar WhatsApp via CallMeBot
const sendWhatsAppViaCallMeBot = async (message: string, phoneNumber: string, apiKey: string): Promise<void> => {
  if (!apiKey || !phoneNumber) {
    throw new Error("CallMeBot API Key ou número de telefone não configurado.");
  }
  const phoneNumberOnlyDigits = phoneNumber.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumberOnlyDigits}&text=${encodedMessage}&apikey=${apiKey}`;

  try {
    // Usando 'no-cors' para evitar problemas de CORS que podem ser interpretados como erros de rede.
    // A chamada é "dispare e esqueça", assumindo que funciona se não houver um erro de rede real.
    await fetch(url, { method: 'GET', mode: 'no-cors' });
    console.log(`Tentativa de envio de mensagem do WhatsApp para ${phoneNumber} efetuada.`);
  } catch (error) {
    console.error("Erro de rede ao tentar enviar mensagem via CallMeBot:", error);
    // Propaga o erro para que a função chamadora (como o botão de teste) saiba da falha.
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

  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    adminWhatsapp: '5522997146538',
    adminWhatsapp2: '',
    orientationVideoUrl: '',
    callMeBotApiKey: '',
    pixKey: 'beaf7a1f-df15-4695-aa30-593c46629de7',
    cnpj: '',
    logoBase64: '',
    pixQrBase64: '',
    modelImageRect22x10Base64: '',
    modelImageRect30x14Base64: '',
    modelImageQuadrada20x20Base64: '',
    modelImageOval17x25Base64: '',
    jsonBinApiKey: '',
    jsonBinBinId: '',
    imgbbApiKey: '',
  });

  useEffect(() => {
    const loadInitialSettings = async () => {
      let localSettings: Partial<AdminSettings> = {};
      const savedSettingsString = localStorage.getItem('adminSettings');
      if (savedSettingsString) {
        try {
          localSettings = JSON.parse(savedSettingsString);
          setAdminSettings(prev => ({ ...prev, ...localSettings }));
        } catch (e) {
          console.error("Falha ao analisar as configurações de administrador do localStorage", e);
        }
      }

      const binId = localSettings.jsonBinBinId;
      const apiKey = localSettings.jsonBinApiKey;

      if (binId && apiKey) {
        console.log("Credenciais JSONBin encontradas. Tentando carregar da nuvem...");
        try {
          const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
            method: 'GET',
            headers: { 'X-Access-Key': apiKey },
          });
          if (!response.ok) {
            throw new Error(`Erro na rede: ${response.statusText}`);
          }
          const data = await response.json();
          const cloudSettings = data.record;
          
          // Mantém as chaves locais caso não venham da nuvem, garantindo que não sejam perdidas.
          cloudSettings.jsonBinBinId = binId;
          cloudSettings.jsonBinApiKey = apiKey;
          // Mantém a chave do imgbb se não vier da nuvem, para não perdê-la.
          if (!cloudSettings.imgbbApiKey && localSettings.imgbbApiKey) {
            cloudSettings.imgbbApiKey = localSettings.imgbbApiKey;
          }

          console.log("Configurações carregadas da nuvem com sucesso.");
          setAdminSettings(prev => ({ ...prev, ...cloudSettings }));
          // Atualiza o localStorage com os dados frescos da nuvem.
          localStorage.setItem('adminSettings', JSON.stringify(cloudSettings));

        } catch (error) {
          console.error("Não foi possível buscar as configurações do JSONBin.io. Usando a versão local.", error);
        }
      }
    };
    
    loadInitialSettings();
  }, []);

  useEffect(() => {
    // Este efeito persiste qualquer mudança no localStorage.
    // Essencial para salvar as chaves quando inseridas no painel.
    try {
      localStorage.setItem('adminSettings', JSON.stringify(adminSettings));
    } catch (error) {
      console.error("Falha ao salvar as configurações de administrador no localStorage", error);
    }
  }, [adminSettings]);

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
  
  useEffect(() => {
    if (!isSubmitted) return;

    const sendNotifications = async () => {
      const { quantity, flavorDetails, nome, whatsapp, cep, logradouro, numero, bairro, cidade, estado, model } = formData;
      const { callMeBotApiKey, adminWhatsapp, adminWhatsapp2, pixKey, cnpj } = adminSettings;

      const saboresList = flavorDetails.map(f => `  - ${f.quantity}x de ${f.name || 'Sabor não definido'}`).join('\n');
      const fullAddress = `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${estado}, CEP: ${cep}`;

      const adminMessage = `*Novo Pedido Print Foods*
*Cliente:* ${nome}
*Contato:* ${whatsapp}
*Modelo:* ${model}
*Pedido:* ${quantity}x ${editableProduct.name}
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
            const clientMessage = `Olá, ${nome}! Seu pedido na Print Foods foi recebido com sucesso! 🎉\n\n*Resumo do seu pedido:*\n- *Produto:* ${editableProduct.name}\n- *Modelo:* ${model}\n- *Quantidade:* ${quantity} unidades\n- *Valor Total:* R$ ${grandTotal.toFixed(2)}\n\nPara agilizar, você pode efetuar o pagamento via PIX e nos enviar o comprovante.\n\n*Nossa chave PIX:* ${pixInfo}\n\nEm breve nossa equipe entrará em contato. Obrigado!`;
            await sendWhatsAppViaCallMeBot(clientMessage, whatsapp, callMeBotApiKey);
        }
      } catch (clientError) {
        console.error("Falha ao enviar confirmação para o cliente:", clientError);
      }
    };

    sendNotifications();
  }, [isSubmitted, formData, adminSettings, grandTotal, editableProduct.name]);

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