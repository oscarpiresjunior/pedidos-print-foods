
import React, { useState } from 'react';
import { FormData, AdminSettings, OrderTotals } from './types';

interface SuccessPageProps {
  formData: FormData;
  adminSettings: AdminSettings;
  orderTotals: OrderTotals;
  productName: string;
  onNewOrder: () => void;
}

const SuccessPage: React.FC<SuccessPageProps> = ({
  formData, adminSettings, orderTotals, productName, onNewOrder
}) => {
  const [copyStatus, setCopyStatus] = useState('Copiar Chave');
  const pixToDisplay = adminSettings.pixKey || adminSettings.cnpj;

  const handleCopy = () => {
    if (pixToDisplay) {
      navigator.clipboard.writeText(pixToDisplay).then(() => {
        setCopyStatus('Copiado!');
        setTimeout(() => setCopyStatus('Copiar Chave'), 2000);
      }).catch(err => {
        console.error('Falha ao copiar: ', err);
        setCopyStatus('Erro ao copiar');
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl w-full max-w-2xl">
         <div className="text-center p-4 sm:p-8 bg-green-50 rounded-lg shadow-lg border-2 border-green-200">
              <h2 className="text-2xl sm:text-3xl font-bold text-green-800 mb-4">Pedido Enviado com Sucesso!</h2>
              <p className="text-gray-700 mb-6">Obrigado, {formData.nome}! Recebemos seu pedido e um e-mail com os detalhes foi enviado para {formData.email}.</p>
              
              <div className="bg-white p-4 sm:p-6 rounded-md shadow-inner text-left space-y-3 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Resumo do Pedido</h3>
                  <p><strong>Produto:</strong> {productName}</p>
                  <p><strong>Quantidade:</strong> {formData.quantity} unidades</p>
                  <p><strong>Total:</strong> <strong className="font-bold text-lg">R$ {orderTotals.grandTotal.toFixed(2)}</strong></p>
              </div>

              <div className="bg-blue-50 p-4 sm:p-6 rounded-md shadow-inner text-left space-y-3">
                  <h3 className="text-lg font-semibold text-blue-800 border-b pb-2 mb-3">Instruções para Pagamento via PIX</h3>
                  <p className="text-gray-700">Para agilizar, realize o pagamento e envie o comprovante para nosso WhatsApp.</p>
                  
                  {adminSettings.pixQrBase64 && (
                    <div className="flex justify-center my-4">
                        <img src={adminSettings.pixQrBase64} alt="PIX QR Code" className="max-w-xs w-48 h-48 border rounded-lg p-2 bg-white"/>
                    </div>
                  )}

                  <div className="mt-4 p-4 bg-gray-100 rounded-md space-y-2">
                      {adminSettings.cnpj && <p><strong className="font-semibold">CNPJ:</strong> {adminSettings.cnpj}</p>}
                      {pixToDisplay && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm sm:text-base break-all"><strong className="font-semibold">Chave PIX:</strong> {pixToDisplay}</p>
                            <button onClick={handleCopy} className="mt-2 sm:mt-0 sm:ml-4 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-1 px-3 rounded-md transition-colors whitespace-nowrap">
                                {copyStatus}
                            </button>
                        </div>
                      )}
                  </div>
                  <p className="text-gray-700 mt-4">WhatsApp para comprovante: <strong className="font-semibold">{adminSettings.adminWhatsapp}</strong></p>
                  {adminSettings.orientationVideoUrl && (
                      <p className="text-sm text-gray-600 mt-4">Assista nosso <a href={adminSettings.orientationVideoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">vídeo de orientação</a>.</p>
                  )}
              </div>
              <button onClick={onNewOrder} className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all duration-300">Fazer Novo Pedido</button>
          </div>
      </div>
    </div>
  );
};

export default SuccessPage;
