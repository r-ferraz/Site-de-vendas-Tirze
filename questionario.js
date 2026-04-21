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
            const labels = {
                nome: 'Nome',
                whatsapp: 'WhatsApp',
                email: 'E-mail',
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

            window._questionarioRespostasHtml = `<table style="width:100%;border-collapse:collapse">${respostasHtml}</table>`;
            window._questionarioLeadData = { nome: data.nome, email: data.email, whatsapp: data.whatsapp, respostas_triagem: data };

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
        window._questionarioLeadData = { nome: userData.nome, email: userData.email, whatsapp: userData.whatsapp, respostas_triagem: userData };

        const peso = parseFloat(userData.peso);
        const meta = parseFloat(userData.meta_peso) || (peso * 0.85); 
        const altura = parseFloat(userData.altura) / 100;

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
        planDetails.innerHTML = `
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
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 25px; display: flex; flex-direction: column;">
                    <h3 style="font-size: 1.1rem; color: #475569; margin: 0 0 20px 0; display: flex; align-items: center; gap: 8px;">💰 No modelo tradicional</h3>
                    <p style="font-size: 1.4rem; color: #1e293b; font-weight: 800; margin-bottom: 15px;">R$ 2.000 a R$ 3.500/mês</p>
                </div>
                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 20px; padding: 25px; display: flex; flex-direction: column;">
                    <h3 style="font-size: 1.1rem; color: #065f46; margin: 0 0 15px 0;">🧬 Aqui na Maori</h3>
                    <p style="font-size: 0.9rem; color: #065f46;">Você entra em um <strong>tratamento estruturado.</strong></p>
                </div>
            </div>

            <button class="btn btn-primary" style="width: 100%; height: 56px; font-size: 1.1rem; border-radius: 50px; background: #9d4615; color: white;" onclick="
                const lead = window._questionarioLeadData || {};
                const html = window._questionarioRespostasHtml || '';
                const utms = window.getUtmParams ? window.getUtmParams() : {};
                this.innerText = 'Enviando...';
                this.disabled = true;

                fetch('https://n8n.srv1586236.hstgr.cloud/webhook/novo-questionario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tipo: 'Questionário Respondido',
                        lead_id: utms.lead_id || localStorage.getItem('lead_id') || '',
                        nome: lead.nome || 'Cliente',
                        email: lead.email || '',
                        whatsapp: lead.whatsapp || '',
                        respostas_html: html,
                        respostas_triagem: lead.respostas_triagem || {},
                        tipo_origem: 'Questionário',
                        utm_source: utms.utm_source || '',
                        utm_medium: utms.utm_medium || '',
                        utm_campaign: utms.utm_campaign || ''
                    })
                })
                .then(r => r.json())
                .finally(() => {
                    const userDataFinal = lead.respostas_triagem || {};
                    const pV = userDataFinal.peso || '';
                    const mV = userDataFinal.meta_peso || '';
                    const query = '&peso=' + pV + '&meta=' + mV;
                    localStorage.setItem('maori_checkout_lead', JSON.stringify(lead));
                    const target = window.addUtmsToUrl ? window.addUtmsToUrl('pagamento.html') : 'pagamento.html' + window.location.search;
                    window.location.href = target + query;
                });
            ">Garantir meu Plano Personalizado</button>
        `;
    }

    nextBtn.addEventListener('click', nextStep);
    renderStep();
});
