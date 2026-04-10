// Supabase Configuration
const SUPABASE_URL = 'https://pzewkvmaewnijwhxkqaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6ZXdrdm1hZXduaWp3aHhrcWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjk0ODQsImV4cCI6MjA4ODc0NTQ4NH0.a42vFvm5vUcZ3euBUoNW_QuWM9MKPW2W7ZvcCyl_P4Y';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const modal = document.getElementById('edit-modal');
let leads = [];

async function fetchLeads() {
    console.log('Fetching leads...');
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*, transcription_results(*)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        leads = data;
        renderBoard();
    } catch (err) {
        console.error('Erro ao buscar leads:', err.message);
    }
}

function renderBoard() {
    const lists = {
        'Novo': document.getElementById('list-novo'),
        'Em Análise': document.getElementById('list-analise'),
        'Finalizado': document.getElementById('list-finalizado')
    };

    const counts = {
        'Novo': document.getElementById('count-novo'),
        'Em Análise': document.getElementById('count-analise'),
        'Finalizado': document.getElementById('count-finalizado')
    };

    // Clear lists
    Object.values(lists).forEach(list => list.innerHTML = '');

    const countMap = { 'Novo': 0, 'Em Análise': 0, 'Finalizado': 0 };

    leads.forEach(lead => {
        const list = lists[lead.status] || lists['Novo'];
        countMap[lead.status || 'Novo']++;

        const card = document.createElement('div');
        card.className = 'lead-card';
        card.draggable = true;
        card.ondragstart = (e) => e.dataTransfer.setData('text/plain', lead.id);

        const tagClass = lead.tipo_origem === 'Receita' ? 'tag-receita' : 'tag-questionario';
        const fileName = lead.arquivo_url ? 'Ver Receita' : '';

        card.innerHTML = `
            <span class="lead-tag ${tagClass}">${lead.tipo_origem || 'Lead'}</span>
            <h3>${lead.nome || 'Sem Nome'}</h3>
            <div class="lead-info">
                <p>📱 ${lead.whatsapp || '-'}</p>
                <p>📧 ${lead.email || '-'}</p>
            </div>
            <div class="lead-actions">
                ${lead.transcription_results && lead.transcription_results.length > 0 ? `<span style="background: #dcfce7; color: #166534; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; margin-bottom: 8px; display: inline-block;">✨ Transcrita</span>` : ''}
                <div style="display:flex; gap:10px; width:100%;">
                    ${lead.arquivo_url ? `<a href="${lead.arquivo_url}" target="_blank" class="btn btn-outline btn-sm">📄 Ver Arquivo</a>` : ''}
                    <button class="btn btn-primary btn-sm" onclick="openEdit('${lead.id}')">✏️ Abrir</button>
                </div>
            </div>
        `;
        list.appendChild(card);
    });

    // Update counts
    Object.keys(countMap).forEach(status => {
        if (counts[status]) counts[status].textContent = countMap[status];
    });
}

// Drag & Drop
function allowDrop(e) { e.preventDefault(); }

async function drop(e, newStatus) {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');

    try {
        const { error } = await supabase
            .from('leads')
            .update({ status: newStatus })
            .eq('id', leadId);

        if (error) throw error;
        fetchLeads();
    } catch (err) {
        alert('Erro ao mover lead: ' + err.message);
    }
}

// Edit Logic
function openEdit(id) {
    const lead = leads.find(l => l.id == id);
    if (!lead) return;

    document.getElementById('edit-id').value = lead.id;
    document.getElementById('edit-nome').value = lead.nome || '';
    document.getElementById('edit-whatsapp').value = lead.whatsapp || '';
    
    // Mostra transcrição
    const transContainer = document.getElementById('view-transcription');
    if (lead.transcription_results && lead.transcription_results.length > 0) {
        transContainer.innerText = lead.transcription_results[0].full_text;
    } else {
        transContainer.innerText = 'Nenhuma transcrição disponível para esta receita.';
    }

    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
}

async function saveEdit() {
    const id = document.getElementById('edit-id').value;
    const nome = document.getElementById('edit-nome').value;
    const whatsapp = document.getElementById('edit-whatsapp').value;

    try {
        const { error } = await supabase
            .from('leads')
            .update({ nome, whatsapp })
            .eq('id', id);

        if (error) throw error;
        closeModal();
        fetchLeads();
    } catch (err) {
        alert('Erro ao salvar: ' + err.message);
    }
}

// Initial load
fetchLeads();
