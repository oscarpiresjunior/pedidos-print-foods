
import React, { useState } from 'react';
import { AdminSettings, ProductDetails, EmailResult } from './types';

interface AdminPanelProps {
    adminSettings: AdminSettings;
    setAdminSettings: React.Dispatch<React.SetStateAction<AdminSettings>>;
    editableProduct: ProductDetails;
    setEditableProduct: React.Dispatch<React.SetStateAction<ProductDetails>>;
    onTestEmail: () => Promise<EmailResult>;
    onExitAdmin: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
    adminSettings, setAdminSettings, editableProduct, setEditableProduct, onTestEmail, onExitAdmin
}) => {
    const [testEmailStatus, setTestEmailStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
    
    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAdminSettings(prev => ({ ...prev, [name]: value as any }));
    };

    const handleProductChange = (field: keyof ProductDetails, value: string | number) => {
        setEditableProduct(prev => ({ ...prev, [field]: field === 'price' ? Number(value) : value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoBase64' | 'pixQrBase64') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setAdminSettings(prev => ({ ...prev, [field]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleTestEmailClick = async () => {
        setTestEmailStatus({ message: 'Enviando...', type: '' });
        const result = await onTestEmail();
        if (result.success) {
            setTestEmailStatus({ message: `Sucesso! E-mail de teste enviado.`, type: 'success' });
        } else {
            setTestEmailStatus({ message: `Falha ao enviar. Detalhe: ${result.error}`, type: 'error' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 font-sans">
            <div className="bg-white p-6 sm:p-10 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-10">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-700">Painel Administrativo</h1>
                    <button onClick={onExitAdmin} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors">Sair</button>
                </header>

                <div className="space-y-8">
                    {/* Gerenciamento de Mídia */}
                    <div className="p-6 bg-blue-50 rounded-lg shadow-md border border-blue-200">
                        <h3 className="text-xl font-semibold text-blue-700 mb-6 border-b pb-3">Gerenciamento de Mídia</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                            <div>
                                <label htmlFor="logoUpload" className="block text-sm font-medium text-gray-700">Logo da Empresa</label>
                                <input type="file" id="logoUpload" accept="image/*" onChange={(e) => handleFileChange(e, 'logoBase64')} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"/>
                                {adminSettings.logoBase64 && <img src={adminSettings.logoBase64} alt="Logo Preview" className="mt-2 h-16 w-auto border rounded p-1"/>}
                            </div>
                            <div>
                                <label htmlFor="pixQrUpload" className="block text-sm font-medium text-gray-700">QR Code do PIX</label>
                                <input type="file" id="pixQrUpload" accept="image/*" onChange={(e) => handleFileChange(e, 'pixQrBase64')} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"/>
                                {adminSettings.pixQrBase64 && <img src={adminSettings.pixQrBase64} alt="PIX QR Code Preview" className="mt-2 h-16 w-16 border rounded p-1"/>}
                            </div>
                        </div>
                    </div>

                    {/* Informações da Loja */}
                    <div className="p-6 bg-blue-50 rounded-lg shadow-md border border-blue-200">
                        <h3 className="text-xl font-semibold text-blue-700 mb-6 border-b pb-3">Informações da Loja e Pagamento</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                            <input type="text" name="cnpj" placeholder="CNPJ da Empresa" value={adminSettings.cnpj} onChange={handleSettingsChange} className="mt-1 block w-full p-2 border rounded-md" />
                            <input type="text" name="pixKey" placeholder="Chave PIX" value={adminSettings.pixKey} onChange={handleSettingsChange} className="mt-1 block w-full p-2 border rounded-md" />
                            <div className="md:col-span-2">
                                <input type="url" name="orientationVideoUrl" placeholder="URL do Vídeo de Orientação" value={adminSettings.orientationVideoUrl} onChange={handleSettingsChange} className="mt-1 block w-full p-2 border rounded-md" />
                            </div>
                        </div>
                    </div>

                     {/* Configurações de Notificação */}
                    <div className="p-6 bg-blue-50 rounded-lg shadow-md border border-blue-200">
                        <h3 className="text-xl font-semibold text-blue-700 mb-6 border-b pb-3">Configurações de Notificação</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 mb-8">
                            <input type="email" name="adminEmail" placeholder="E-mail do Administrador (para resposta)" value={adminSettings.adminEmail} onChange={handleSettingsChange} className="mt-1 block w-full p-2 border rounded-md" />
                            <input type="tel" name="adminWhatsapp" placeholder="WhatsApp do Administrador (com país)" value={adminSettings.adminWhatsapp} onChange={handleSettingsChange} className="mt-1 block w-full p-2 border rounded-md" />
                        </div>

                        <h4 className="text-lg font-semibold text-blue-600 mb-4">Integração com CallMeBot</h4>
                        <input type="text" name="callMeBotApiKey" placeholder="API Key do CallMeBot" value={adminSettings.callMeBotApiKey} onChange={handleSettingsChange} className="mt-1 block w-full p-2 border rounded-md mb-8"/>
                        
                        <h4 className="text-lg font-semibold text-blue-600 mb-4">Integração com EmailJS</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                            <input type="text" name="emailJsServiceId" placeholder="Service ID" value={adminSettings.emailJsServiceId} onChange={handleSettingsChange} className="mt-1 block w-full p-2 border rounded-md" />
                            <input type="text" name="emailJsPublicKey" placeholder="Public Key" value={adminSettings.emailJsPublicKey} onChange={handleSettingsChange} className="mt-1 block w-full p-2 border rounded-md" />
                            <input type="text" name="emailJsTemplateIdAdmin" placeholder="Template ID (Admin)" value={adminSettings.emailJsTemplateIdAdmin} onChange={handleSettingsChange} className="mt-1 block w-full p-2 border rounded-md" />
                            <input type="text" name="emailJsTemplateIdUser" placeholder="Template ID (Cliente)" value={adminSettings.emailJsTemplateIdUser} onChange={handleSettingsChange} className="mt-1 block w-full p-2 border rounded-md" />
                        </div>
                         <div className="mt-6">
                            <button type="button" onClick={handleTestEmailClick} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md shadow-md">Testar E-mail Admin</button>
                            {testEmailStatus.message && <p className={`mt-2 text-sm ${testEmailStatus.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{testEmailStatus.message}</p>}
                        </div>
                    </div>

                    {/* Gerenciamento de Produto */}
                    <div className="p-6 bg-blue-50 rounded-lg shadow-md border border-blue-200">
                        <h3 className="text-xl font-semibold text-blue-700 mb-6 border-b pb-3">Gerenciamento de Produto</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input type="text" value={editableProduct.name} onChange={(e) => handleProductChange('name', e.target.value)} className="mt-1 block w-full p-2 border rounded-md" placeholder="Nome do Produto"/>
                            <input type="number" value={editableProduct.price} onChange={(e) => handleProductChange('price', e.target.value)} className="mt-1 block w-full p-2 border rounded-md" placeholder="Preço"/>
                        </div>
                        <textarea value={editableProduct.description} rows={4} onChange={(e) => handleProductChange('description', e.target.value)} className="mt-1 block w-full p-2 border rounded-md" placeholder="Descrição do Produto"/>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
