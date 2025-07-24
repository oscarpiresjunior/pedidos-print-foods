import React, { useState, useEffect } from 'react';
import { FormData, ProductDetails, OrderTotals, AdminSettings } from './types';

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
  { id: 'Retangular 22x10mm', label: 'Retangular 22x10mm', imageKey: 'modelImageRect22x10' as keyof AdminSettings },
  { id: 'Retangular 30x14mm', label: 'Retangular 30x14mm', imageKey: 'modelImageRect30x14' as keyof AdminSettings },
  { id: 'Quadrada 20x20mm', label: 'Quadrada 20x20mm', imageKey: 'modelImageQuadrada20x20' as keyof AdminSettings },
  { id: 'Oval 17x25mm', label: 'Oval 17x25mm', imageKey: 'modelOval17x25' as keyof AdminSettings }
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

      setFormData(prev => ({ ...prev, flavorDetails: finalFlavorDetails }));
  };

  const getQuantityOptionsForFlavor = (index: number): number[] => {
      const allocatedInPreviousRows = formData.flavorDetails.slice(0, index).reduce((sum, f) => sum + f.quantity, 0);
      const maxForThisRow = formData.quantity - allocatedInPreviousRows;
      const options = [];
      for (let q = maxForThisRow; q >= UNITS_PER_PACKAGE; q -= UNITS_PER_PACKAGE) {
          options.push(q);
      }
      return options;
  };

  return (
    <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl w-full max-w-3xl">
        <header className="text-center mb-8">
            {adminSettings.logoBase64 && <img src={adminSettings.logoBase64} alt="Logo da Empresa" className="mx-auto h-20 w-auto mb-6"/>}
            <h1 className="text-4xl sm:text-5xl font-bold text-blue-800">Print Foods®</h1>
            <p className="text-gray-600 mt-2">Olá, aluna do curso Minha Fábrica de Crepes! Faça seu pedido aqui.</p>
        </header>

        <section className="mb-8 p-6 bg-blue-50 rounded-lg shadow-inner border border-blue-200">
            <h2 className="text-xl font-semibold text-blue-800 mb-2">{editableProduct.name}</h2>
            {editableProduct.description.split('\n').map((line, i) => <p key={i} className="text-gray-700 mb-1">{line}</p>)}
            <p className="text-lg font-bold text-blue-800 mt-4">Valor por pacote com 100 unidades: <br/><span className="text-gray-500 line-through mr-2">De R$ {OLD_PRICE.toFixed(2)}</span> por apenas R$ {editableProduct.price.toFixed(2)}</p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg border">
                <h3 className="block text-lg font-medium text-gray-800 mb-4">1. Escolha o Modelo da Etiqueta:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {models.map(model => (
                        <label key={model.id} className={`relative flex flex-col items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.model === model.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-blue-400'}`}>
                            <input type="radio" name="model" value={model.id} checked={formData.model === model.id} onChange={handleChange} required className="absolute opacity-0 w-0 h-0"/>
                            {adminSettings[model.imageKey] ? 
                                <img src={adminSettings[model.imageKey] as string} alt={model.label} className="w-20 h-20 object-contain mb-2"/>
                                : <div className="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center text-gray-500 text-xs text-center mb-2">Sem Imagem</div>
                            }
                            <span className="text-center text-sm font-semibold text-gray-700">{model.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border">
              <h3 className="block text-lg font-medium text-gray-800 mb-4">2. Personalize seu Pedido:</h3>
              <div className="mb-6">
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantidade Total de Etiquetas:</label>
                  <select
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleQuantityChange}
                    required
                    className="mt-1 block w-full max-w-xs px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {quantityOptions.map(q => (
                      <option key={q} value={q}>{q} unidades</option>
                    ))}
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Distribua a quantidade entre os sabores:</label>
                  <div className="space-y-4">
                      {formData.flavorDetails.map((flavor, index) => (
                          <div key={index} className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-white rounded-md border">
                              <input 
                                type="text" 
                                value={flavor.name} 
                                onChange={(e) => handleFlavorNameChange(index, e.target.value)} 
                                required 
                                className="flex-grow w-full sm:w-auto mt-1 block px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                placeholder={`Sabor ${index + 1}`}
                              />
                              <select 
                                value={flavor.quantity} 
                                onChange={(e) => handleFlavorQuantityChange(index, e.target.value)} 
                                className="w-full sm:w-auto mt-1 block px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                  {getQuantityOptionsForFlavor(index).map(q => (
                                      <option key={q} value={q}>{q} unidades</option>
                                  ))}
                              </select>
                          </div>
                      ))}
                  </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border">
                <h3 className="block text-lg font-medium text-gray-800 mb-4">3. Seus Dados e Entrega:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" name="nome" placeholder="Nome Completo" value={formData.nome} onChange={handleChange} required className="md:col-span-2 mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    <input type="tel" name="whatsapp" placeholder="WhatsApp (com DDD)" value={formData.whatsapp} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    <input type="email" name="email" placeholder="E-mail" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="md:col-span-1">
                    <input type="text" name="cep" placeholder="CEP" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    {cepError && <p className="text-red-500 text-xs mt-1">{cepError}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <input type="text" name="logradouro" placeholder="Rua / Logradouro" value={formData.logradouro} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm" readOnly/>
                  </div>
                  <div className="md:col-span-1">
                    <input type="text" name="numero" placeholder="Número" value={formData.numero} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                  <div className="md:col-span-2">
                    <input type="text" name="bairro" placeholder="Bairro" value={formData.bairro} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm" readOnly/>
                  </div>
                   <div className="md:col-span-2">
                     <input type="text" name="cidade" placeholder="Cidade" value={formData.cidade} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm" readOnly/>
                  </div>
                   <div className="md:col-span-1">
                    <select name="estado" value={formData.estado} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm" disabled>
                        <option value="">Estado</option>
                        {brazilianStates.map(state => <option key={state} value={state}>{state}</option>)}
                    </select>
                  </div>
                </div>
            </div>

            <div className="p-6 bg-blue-100 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-blue-800 mb-4">Resumo do Pedido</h3>
                <div className="space-y-2 text-gray-700">
                    <div className="flex justify-between"><span>Subtotal dos Produtos:</span> <span>R$ {orderTotals.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Frete (para {formData.estado || '...'}):</span> <span>R$ {orderTotals.shippingCost.toFixed(2)}</span></div>
                    <hr className="my-2 border-blue-200"/>
                    <div className="flex justify-between text-lg font-bold text-blue-900"><span>Valor Total:</span> <span>R$ {orderTotals.grandTotal.toFixed(2)}</span></div>
                </div>
            </div>
            
            {adminSettings.adminWhatsapp && (
              <div className="text-center my-4">
                  <a 
                    href={`https://wa.me/${adminSettings.adminWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre o pedido de etiquetas.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-500 hover:bg-green-600 shadow-sm"
                  >
                    <svg className="w-5 h-5 mr-2 -ml-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.924 6.219l-1.056 3.864 3.952-1.037z" /></svg>
                    Dúvidas? Fale Conosco (9h às 17h)
                  </a>
              </div>
            )}
            
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-lg shadow-lg text-lg transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={submissionStatus === 'submitting'}>
                {submissionStatus === 'submitting' ? 'Enviando Pedido...' : 'Finalizar Pedido e Ver Dados de Pagamento'}
            </button>
        </form>
    </div>
  );
};

export default OrderForm;
