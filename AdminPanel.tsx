import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
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
    
    // States for AI generator
    const [adminTemplatePrompt, setAdminTemplatePrompt] = useState('Um e-mail simples para notificar o admin sobre um novo pedido, contendo todos os detalhes do cliente e do pedido.');
    const [userTemplatePrompt, setUserTemplatePrompt] = useState('Um e-mail amigável de confirmação para o cliente, agradecendo pela compra. Inclua um resumo do pedido e as instruções de pagamento PIX.');
    const [generatedAdminTemplate, setGeneratedAdminTemplate] = useState('');
    const [generatedUserTemplate, setGeneratedUserTemplate] = useState('');
    const [isGenerating, setIsGenerating] = useState<'admin' | 'user' | null>(null);
    const [generationError, setGenerationError] = useState('');
    const [copied, setCopied] = useState<'admin' | 'user' | ''>('');


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
    
    const getVariablesGuide = (type: 'admin' | 'user'): string => {
        const commonVars = `
            - \`{{nome}}\`: Nome completo do cliente.
            - \`{{whatsapp}}\`: WhatsApp do cliente.
            - \`{{email}}\`: E-mail do cliente.
            - \`{{full_address}}\`: Endereço completo formatado para entrega.
            - \`{{product_name}}\`: Nome do produto.
            - \`{{quantity_text}}\`: Quantidade formatada (ex: "500 unidades (5 pacotes)").
            - \`{{sabores_list}}\`: Lista dos sabores de cada pacote.
            - \`{{subtotal}}\`: Subtotal dos produtos (ex: "126.05").
            - \`{{shipping_cost}}\`: Custo do frete (ex: "25.00").
            - \`{{grand_total}}\`: Valor total do pedido (ex: "151.05").
        `;
        const userOnlyVars = `
            - \`{{user_recipient_email}}\`: E-mail do cliente (use este para o campo "To" no template do cliente).
            - \`{{orientation_video_url}}\`: URL do vídeo de orientação.
            - \`{{admin_whatsapp_contact}}\`: Número de WhatsApp do administrador para contato.
            - \`{{admin_reply_to_email}}\`: E-mail do administrador para resposta.
            - \`{{company_cnpj}}\`: CNPJ da empresa.
            - \`{{pix_key_info}}\`: Chave PIX para pagamento.
        `;
        if (type === 'user') {
            return `Aqui está a lista de variáveis que você pode usar:\n${commonVars}\n${userOnlyVars}`;
        }
        return `Aqui está a lista de variáveis que você pode usar:\n${commonVars}\n- \`{{reply_to}}\`: E-mail do cliente (Use este campo para a configuração 'Reply-To' no seu template de e-mail no EmailJS para que a resposta vá direto para o cliente).`;
    };

    const handleGenerateTemplate = async (type: 'admin' | 'user') => {
        if (!process.env.API_KEY) {
            setGenerationError("A chave da API do Gemini não foi configurada no ambiente.");
            return;
        }
        setIsGenerating(type);
        setGenerationError('');
        if (type === 'admin') setGeneratedAdminTemplate('');
        if (type === 'user') setGeneratedUserTemplate('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const userPrompt = type === 'admin' ? adminTemplatePrompt : userTemplatePrompt;
            const variablesGuide = getVariablesGuide(type);

            const systemInstruction = `Você é um especialista em criar templates de e-mail em HTML para a plataforma EmailJS. Sua tarefa é gerar um código HTML completo e estilizado para um e-mail, baseado na solicitação do usuário. O template DEVE usar as variáveis no formato {{nome_da_variavel}} para inserir dados dinâmicos. O HTML deve ser bem formatado, responsivo e visualmente agradável, usando CSS inline para máxima compatibilidade. Não invente variáveis; use apenas as que são fornecidas na lista. Para variáveis que podem estar vazias (como CNPJ ou vídeo), use a sintaxe de bloco condicional do Handlebars (usada pelo EmailJS): {{#if variavel}}...{{/if}}. Responda APENAS com o código HTML. Não inclua \`\`\`html, explicações ou qualquer outro texto fora do código.\n\n${variablesGuide}`;
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: userPrompt,
                config: {
                    systemInstruction: systemInstruction,
                }
            });

            const template = response.text;
            if (type === 'admin') {
                setGeneratedAdminTemplate(template);
            } else {
                setGeneratedUserTemplate(template);
            }
        } catch (error) {
            console.error("Erro ao gerar template com Gemini:", error);
            const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
            setGenerationError(`Ocorreu um erro ao gerar o template: ${errorMessage}. Verifique o console para mais detalhes.`);
        } finally {
            setIsGenerating(null);
        }
    };

    const handleCopy = (text: string, type: 'admin' | 'user') => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(''), 2500);
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
                        
                        <div className="mt-8 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <details>
                                <summary className="font-semibold text-indigo-800 cursor-pointer hover:text-indigo-600 list-none">
                                    <span className="select-none">Guia de Variáveis para Template (Clique para expandir)</span>
                                </summary>
                                <div className="mt-4 pt-4 border-t border-indigo-200 space-y-4 text-gray-700">
                                <p className="text-sm">Use estas variáveis nos seus templates no site do EmailJS para exibir os dados do pedido. Basta copiar e colar <code>{"{{nome_da_variavel}}"}</code>.</p>
                                <div>
                                    <h5 className="font-semibold text-gray-800">Variáveis Comuns (Admin e Cliente)</h5>
                                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                    <li><code>{"{{nome}}"}</code>: Nome completo do cliente.</li>
                                    <li><code>{"{{whatsapp}}"}</code>: WhatsApp do cliente.</li>
                                    <li><code>{"{{email}}"}</code>: E-mail do cliente (usado como 'reply_to' no e-mail do admin).</li>
                                    <li><code>{"{{full_address}}"}</code>: Endereço completo formatado para entrega.</li>
                                    <li><code>{"{{product_name}}"}</code>: Nome do produto.</li>
                                    <li><code>{"{{quantity_text}}"}</code>: Quantidade formatada (ex: "500 unidades (5 pacotes)").</li>
                                    <li><code>{"{{sabores_list}}"}</code>: Lista dos sabores de cada pacote.</li>
                                    <li><code>{"{{subtotal}}"}</code>: Subtotal dos produtos (ex: "126.05").</li>
                                    <li><code>{"{{shipping_cost}}"}</code>: Custo do frete (ex: "25.00").</li>
                                    <li><code>{"{{grand_total}}"}</code>: Valor total do pedido (ex: "151.05").</li>
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-gray-800">Variáveis Adicionais (Apenas para Template do Cliente)</h5>
                                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                    <li><code>{"{{user_recipient_email}}"}</code>: E-mail do cliente (use este para o campo "To" no template do cliente).</li>
                                    <li><code>{"{{orientation_video_url}}"}</code>: URL do vídeo de orientação.</li>
                                    <li><code>{"{{admin_whatsapp_contact}}"}</code>: Número de WhatsApp do administrador para contato.</li>
                                    <li><code>{"{{admin_reply_to_email}}"}</code>: E-mail do administrador para resposta.</li>
                                    <li><code>{"{{company_cnpj}}"}</code>: CNPJ da empresa.</li>
                                    <li><code>{"{{pix_key_info}}"}</code>: Chave PIX para pagamento.</li>
                                    </ul>
                                </div>
                                <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-md">
                                    <h5 className="font-bold text-yellow-800">Importante: Campos Opcionais</h5>
                                    <p className="text-sm text-yellow-700 mt-1">Para campos que podem não ser preenchidos (como CNPJ ou Vídeo), use blocos condicionais para evitar erros de "variáveis corrompidas". Exemplo:</p>
                                    <pre className="mt-2 p-2 bg-gray-800 text-white rounded-md text-xs overflow-x-auto">
                                    <code>
                                        {'{{#if company_cnpj}}\n'}
                                        {'  <p>Nosso CNPJ: {{company_cnpj}}</p>\n'}
                                        {'{{/if}}'}
                                    </code>
                                    </pre>
                                </div>
                                </div>
                            </details>
                        </div>

                         <div className="mt-8 pt-6 border-t border-blue-300">
                            <details>
                                <summary className="font-semibold text-fuchsia-800 cursor-pointer hover:text-fuchsia-600 list-none flex items-center gap-2 select-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                    <span className="text-lg">Gerador de Template de E-mail com IA</span>
                                </summary>
                                <div className="mt-4 p-4 bg-fuchsia-50 border border-fuchsia-200 rounded-lg space-y-8">
                                    <p className="text-sm text-fuchsia-700">Com dificuldades para criar os templates no EmailJS? Descreva o que você precisa em cada campo abaixo e deixe a IA gerar o código HTML para você. Depois, é só copiar e colar no seu painel do EmailJS.</p>
                                    {generationError && <div className="p-3 my-2 text-sm text-red-800 rounded-lg bg-red-100 border border-red-300" role="alert">{generationError}</div>}
                                    
                                    <div className="space-y-3">
                                        <h5 className="font-semibold text-gray-800">1. Template de Notificação para o Administrador</h5>
                                        <textarea rows={2} placeholder="Ex: Um email formal notificando sobre um novo pedido..." className="block w-full p-2 border rounded-md shadow-sm focus:ring-fuchsia-500 focus:border-fuchsia-500" value={adminTemplatePrompt} onChange={(e) => setAdminTemplatePrompt(e.target.value)} />
                                        <button onClick={() => handleGenerateTemplate('admin')} disabled={isGenerating === 'admin'} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-all disabled:bg-gray-400 disabled:cursor-wait">
                                            {isGenerating === 'admin' ? 'Gerando...' : 'Gerar Template do Admin'}
                                        </button>
                                        {generatedAdminTemplate && (
                                            <div className="mt-3 relative">
                                                <textarea readOnly rows={10} value={generatedAdminTemplate} className="w-full p-3 font-mono text-sm bg-gray-100 border rounded-md resize-y" />
                                                <button onClick={() => handleCopy(generatedAdminTemplate, 'admin')} className="absolute top-2 right-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-2 rounded transition-colors">
                                                    {copied === 'admin' ? 'Copiado!' : 'Copiar'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <h5 className="font-semibold text-gray-800">2. Template de Confirmação para o Cliente</h5>
                                        <textarea rows={2} placeholder="Ex: Um email amigável de confirmação para o cliente..." className="block w-full p-2 border rounded-md shadow-sm focus:ring-fuchsia-500 focus:border-fuchsia-500" value={userTemplatePrompt} onChange={(e) => setUserTemplatePrompt(e.target.value)} />
                                        <button onClick={() => handleGenerateTemplate('user')} disabled={isGenerating === 'user'} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-all disabled:bg-gray-400 disabled:cursor-wait">
                                            {isGenerating === 'user' ? 'Gerando...' : 'Gerar Template do Cliente'}
                                        </button>
                                        {generatedUserTemplate && (
                                            <div className="mt-3 relative">
                                                <textarea readOnly rows={10} value={generatedUserTemplate} className="w-full p-3 font-mono text-sm bg-gray-100 border rounded-md resize-y" />
                                                <button onClick={() => handleCopy(generatedUserTemplate, 'user')} className="absolute top-2 right-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-2 rounded transition-colors">
                                                    {copied === 'user' ? 'Copiado!' : 'Copiar'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </details>
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
