document.addEventListener('DOMContentLoaded', () => {
    if (!window.akinQuestions) {
        console.error('Erro: perguntas não carregadas.');
        return;
    }

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
        
        if (q.type !== 'single') {
            nextBtn.style.display = 'block';
        } else {
            nextBtn.style.display = 'none';
        }
    }

    window.selectOption = (questionId, option, type) => {
        if (type === 'single') {
            userData[questionId] = option;
            nextStep();
        } else {
            if (!userData[questionId]) userData[questionId] = [];
            const idx = userData[questionId].indexOf(option);
            if (idx > -1) userData[questionId].splice(idx, 1);
            else userData[questionId].push(option);
            renderStep();
        }
    };

    async function saveLead(data) {
        try {
            const utms = window.getUtmParams ? window.getUtmParams() : {};
            const response = await fetch('https://n8n.srv1586236.hstgr.cloud/webhook/novo-questionario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: 'Novo Lead - Avaliação Gratuita',
                    lead_id: utms.lead_id || localStorage.getItem('lead_id') || '',
                    nome: data.nome,
                    whatsapp: data.whatsapp,
                    email: data.email,
                    respostas_triagem: data,
                    tipo_origem: 'Questionário',
                    utm_source: utms.utm_source || '',
                    utm_medium: utms.utm_medium || '',
                    utm_campaign: utms.utm_campaign || ''
                })
            });

            const res = await response.json();
            if (res.lead_id) {
                localStorage.setItem('lead_id', res.lead_id);
            }
        } catch (err) {
            console.error('Erro ao salvar lead:', err.message);
        }
    }

    function nextStep() {
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
                if (!val) allFilled = false;
                userData[input.id] = val;
            });
            if (!allFilled) {
                alert('Por favor, preencha todos os campos.');
                return;
            }
            if (q.id === 'contato') saveLead(userData);
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
        const meta = parseFloat(userData.meta_peso) || (peso * 0.85); 
        
        window._questionarioLeadData = { nome: userData.nome, email: userData.email, whatsapp: userData.whatsapp, respostas_triagem: userData };

        const chartContainer = document.getElementById('chart-container');
        chartContainer.innerHTML = '';

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '10';

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "var(--primary-dark)"); 
        path.setAttribute("stroke-width", "3");
        path.setAttribute("stroke-dasharray", "6,6");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        svg.appendChild(path);
        chartContainer.appendChild(svg);

        const targetHeights = [];
        for (let j = 0; j < 5; j++) {
            const stepRatio = j / 4; 
            const currentProjection = meta + (peso - meta) * Math.pow(1 - stepRatio, 1.8);
            const heightPercent = 20 + ((currentProjection - meta) / (peso - meta)) * 80;
            targetHeights.push(heightPercent);

            const barWrapper = document.createElement('div');
            barWrapper.className = 'chart-col-wrapper';
            barWrapper.style.width = '16%';
            barWrapper.style.display = 'flex';
            barWrapper.style.flexDirection = 'column';
            barWrapper.style.alignItems = 'center';
            barWrapper.style.justifyContent = 'flex-end';
            barWrapper.style.height = '100%';

            const label = document.createElement('div');
            label.style.fontSize = '0.9rem';
            label.style.fontWeight = 'bold';
            label.style.color = '#555';
            label.style.marginBottom = '5px';
            label.innerText = `${currentProjection.toFixed(1)}kg`;

            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.height = '0%';
            bar.style.width = '100%';
            bar.style.borderRadius = '8px 8px 0 0';
            bar.style.background = 'var(--primary-blue)';
            bar.style.transition = 'height 1s cubic-bezier(0.4, 0, 0.2, 1)';

            barWrapper.appendChild(label);
            barWrapper.appendChild(bar);
            chartContainer.appendChild(barWrapper);

            setTimeout(() => {
                bar.style.height = `${heightPercent}%`;
            }, j * 200);
        }

        setTimeout(() => {
            const w = chartContainer.clientWidth;
            const h = chartContainer.clientHeight;
            svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
            let d = '';
            const wrappers = chartContainer.querySelectorAll('.chart-col-wrapper');
            wrappers.forEach((el, index) => {
                const rect = el.getBoundingClientRect();
                const containerRect = chartContainer.getBoundingClientRect();
                const x = rect.left - containerRect.left + rect.width / 2;
                const targetY = h - (h * targetHeights[index] / 100); 
                d += (index === 0 ? 'M' : 'L') + ` ${x},${targetY} `;
            });
            path.setAttribute("d", d);
            path.style.transition = 'stroke-dashoffset 2s ease-out';
            path.style.strokeDashoffset = '0';
        }, 100);

        const planDetails = document.getElementById('plan-details');
        
        window._selectedProtocol = { id: '20', price: '1.200' };
        window.selectProtocol = (id, price, el) => {
            window._selectedProtocol = { id, price };
            document.querySelectorAll('.protocol-item').forEach(item => item.classList.remove('active'));
            el.classList.add('active');
                planDetails.innerHTML = `
            <div class="checkout-compact" style="margin-top: 40px;">
                <h3 class="section-subtitle">Seu plano já foi montado agora escolha seu ritmo:</h3>
                
                <div class="protocol-selection">
                    <div class="protocol-item active" onclick="window.selectProtocol('20', '1.200', this)">
                        <div class="protocol-info">
                            <h3>Protocolo Essencial · 20mg</h3>
                            <p>Para quem quer começar com segurança e ritmo consistente</p>
                        </div>
                        <div class="protocol-price">
                            <span class="price-old">R$ 1.500</span>
                            <span class="price-new">R$ 1.200</span>
                        </div>
                    </div>
                    <div class="protocol-item" onclick="window.selectProtocol('60', '2.800', this)">
                        <div class="protocol-info">
                            <h3>Protocolo Completo · 60mg ⭐ Mais escolhido</h3>
                            <p>Para quem quer o resultado completo com suporte de ponta a ponta <br> ✓ 3x mais duração de tratamento</p>
                        </div>
                        <div class="protocol-price">
                            <span class="price-old">R$ 3.500</span>
                            <span class="price-new">R$ 2.800</span>
                        </div>
                    </div>
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Dose semanal</th>
                                <th>Essencial</th>
                                <th>Completa</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>2,5mg</strong></td><td>8 semanas</td><td>24 semanas</td></tr>
                            <tr style="background: #fdfaf7;"><td><strong>5mg (padrão)</strong></td><td>4 semanas</td><td>12 semanas</td></tr>
                            <tr><td><strong>7,5mg</strong></td><td>~3 semanas</td><td>8 semanas</td></tr>
                            <tr style="background: #fdfaf7;"><td><strong>10mg</strong></td><td>2 semanas</td><td>6 semanas</td></tr>
                        </tbody>
                    </table>
                </div>

                <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: left;">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <span style="font-size: 1.2rem;">⚠️</span>
                        <div>
                            <h3 style="color: #92400e; font-size: 1.1rem; margin: 0 0 8px 0; font-weight: 700;">Agora, sendo direto com você</h3>
                            <p style="color: #b45309; font-size: 0.95rem; margin: 0; line-height: 1.5;">Hoje, no mercado tradicional, você tem duas opções: <br><strong>Pagar caro por um tratamento padronizado</strong> ou <strong>seguir um protocolo Maori ajustado ao seu corpo.</strong></p>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 25px; display: flex; flex-direction: column; text-align: left;">
                        <h3 style="font-size: 1.1rem; color: #475569; margin: 0 0 20px 0;">💰 No modelo tradicional</h3>
                        <p style="font-size: 1.4rem; color: #1e293b; font-weight: 800; margin-bottom: 15px;">R$ 2.000 a R$ 3.500/mês</p>
                    </div>
                    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 20px; padding: 25px; display: flex; flex-direction: column; text-align: left;">
                        <h3 style="font-size: 1.1rem; color: #065f46; margin: 0 0 15px 0;">🧬 Aqui na Maori</h3>
                        <p style="font-size: 0.9rem; color: #065f46;">Você entra em um <strong>tratamento estruturado.</strong></p>
                    </div>
                </div>

                <button class="terms-toggle" onclick="document.getElementById('terms-content').style.display = (document.getElementById('terms-content').style.display === 'block' ? 'none' : 'block')">
                    📄 Ver Termos de Responsabilidade
                </button>
                <div id="terms-content" class="terms-content" style="display:none; padding:15px; background:#fdfaf7; border:1px solid #eee; border-radius:10px; font-size:0.8rem; margin-bottom:20px; text-align:left;">
                    <strong>TERMO DE CIÊNCIA E RESPONSABILIDADE</strong><br><br>
                    Ao prosseguir, você declara estar ciente de que o tratamento depende de avaliação médica individualizada e concorda com as diretrizes da Maori Saúde.
                </div>

                <label class="terms-check">
                    <input type="checkbox" id="accept-terms">
                    <span>Li e aceito os termos de responsabilidade.</span>
                </label>

                <div class="checkout-footer" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 15px; margin-top: 20px;">
                    <button class="btn btn-primary" style="height: 64px; font-size: 1rem; border-radius: 50px; background: #9d4615; color: white; display: flex; flex-direction: column; line-height: 1.2;" onclick="window.finalCheckout('20', '1.200', this)">
                        <span>Garantir Tratamento 20mg</span>
                        <small style="font-size: 0.75rem; opacity: 0.9;">Essencial - Iniciar agora</small>
                    </button>
                    <button class="btn btn-primary" style="height: 64px; font-size: 1rem; border-radius: 50px; background: #a44716; color: white; display: flex; flex-direction: column; line-height: 1.2; box-shadow: 0 4px 15px rgba(164, 71, 22, 0.3);" onclick="window.finalCheckout('60', '2.800', this)">
                        <span>Garantir Tratamento 60mg</span>
                        <small style="font-size: 0.75rem; opacity: 0.9;">Completo - Mais Escolhido</small>
                    </button>
                </div>
            </div>
        `;

        window.finalCheckout = (id, price, btn) => {
            if(!document.getElementById('accept-terms').checked) {
                alert('Por favor, aceite os termos de responsabilidade.');
                return;
            }

            const urls = {
                '20': 'https://pay.hypercash.com.br/pt/checkout/c0185f95-2fc4-4fe3-adb5-cb4fb8c966ea',
                '60': 'https://pay.hypercash.com.br/pt/checkout/23fa3778-2c07-44e6-a16e-3b898910c01e'
            };

            const lead = window._questionarioLeadData || {};
            const utms = window.getUtmParams ? window.getUtmParams() : {};
            const originalText = btn.innerHTML;
            btn.innerText = 'Redirecionando...';
            btn.disabled = true;

            fetch('https://n8n.srv1586236.hstgr.cloud/webhook/maori-vendas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: 'Venda Iniciada - Funil Compacto Dual',
                    ...lead,
                    plano_escolhido: id,
                    preco_base: price,
                    ...utms
                })
            }).finally(() => {
                const target = urls[id] || urls['20'];
                window.location.href = window.addUtmsToUrl ? window.addUtmsToUrl(target) : target;
            });
        };ton>
            </div>
        `;
    }

    nextBtn.addEventListener('click', nextStep);
    renderStep();
});
