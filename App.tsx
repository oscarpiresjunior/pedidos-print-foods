
import React, { useState, useMemo, useEffect } from 'react';
import { AdminSettings, FormData, ProductDetails, EmailResult } from './types';
import OrderForm from './OrderForm';
import SuccessPage from './SuccessPage';
import AdminPanel from './AdminPanel';

// Funções utilitárias movidas para fora do componente para clareza
const sendWhatsAppViaCallMeBot = async (message: string, adminPhoneNumber: string, apiKey: string): Promise<void> => {
  if (!apiKey || !adminPhoneNumber) {
    console.warn("CallMeBot API Key ou número do admin não configurado. WhatsApp não enviado.");
    return;
  }
  const phoneNumberOnlyDigits = adminPhoneNumber.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumberOnlyDigits}&text=${encodedMessage}&apikey=${apiKey}`;

  try {
    const response = await fetch(url, { method: 'GET' });
    if (response.ok) console.log("Mensagem do WhatsApp enviada via CallMeBot com sucesso!");
    else console.error("Erro ao enviar mensagem via CallMeBot:", response.status, await response.text());
  } catch (error) {
    console.error("Erro de rede ao tentar enviar mensagem via CallMeBot:", error);
  }
};

const sendEmailViaEmailJS = async (
  serviceId: string,
  templateId: string,
  templateParams: Record<string, unknown>,
  publicKey: string
): Promise<EmailResult> => {
  if (!serviceId || !templateId || !publicKey) {
    const errorMessage = "Configurações do EmailJS (Service ID, Template ID, ou Public Key) incompletas.";
    console.warn(errorMessage);
    return { success: false, error: errorMessage };
  }
  if (typeof (window as any).emailjs === 'undefined') {
    const errorMessage = "SDK do EmailJS não carregado.";
    console.error(errorMessage);
    return { success: false, error: errorMessage };
  }
  try {
    await (window as any).emailjs.send(serviceId, templateId, templateParams, publicKey);
    return { success: true };
  } catch (error) {
    const errorText = (error instanceof Error) ? error.message : JSON.stringify(error);
    return { success: false, error: `Falha no envio: ${errorText}` };
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
    adminEmail: 'atendimento@printfoods.com.br',
    adminWhatsapp: '5522997146538',
    orientationVideoUrl: '',
    callMeBotApiKey: '',
    emailJsServiceId: '',
    emailJsTemplateIdAdmin: '',
    emailJsTemplateIdUser: '',
    emailJsPublicKey: '',
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

    const { quantity, sabores, nome, whatsapp, email, ...address } = formData;
    const { emailJsServiceId, emailJsTemplateIdAdmin, emailJsPublicKey, emailJsTemplateIdUser, callMeBotApiKey, adminWhatsapp, orientationVideoUrl, adminEmail, cnpj, pixKey } = adminSettings;

    const numPackages = quantity / 100;
    const saboresList = sabores.slice(0, numPackages).map((s, i) => `Pacote ${i + 1}: ${s || 'N/A'}`).join('\n');
    const fullAddress = `${address.logradouro}, ${address.numero} - ${address.bairro}, ${address.cidade} - ${address.estado}, CEP: ${address.cep}`;
    const pixToDisplay = pixKey || cnpj;

    try {
      const adminParams = {
        ...formData,
        product_name: editableProduct.name,
        quantity_text: `${quantity} unidades (${numPackages} pacotes)`,
        sabores_list: saboresList,
        full_address: fullAddress,
        subtotal: subtotal.toFixed(2),
        shipping_cost: shippingCost.toFixed(2),
        grand_total: grandTotal.toFixed(2),
        reply_to: email,
      };
      const adminResult = await sendEmailViaEmailJS(emailJsServiceId, emailJsTemplateIdAdmin, adminParams, emailJsPublicKey);
      if (!adminResult.success) throw new Error(`Falha ao notificar admin. Detalhe: ${adminResult.error}`);

      const userParams = {
        ...adminParams,
        user_recipient_email: email,
        orientation_video_url: orientationVideoUrl,
        admin_whatsapp_contact: adminWhatsapp,
        admin_reply_to_email: adminEmail,
        company_cnpj: cnpj,
        pix_key_info: pixToDisplay,
      };
      const userResult = await sendEmailViaEmailJS(emailJsServiceId, emailJsTemplateIdUser, userParams, emailJsPublicKey);
      if (!userResult.success) throw new Error(`Falha ao enviar confirmação ao cliente. Detalhe: ${userResult.error}`);

      const whatsappMessage = `Novo Pedido: ${quantity}x ${editableProduct.name} por ${nome}. Total: R$${grandTotal.toFixed(2)}. Contato: ${whatsapp}`;
      if (callMeBotApiKey && adminWhatsapp) {
        await sendWhatsAppViaCallMeBot(whatsappMessage, adminWhatsapp, callMeBotApiKey);
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
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin';
    if (adminCredentials.username === adminUser && adminCredentials.password === adminPass) {
      setIsAdminView(true);
      setShowAdminLoginModal(false);
      setAdminLoginError(null);
      setAdminCredentials({ username: '', password: '' });
    } else {
      setAdminLoginError('Usuário ou senha inválidos.');
    }
  };

  const handleTestEmail = async () => {
    const { emailJsServiceId, emailJsTemplateIdAdmin, emailJsPublicKey, adminEmail } = adminSettings;
    const testParams = {
        product_name: "E-mail de Teste",
        sabores_list: "Teste de configuração do EmailJS.",
        user_name: "Sistema Print Foods",
        reply_to: adminEmail,
    };
    return await sendEmailViaEmailJS(emailJsServiceId, emailJsTemplateIdAdmin, testParams, emailJsPublicKey);
  };

  // Render Logic
  if (isAdminView) {
    return (
      <AdminPanel
        adminSettings={adminSettings}
        setAdminSettings={setAdminSettings}
        editableProduct={editableProduct}
        setEditableProduct={setEditableProduct}
        onTestEmail={handleTestEmail}
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
