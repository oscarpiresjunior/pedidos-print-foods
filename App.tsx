
import React, { useState, useMemo, useEffect } from 'react';

interface FormData {
  nome: string;
  whatsapp: string;
  email: string;
  estado: string; // Estado para entrega
  sabores: string[];
  quantity: number; // Total de unidades
}

interface ProductDetails {
  id: string;
  name: string;
  description: string;
  price: number; // Preço por pacote de 100 unidades
}

interface AdminSettings {
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
}

const MINIMUM_UNITS = 500;
const UNITS_PER_PACKAGE = 100;
const OLD_PRICE = 31.52; // Preço original para exibição

// Produto único e fixo
const mainProduct: ProductDetails = {
  id: 'etiquetas_comestiveis',
  name: 'Etiquetas Comestíveis Personalizadas',
  description: 'Etiquetas personalizadas com o sabor à sua escolha para aplicar nos seus crepes.\nDesconto exclusivo de 20% para alunas do curso Minha Fábrica de Crepes.',
  price: 25.21, // Preço com desconto
};

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

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
    if (response.ok) {
      console.log("Mensagem do WhatsApp enviada via CallMeBot com sucesso!");
    } else {
      const errorText = await response.text();
      console.error("Erro ao enviar mensagem via CallMeBot:", response.status, errorText);
    }
  } catch (error) {
    console.error("Erro de rede ao tentar enviar mensagem via CallMeBot:", error);
  }
};

const sendEmailViaEmailJS = async (
  serviceId: string,
  templateId: string,
  templateParams: Record<string, unknown>,
  publicKey: string
): Promise<void> => {
  if (!serviceId || !templateId || !publicKey) {
    console.warn("Configurações do EmailJS (Service ID, Template ID, ou Public Key) incompletas. E-mail não enviado.");
    return;
  }
  if (typeof (window as any).emailjs === 'undefined') {
    console.error("SDK do EmailJS não carregado. Verifique se o script foi adicionado ao index.html.");
    return;
  }

  try {
    await (window as any).emailjs.send(serviceId, templateId, templateParams, publicKey);
    console.log(`E-mail enviado com sucesso usando o template ${templateId} via EmailJS.`);
  } catch (error) {
    console.error(`Erro ao enviar e-mail com o template ${templateId} via EmailJS:`, error);
  }
};


const App: React.FC = () => {
  // O produto agora é editável apenas no admin
  const [editableProduct, setEditableProduct] = useState<ProductDetails>(mainProduct);

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    whatsapp: '',
    email: '',
    estado: '',
    quantity: MINIMUM_UNITS,
    sabores: Array(MINIMUM_UNITS / UNITS_PER_PACKAGE).fill(''),
  });
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

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
    pixKey: '',
    cnpj: '',
  });

  // Load settings from localStorage on initial render
  useEffect(() => {
    const savedSettings = localStorage.getItem('adminSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        // Merge with defaults to ensure all keys are present
        setAdminSettings(prev => ({ ...prev, ...parsedSettings }));
      } catch (error) {
        console.error("Failed to parse admin settings from localStorage", error);
      }
    }
  }, []); // Empty dependency array means this runs once on mount

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('adminSettings', JSON.stringify(adminSettings));
    } catch (error) {
      console.error("Failed to save admin settings to localStorage", error);
    }
  }, [adminSettings]); // This runs whenever adminSettings changes

  const subtotal = useMemo(() => {
    const numPackages = formData.quantity / UNITS_PER_PACKAGE;
    return numPackages * editableProduct.price;
  }, [formData.quantity, editableProduct.price]);

  const shippingCost = useMemo(() => {
    if (!formData.estado) return 0;
    const specialStates = ['RJ', 'SP', 'MG', 'ES'];
    return specialStates.includes(formData.estado) ? 25 : 35;
  }, [formData.estado]);

  const grandTotal = useMemo(() => subtotal + shippingCost, [subtotal, shippingCost]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newQuantity = parseInt(e.target.value, 10);

    // Na saída do campo, garante as regras de negócio
    if (e.type === 'blur') {
        if (isNaN(newQuantity) || newQuantity < MINIMUM_UNITS) {
            newQuantity = MINIMUM_UNITS;
        }
        // Arredonda para o múltiplo de 100 mais próximo
        newQuantity = Math.round(newQuantity / UNITS_PER_PACKAGE) * UNITS_PER_PACKAGE;
        if (newQuantity < MINIMUM_UNITS) newQuantity = MINIMUM_UNITS;
    }

    if (isNaN(newQuantity)) newQuantity = MINIMUM_UNITS;

    if (newQuantity > 5000) newQuantity = 5000; // Safety limit: 50 pacotes

    setFormData(prev => {
        const numPackages = Math.ceil(newQuantity / UNITS_PER_PACKAGE);
        const currentSabores = prev.sabores;
        const newSabores = Array.from({ length: numPackages }, (_, i) => currentSabores[i] || '');
        return { ...prev, quantity: newQuantity, sabores: newSabores };
    });
  };

  const handleFlavorChange = (index: number, value: string) => {
    const newSabores = [...formData.sabores];
    newSabores[index] = value;
    setFormData(prev => ({ ...prev, sabores: newSabores }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const productName = editableProduct.name;
    const quantity = formData.quantity;
    const numPackages = formData.quantity / UNITS_PER_PACKAGE;
    const saboresList = formData.sabores.slice(0, numPackages).map((sabor, index) => `Pacote ${index + 1}: ${sabor || 'Não especificado'}`).join('\n');
    const saboresListPlain = formData.sabores.slice(0, numPackages).map(s => s || 'N/A').join(', ');
    const userName = formData.nome;
    const userWhatsAppInput = formData.whatsapp;
    const userEmail = formData.email;
    const deliveryState = formData.estado;

    // 1. Notify Admin via EmailJS
    if (adminSettings.emailJsServiceId && adminSettings.emailJsTemplateIdAdmin && adminSettings.emailJsPublicKey) {
      const adminEmailParams = {
        product_name: productName,
        quantity: `${quantity} unidades (${numPackages} pacotes)`,
        sabores_list: saboresList,
        subtotal: subtotal.toFixed(2),
        shipping_cost: shippingCost.toFixed(2),
        grand_total: grandTotal.toFixed(2),
        user_name: userName,
        user_whatsapp: userWhatsAppInput,
        user_email: userEmail,
        delivery_state: deliveryState,
        admin_recipient_email: adminSettings.adminEmail,
        reply_to: userEmail,
      };
      await sendEmailViaEmailJS(
        adminSettings.emailJsServiceId,
        adminSettings.emailJsTemplateIdAdmin,
        adminEmailParams,
        adminSettings.emailJsPublicKey
      );
    }

    // 2. Notify Admin via WhatsApp (CallMeBot)
    const adminWhatsAppMessage = `Novo Pedido Print Foods: ${quantity}x ${productName} por ${userName}. Entrega: ${deliveryState}. Sabores: ${saboresListPlain}. Total: R$${grandTotal.toFixed(2)} (Produtos R$${subtotal.toFixed(2)} + Frete R$${shippingCost.toFixed(2)}). Contato: ${userWhatsAppInput}`;
    if (adminSettings.callMeBotApiKey && adminSettings.adminWhatsapp) {
      await sendWhatsAppViaCallMeBot(adminWhatsAppMessage, adminSettings.adminWhatsapp, adminSettings.callMeBotApiKey);
    }

    // 3. Send Confirmation Email to User via EmailJS
    const pixToDisplay = adminSettings.pixKey || adminSettings.cnpj;
    if (adminSettings.emailJsServiceId && adminSettings.emailJsTemplateIdUser && adminSettings.emailJsPublicKey) {
      const userEmailParams = {
        user_name: userName,
        user_recipient_email: userEmail,
        product_name: productName,
        quantity: `${quantity} unidades (${numPackages} pacotes)`,
        sabores_list: saboresList,
        subtotal: subtotal.toFixed(2),
        shipping_cost: shippingCost.toFixed(2),
        grand_total: grandTotal.toFixed(2),
        delivery_state: deliveryState,
        orientation_video_url: adminSettings.orientationVideoUrl,
        admin_whatsapp_contact: adminSettings.adminWhatsapp,
        admin_reply_to_email: adminSettings.adminEmail,
        company_cnpj: adminSettings.cnpj,
        pix_key_info: pixToDisplay,
      };
      await sendEmailViaEmailJS(
        adminSettings.emailJsServiceId,
        adminSettings.emailJsTemplateIdUser,
        userEmailParams,
        adminSettings.emailJsPublicKey
      );
    }

    setIsSubmitted(true);
  };

  const handleNewRegistration = () => {
    setFormData({
        nome: '',
        whatsapp: '',
        email: '',
        estado: '',
        quantity: MINIMUM_UNITS,
        sabores: Array(MINIMUM_UNITS / UNITS_PER_PACKAGE).fill(''),
    });
    setIsSubmitted(false);
  };

  const handleAdminLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdminCredentials(prev => ({ ...prev, [name]: value }));
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

  const handleAdminProductChange = (field: keyof ProductDetails, value: string | number) => {
    setEditableProduct(prevProduct => ({
      ...prevProduct,
      [field]: field === 'price' ? Number(value) : value,
    }));
  };

  const handleAdminSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAdminSettings(prev => ({ ...prev, [name]: value as any }));
  };

  if (isAdminView) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 font-sans">
        <div className="bg-white p-6 sm:p-10 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
          <header className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-blue-800">Print Foods®</h1>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-700">Painel Administrativo</h2>
            </div>
            <button
              onClick={() => setIsAdminView(false)}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors"
            >
              Sair do Admin
            </button>
          </header>

          <div className="space-y-8 mb-8">
            <div className="p-6 bg-blue-50 rounded-lg shadow-md border border-blue-200">
                <h3 className="text-xl font-semibold text-blue-700 mb-6 border-b border-blue-200 pb-3">Informações da Loja e Pagamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                    <div>
                        <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">CNPJ da Empresa</label>
                        <input type="text" id="cnpj" name="cnpj" value={adminSettings.cnpj} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="00.000.000/0001-00"/>
                        <p className="mt-1 text-xs text-gray-500">Será exibido na página de pagamento.</p>
                    </div>
                    <div>
                        <label htmlFor="pixKey" className="block text-sm font-medium text-gray-700">Chave PIX para Pagamento</label>
                        <input type="text" id="pixKey" name="pixKey" value={adminSettings.pixKey} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="E-mail, telefone, etc."/>
                        <p className="mt-1 text-xs text-gray-500">Deixe em branco para usar o CNPJ como Chave PIX.</p>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="orientationVideoUrl" className="block text-sm font-medium text-gray-700">URL do Vídeo de Orientação</label>
                        <input type="url" id="orientationVideoUrl" name="orientationVideoUrl" value={adminSettings.orientationVideoUrl} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="https://youtube.com/seu-video"/>
                        <p className="mt-1 text-xs text-gray-500">Link enviado no e-mail de confirmação ao cliente.</p>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-blue-50 rounded-lg shadow-md border border-blue-200">
                <h3 className="text-xl font-semibold text-blue-700 mb-6 border-b border-blue-200 pb-3">Configurações de Notificação</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 mb-8">
                    <div>
                        <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">E-mail do Administrador</label>
                        <input type="email" id="adminEmail" name="adminEmail" value={adminSettings.adminEmail} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="seu-email@provedor.com"/>
                        <p className="mt-1 text-xs text-gray-500">E-mail que receberá os avisos de novos pedidos.</p>
                    </div>
                    <div>
                        <label htmlFor="adminWhatsapp" className="block text-sm font-medium text-gray-700">WhatsApp do Administrador</label>
                        <input type="tel" id="adminWhatsapp" name="adminWhatsapp" value={adminSettings.adminWhatsapp} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="5511987654321"/>
                        <p className="mt-1 text-xs text-gray-500">Para notificações e contato do cliente.</p>
                    </div>
                </div>
                
                <div className="space-y-8">
                    <div>
                        <h4 className="text-lg font-semibold text-blue-600 mb-4">Integração com CallMeBot (WhatsApp)</h4>
                        <div>
                            <label htmlFor="callMeBotApiKey" className="block text-sm font-medium text-gray-700">API Key do CallMeBot</label>
                            <input type="text" id="callMeBotApiKey" name="callMeBotApiKey" value={adminSettings.callMeBotApiKey} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                            <p className="mt-1 text-xs text-gray-500">Sua chave da API encontrada no site do CallMeBot.</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold text-blue-600 mb-4">Integração com EmailJS</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                            <div>
                                <label htmlFor="emailJsServiceId" className="block text-sm font-medium text-gray-700">Service ID</label>
                                <input type="text" id="emailJsServiceId" name="emailJsServiceId" value={adminSettings.emailJsServiceId} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="service_xxxxxxxx"/>
                                <p className="mt-1 text-xs text-gray-500">Em Email Services &gt; (seu serviço) &gt; copie o Service ID.</p>
                            </div>
                             <div>
                                <label htmlFor="emailJsPublicKey" className="block text-sm font-medium text-gray-700">Public Key</label>
                                <input type="text" id="emailJsPublicKey" name="emailJsPublicKey" value={adminSettings.emailJsPublicKey} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Sua_Public_Key"/>
                                <p className="mt-1 text-xs text-gray-500">Em Account &gt; API Keys &gt; copie a Public Key.</p>
                            </div>
                             <div>
                                <label htmlFor="emailJsTemplateIdAdmin" className="block text-sm font-medium text-gray-700">Template ID (Admin)</label>
                                <input type="text" id="emailJsTemplateIdAdmin" name="emailJsTemplateIdAdmin" value={adminSettings.emailJsTemplateIdAdmin} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="template_xxxxxxxx"/>
                                <p className="mt-1 text-xs text-gray-500">ID do template de e-mail para notificar o admin.</p>
                            </div>
                             <div>
                                <label htmlFor="emailJsTemplateIdUser" className="block text-sm font-medium text-gray-700">Template ID (Cliente)</label>
                                <input type="text" id="emailJsTemplateIdUser" name="emailJsTemplateIdUser" value={adminSettings.emailJsTemplateIdUser} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="template_xxxxxxxx"/>
                                <p className="mt-1 text-xs text-gray-500">ID do template de e-mail de confirmação para o cliente.</p>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Gerenciamento de Produto</h2>
            <div className="p-6 bg-blue-50 rounded-lg shadow-md border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-700 mb-4">Editando: {editableProduct.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor={`name-${editableProduct.id}`} className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto:</label>
                  <input type="text" id={`name-${editableProduct.id}`} value={editableProduct.name} onChange={(e) => handleAdminProductChange('name', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <div>
                  <label htmlFor={`price-${editableProduct.id}`} className="block text-sm font-medium text-gray-700 mb-1">Preço com Desconto (R$):</label>
                  <input type="number" id={`price-${editableProduct.id}`} value={editableProduct.price} onChange={(e) => handleAdminProductChange('price', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor={`description-${editableProduct.id}`} className="block text-sm font-medium text-gray-700 mb-1">Descrição (use '\n' para nova linha):</label>
                <textarea id={`description-${editableProduct.id}`} value={editableProduct.description} rows={4} onChange={(e) => handleAdminProductChange('description', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
              </div>
            </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    const pixToDisplay = adminSettings.pixKey || adminSettings.cnpj;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl w-full max-w-2xl">
           <div className="text-center p-4 sm:p-8 bg-green-50 rounded-lg shadow-lg border-2 border-green-200">
                <h2 className="text-2xl sm:text-3xl font-bold text-green-800 mb-4">Pedido Enviado com Sucesso!</h2>
                <p className="text-gray-700 mb-6">Obrigado, {formData.nome}! Recebemos seu pedido e em breve entraremos em contato pelo WhatsApp para confirmar os detalhes do pagamento e da entrega.</p>
                
                <div className="bg-white p-4 sm:p-6 rounded-md shadow-inner text-left space-y-3 mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Resumo do Pedido</h3>
                    <p className="text-gray-700"><strong>Produto:</strong> {editableProduct.name}</p>
                    <p className="text-gray-700"><strong>Quantidade:</strong> {formData.quantity} unidades</p>
                    <p className="text-gray-700"><strong>Subtotal:</strong> R$ {subtotal.toFixed(2)}</p>
                    <p className="text-gray-700"><strong>Frete para {formData.estado}:</strong> R$ {shippingCost.toFixed(2)}</p>
                    <p className="text-lg font-bold text-gray-800"><strong>Total:</strong> R$ {grandTotal.toFixed(2)}</p>
                </div>

                <div className="bg-blue-50 p-4 sm:p-6 rounded-md shadow-inner text-left space-y-3">
                    <h3 className="text-lg font-semibold text-blue-800 border-b pb-2 mb-3">Instruções para Pagamento</h3>
                    <p className="text-gray-700">Para agilizar, realize o pagamento no valor total de <strong className="font-bold text-blue-900">R$ {grandTotal.toFixed(2)}</strong> via PIX e envie o comprovante para o nosso WhatsApp.</p>
                    <div className="mt-4 p-4 bg-gray-100 rounded-md space-y-2">
                        {adminSettings.cnpj && <p className="text-gray-800"><strong className="font-semibold">CNPJ:</strong> {adminSettings.cnpj}</p>}
                        {pixToDisplay && <p className="text-gray-800"><strong className="font-semibold">Chave PIX:</strong> {pixToDisplay}</p>}
                    </div>
                    <p className="text-gray-700 mt-4">Nosso WhatsApp para envio do comprovante e dúvidas é: <strong className="font-semibold">{adminSettings.adminWhatsapp}</strong></p>
                    {adminSettings.orientationVideoUrl && (
                        <p className="text-sm text-gray-600 mt-4">Assista nosso <a href={adminSettings.orientationVideoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">vídeo de orientação</a> sobre como aplicar as etiquetas.</p>
                    )}
                </div>
                <button onClick={handleNewRegistration} className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all duration-300">
                    Fazer Novo Pedido
                </button>
            </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-sans">
      <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl w-full max-w-2xl transition-all duration-500 ease-in-out">
        {!isSubmitted ? (
          <>
            <header className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-blue-800">
                Print Foods®
              </h1>
              <p className="text-gray-600 mt-2">Olá, aluna do curso Minha Fábrica de Crepes! Faça seu pedido aqui.</p>
            </header>
            
            <section className="mb-8 p-6 bg-blue-50 rounded-lg shadow-inner border border-blue-200">
              <h2 className="text-xl font-semibold text-blue-800 mb-2">{editableProduct.name}</h2>
              {editableProduct.description.split('\n').map((line, index) => (
                  <p key={index} className="text-gray-700 mb-1">{line}</p>
              ))}
              <p className="text-lg font-bold text-blue-800 mt-4">
                Valor por pacote com 100 unidades: <br />
                <span className="text-gray-500 line-through mr-2">De R$ {OLD_PRICE.toFixed(2)}</span> 
                por apenas R$ {editableProduct.price.toFixed(2)}
              </p>
            </section>
            
            <form id="formulario" onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="p-4 bg-gray-50 rounded-lg border">
                    <h3 className="block text-lg font-medium text-gray-800 mb-4">1. Personalize seu Pedido:</h3>
                    
                    <div className="mb-6">
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Etiquetas (mín. {MINIMUM_UNITS}, em múltiplos de {UNITS_PER_PACKAGE}):</label>
                        <input type="number" id="quantity" name="quantity" value={formData.quantity} onChange={handleQuantityChange} onBlur={handleQuantityChange} min={MINIMUM_UNITS} step={UNITS_PER_PACKAGE} required className="mt-1 block w-full max-w-xs px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Texto de cada pacote de 100 etiquetas (Sabor):</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {formData.sabores.map((sabor, index) => (
                                <div key={index}>
                                    <label htmlFor={`sabor-${index}`} className="block text-xs text-gray-600 mb-1">Pacote {index + 1}:</label>
                                    <input type="text" id={`sabor-${index}`} value={sabor} onChange={(e) => handleFlavorChange(index, e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Chocolate"/>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border">
                    <h3 className="block text-lg font-medium text-gray-800 mb-4">2. Seus Dados e Entrega:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome Completo:</label>
                            <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                        <div>
                            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">WhatsApp (com DDD):</label>
                            <input type="tel" id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: 11987654321"/>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-mail:</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                        <div>
                            <label htmlFor="estado" className="block text-sm font-medium text-gray-700">Estado para Entrega:</label>
                            <select id="estado" name="estado" value={formData.estado} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="" disabled>Selecione um estado</option>
                                {brazilianStates.map(state => <option key={state} value={state}>{state}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-blue-100 rounded-lg shadow-md mt-6">
                    <h3 className="text-xl font-semibold text-blue-800 mb-4">Resumo do Pedido</h3>
                    <div className="space-y-2 text-gray-700">
                        <div className="flex justify-between"><span>Subtotal dos Produtos:</span> <span>R$ {subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Frete (para {formData.estado || '...'}):</span> <span>R$ {shippingCost.toFixed(2)}</span></div>
                        <hr className="my-2 border-blue-200"/>
                        <div className="flex justify-between text-lg font-bold text-blue-900"><span>Valor Total:</span> <span>R$ {grandTotal.toFixed(2)}</span></div>
                    </div>
                </div>

                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-lg shadow-lg text-lg transition-all duration-300">
                    Finalizar Pedido e Ver Dados de Pagamento
                </button>
            </form>
          </>
        ) : null}

        {!isSubmitted && (
            <footer className="text-center mt-8">
              <button
                onClick={() => setShowAdminLoginModal(true)}
                className="text-sm text-gray-400 hover:text-blue-600 transition-colors"
              >
                Acesso Administrativo
              </button>
            </footer>
        )}
      </div>

      {showAdminLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Login Administrativo</h2>
            <form onSubmit={handleAdminLoginSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                  Usuário
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="username"
                  type="text"
                  name="username"
                  value={adminCredentials.username}
                  onChange={handleAdminLoginChange}
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                  Senha
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                  id="password"
                  type="password"
                  name="password"
                  value={adminCredentials.password}
                  onChange={handleAdminLoginChange}
                />
                {adminLoginError && <p className="text-red-500 text-xs italic">{adminLoginError}</p>}
              </div>
              <div className="flex items-center justify-between">
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  type="submit"
                >
                  Entrar
                </button>
                <button
                  className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
                  type="button"
                  onClick={() => setShowAdminLoginModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
