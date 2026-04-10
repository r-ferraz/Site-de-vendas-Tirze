const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Configurações
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    const IS_SANDBOX = process.env.ASAAS_ENVIRONMENT === 'sandbox';
    const ASAAS_URL = IS_SANDBOX ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

    if (!ASAAS_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        return res.status(500).json({ error: 'Environment variables missing on Vercel' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );

    try {
        const { customer, payment, temReceita, whatsapp, produto } = req.body;

        // 1. Criar Cliente no Asaas
        const customerResponse = await axios.post(`${ASAAS_URL}/customers`, customer, {
            headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' }
        });
        const customerId = customerResponse.data.id;

        // 2. Criar Cobrança
        const paymentData = { ...payment, customer: customerId };
        if (paymentData.creditCard && paymentData.creditCard.cvv) {
            paymentData.creditCard.ccv = paymentData.creditCard.cvv;
        }

        const paymentResponse = await axios.post(`${ASAAS_URL}/payments`, paymentData, {
            headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' }
        });

        // 3. Persistência Supabase
        await supabase
            .from('clientes')
            .insert([{
                nome: customer.name,
                email: customer.email,
                cpf: customer.cpfCnpj,
                whatsapp: whatsapp || customer.phone,
                produto: produto || 'Plano Maori',
                tem_receita: temReceita === 'sim',
                payment_id: paymentResponse.data.id,
                status: 'aprovado'
            }]);

        // 4. WhatsApp Automation (UAZAPI)
        await enviarWhatsApp({
            whatsapp: whatsapp || customer.phone,
            nome: customer.name,
            produto: produto || 'Plano Maori',
            temReceita: temReceita === 'sim'
        });

        return res.status(200).json({
            success: true,
            paymentId: paymentResponse.data.id,
            status: paymentResponse.data.status
        });

    } catch (error) {
        console.error('[API-ERROR]', error.response?.data || error.message);
        return res.status(400).json({
            success: false,
            error: error.response?.data?.errors?.[0]?.description || 'Erro no processamento'
        });
    }
};

async function enviarWhatsApp({ whatsapp, nome, produto, temReceita }) {
    try {
        const numeroLimpo = whatsapp.replace(/\D/g, '');
        const mensagem = temReceita ? 
            `Oi, ${nome}, tudo bem?\nSeja bem-vindo à Maori.\nRecebemos sua receita e o pagamento do seu tratamento (${produto}), e já fizemos a validação inicial por aqui...\nPosso te enviar os horários disponíveis?` :
            `Oi, ${nome}, tudo bem?\nSeja bem-vindo à Maori.\nRecebemos o pagamento do seu tratamento (${produto}) e já iniciamos seu onboarding por aqui...\nPosso te enviar os horários disponíveis?`;

        await axios.post(process.env.UAZAPI_URL, {
            number: `55${numeroLimpo}`,
            options: { delay: 1200, presence: "composing" },
            textMessage: { text: mensagem }
        }, {
            headers: { 'apikey': process.env.UAZAPI_KEY, 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('[WA-ERROR]', err.message);
    }
}
