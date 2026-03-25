const questions = window.akinQuestions;
let currentStep = 0;
let userData = {};

const stepContent = document.getElementById('step-content');
const nextBtn = document.getElementById('next-btn');
const progressBar = document.querySelector('.progress-bar');
const questionnaireBox = document.getElementById('questionnaire-box');
const resultsBox = document.getElementById('results-box');

function renderStep() {
    const q = questions[currentStep];

    // Check condition
    if (q.condition && !q.condition(userData)) {
        currentStep++;
        renderStep();
        return;
    }

    progressBar.style.width = `${((currentStep + 1) / questions.length) * 100}%`;

    let html = `<h2 class="q-title">${q.question}</h2>`;
    if (q.description) html += `<p style="text-align:center; color:#666; margin-top:-20px; margin-bottom:20px;">${q.description}</p>`;

    html += `<div class="q-options">`;

    if (q.type === 'single' || q.type === 'multiple' || q.type === 'multiple_grid') {
        q.options.forEach(opt => {
            const isSelected = userData[q.id] && (Array.isArray(userData[q.id]) ? userData[q.id].includes(opt) : userData[q.id] === opt);
            html += `
                <div class="option-btn ${isSelected ? 'selected' : ''}" onclick="window.selectOption('${q.id}', '${opt}', '${q.type}')">
                    ${opt}
                </div>
            `;
        });
    } else if (q.type === 'input') {
        html += `<input type="${q.inputType}" id="${q.id}" class="q-input" placeholder="${q.placeholder || ''}" value="${userData[q.id] || ''}">`;
    } else if (q.type === 'input_group') {
        q.inputs.forEach(input => {
            html += `
                <div class="input-group">
                    <label style="display:block; margin-bottom:5px; font-weight:500;">${input.label}</label>
                    <input type="${input.type}" id="${input.id}" class="q-input" placeholder="${input.placeholder}" value="${userData[input.id] || ''}">
                </div>
            `;
        });
    }

    html += `</div>`;
    stepContent.innerHTML = html;
}

window.selectOption = (id, value, type) => {
    if (type === 'single') {
        userData[id] = value;
        setTimeout(nextStep, 300);
    } else {
        if (!userData[id]) userData[id] = [];
        if (userData[id].includes(value)) {
            userData[id] = userData[id].filter(v => v !== value);
        } else {
            userData[id].push(value);
        }
    }
    renderStep();
};

// Supabase Configuration
const SUPABASE_URL = 'https://pzewkvmaewnijwhxkqaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6ZXdrdm1hZXduaWp3aHhrcWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjk0ODQsImV4cCI6MjA4ODc0NTQ4NH0.a42vFvm5vUcZ3euBUoNW_QuWM9MKPW2W7ZvcCyl_P4Y';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

async function saveLead(data) {
    if (!supabaseClient) {
        console.warn('Supabase not initialized');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('leads')
            .insert([
                {
                    nome: data.nome || 'Cliente Questionário',
                    whatsapp: data.whatsapp,
                    email: data.email,
                    status: 'Novo',
                    tipo_origem: 'Questionário',
                    metadata: data
                }
            ]);

        if (error) throw error;
        console.log('Lead salvo com sucesso!');

        // --- Monta o resumo das respostas para o email ---
        const labels = {
            objetivos: 'Objetivos',
            tratamento_anterior: 'Tratamento anterior?',
            tentativas_anteriores: 'Já tentou',
            tempo_tentativa: 'Tempo tentando emagrecer',
            desafios: 'Maiores desafios',
            nome: 'Nome',
            whatsapp: 'WhatsApp',
            email: 'E-mail',
            data_nasc: 'Data de nascimento',
            sexo: 'Sexo biológico',
            peso: 'Peso (kg)',
            altura: 'Altura (cm)',
            target: 'Tem meta de peso?',
            meta_peso: 'Meta de peso (kg)',
            saude_historico: 'Histórico de saúde',
            bariatrica: 'Cirurgia bariátrica?',
            preferencia: 'Prioridade no tratamento'
        };

        let respostasHtml = '';
        Object.entries(labels).forEach(([key, label]) => {
            const valor = data[key];
            if (!valor) return;
            const display = Array.isArray(valor) ? valor.join(', ') : valor;
            const bg = respostasHtml.split('<tr').length % 2 === 0 ? '#f9f9f9' : 'white';
            respostasHtml += `<tr style="background:${bg}"><td style="padding:8px;color:#555;width:200px">${label}</td><td style="padding:8px;font-weight:500">${display}</td></tr>`;
        });

        // Salva o HTML de respostas para enviar ao clicar em 'Quero meu plano'
        window._questionarioRespostasHtml = `<table style="width:100%;border-collapse:collapse">${respostasHtml}</table>`;
        window._questionarioLeadData = { nome: data.nome, email: data.email, whatsapp: data.whatsapp };

    } catch (err) {
        console.error('Erro ao salvar lead:', err.message);
    }
}


function nextStep() {
    // Collect input data
    const q = questions[currentStep];
    if (q.type === 'input') {
        const inputVal = document.getElementById(q.id).value;
        if (!inputVal) {
            alert('Por favor, preencha este campo.');
            return;
        }
        userData[q.id] = inputVal;
    } else if (q.type === 'input_group') {
        let allFilled = true;
        q.inputs.forEach(input => {
            const val = document.getElementById(input.id).value;
            if (!val) {
                allFilled = false;
            }
            userData[input.id] = val;
        });

        if (!allFilled) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        // If this is the contact step, save the lead immediately
        if (q.id === 'contato') {
            saveLead(userData);
        }
    }

    if (currentStep < questions.length - 1) {
        currentStep++;
        renderStep();
    } else {
        showResults();
    }
}

function showResults() {
    questionnaireBox.style.display = 'none';
    resultsBox.style.display = 'block';

    // --- Salva TODOS os dados do questionário neste momento (completo) ---
    const labels = {
        objetivos: 'Objetivos',
        tratamento_anterior: 'Tratamento anterior?',
        tentativas_anteriores: 'Já tentou',
        tempo_tentativa: 'Tempo tentando emagrecer',
        desafios: 'Maiores desafios',
        nome: 'Nome',
        whatsapp: 'WhatsApp',
        email: 'E-mail',
        data_nasc: 'Data de nascimento',
        sexo: 'Sexo biológico',
        peso: 'Peso (kg)',
        altura: 'Altura (cm)',
        target: 'Tem meta de peso?',
        meta_peso: 'Meta de peso (kg)',
        saude_historico: 'Histórico de saúde',
        bariatrica: 'Cirurgia bariátrica?',
        preferencia: 'Prioridade no tratamento'
    };
    let rows = '';
    let i = 0;
    Object.entries(labels).forEach(([key, label]) => {
        const valor = userData[key];
        if (!valor) return;
        const display = Array.isArray(valor) ? valor.join(', ') : valor;
        const bg = i++ % 2 === 0 ? 'white' : '#f9f9f9';
        rows += `<tr style="background:${bg}"><td style="padding:10px;color:#555;width:200px;font-weight:500">${label}</td><td style="padding:10px">${display}</td></tr>`;
    });
    window._questionarioRespostasHtml = `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif">${rows}</table>`;
    window._questionarioLeadData = { nome: userData.nome, email: userData.email, whatsapp: userData.whatsapp };

    const peso = parseFloat(userData.peso);
    const meta = parseFloat(userData.meta_peso) || (peso * 0.85); // Default 15% loss
    const altura = parseFloat(userData.altura) / 100;
    const imc = (peso / (altura * altura)).toFixed(1);

    // Generate Evolution Chart
    const chartContainer = document.getElementById('chart-container');
    chartContainer.innerHTML = '';

    // 10 month projection
    for (let i = 0; i < 11; i++) {
        // Clinical curve for GLP-1: faster at start, then tapers
        // Weight(t) = Target + (Start - Target) * exp(-k * t)
        const k = 0.25;
        const currentProjection = meta + (peso - meta) * Math.exp(-k * (i / 2));
        const heightPercent = (currentProjection / peso) * 100;

        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = '0%';
        chartContainer.appendChild(bar);

        setTimeout(() => {
            bar.style.height = `${heightPercent}%`;
        }, i * 100);
    }

    const planDetails = document.getElementById('plan-details');
    planDetails.innerHTML = `
        <div style="text-align: center; background: var(--accent-blue); padding: 20px; border-radius: 16px; margin-bottom: 20px;">
            <p style="font-size: 1.1rem;">Seu IMC é <strong>${imc}</strong></p>
            <p>Com o plano Maori, você poderá chegar aos <strong>${meta.toFixed(1)}kg</strong> em aproximadamente 10 meses.</p>
        </div>
        <div style="border: 1px solid #eee; padding: 20px; border-radius: 16px;">
            <h3 style="margin-bottom: 15px;">O que está incluso:</h3>
            <ul style="list-style: none; padding: 0;">
                <li style="margin-bottom:10px;">✅ Medicação GLP-1 (Wegovy/Ozempic)</li>
                <li style="margin-bottom:10px;">✅ Suporte médico via WhatsApp 24/7</li>
                <li style="margin-bottom:10px;">✅ Acompanhamento Nutricional</li>
                <li style="margin-bottom:10px;">✅ Entrega garantida e discreta</li>
            </ul>
            <button class="btn btn-primary" style="margin-top: 20px; width: 100%;" onclick="
                const lead = window._questionarioLeadData || {};
                const html = window._questionarioRespostasHtml || '';
                fetch('https://n8n.akinconsultoria.com.br/webhook/novo-questionario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tipo: 'Questionário Respondido',
                        nome: lead.nome || 'Cliente',
                        email: lead.email || '',
                        whatsapp: lead.whatsapp || '',
                        respostas_html: html
                    })
                }).catch(e => console.warn('[n8n]', e)).finally(() => {
                    window.location.href = 'pagamento.html';
                });
            ">Garantir meu plano - 2x R$ 457,00</button>
        </div>
    `;
}

nextBtn.addEventListener('click', nextStep);
renderStep();
