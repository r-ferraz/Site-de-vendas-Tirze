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
        if (currentStep >= questions.length) {
            showResults();
            return;
        }
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
            html += `
                <div class="input-group">
                    <input type="${q.inputType}" id="${q.id}" class="q-input" style="width: 100%; display: block;" placeholder="${q.placeholder || ''}" value="${userData[q.id] || ''}">
                </div>
            `;
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
            if (questionId === 'target' && option === 'Não') {
                saveLead(userData);
                const targetUrl = window.addUtmsToUrl ? window.addUtmsToUrl('oferta.html') : 'oferta.html' + window.location.search;
                setTimeout(() => { window.location.href = targetUrl; }, 800);
                return;
            }
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
            const response = await fetch('https://n8n.akinconsultoria.com.br/webhook/novo-questionario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: data.tipo || 'Novo Lead - Avaliação Gratuita',
                    lead_id: utms.lead_id || localStorage.getItem('lead_id') || '',
                    nome: data.nome,
                    whatsapp: data.whatsapp,
                    email: data.email,
                    // Flatten key answers for easier n8n mapping
                    peso: data.peso || '',
                    meta_peso: data.meta_peso || '',
                    objetivos: Array.isArray(data.objetivos) ? data.objetivos.join(', ') : (data.objetivos || ''),
                    desafios: Array.isArray(data.desafios) ? data.desafios.join(', ') : (data.desafios || ''),
                    tempo_tentativa: data.tempo_tentativa || '',
                    sexo: data.sexo || '',
                    resumo_completo: (window.akinQuestions || []).map(q => {
                        const val = data[q.id];
                        if (!val) return null;
                        const label = Array.isArray(val) ? val.join(', ') : val;
                        return `${q.id.toUpperCase()}: ${label}`;
                    }).filter(x => x).join('\n'),
                    respostas: data,
                    origem: 'Questionário',
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

            // Validação de Peso Real
            if (userData.peso && parseFloat(userData.peso) <= 10) {
                alert('Por favor, insira um peso real (maior que 10kg).');
                return;
            }

            // Validação de Dados de Contato
            if (q.id === 'contato') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(userData.email)) {
                    alert('Por favor, insira um e-mail válido.');
                    return;
                }

                const phoneDigits = userData.whatsapp.replace(/\D/g, '');
                if (phoneDigits.length < 10) {
                    alert('Por favor, insira um número de WhatsApp válido (com DDD).');
                    return;
                }
                saveLead({ ...userData, tipo: 'Novo Lead Rápido - ' + userData.nome });
            }
        }

        // Validação de Meta de Peso Real
        if (q.id === 'meta_peso') {
            const metaVal = parseFloat(document.getElementById('meta_peso').value);
            if (metaVal <= 10) {
                alert('Por favor, insira um peso real. Caso vc não saiba seu peso atual, inclua o último peso que vc se lembra');
                return;
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
        // Envia os dados finais (incluindo peso, meta, etc)
        saveLead({ ...userData, tipo: 'Questionário Respondido - ' + userData.nome });

        questionnaireBox.style.display = 'none';
        resultsBox.style.display = 'block';

        const peso = parseFloat(userData.peso);
        const meta = parseFloat(userData.meta_peso) || (peso * 0.85); 
        
        window._questionarioLeadData = { 
            nome: userData.nome, 
            email: userData.email, 
            whatsapp: userData.whatsapp, 
            respostas_triagem: userData 
        };

        const resultsTitle = document.getElementById('results-title');
        const evolutionSection = document.getElementById('evolution-section');
        
        if (userData.target === 'Sim') {
            if (evolutionSection) evolutionSection.style.display = 'block';
            if (resultsTitle) resultsTitle.style.display = 'block';
            
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
                label.style.fontSize = '0.75rem';
                label.style.fontWeight = '700';
                label.style.color = '#555';
                label.style.marginBottom = '5px';
                label.innerText = `${currentProjection.toFixed(1)}kg`;

                const bar = document.createElement('div');
                bar.className = 'chart-bar';
                bar.style.height = '0%';
                bar.style.width = '100%';
                bar.style.borderRadius = '8px 8px 0 0';
                bar.style.background = '#9d4615'; // Brown
                bar.style.transition = 'height 1s cubic-bezier(0.4, 0, 0.2, 1)';

                barWrapper.appendChild(label);
                barWrapper.appendChild(bar);
                chartContainer.appendChild(barWrapper);

                setTimeout(() => bar.style.height = `${heightPercent}%`, j * 150);
            }

            setTimeout(() => {
                const containerW = chartContainer.clientWidth;
                const containerH = chartContainer.clientHeight;
                svg.setAttribute("viewBox", `0 0 ${containerW} ${containerH}`);

                let points = "";
                const wrappers = chartContainer.querySelectorAll('.chart-col-wrapper');
                wrappers.forEach((wrp, idx) => {
                    const bx = wrp.offsetLeft + (wrp.clientWidth / 2);
                    const by = containerH - (containerH * (targetHeights[idx] / 100));
                    points += (idx === 0 ? "M" : " L") + `${bx},${by}`;
                });
                path.setAttribute("d", points);
                path.style.strokeDashoffset = '1000';
                path.style.strokeDasharray = '1000';
                path.style.transition = 'stroke-dashoffset 2s ease-out';
                path.style.strokeDashoffset = '0';
            }, 300);
        } else {
            if (evolutionSection) evolutionSection.style.display = 'none';
            if (resultsTitle) resultsTitle.style.display = 'none';
        }

        const planDetails = document.getElementById('plan-details');
        
        // Define global helpers
        window._selectedProtocol = { id: '20', price: '1.200' };
        
        window.selectProtocol = (id, price, el) => {
            window._selectedProtocol = { id, price };
            document.querySelectorAll('.protocol-item').forEach(item => item.classList.remove('active'));
            el.classList.add('active');
        };

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
            btn.innerText = 'Redirecionando...';
            btn.disabled = true;

            fetch('https://n8n.akinconsultoria.com.br/webhook/maori-vendas', {
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
        };

        // Render HTML
        planDetails.innerHTML = `
            <div class="checkout-compact" style="margin-top: 40px;">
                <h3 class="section-subtitle">Seu plano já foi montado, agora escolha seu ritmo:</h3>
                
                <div class="protocol-selection">
                    <div class="protocol-item active" onclick="window.selectProtocol('20', '1.200', this)">
                        <div class="protocol-info">
                            <h3>Plano Essencial · 20mg</h3>
                            <p>Para quem quer começar com segurança e ritmo consistente</p>
                        </div>
                        <div class="protocol-price">
                            <span class="price-old">R$ 1.500</span>
                            <span class="price-new">R$ 1.200</span>
                        </div>
                    </div>
                    <div class="protocol-item" onclick="window.selectProtocol('60', '2.800', this)">
                        <div class="protocol-info">
                            <h3>Plano Completo · 60mg ⭐ Mais escolhido</h3>
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
                            <tr><td><strong>7,5mg</strong></td><td>3 semanas</td><td>8 semanas</td></tr>
                            <tr style="background: #fdfaf7;"><td><strong>10mg</strong></td><td>2 semanas</td><td>6 semanas</td></tr>
                        </tbody>
                    </table>
                </div>

                <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: left;">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <div>
                            <h3 style="color: #92400e; font-size: 1.1rem; margin: 0 0 8px 0; font-weight: 700;">Agora, sendo direto com você</h3>
                            <p style="color: #b45309; font-size: 0.95rem; margin: 0; line-height: 1.5;">Hoje, no mercado tradicional, você tem duas opções: <br><strong>Pagar caro por um tratamento padronizado</strong> ou <strong>seguir um Plano Maori ajustado ao seu corpo.</strong></p>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 30px;">
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 25px; display: flex; flex-direction: column; text-align: left;">
                        <h3 style="font-size: 1.1rem; color: #475569; margin: 0 0 15px 0;">🧬 Aqui na Maori</h3>
                        <p style="font-size: 0.9rem; color: #64748b;">Você entra em um <strong>tratamento estruturado.</strong></p>
                    </div>
                </div>

                <div id="terms-modal" class="modal-overlay" onclick="if(event.target === this) window.closeTermsModal()">
                    <div class="modal-container">
                        <button class="modal-close" onclick="window.closeTermsModal()">&times;</button>
                        <h3 style="font-family: 'Lora', serif; color: var(--primary); margin-bottom: 20px;">TERMO DE CIÊNCIA, CONSENTIMENTO E RESPONSABILIDADE</h3>
                        <div style="font-size: 0.85rem; line-height: 1.6; color: var(--text-main); padding-right: 10px;">
                            <p>Pelo presente instrumento, o paciente declara que leu, compreendeu e concorda integralmente com as condições abaixo, ao iniciar ou dar continuidade ao acompanhamento junto à Maori:</p>
                            
                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">1. OBJETO</h4>
                            <p>O presente termo tem como objeto a prestação de serviços de natureza médica e assistencial, consistentes em avaliação, acompanhamento e definição de condutas clínicas individualizadas, baseadas em critérios técnicos, científicos e na individualidade biológica do paciente.</p>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">2. NATUREZA DA ATIVIDADE</h4>
                            <p>A Maori atua exclusivamente como clínica médica, não exercendo atividades de comércio, dispensação, armazenamento ou distribuição de medicamentos, em conformidade com a legislação vigente e normas éticas aplicáveis à prática médica.</p>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">3. PRESCRIÇÃO MÉDICA</h4>
                            <p>O paciente declara estar ciente de que:</p>
                            <ul style="padding-left: 20px;">
                                <li>I. Eventuais prescrições decorrem de avaliação clínica individualizada</li>
                                <li>II. São realizadas por profissionais legalmente habilitados</li>
                                <li>III. Não garantem resultado específico, estando sujeitas à resposta individual do organismo</li>
                            </ul>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">4. FORNECIMENTO POR TERCEIROS</h4>
                            <p>O paciente reconhece e concorda que:</p>
                            <ul style="padding-left: 20px;">
                                <li>I. A eventual manipulação ou fornecimento de substâncias prescritas será realizada por farmácias ou laboratórios parceiros, devidamente regularizados perante os órgãos competentes</li>
                                <li>II. Tais estabelecimentos são integralmente responsáveis pela produção, controle de qualidade, armazenamento e dispensação dos produtos</li>
                                <li>III. A Maori não possui ingerência sobre os processos internos desses terceiros</li>
                            </ul>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">5. CONFORMIDADE REGULATÓRIA</h4>
                            <p>Todo o fluxo clínico e de prescrição observa rigorosamente:</p>
                            <ul style="padding-left: 20px;">
                                <li>I. Normas da Agência Nacional de Vigilância Sanitária (ANVISA)</li>
                                <li>II. Código de Ética Médica</li>
                                <li>III. Demais legislações sanitárias e regulatórias aplicáveis</li>
                            </ul>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">6. RESPONSABILIDADES DO PACIENTE</h4>
                            <p>O paciente se compromete a:</p>
                            <ul style="padding-left: 20px;">
                                <li>I. Fornecer informações verídicas, completas e atualizadas sobre seu estado de saúde</li>
                                <li>II. Informar o uso de medicamentos, suplementos ou tratamentos paralelos</li>
                                <li>III. Seguir corretamente as orientações médicas</li>
                                <li>IV. Não utilizar substâncias prescritas de forma diversa da recomendada</li>
                            </ul>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">7. LIMITAÇÃO DE RESPONSABILIDADE</h4>
                            <p>A Maori não se responsabiliza por:</p>
                            <ul style="padding-left: 20px;">
                                <li>I. Uso inadequado ou em desacordo com a prescrição médica</li>
                                <li>II. Aquisição de substâncias por canais não indicados</li>
                                <li>III. Intercorrências decorrentes de omissão de informações pelo paciente</li>
                                <li>IV. Atos, falhas ou produtos fornecidos por terceiros (farmácias ou laboratórios)</li>
                            </ul>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">8. AUSÊNCIA DE GARANTIA DE RESULTADOS</h4>
                            <p>O paciente declara estar ciente de que os resultados clínicos podem variar conforme fatores individuais, não havendo garantia de resultado específico, uma vez que a resposta terapêutica depende de múltiplas variáveis biológicas e comportamentais.</p>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">9. CONSENTIMENTO LIVRE E ESCLARECIDO</h4>
                            <p>O paciente declara que:</p>
                            <ul style="padding-left: 20px;">
                                <li>I. Recebeu informações claras sobre a natureza do acompanhamento</li>
                                <li>II. Teve a oportunidade de esclarecer dúvidas</li>
                                <li>III. Está ciente dos benefícios, riscos e limitações do tratamento</li>
                            </ul>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">10. AUTONOMIA E DECISÃO</h4>
                            <p>O paciente reconhece que a decisão de iniciar, manter ou interromper qualquer conduta terapêutica é realizada de forma livre e consciente, podendo, a qualquer momento, optar pela descontinuidade do acompanhamento.</p>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">11. PROTEÇÃO DE DADOS (LGPD)</h4>
                            <p>O paciente autoriza o tratamento de seus dados pessoais e sensíveis, incluindo dados de saúde, para fins de prestação de serviços médicos, acompanhamento clínico e cumprimento de obrigações legais e regulatórias, nos termos da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados). A Maori se compromete a adotar medidas técnicas e administrativas adequadas para garantir a segurança, confidencialidade e integridade das informações.</p>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">12. TELEATENDIMENTO (QUANDO APLICÁVEL)</h4>
                            <p>O paciente declara estar ciente de que atendimentos poderão ocorrer por meio de telemedicina, nos termos da regulamentação vigente, reconhecendo suas limitações e concordando com esse formato quando utilizado.</p>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">13. VIGÊNCIA</h4>
                            <p>O presente termo passa a vigorar a partir do aceite do paciente, sendo aplicável durante todo o período de acompanhamento junto à Maori.</p>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">14. FORO</h4>
                            <p>Para dirimir quaisquer dúvidas ou controvérsias oriundas deste termo, as partes elegem o foro da Comarca de Santo André/SP, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

                            <h4 style="margin: 15px 0 5px 0; color: var(--primary-dark);">15. ACEITE</h4>
                            <p>Ao prosseguir com o atendimento, o paciente declara que leu, compreendeu e aceita integralmente os termos acima.</p>
                        </div>
                    </div>
                </div>

                <label class="terms-check" style="margin-top: 20px;">
                    <input type="checkbox" id="accept-terms">
                    <span>Li e aceito os <span style="text-decoration: underline; cursor: pointer; color: var(--primary);" onclick="event.preventDefault(); window.openTermsModal();">termos de responsabilidade.</span></span>
                </label>

                <div class="checkout-footer" style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px;">
                    <button class="btn btn-primary" style="width: 100%; height: 68px; font-size: 1.05rem; border-radius: 50px; background: #9d4615; color: white; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.2; box-shadow: 0 4px 15px rgba(157, 70, 21, 0.2);" onclick="window.finalCheckout('20', '1.200', this)">
                        <span>Garantir Tratamento 20mg</span>
                        <small style="font-size: 0.75rem; opacity: 0.9;">Plano Essencial - Iniciar agora</small>
                    </button>
                    <button class="btn btn-primary" style="width: 100%; height: 68px; font-size: 1.05rem; border-radius: 50px; background: #a44716; color: white; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.2; box-shadow: 0 6px 20px rgba(164, 71, 22, 0.3);" onclick="window.finalCheckout('60', '2.800', this)">
                        <span>Garantir Tratamento 60mg</span>
                        <small style="font-size: 0.75rem; opacity: 0.9;">Plano Completo - Mais Escolhido</small>
                    </button>
                </div>
            </div>
        `;

        window.openTermsModal = () => document.getElementById('terms-modal').style.display = 'flex';
        window.closeTermsModal = () => document.getElementById('terms-modal').style.display = 'none';
    }

    nextBtn.addEventListener('click', nextStep);
    renderStep();
});
