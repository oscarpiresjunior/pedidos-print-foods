import React, { useState, useEffect, useMemo } from 'react';
import { FormData, ProductDetails, OrderTotals, AdminSettings } from './types';
import { 
    PLACEHOLDER_RECT_22_10, 
    PLACEHOLDER_RECT_30_14, 
    PLACEHOLDER_SQUARE_20_20, 
    PLACEHOLDER_OVAL_17_25 
} from './placeholders';

interface OrderFormProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  editableProduct: ProductDetails;
  orderTotals: OrderTotals;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submissionStatus: 'idle' | 'submitting';
  adminSettings: AdminSettings;
}

const UNITS_PER_PACKAGE = 100;
const OLD_PRICE = 31.52;
const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];
const quantityOptions = Array.from({ length: (2000 - 500) / 100 + 1 }, (_, i) => 500 + i * 100);

const models = [
  { id: 'Retangular 22x10mm', labelLine1: 'Retangular', labelLine2: '22x10mm', imageKey: 'modelImageUrlRect22x10' as keyof AdminSettings, placeholder: PLACEHOLDER_RECT_22_10 },
  { id: 'Retangular 30x14mm', labelLine1: 'Retangular', labelLine2: '30x14mm', imageKey: 'modelImageUrlRect30x14' as keyof AdminSettings, placeholder: PLACEHOLDER_RECT_30_14 },
  { id: 'Quadrada 20x20mm', labelLine1: 'Quadrada', labelLine2: '20x20mm', imageKey: 'modelImageUrlQuadrada20x20' as keyof AdminSettings, placeholder: PLACEHOLDER_SQUARE_20_20 },
  { id: 'Oval 17x25mm', labelLine1: 'Oval', labelLine2: '17x25mm', imageKey: 'modelImageUrlOval17x25' as keyof AdminSettings, placeholder: PLACEHOLDER_OVAL_17_25 }
];


const OrderForm: React.FC<OrderFormProps> = ({
  formData, setFormData, editableProduct, orderTotals,
  handleSubmit, submissionStatus, adminSettings
}) => {
  const [cepError, setCepError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize flavor details when the component mounts if it's empty
    if (formData.flavorDetails.length === 0) {
        setFormData(prev => ({
            ...prev,
            flavorDetails: [{ name: '', quantity: prev.quantity }]
        }));
    }
  }, []); // Runs only on mount

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) {
      setCepError("CEP deve conter 8 dígitos.");
      return;
    }
    setCepError(null);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.erro) {
        setCepError("CEP não encontrado.");
        return;
      }
      setFormData(prev => ({
        ...prev,
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf
      }));
    } catch (error) {
      setCepError("Erro ao buscar CEP. Verifique a conexão.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newQuantity = parseInt(e.target.value, 10);
    setFormData(prev => ({
        ...prev,
        quantity: newQuantity,
        flavorDetails: [{ name: '', quantity: newQuantity }] // Reset flavors
    }));
  };

  const handleFlavorNameChange = (index: number, name: string) => {
    const newFlavorDetails = [...formData.flavorDetails];
    newFlavorDetails[index].name = name;
    setFormData(prev => ({ ...prev, flavorDetails: newFlavorDetails }));
  };

  const handleFlavorQuantityChange = (index: number, newQuantityStr: string) => {
      const newQuantity = parseInt(newQuantityStr, 10);
      const updatedFlavorDetails = [...formData.flavorDetails];
      updatedFlavorDetails[index].quantity = newQuantity;

      const totalAllocated = updatedFlavorDetails.slice(0, index + 1).reduce((sum, f) => sum + f.quantity, 0);
      const remaining = formData.quantity - totalAllocated;

      let finalFlavorDetails = updatedFlavorDetails.slice(0, index + 1);

      if (remaining > 0) {
          finalFlavorDetails.push({ name: '', quantity: remaining });
      }

      setFormData(prev => ({
          ...prev,
          flavorDetails: finalFlavorDetails
      }));
  };

  const getFlavorQuantityOptions = (index: number): number[] => {
    const allocatedBefore = formData.flavorDetails.slice(0, index).reduce((sum, f) => sum + f.quantity, 0);
    const maxForThisField = formData.quantity - allocatedBefore;
    const options = [];
    for (let i = maxForThisField; i >= UNITS_PER_PACKAGE; i -= UNITS_PER_PACKAGE) {
        options.push(i);
    }
    return options;
  };
  
  const handleModelClick = (modelId: string) => {
    setFormData(prev => ({ ...prev, model: modelId }));
  };
  
  const totalAllocated = formData.flavorDetails.reduce((sum, f) => sum + f.quantity, 0);

  const getImageSrc = (model: (typeof models)[0]) => {
    return (adminSettings[model.imageKey] as string) || model.placeholder;
  };

  const selectedModel = useMemo(() => models.find(m => m.id === formData.model), [formData.model]);

  return (
    <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl w-full max-w-4xl font-sans">
        <div className="text-center mb-8">
            {adminSettings.logoUrl && <img src={adminSettings.logoUrl} alt="Logo Print Foods" className="mx-auto h-20 w-auto mb-2" />}
            <h1 className="text-3xl font-bold text-blue-600">Print Foods ®</h1>
            <p className="text-md text-gray-600 mt-2">Olá, aluna do curso Minha Fábrica de Crepes! Faça seu pedido aqui.</p>
        </div>
      
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-12">
            <h2 className="text-2xl font-bold text-blue-800 mb-3">{editableProduct.name}</h2>
            <p className="text-gray-700 mb-4 whitespace-pre-line">{editableProduct.description}</p>
            <div className="bg-white rounded-md p-4 text-center border border-blue-100 shadow-sm">
                <p className="font-bold text-gray-800">Valor por pacote com 100 unidades:</p>
                <p className="text-lg">
                    <span className="text-gray-500 line-through mr-2">De R$ {OLD_PRICE.toFixed(2)}</span>
                    <span className="font-extrabold text-blue-600">por apenas R$ {editableProduct.price.toFixed(2)}</span>
                </p>
            </div>
        </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Step 1: Model Selection */}
        <fieldset>
            <legend className="text-xl font-bold text-gray-800 mb-6 pb-2">1. Escolha o Modelo da Etiqueta:</legend>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {models.map(model => (
                    <div 
                      key={model.id}
                      onClick={() => handleModelClick(model.id)}
                      className={`cursor-pointer border-2 rounded-lg p-3 text-center transition-all duration-300 ${formData.model === model.id ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' : 'border-gray-200 hover:border-blue-400 hover:shadow-md'}`}
                    >
                        <img src={getImageSrc(model)} alt={`${model.labelLine1} ${model.labelLine2}`} className="w-24 h-16 mx-auto mb-3 object-contain"/>
                        <div>
                            <span className="font-semibold text-gray-700 block text-sm">{model.labelLine1}</span>
                            <span className="text-xs text-gray-500">{model.labelLine2}</span>
                        </div>
                    </div>
                ))}
            </div>
            {selectedModel && (
              <div className="mt-6 flex justify-center transition-opacity duration-300" style={{ minHeight: '200px' }}>
                  <img src={getImageSrc(selectedModel)} alt="Preview do modelo" className="max-w-xs w-full h-auto object-contain rounded-lg shadow-xl"/>
              </div>
            )}
            {!formData.model && submissionStatus !== 'idle' && <p className="text-red-500 text-sm mt-2">Por favor, selecione um modelo.</p>}
        </fieldset>

        {/* Step 2: Quantity and Flavor */}
        <fieldset>
          <legend className="text-xl font-bold text-gray-800 mb-6 pb-2">2. Personalize seu Pedido:</legend>
           <div className="mb-8">
              <label htmlFor="quantity" className="mb-2 font-semibold text-gray-700 block">Quantidade Total de Etiquetas:</label>
               <div className="max-w-xs">
                    <select id="quantity" name="quantity" value={formData.quantity} onChange={handleQuantityChange} className="p-3 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-full">
                        {quantityOptions.map(q => <option key={q} value={q}>{q} unidades</option>)}
                    </select>
                </div>
            </div>
          
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">Distribua a quantidade entre os sabores:</h4>
            <div className="space-y-4">
              {formData.flavorDetails.map((flavor, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    placeholder={`Sabor ${index + 1}`}
                    value={flavor.name}
                    onChange={(e) => handleFlavorNameChange(index, e.target.value)}
                    className="p-3 border rounded-md shadow-sm w-full md:col-span-2"
                    required
                  />
                  <select
                    value={flavor.quantity}
                    onChange={(e) => handleFlavorQuantityChange(index, e.target.value)}
                    className="p-3 border rounded-md shadow-sm w-full"
                    disabled={index !== formData.flavorDetails.length - 1 && totalAllocated === formData.quantity}
                  >
                    {getFlavorQuantityOptions(index).map(q => <option key={q} value={q}>{q} unidades</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </fieldset>

        {/* Step 3: Personal and Shipping Info */}
        <fieldset>
          <legend className="text-xl font-bold text-gray-800 mb-6 border-b-2 border-blue-500 pb-2">3. Suas Informações e Endereço</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            <input type="text" name="nome" placeholder="Seu nome completo" value={formData.nome} onChange={handleChange} required className="p-3 border rounded-md shadow-sm" />
            <input type="tel" name="whatsapp" placeholder="Seu WhatsApp (com DDD)" value={formData.whatsapp} onChange={handleChange} required className="p-3 border rounded-md shadow-sm" />
            <input type="email" name="email" placeholder="Seu melhor e-mail" value={formData.email} onChange={handleChange} required className="p-3 border rounded-md shadow-sm md:col-span-2" />
            
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
                <div className="md:col-span-1">
                    <input type="text" name="cep" placeholder="CEP" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} required className="p-3 border rounded-md shadow-sm w-full" />
                    {cepError && <p className="text-red-500 text-sm mt-1">{cepError}</p>}
                </div>
                <input type="text" name="logradouro" placeholder="Endereço" value={formData.logradouro} onChange={handleChange} required className="p-3 border rounded-md shadow-sm md:col-span-2" />
                <input type="text" name="numero" placeholder="Número" value={formData.numero} onChange={handleChange} required className="p-3 border rounded-md shadow-sm" />
                <input type="text" name="bairro" placeholder="Bairro" value={formData.bairro} onChange={handleChange} required className="p-3 border rounded-md shadow-sm" />
                <input type="text" name="cidade" placeholder="Cidade" value={formData.cidade} onChange={handleChange} required className="p-3 border rounded-md shadow-sm" />
                <select name="estado" value={formData.estado} onChange={handleChange} required className="p-3 border rounded-md shadow-sm bg-white">
                    <option value="">Estado</option>
                    {brazilianStates.map(state => <option key={state} value={state}>{state}</option>)}
                </select>
            </div>
          </div>
        </fieldset>
        
        {/* Order Summary and Total */}
        <div className="p-6 bg-gray-100 rounded-lg shadow-inner">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Resumo do Pedido</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Subtotal ({formData.quantity} unidades):</span><span className="font-medium">R$ {orderTotals.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Frete:</span><span className="font-medium">R$ {orderTotals.shippingCost.toFixed(2)}</span></div>
            <div className="flex justify-between text-xl font-bold text-gray-800 border-t pt-2 mt-2"><span>Total:</span><span>R$ {orderTotals.grandTotal.toFixed(2)}</span></div>
          </div>
        </div>

        {/* WhatsApp Support Button */}
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
             <p className="text-gray-700 mb-3">Dúvidas? Fale conosco antes de finalizar o pedido!</p>
             <a 
               href={`https://wa.me/${adminSettings.adminWhatsapp.replace(/\D/g, '')}?text=Olá! Tenho uma dúvida sobre o pedido de etiquetas.`}
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM14.23 13.32c-.32.32-1 .5-1.54.2l-1.63-1c-.24-.15-.58-.12-.78.08l-1.32 1.32c-.45.45-1.18.5-1.69.1l-2.78-2.17a5.53 5.53 0 01-1.3-2.1L4.8 7.02c-.2-.5.05-1.1.5-1.32l1.32-1.32c.2-.2.23-.54.08-.78l-1-1.63c-.27-.45-.9-.6-1.36-.32l-.28.17a1.64 1.64 0 00-1.02 1.54 8.58 8.58 0 008.58 8.58c.6 0 1.15-.36 1.4-.85l.17-.28c.27-.46.12-1.1-.32-1.36z" />
                </svg>
                Falar no WhatsApp
             </a>
             <p className="text-xs text-gray-500 mt-2">(Atendimento de 9h às 17h)</p>
        </div>

        <button type="submit" disabled={submissionStatus === 'submitting' || !formData.model} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-lg shadow-lg text-lg transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed">
          {submissionStatus === 'submitting' ? 'Enviando Pedido...' : 'Finalizar Pedido'}
        </button>
      </form>
    </div>
  );
};

export default OrderForm;