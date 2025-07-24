
import React, { useState, useMemo, useEffect } from 'react';
import { AdminSettings, FormData, ProductDetails } from './types';
import OrderForm from './OrderForm';
import SuccessPage from './SuccessPage';
import AdminPanel from './AdminPanel';
import { ADMIN_USERNAME, ADMIN_PASSWORD } from './config';

// Função utilitária para enviar WhatsApp via CallMeBot
const sendWhatsAppViaCallMeBot = async (message: string, adminPhoneNumber: string, apiKey: string): Promise<void> => {
  if (!apiKey || !adminPhoneNumber) {
    throw new Error("CallMeBot API Key ou número do admin não configurado.");
  }
  const phoneNumberOnlyDigits = adminPhoneNumber.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumberOnlyDigits}&text=${encodedMessage}&apikey=${apiKey}`;

  try {
    const response = await fetch(url, { method: 'GET' });
    if (response.ok) {
      console.log(`Mensagem do WhatsApp enviada para ${adminPhoneNumber} com sucesso!`);
    } else {
      const errorText = await response.text();
      console.error("Erro ao enviar mensagem via CallMeBot:", response.status, errorText);
      throw new Error(`Falha ao enviar notificação para ${adminPhoneNumber}. Resposta do serviço: ${errorText}`);
    }
  } catch (error) {
    console.error("Erro de rede ao tentar enviar mensagem via CallMeBot:", error);
    if (error instanceof Error && error.message.startsWith('Falha ao enviar')) {
      throw error; // Re-lança o erro específico
    }
    throw new Error(`Erro de rede ao enviar notificação para ${adminPhoneNumber}.`);
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
    quantity: 500, sabores: Array(500 / 100).fill(''),
  });

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
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
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('adminSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setAdminSettings(prev => ({ ...prev, ...parsedSettings }));
      } catch (error) {
        console.error("Falha ao analisar as configurações de administrador do localStorage", error);
      }
    }
  }, []);

  useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmissionStatus('submitting');
    setSubmissionError(null);

    const { quantity, sabores, nome, whatsapp, cep, logradouro, numero, bairro, cidade, estado } = formData;
    const { callMeBotApiKey, adminWhatsapp, adminWhatsapp2, pixKey, cnpj } = adminSettings;

    const numPackages = quantity / 100;
    const saboresList = sabores.slice(0, numPackages).map((s, i) => `  - Pacote ${i + 1}: ${s || 'N/A'}`).join('\n');
    const fullAddress = `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${estado}, CEP: ${cep}`;

    const adminMessage = `*Novo Pedido Print Foods*
*Cliente:* ${nome}
*Contato:* ${whatsapp}
*Pedido:* ${quantity}x ${editableProduct.name}
*Sabores:*
${saboresList}
*Total:* R$ ${grandTotal.toFixed(2)}
*Endereço:* ${fullAddress}`;

    try {
      if (!callMeBotApiKey || (!adminWhatsapp && !adminWhatsapp2)) {
        throw new Error("Notificação por WhatsApp não configurada. Administrador, verifique a chave da API do CallMeBot e os números de WhatsApp no painel.");
      }
      
      const adminPromises = [];
      if (adminWhatsapp) {
        adminPromises.push(sendWhatsAppViaCallMeBot(adminMessage, adminWhatsapp, callMeBotApiKey));
      }
      if (adminWhatsapp2) {
        adminPromises.push(sendWhatsAppViaCallMeBot(adminMessage, adminWhatsapp2, callMeBotApiKey));
      }

      if (adminPromises.length === 0) {
           throw new Error("Nenhum número de WhatsApp para notificação foi configurado pelo administrador.");
      }
      
      await Promise.all(adminPromises);

      // Envia confirmação para o cliente
      try {
        if(whatsapp && callMeBotApiKey){
            const pixInfo = pixKey || cnpj || "Chave PIX não configurada";
            const clientMessage = `Olá, ${nome}! Seu pedido na Print Foods foi recebido com sucesso! 🎉\n\n*Resumo do seu pedido:*\n- *Produto:* ${editableProduct.name}\n- *Quantidade:* ${quantity} unidades\n- *Valor Total:* R$ ${grandTotal.toFixed(2)}\n\nPara agilizar, você pode efetuar o pagamento via PIX e nos enviar o comprovante.\n\n*Nossa chave PIX:* ${pixInfo}\n\nEm breve nossa equipe entrará em contato. Obrigado!`;
            await sendWhatsAppViaCallMeBot(clientMessage, whatsapp, callMeBotApiKey);
        }
      } catch (clientError) {
        // Loga o erro mas não impede o fluxo. O importante é o admin receber.
        console.error("Falha ao enviar confirmação para o cliente via WhatsApp:", clientError);
      }
      
      setIsSubmitted(true);

    } catch (error) {
      const msg = (error instanceof Error) ? error.message : 'Ocorreu um erro desconhecido.';
      setSubmissionError(msg);
      setSubmissionStatus('error');
    }
  };

  const handleNewRegistration = () => {
    setFormData({
        nome: '', whatsapp: '', email: '',
        cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '',
        quantity: 500, sabores: Array(5).fill(''),
    });
    setIsSubmitted(false);
    setSubmissionStatus('idle');
    setSubmissionError(null);
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
    
    if (!callMeBotApiKey) {
        return { success: false, error: "API Key do CallMeBot não configurada." };
    }
    if (!adminWhatsapp && !adminWhatsapp2) {
        return { success: false, error: "Nenhum número de WhatsApp do administrador configurado." };
    }

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

  // Render Logic
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
        submissionError={submissionError}
        setSubmissionStatus={setSubmissionStatus}
        setSubmissionError={setSubmissionError}
        logoBase64={adminSettings.logoBase64}
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
