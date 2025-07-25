
import React, { useState, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { AdminSettings, ProductDetails } from './types';

interface AdminPanelProps {
    adminSettings: AdminSettings;
    setAdminSettings: React.Dispatch<React.SetStateAction<AdminSettings>>;
    editableProduct: ProductDetails;
    setEditableProduct: React.Dispatch<React.SetStateAction<ProductDetails>>;
    onTestWhatsapp: () => Promise<{ success: boolean; error?: string }>;
    onExitAdmin: () => void;
    supabase: SupabaseClient | null;
}

const modelsToManage = [
  { key: 'modelImageUrlRect22x10', label: 'Retangular 22x10mm' },
  { key: 'modelImageUrlRect30x14', label: 'Retangular 30x14mm' },
  { key: 'modelImageUrlQuadrada20x20', label: 'Quadrada 20x20mm' },
  { key: 'modelImageUrlOval17x25', label: 'Oval 17x25mm' }
];

const MEDIA_BUCKET = 'media';

const AdminPanel: React.FC<AdminPanelProps> = ({
    adminSettings, setAdminSettings, editableProduct, setEditableProduct, 
    onTestWhatsapp, onExitAdmin, supabase
}) => {
    const [testWhatsappStatus, setTestWhatsappStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
    const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
    const [isUploading, setIsUploading] = useState<string | null>(null);

    // State to track initial data to detect unsaved changes
    const [initialSettings, setInitialSettings] = useState<AdminSettings>(adminSettings);
    const [initialProduct, setInitialProduct] = useState<ProductDetails>(editableProduct);

    const hasUnsavedChanges = useMemo(() => {
        return JSON.stringify(adminSettings) !== JSON.stringify(initialSettings) ||
               JSON.stringify(editableProduct) !== JSON.stringify(initialProduct);
    }, [adminSettings, editableProduct, initialSettings, initialProduct]);

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAdminSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleProductChange = (field: keyof ProductDetails, value: string | number) => {
        setEditableProduct(prev => ({ ...prev, [field]: field === 'price' ? Number(value) : value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof AdminSettings) => {
        if (!supabase) {
            setSyncStatus({ message: 'Conexão com Supabase não estabelecida. Verifique o config.ts', type: 'error' });
            return;
        }
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(field);
        setSyncStatus({ message: `Fazendo upload de ${file.name}...`, type: ''});

        const filePath = `public/${field}-${Date.now()}`;
        const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(filePath, file, { upsert: true });

        if (uploadError) {
            setSyncStatus({ message: `Erro no upload: ${uploadError.message}`, type: 'error' });
            setIsUploading(null);
            return;
        }

        const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
        setAdminSettings(prev => ({ ...prev, [field]: data.publicUrl }));
        setSyncStatus({ message: `${file.name} enviado com sucesso!`, type: 'success' });
        setIsUploading(null);
    };

    const handleTestWhatsappClick = async () => {
        setTestWhatsappStatus({ message: 'Enviando teste...', type: '' });
        const result = await onTestWhatsapp();
        if (result.success) {
            setTestWhatsappStatus({ message: `Sucesso! Mensagem de teste enviada.`, type: 'success' });
        } else {
            setTestWhatsappStatus({ message: `Falha ao enviar. Detalhe: ${result.error}`, type: 'error' });
        }
    };

    const handleSaveAndSync = async (): Promise<{ success: boolean }> => {
        setSyncStatus({ message: 'Sincronizando...', type: '' });
        
        if (!supabase) {
            setSyncStatus({ message: 'Erro: Conexão com Supabase não disponível. Verifique as credenciais no arquivo config.ts.', type: 'error' });
            return { success: false };
        }
        
        const settingsToSave = { ...adminSettings, id: 1 };

        const { data: settingsData, error: settingsError } = await supabase.from('settings').upsert(settingsToSave).select().single();
        const { data: productData, error: productError } = await supabase.from('products').upsert(editableProduct).select().single();

        if (settingsError || productError) {
            const errorMsg = settingsError?.message || productError?.message || 'Ocorreu um erro desconhecido.';
            setSyncStatus({ message: `Falha na sincronização: ${errorMsg}`, type: 'error' });
            return { success: false };
        } else {
            if(settingsData) {
                setAdminSettings(settingsData as AdminSettings);
                setInitialSettings(settingsData as AdminSettings);
            }
            if(productData) {
                const typedProductData = productData as ProductDetails;
                setEditableProduct(typedProductData);
                setInitialProduct(typedProductData);
            }
            setSyncStatus({ message: 'Configurações salvas e sincronizadas com sucesso!', type: 'success' });
            setTimeout(() => setSyncStatus({ message: '', type: '' }), 4000);
            return { success: true };
        }
    };

    const handleExitRequest = async () => {
        if (hasUnsavedChanges) {
            if (window.confirm("Você tem alterações não salvas. Deseja salvar antes de sair?")) {
                const { success } = await handleSaveAndSync();
                if (success) {
                    onExitAdmin();
                }
            } else {
                setAdminSettings(initialSettings);
                setEditableProduct(initialProduct);
                onExitAdmin();
            }
        } else {
            onExitAdmin();
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 font-sans">
            <div className="bg-white p-6 sm:p-10 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-10 pb-4 border-b">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-700">Painel Administrativo</h1>
                    <div className="flex items-center space-x-4">
                        <button
                            type="button"
                            onClick={handleSaveAndSync}
                            disabled={!supabase || isUploading !== null || !hasUnsavedChanges}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-md shadow-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Salvar Alterações
                        </button>
                        <button onClick={handleExitRequest} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors">
                            Sair
                        </button>
                    </div>
                </header>

                <div className="space-y-8">
                    {/* Sincronização na Nuvem */}
                    <div className="p-6 bg-amber-50 rounded-lg shadow-md border border-amber-300">
                        <h3 className="text-xl font-semibold text-amber-800 mb-4 border-b pb-3">Sincronização na Nuvem (Supabase)</h3>
                        
                        {!supabase ? (
                             <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-800">
                                <p className="font-bold">Conexão Falhou!</p>
                                <p className="text-sm mt-1">Verifique se a URL e a Chave Anon do Supabase estão corretamente preenchidas no arquivo <strong>config.ts</strong>.</p>
                            </div>
                        ) : (
                             <div className="p-4 bg-green-100 border-l-4 border-green-500 text-green-800">
                                <p className="font-bold">Conectado ao Supabase!</p>
                                <p className="text-sm mt-1">A aplicação está pronta para sincronizar os dados na nuvem. Clique no botão "Salvar Alterações" no topo para guardar seu trabalho.</p>
                            </div>
                        )}

                        <div className="mt-4">
                             {syncStatus.message && <p className={`text-sm font-medium ${syncStatus.type === 'success' ? 'text-green-700' : syncStatus.type === 'error' ? 'text-red-700' : 'text-gray-800'}`}>{syncStatus.message}</p>}
                        </div>
                    </div>

                    {/* Gerenciamento de Mídia */}
                    <div className="p-6 bg-blue-50 rounded-lg shadow-md border border-blue-200">
                        <h3 className="text-xl font-semibold text-blue-700 mb-6 border-b pb-3">Gerenciamento de Mídia Principal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                            <div>
                                <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">Logo da Empresa</label>
                                <input type="file" id="logoUrl" accept="image/*" onChange={(e) => handleFileChange(e, 'logoUrl')} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" disabled={isUploading !== null || !supabase}/>
                                {adminSettings.logoUrl && <img src={adminSettings.logoUrl} alt="Logo Preview" className="mt-2 h-16 w-auto border rounded p-1"/>}
                                {isUploading === 'logoUrl' && <p className="text-sm text-blue-600 mt-2">Enviando...</p>}
                            </div>
                            <div>
                                <label htmlFor="pixQrUrl" className="block text-sm font-medium text-gray-700">QR Code do PIX</label>
                                <input type="file" id="pixQrUrl" accept="image/*" onChange={(e) => handleFileChange(e, 'pixQrUrl')} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" disabled={isUploading !== null || !supabase}/>
                                {adminSettings.pixQrUrl && <img src={adminSettings.pixQrUrl} alt="PIX QR Code Preview" className="mt-2 h-16 w-16 border rounded p-1"/>}
                                {isUploading === 'pixQrUrl' && <p className="text-sm text-blue-600 mt-2">Enviando...</p>}
                            </div>
                        </div>
                    </div>
                    
                    {/* Gerenciamento de Mídia dos Modelos */}
                    <div className="p-6 bg-blue-50 rounded-lg shadow-md border border-blue-200">
                        <h3 className="text-xl font-semibold text-blue-700 mb-6 border-b pb-3">Imagens dos Modelos de Etiqueta</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                           {modelsToManage.map(model => (
                             <div key={model.key}>
                                <label htmlFor={model.key} className="block text-sm font-medium text-gray-700">{model.label}</label>
                                <input type="file" id={model.key} accept="image/*" onChange={(e) => handleFileChange(e, model.key as keyof AdminSettings)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" disabled={isUploading !== null || !supabase}/>
                                {adminSettings[model.key as keyof AdminSettings] && <img src={adminSettings[model.key as keyof AdminSettings] as string} alt={`${model.label} Preview`} className="mt-2 h-16 w-auto border rounded p-1"/>}
                                {isUploading === model.key && <p className="text-sm text-blue-600 mt-2">Enviando...</p>}
                            </div>
                           ))}
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
                        <h3 className="text-xl font-semibold text-blue-700 mb-6 border-b pb-3">Configurações de Notificação por WhatsApp</h3>
                        
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-900">
                            <p><strong className="font-bold">Como configurar:</strong></p>
                            <ol className="list-decimal list-inside mt-2 space-y-1">
                                <li>Acesse <a href="https://www.callmebot.com/" target="_blank" rel="noopener noreferrer" className="font-bold underline">CallMeBot</a> e obtenha sua API Key para WhatsApp.</li>
                                <li>Adicione o número do bot aos seus contatos e envie a mensagem de ativação, como instruído no site.</li>
                                <li>Insira sua API Key e os números de WhatsApp dos administradores abaixo.</li>
                            </ol>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 mb-8">
                            <div>
                                <label htmlFor="adminWhatsapp" className="block text-sm font-medium text-gray-700">WhatsApp do Admin 1</label>
                                <input id="adminWhatsapp" type="tel" name="adminWhatsapp" placeholder="Nº com código do país (Ex: 55119...)" value={adminSettings.adminWhatsapp} onChange={handleSettingsChange} className="mt-1 block w-full p-2 border rounded-md" />
                            </div>
                             <div>
                                <label htmlFor="adminWhatsapp2" className="block text-sm font-medium text-gray-700">WhatsApp do Admin 2 (Opcional)</label>
                                <input id="adminWhatsapp2" type="tel" name="adminWhatsapp2" placeholder="Nº com código do país (Ex: 55219...)" value={adminSettings.adminWhatsapp2} onChange={handleSettingsChange} className="mt-1 block w-full p-2 border rounded-md" />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="callMeBotApiKey" className="block text-sm font-medium text-gray-700">API Key do CallMeBot</label>
                                <input id="callMeBotApiKey" type="text" name="callMeBotApiKey" placeholder="Sua API Key do CallMeBot" value={adminSettings.callMeBotApiKey} onChange={handleSettingsChange} className="mt-1 block w-full p-2 border rounded-md"/>
                            </div>
                        </div>
                        
                        <div className="mt-6">
                            <button type="button" onClick={handleTestWhatsappClick} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md shadow-md">Testar Notificação WhatsApp</button>
                            {testWhatsappStatus.message && <p className={`mt-2 text-sm ${testWhatsappStatus.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{testWhatsappStatus.message}</p>}
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
