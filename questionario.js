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
                    whatsapp: data.whatsapp,
                    email: data.email,
                    metadata: data // Full questionnaire progress
                }
            ]);

        if (error) throw error;
        console.log('Lead salvo com sucesso!');
    } catch (err) {
        console.error('Erro ao salvar lead:', err.message);
    }
}

function nextStep() {
    // Collect input data
    const q = questions[currentStep];
    if (q.type === 'input') {
        userData[q.id] = document.getElementById(q.id).value;
    } else if (q.type === 'input_group') {
        q.inputs.forEach(input => {
            userData[input.id] = document.getElementById(input.id).value;
        });

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
            <p>Com o plano Akin, você poderá chegar aos <strong>${meta.toFixed(1)}kg</strong> em aproximadamente 10 meses.</p>
        </div>
        <div style="border: 1px solid #eee; padding: 20px; border-radius: 16px;">
            <h3 style="margin-bottom: 15px;">O que está incluso:</h3>
            <ul style="list-style: none; padding: 0;">
                <li style="margin-bottom:10px;">✅ Medicação GLP-1 (Wegovy/Ozempic)</li>
                <li style="margin-bottom:10px;">✅ Suporte médico via WhatsApp 24/7</li>
                <li style="margin-bottom:10px;">✅ Acompanhamento Nutricional</li>
                <li style="margin-bottom:10px;">✅ Entrega garantida e discreta</li>
            </ul>
            <button class="btn btn-primary" style="margin-top: 20px; width: 100%;" onclick="window.location.href='pagamento.html'">Garantir meu plano - 2x R$ 457,00</button>
        </div>
    `;
}

nextBtn.addEventListener('click', nextStep);
renderStep();
