import React, { useState, useMemo } from 'react';

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
    pixKey: 'SEU CNPJ (CONFIGURAR NO PAINEL ADMIN)',
  });

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
          <header className="flex justify-between items-center mb-8">
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

          <div className="p-6 bg-blue-50 rounded-lg shadow-md border border-blue-200 mb-8">
            <h2 className="text-xl font-semibold text-blue-700 mb-4">Configurações Gerais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <input type="email" id="adminEmail" name="adminEmail" value={adminSettings.adminEmail} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="E-mail do Admin"/>
              <input type="tel" id="adminWhatsapp" name="adminWhatsapp" value={adminSettings.adminWhatsapp} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="WhatsApp do Admin (ex: 55119...)" />
              <input type="text" id="pixKey" name="pixKey" value={adminSettings.pixKey} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Chave PIX (CNPJ, e-mail, etc.)" />
              <input type="url" id="orientationVideoUrl" name="orientationVideoUrl" value={adminSettings.orientationVideoUrl} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="URL do Vídeo de Orientação"/>
            </div>
             <h3 className="text-lg font-semibold text-blue-600 mt-6 mb-3">Configurações do CallMeBot (WhatsApp)</h3>
              <input type="text" id="callMeBotApiKey" name="callMeBotApiKey" value={adminSettings.callMeBotApiKey} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="CallMeBot API Key"/>
             <h3 className="text-lg font-semibold text-blue-600 mt-6 mb-3">Configurações do EmailJS</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                 <input type="text" id="emailJsServiceId" name="emailJsServiceId" value={adminSettings.emailJsServiceId} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="EmailJS Service ID"/>
                 <input type="text" id="emailJsPublicKey" name="emailJsPublicKey" value={adminSettings.emailJsPublicKey} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="EmailJS Public Key"/>
                 <input type="text" id="emailJsTemplateIdAdmin" name="emailJsTemplateIdAdmin" value={adminSettings.emailJsTemplateIdAdmin} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Template ID (Admin)"/>
                 <input type="text" id="emailJsTemplateIdUser" name="emailJsTemplateIdUser" value={adminSettings.emailJsTemplateIdUser} onChange={handleAdminSettingsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Template ID (User)"/>
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
                                    <input type="text" id={`sabor-${index}`} name={`sabor-${index}`} value={sabor} onChange={(e) => handleFlavorChange(index, e.target.value)} required className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Frango com Catupiry"/>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h3 className="block text-lg font-medium text-gray-800 mb-4">2. Endereço de Entrega:</h3>
                  <div>
                    <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">Estado:</label>
                    <select id="estado" name="estado" value={formData.estado} onChange={handleChange} required className="mt-1 block w-full max-w-xs px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="" disabled>Selecione seu estado</option>
                      {brazilianStates.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border">
                    <h3 className="block text-lg font-medium text-gray-800 mb-4">3. Seus Dados para Contato:</h3>
                    <div>
                      <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">Nome completo:</label>
                      <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required className="mt-1 block w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Seu nome completo"/>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDD):</label>
                      <input type="tel" id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={handleChange} required className="mt-1 block w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="(XX) XXXXX-XXXX"/>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mail:</label>
                      <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="seuemail@exemplo.com"/>
                    </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-100 border-t-4 border-blue-500 rounded-b-lg text-left space-y-2">
                    <div className="flex justify-between items-center text-lg text-blue-800">
                      <span>Subtotal dos Produtos:</span>
                      <span className="font-semibold">R$ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg text-blue-800">
                      <span>Frete:</span>
                      <span className="font-semibold">R$ {shippingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xl font-bold text-blue-900 border-t pt-2 mt-2">
                      <span>Total do Pedido:</span>
                      <span>R$ {grandTotal.toFixed(2)}</span>
                    </div>
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 ease-in-out transform hover:scale-105" disabled={!formData.nome || !formData.whatsapp || !formData.email || !formData.estado}>
                  Enviar Pedido
                </button>
            </form>
          </>
        ) : (
          <div className="space-y-6 text-center">
            <div id="confirmacao" className="p-4 sm:p-6 bg-green-50 border-l-4 border-green-500 rounded-md shadow-md text-left">
              <div className="flex items-start">
                  <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                  </div>
                  <div className="ml-3">
                      <h3 className="text-lg font-bold text-green-800">Pedido enviado! Próximo passo: Pagamento</h3>
                      <p className="mt-2 text-md text-green-700">Para finalizar, realize o pagamento do valor total e envie o comprovante.</p>

                      <div className="mt-4 p-4 bg-gray-100 rounded-lg text-gray-800">
                          <p className="font-semibold">Pague com PIX:</p>
                          <p className="mt-1"><strong>Chave PIX (CNPJ):</strong> <span className="font-mono bg-gray-200 px-2 py-1 rounded">{adminSettings.pixKey || 'Não configurada'}</span></p>
                          <p className="mt-1"><strong>Valor Total:</strong> <span className="font-bold">R$ {grandTotal.toFixed(2)}</span></p>
                      </div>

                      <a href={`https://wa.me/${adminSettings.adminWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Segue o comprovante do pedido em nome de ${formData.nome}, no valor de R$ ${grandTotal.toFixed(2)}.`)}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="mt-4 inline-block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-md shadow-lg transition-transform transform hover:scale-105">
                         Enviar Comprovante por WhatsApp
                      </a>
                      
                      <p className="mt-4 text-sm text-gray-600">Um e-mail de confirmação com os detalhes do pedido foi enviado para <strong>{formData.email}</strong>. Verifique sua caixa de entrada e spam.</p>
                  </div>
              </div>
            </div>

            <button onClick={handleNewRegistration} className="mt-6 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
              Fazer Novo Pedido
            </button>
          </div>
        )}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Print Foods. Todos os direitos reservados.</p>
          {!isAdminView && (<button onClick={() => { setAdminLoginError(null); setShowAdminLoginModal(true); }} className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline">Acesso Administrativo</button>)}
        </footer>
      </div>

      {showAdminLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
            <h2 className="text-2xl font-bold text-blue-800 mb-6 text-center">Login Administrativo</h2>
            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="admin-username" className="block text-sm font-medium text-gray-700">Usuário:</label>
                <input type="text" id="admin-username" name="username" value={adminCredentials.username} onChange={handleAdminLoginChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
              </div>
              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700">Senha:</label>
                <input type="password" id="admin-password" name="password" value={adminCredentials.password} onChange={handleAdminLoginChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
              </div>
              {adminLoginError && <p className="text-sm text-red-600">{adminLoginError}</p>}
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setShowAdminLoginModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md shadow-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Entrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
