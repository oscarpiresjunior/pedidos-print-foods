
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
  { id: 'Retangular 22x10mm', labelLine1: 'Retangular', labelLine2: '22x10mm', imageKey: 'model_image_url_rect_22x10' as keyof AdminSettings, placeholder: PLACEHOLDER_RECT_22_10 },
  { id: 'Retangular 30x14mm', labelLine1: 'Retangular', labelLine2: '30x14mm', imageKey: 'model_image_url_rect_30x14' as keyof AdminSettings, placeholder: PLACEHOLDER_RECT_30_14 },
  { id: 'Quadrada 20x20mm', labelLine1: 'Quadrada', labelLine2: '20x20mm', imageKey: 'model_image_url_quadrada_20x20' as keyof AdminSettings, placeholder: PLACEHOLDER_SQUARE_20_20 },
  { id: 'Oval 17x25mm', labelLine1: 'Oval', labelLine2: '17x25mm', imageKey: 'model_image_url_oval_17x25' as keyof AdminSettings, placeholder: PLACEHOLDER_OVAL_17_25 }
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
    if (options.length === 0 && maxForThisField > 0) {
        options.push(maxForThisField);
    }
    return options;
  };
  
  const handleModelClick = (modelId: string) => {
    setFormData(prev => ({ ...prev, model: modelId }));
  };
  
  const totalAllocated = formData.flavorDetails.reduce((sum, f) => sum + (f.quantity || 0), 0);

  const getImageSrc = (model: (typeof models)[0]) => {
    const url = adminSettings[model.imageKey] as string;
    return url || model.placeholder;
  };

  const selectedModel = useMemo(() => models.find(m => m.id === formData.model), [formData.model]);

  return (
    <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl w-full max-w-4xl">
      <header className="text-center mb-8">
        {adminSettings.logo_url && <img src={adminSettings.logo_url} alt="Logo da Empresa" className="mx-auto h-12 w-auto mb-4"/>}
        <h1 className="text-lg sm:text-xl font-extrabold text-gray-800">{editableProduct.name}</h1>
        {editableProduct.description && <p className="mt-2 text-gray-600 max-w-2xl mx-auto text-center">{editableProduct.description.replace(/\\n/g, ' ')}</p>}
      </header>

      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* Section 1: Model */}
        <section>
            <h3 className="text-xl font-bold text-gray-800 mb-6 border-b-2 pb-3">1. Escolha o Modelo da Etiqueta:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {models.map(model => (
                <div key={model.id} onClick={() => handleModelClick(model.id)} className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${formData.model === model.id ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-300 hover:border-blue-400 hover:shadow-md'}`}>
                  <img src={getImageSrc(model)} alt={model.id} className="h-24 mx-auto mb-3 object-contain"/>
                  <p className="text-center font-semibold text-gray-700">{model.labelLine1}</p>
                  <p className="text-center text-sm text-gray-500">{model.labelLine2}</p>
                </div>
              ))}
            </div>
            {!formData.model && submissionStatus === 'idle' && <p className="text-red-500 text-sm mt-2">Por favor, selecione um modelo.</p>}
            
            {selectedModel && (
              <div className="mt-8 flex justify-center">
                  <img
                      key={getImageSrc(selectedModel)} // key ensures re-render and re-animation on src change
                      src={getImageSrc(selectedModel)}
                      alt={`Preview do modelo ${selectedModel.id}`}
                      className="rounded-lg shadow-lg max-w-full sm:max-w-md w-full object-contain animate-fade-in"
                  />
              </div>
            )}
        </section>

        {/* Section 2: Quantity and Flavors */}
        <section>
            <h3 className="text-xl font-bold text-gray-800 mb-6 border-b-2 pb-3">2. Quantidade e Sabores</h3>
            <div className="space-y-4">
                <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">Quantidade Total de Etiquetas:</label>
                    <select id="quantity" name="quantity" value={formData.quantity} onChange={handleQuantityChange} className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white">
                      {quantityOptions.map(qty => <option key={qty} value={qty}>{qty} unidades</option>)}
                    </select>
                </div>
                 <div>
                    <p className="text-sm text-gray-600 mb-2">Especifique o sabor para cada pacote de {UNITS_PER_PACKAGE} unidades:</p>
                    <div className="space-y-3">
                        {formData.flavorDetails.map((flavor, index) => (
                           <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                               <input type="text" placeholder={`Sabor do Pacote ${index + 1}`} value={flavor.name} onChange={(e) => handleFlavorNameChange(index, e.target.value)} required className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm"/>
                                <select value={flavor.quantity} onChange={(e) => handleFlavorQuantityChange(index, e.target.value)} className="p-2 border border-gray-300 rounded-md bg-white">
                                    {getFlavorQuantityOptions(index).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                           </div>
                        ))}
                    </div>
                 </div>
                 {totalAllocated !== formData.quantity && <p className="text-red-500 text-sm mt-2">A soma das quantidades dos sabores ({totalAllocated}) deve ser igual à quantidade total ({formData.quantity}).</p>}
            </div>
        </section>

        {/* Section 3: Personal Data */}
        <section>
          <h3 className="text-xl font-bold text-gray-800 mb-6 border-b-2 pb-3">3. Dados Pessoais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <input type="text" name="nome" placeholder="Nome Completo" value={formData.nome} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
            <input type="tel" name="whatsapp" placeholder="WhatsApp (DDD + Número)" value={formData.whatsapp} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
            <div className="md:col-span-2">
                <input type="email" name="email" placeholder="E-mail" value={formData.email} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div className="md:col-span-2">
                <input type="text" name="cpf_cnpj" placeholder="CPF ou CNPJ (Opcional)" value={formData.cpf_cnpj || ''} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
            </div>
          </div>
        </section>

        {/* Section 4: Address */}
        <section>
            <h3 className="text-xl font-bold text-gray-800 mb-6 border-b-2 pb-3">4. Endereço de Entrega</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <div className="md:col-span-1">
                    <input type="text" name="cep" placeholder="CEP" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} required className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    {cepError && <p className="text-red-500 text-xs mt-1">{cepError}</p>}
                </div>
                <div className="md:col-span-2">
                    <input type="text" name="logradouro" placeholder="Logradouro" value={formData.logradouro} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <div>
                    <input type="text" name="numero" placeholder="Número" value={formData.numero} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <div className="md:col-span-2">
                     <input type="text" name="bairro" placeholder="Bairro" value={formData.bairro} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <div className="md:col-span-2">
                     <input type="text" name="cidade" placeholder="Cidade" value={formData.cidade} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <div>
                    <select name="estado" value={formData.estado} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white">
                        <option value="">Estado</option>
                        {brazilianStates.map(state => <option key={state} value={state}>{state}</option>)}
                    </select>
                </div>
            </div>
        </section>
        
        {/* Section 5: Summary and Submit */}
        <section>
          <div className="bg-gray-100 p-6 rounded-lg shadow-inner">
             <h3 className="text-xl font-bold text-gray-800 mb-4">Resumo do Pedido</h3>
             <div className="space-y-2">
                 <div className="flex justify-between">
                     <span className="text-gray-600">Preço por 100 unidades:</span>
                     <div>
                         <span className="text-gray-500 line-through mr-2">R$ {OLD_PRICE.toFixed(2)}</span>
                         <span className="font-semibold text-green-600">R$ {editableProduct.price.toFixed(2)}</span>
                     </div>
                 </div>
                 <div className="flex justify-between">
                     <span className="text-gray-600">Subtotal ({formData.quantity} unidades):</span>
                     <span className="font-semibold text-gray-800">R$ {orderTotals.subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between">
                     <span className="text-gray-600">Frete:</span>
                     <span className="font-semibold text-gray-800">{formData.estado ? `R$ ${orderTotals.shippingCost.toFixed(2)}` : 'Preencha o CEP'}</span>
                 </div>
                 <div className="border-t my-2"></div>
                 <div className="flex justify-between text-xl font-bold">
                     <span className="text-gray-900">Total a Pagar:</span>
                     <span className="text-blue-600">R$ {orderTotals.grandTotal.toFixed(2)}</span>
                 </div>
             </div>
          </div>
        </section>

        <div className="text-center">
          <button type="submit" disabled={submissionStatus === 'submitting' || totalAllocated !== formData.quantity || !formData.model} className="w-full max-w-md bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg shadow-lg text-lg transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed">
            {submissionStatus === 'submitting' ? 'Enviando Pedido...' : 'Finalizar Pedido'}
          </button>
          <p className="text-center text-xs text-gray-500 mt-4">
            Atendimento em dias úteis, de 9h às 17h.
          </p>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;