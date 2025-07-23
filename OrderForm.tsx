
import React, { useState } from 'react';
import { FormData, ProductDetails, OrderTotals } from './types';

interface OrderFormProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  editableProduct: ProductDetails;
  orderTotals: OrderTotals;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submissionStatus: 'idle' | 'submitting' | 'error';
  submissionError: string | null;
  setSubmissionStatus: React.Dispatch<React.SetStateAction<'idle' | 'submitting' | 'error'>>;
  setSubmissionError: React.Dispatch<React.SetStateAction<string | null>>;
}

const MINIMUM_UNITS = 500;
const UNITS_PER_PACKAGE = 100;
const OLD_PRICE = 31.52;
const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const OrderForm: React.FC<OrderFormProps> = ({
  formData, setFormData, editableProduct, orderTotals,
  handleSubmit, submissionStatus, submissionError,
  setSubmissionStatus, setSubmissionError
}) => {
  const [cepError, setCepError] = useState<string | null>(null);

  const clearError = () => {
    if (submissionStatus === 'error') {
      setSubmissionStatus('idle');
      setSubmissionError(null);
    }
  };

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
    clearError();
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newQuantity = parseInt(e.target.value, 10);
    if (e.type === 'blur') {
      if (isNaN(newQuantity) || newQuantity < MINIMUM_UNITS) newQuantity = MINIMUM_UNITS;
      newQuantity = Math.round(newQuantity / UNITS_PER_PACKAGE) * UNITS_PER_PACKAGE;
      if (newQuantity < MINIMUM_UNITS) newQuantity = MINIMUM_UNITS;
    }
    if (isNaN(newQuantity)) newQuantity = MINIMUM_UNITS;
    if (newQuantity > 5000) newQuantity = 5000;

    setFormData(prev => {
        const numPackages = Math.ceil(newQuantity / UNITS_PER_PACKAGE);
        const newSabores = Array.from({ length: numPackages }, (_, i) => prev.sabores[i] || '');
        return { ...prev, quantity: newQuantity, sabores: newSabores };
    });
    clearError();
  };

  const handleFlavorChange = (index: number, value: string) => {
    const newSabores = [...formData.sabores];
    newSabores[index] = value;
    setFormData(prev => ({ ...prev, sabores: newSabores }));
    clearError();
  };

  return (
    <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl w-full max-w-2xl">
        <header className="text-center mb-8">
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

            {submissionStatus === 'error' && (
              <div className="p-4 my-4 text-sm text-red-800 rounded-lg bg-red-100 border border-red-300" role="alert">
                <p><strong className="font-bold">Erro no Envio:</strong> {submissionError}</p>
                <p className="mt-1">Por favor, verifique os dados e tente novamente. Se o erro persistir, o administrador deve conferir as configurações.</p>
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
