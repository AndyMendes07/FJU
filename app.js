// --- 1. CONFIGURAÇÃO ---
const firebaseConfig = {
  apiKey: "AIzaSyDg5LXnZXQ8RneOWgVWVglk_QhtQPWrmTE",
  authDomain: "fju-desafio-semanal.firebaseapp.com",
  projectId: "fju-desafio-semanal",
  storageBucket: "fju-desafio-semanal.firebasestorage.app",
  messagingSenderId: "143324693175",
  appId: "1:143324693175:web:0bd390986aea549e7ec332"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// --- 2. DADOS ---
const missoesFoto = [
    { id: "visita", texto: "Visitar jovem afastado (Anexar fotos)" },
    { id: "limpeza", texto: "Limpar algo na igreja" },
    { id: "ponto_oracao", texto: "Fazer um ponto de oração" },
    { id: "pe_bairro", texto: "Pé no bairro" },
    { id: "compartilhar", texto: "Compartilhar algo de Deus no grupo" },
    { id: "algo_mais", texto: "Participar do Algo a Mais" },
    { id: "ej", texto: "Participar do Encontro Jovem" }
];

const missoesSimples = [
    { id: "jejum", texto: "Fazer jejum na semana" }, // Sem dias (Vale 1 ponto)
    { 
        id: "biblia", 
        texto: "Ler a bíblia", 
        dias: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"] 
    },
    { 
        id: "orar_sair", 
        texto: "Orar antes de sair de casa",
        dias: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"]
    },
    { 
        id: "ungir", 
        texto: "Se ungir antes de sair de casa",
        dias: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"]
    },
    { 
        id: "igreja_5x", 
        texto: "Ir na igreja 5x na semana",
        dias: ["Seg", "Qua", "Sex", "Sab", "Dom"]
    }
];

// --- 3. INÍCIO ---
function iniciarApp() {
    renderizarMissoes();
    configurarFotoPerfil();
    configurarMonitoramentoRascunho();
    restaurarRascunho();
}

function renderizarMissoes() {
    const listaFotos = document.getElementById('photoTasksList');
    const listaSimples = document.getElementById('simpleTasksList');

    listaFotos.innerHTML = "";
    listaSimples.innerHTML = "";

    // 1. Renderiza Missões com Foto
    // Elas contam pontos, então ganham a classe 'track-progress'
    missoesFoto.forEach(missao => {
        const item = document.createElement('div');
        item.className = 'task-item';
        item.innerHTML = `
            <div class="task-header">
                <input type="checkbox" id="${missao.id}" class="track-progress" disabled data-fotos='[]'>
                <label class="task-label" for="${missao.id}">${missao.texto}</label>
                <i class="material-icons" style="color: #999;">photo_camera</i>
            </div>
            <div class="file-upload-wrapper active-upload">
                <div class="upload-controls">
                    <label for="file_${missao.id}" style="cursor:pointer; color:#004aad; font-weight:bold; display:flex; align-items:center; gap:5px; border:1px solid #004aad; padding:5px 10px; border-radius:5px;">
                        <i class="material-icons">add_a_photo</i> Adicionar Foto
                    </label>
                    <input type="file" id="file_${missao.id}" onchange="uploadFoto('${missao.id}')" hidden>
                </div>
                <small id="status_${missao.id}" style="color: orange; display:none;">Enviando...</small>
                
                <div class="gallery-container" id="gallery_${missao.id}"></div>
            </div>
            <input type="date" class="date-input" id="data_${missao.id}">
        `;
        listaFotos.appendChild(item);
    });

    // 2. Renderiza Missões Simples
    missoesSimples.forEach(missao => {
        const item = document.createElement('div');
        item.className = 'task-item';
        
        // Verifica se tem sub-dias
        if (missao.dias) {
            // --- COM DIAS (Bíblia, Oração...) ---
            // Cabeçalho SEM checkbox (apenas texto)
            // Dias com checkbox que contam pontos ('track-progress')
            
            let diasHtml = '<div class="sub-tasks-container">';
            missao.dias.forEach((dia, index) => {
                diasHtml += `
                    <label class="sub-task-label">
                        <input type="checkbox" id="${missao.id}_dia_${index}" class="track-progress" onchange="atualizarProgresso()">
                        ${dia}
                    </label>
                `;
            });
            diasHtml += '</div>';

            item.innerHTML = `
                <div class="task-header">
                    <label class="task-label" style="font-weight:bold; margin-left:0;">${missao.texto}</label>
                </div>
                ${diasHtml}
            `;
        } else {
            // --- SEM DIAS (Jejum) ---
            // Mantém o checkbox principal contando ponto
            item.innerHTML = `
                <div class="task-header">
                    <input type="checkbox" id="${missao.id}" class="track-progress" onchange="atualizarProgresso()">
                    <label class="task-label" for="${missao.id}">${missao.texto}</label>
                </div>
                <input type="date" class="date-input" id="data_${missao.id}">
            `;
        }
        listaSimples.appendChild(item);
    });
}

// --- 4. SISTEMA DE USUÁRIO ---
function verificarUsuario() {
    const nomeInput = document.getElementById('userName');
    const nome = nomeInput.value.trim();
    if (!nome) { alert("Digite um nome!"); return; }

    const userId = nome.toLowerCase().replace(/\s+/g, '_');
    const btn = document.querySelector('.btn-load');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="material-icons">hourglass_empty</i>';

    db.collection("ranking_semanal").doc(userId).get()
        .then((doc) => {
            if (doc.exists) {
                carregarDadosNaTela(doc.data());
                alert(`Bem-vindo de volta, ${doc.data().nome}!`);
            } else {
                limparFormularioCompleto();
                alert(`Olá ${nome}! Ficha iniciada.`);
            }
            salvarRascunho();
            btn.innerHTML = originalHtml;
        })
        .catch((error) => {
            console.error(error);
            alert("Erro de conexão.");
            btn.innerHTML = originalHtml;
        });
}

function carregarDadosNaTela(dados) {
    document.getElementById('userTribe').value = dados.tribo || "";
    document.getElementById('userProject').value = dados.projeto || "";

    // Foto Perfil
    const img = document.getElementById('profilePreview');
    const deleteBtn = document.getElementById('deleteProfileBtn');
    const iconeCamera = document.querySelector('.edit-icon');

    if(dados.fotoPerfil && dados.fotoPerfil.length > 5) {
        img.src = dados.fotoPerfil;
        img.setAttribute('data-url-final', dados.fotoPerfil);
        iconeCamera.style.display = 'none';
        deleteBtn.style.display = 'block';
    } else {
        img.src = "https://ui-avatars.com/api/?name=Foto&background=eee&color=999&size=128";
        img.removeAttribute('data-url-final');
        iconeCamera.style.display = 'block';
        deleteBtn.style.display = 'none';
    }

    limparInputsMasManterNome();

    if (dados.respostas) {
        for (const [id, valor] of Object.entries(dados.respostas)) {
            const check = document.getElementById(id);
            if (check) {
                check.checked = valor.feito;
                
                // Galeria de Fotos
                if (valor.fotos || valor.fotoUrl) {
                    let listaFotos = valor.fotos || [valor.fotoUrl];
                    if(!Array.isArray(listaFotos)) listaFotos = [listaFotos];
                    check.dataset.fotos = JSON.stringify(listaFotos);
                    
                    const galeria = document.getElementById(`gallery_${id}`);
                    if(galeria) {
                        galeria.innerHTML = "";
                        listaFotos.forEach(url => adicionarMiniatura(id, url));
                    }
                    if (listaFotos.length > 0) {
                        check.disabled = false;
                        check.checked = true;
                    }
                }

                const dataInput = document.getElementById(`data_${id}`);
                if (dataInput && valor.dataExecucao) {
                    dataInput.value = valor.dataExecucao;
                    dataInput.style.display = 'block';
                }
            }
        }
    }
    atualizarProgresso();
}

function limparFormularioCompleto() {
    document.getElementById('userTribe').value = "";
    document.getElementById('userProject').value = "";
    
    const img = document.getElementById('profilePreview');
    img.src = "https://ui-avatars.com/api/?name=Foto&background=eee&color=999&size=128";
    img.removeAttribute('data-url-final');
    document.getElementById('profilePicInput').value = "";
    document.querySelector('.edit-icon').style.display = 'block';
    document.getElementById('deleteProfileBtn').style.display = 'none';

    limparInputsMasManterNome();
}

function limparInputsMasManterNome() {
    document.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        chk.checked = false;
        
        chk.dataset.fotos = '[]'; 
        const galeria = document.getElementById(`gallery_${chk.id}`);
        if(galeria) galeria.innerHTML = "";

        // Se for missão principal com foto, trava
        // Verifica pelo ID se está na lista de fotos
        if(missoesFoto.find(m => m.id === chk.id)) {
            chk.disabled = true;
        }

        const status = document.getElementById(`status_${chk.id}`);
        if(status) { status.style.display = 'none'; }
        
        const dataInput = document.getElementById(`data_${chk.id}`);
        if(dataInput) { dataInput.style.display = 'none'; dataInput.value = ''; }
        
        const fileInput = document.getElementById(`file_${chk.id}`);
        if(fileInput) fileInput.value = "";
    });
    atualizarProgresso();
}

// --- 5. UPLOAD ---
function uploadFoto(idMissao) {
    const fileInput = document.getElementById(`file_${idMissao}`);
    const statusMsg = document.getElementById(`status_${idMissao}`);
    const checkbox = document.getElementById(idMissao);
    const file = fileInput.files[0];

    if (!file) return;

    statusMsg.style.display = 'block';
    statusMsg.innerText = "Enviando...";
    statusMsg.style.color = "orange";

    const storageRef = storage.ref(`fotos_fju/${idMissao}_${new Date().getTime()}`);

    storageRef.put(file).then((snapshot) => {
        snapshot.ref.getDownloadURL().then((url) => {
            statusMsg.style.display = 'none'; 
            
            let fotosAtuais = JSON.parse(checkbox.dataset.fotos || '[]');
            fotosAtuais.push(url);
            checkbox.dataset.fotos = JSON.stringify(fotosAtuais);

            adicionarMiniatura(idMissao, url);

            checkbox.disabled = false;
            checkbox.checked = true;
            document.getElementById(`data_${idMissao}`).style.display = 'block';

            fileInput.value = "";
            atualizarProgresso();
            salvarRascunho();
        });
    }).catch(err => {
        console.error(err);
        statusMsg.innerText = "Erro.";
    });
}

function adicionarMiniatura(idMissao, url) {
    const galeria = document.getElementById(`gallery_${idMissao}`);
    const div = document.createElement('div');
    div.className = 'thumb-box';
    div.innerHTML = `
        <img src="${url}" class="thumb-img" onclick="window.open('${url}')">
        <div class="thumb-close" onclick="removerFotoEspecifica('${idMissao}', '${url}', this)">×</div>
    `;
    galeria.appendChild(div);
}

function removerFotoEspecifica(idMissao, urlParaRemover, elementoBtn) {
    if(!confirm("Remover esta foto?")) return;

    const thumbBox = elementoBtn.parentElement;
    thumbBox.remove();

    const checkbox = document.getElementById(idMissao);
    let fotosAtuais = JSON.parse(checkbox.dataset.fotos || '[]');
    fotosAtuais = fotosAtuais.filter(u => u !== urlParaRemover);
    checkbox.dataset.fotos = JSON.stringify(fotosAtuais);

    if (fotosAtuais.length === 0) {
        checkbox.checked = false;
        checkbox.disabled = true;
        document.getElementById(`data_${idMissao}`).style.display = 'none';
    }

    atualizarProgresso();
    salvarRascunho();
}

function deletarFotoPerfil() {
    if(!confirm("Remover foto de perfil?")) return;
    
    const img = document.getElementById('profilePreview');
    img.src = "https://ui-avatars.com/api/?name=Foto&background=eee&color=999&size=128";
    img.removeAttribute('data-url-final');
    document.getElementById('profilePicInput').value = "";
    document.querySelector('.edit-icon').style.display = 'block';
    document.getElementById('deleteProfileBtn').style.display = 'none';

    salvarRascunho();
}

function configurarFotoPerfil() {
    const profileInput = document.getElementById('profilePicInput');
    const profilePreview = document.getElementById('profilePreview');
    const deleteBtn = document.getElementById('deleteProfileBtn');

    profileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = function(e) { 
                profilePreview.src = e.target.result;
                document.querySelector('.edit-icon').style.display = 'none';
            }
            reader.readAsDataURL(file);

            const storageRef = storage.ref(`perfis/${new Date().getTime()}_${file.name}`);
            profilePreview.style.opacity = "0.5"; 
            
            storageRef.put(file).then(snapshot => {
                snapshot.ref.getDownloadURL().then(url => {
                    profilePreview.setAttribute('data-url-final', url);
                    profilePreview.style.opacity = "1"; 
                    deleteBtn.style.display = 'block';
                    salvarRascunho(); 
                });
            });
        }
    });
}

// --- 6. CÁLCULO DE PROGRESSO INTELIGENTE ---
function atualizarProgresso() {
    // 1. Coleta todos os itens que devem contar ponto
    // (São aqueles que possuem a classe 'track-progress')
    const todosItensPontuaveis = document.querySelectorAll('.track-progress');
    const totalPossivel = todosItensPontuaveis.length;

    // 2. Conta quantos estão marcados
    const marcados = document.querySelectorAll('.track-progress:checked').length;
    
    // 3. Calcula porcentagem
    // Evita divisão por zero
    const porcentagem = totalPossivel === 0 ? 0 : Math.round((marcados / totalPossivel) * 100);
    
    const barra = document.getElementById('progressBar');
    const texto = document.getElementById('progressText');
    barra.style.width = porcentagem + '%';
    barra.innerText = porcentagem + '%';
    texto.innerText = porcentagem + '% Concluído';
    
    // Muda a cor se completar tudo
    barra.style.backgroundColor = porcentagem === 100 ? '#FFD700' : '#00ff88';

    salvarRascunho();
}

function salvarRascunho() {
    const rascunho = {
        nome: document.getElementById('userName').value,
        tribo: document.getElementById('userTribe').value,
        projeto: document.getElementById('userProject').value,
        fotoPerfilUrl: document.getElementById('profilePreview').getAttribute('data-url-final') || "",
        checkboxes: {}
    };
    
    const allInputs = document.querySelectorAll('input[type="checkbox"]');
    allInputs.forEach(input => {
        let fotos = [];
        if (input.dataset.fotos) {
            try { fotos = JSON.parse(input.dataset.fotos); } catch(e) {}
        }

        rascunho.checkboxes[input.id] = {
            checked: input.checked,
            disabled: input.disabled,
            data: document.getElementById(`data_${input.id}`) ? document.getElementById(`data_${input.id}`).value : "",
            fotos: fotos 
        };
    });
    localStorage.setItem('fju_rascunho_semanal', JSON.stringify(rascunho));
}

function restaurarRascunho() {
    const salvo = localStorage.getItem('fju_rascunho_semanal');
    if (salvo) {
        const dados = JSON.parse(salvo);
        document.getElementById('userName').value = dados.nome || "";
        document.getElementById('userTribe').value = dados.tribo || "";
        document.getElementById('userProject').value = dados.projeto || "";

        if (dados.fotoPerfilUrl) {
            document.getElementById('profilePreview').src = dados.fotoPerfilUrl;
            document.getElementById('profilePreview').setAttribute('data-url-final', dados.fotoPerfilUrl);
            document.querySelector('.edit-icon').style.display = 'none';
            document.getElementById('deleteProfileBtn').style.display = 'block';
        }

        if (dados.checkboxes) {
            for (const [id, valor] of Object.entries(dados.checkboxes)) {
                const check = document.getElementById(id);
                if (check) {
                    check.checked = valor.checked;
                    
                    if (valor.fotos && valor.fotos.length > 0) {
                        check.dataset.fotos = JSON.stringify(valor.fotos);
                        const galeria = document.getElementById(`gallery_${id}`);
                        if(galeria) {
                            galeria.innerHTML = "";
                            valor.fotos.forEach(url => adicionarMiniatura(id, url));
                        }
                        check.disabled = false;
                    }
                    else if (valor.fotoUrl) {
                         check.dataset.fotos = JSON.stringify([valor.fotoUrl]);
                         adicionarMiniatura(id, valor.fotoUrl);
                         check.disabled = false;
                    }

                    const dataInput = document.getElementById(`data_${id}`);
                    if (dataInput && valor.data) {
                        dataInput.value = valor.data;
                        dataInput.style.display = 'block';
                    }
                }
            }
        }
        atualizarProgresso(); 
    }
}

function configurarMonitoramentoRascunho() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(el => {
        el.addEventListener('change', salvarRascunho);
        el.addEventListener('input', salvarRascunho);
    });
}

// --- 7. BOTÕES FINAIS ---
document.getElementById('saveBtn').addEventListener('click', () => {
    const nome = document.getElementById('userName').value;
    if (!nome) { alert("Preencha Nome!"); return; }

    const userId = nome.toLowerCase().replace(/\s+/g, '_');
    const dadosUsuario = JSON.parse(localStorage.getItem('fju_rascunho_semanal'));
    dadosUsuario.ultimaAtualizacao = new Date();
    
    const respostasFormatadas = {};
    for(const [key, val] of Object.entries(dadosUsuario.checkboxes)) {
        respostasFormatadas[key] = {
            feito: val.checked,
            dataExecucao: val.data,
            fotos: val.fotos 
        };
    }
    
    db.collection("ranking_semanal").doc(userId).set({
        nome: dadosUsuario.nome,
        tribo: dadosUsuario.tribo,
        projeto: dadosUsuario.projeto,
        fotoPerfil: dadosUsuario.fotoPerfilUrl,
        porcentagem: document.getElementById('progressBar').innerText,
        ultimaAtualizacao: new Date(),
        respostas: respostasFormatadas
    }).then(() => {
        alert("✅ Progresso salvo na nuvem!");
    }).catch(err => alert("Erro ao salvar: " + err));
});

function finalizarSemana() {
    const nome = document.getElementById('userName').value;
    if (!nome) { alert("Preencha seu nome!"); return; }

    if (!confirm("ATENÇÃO: Finalizar a semana vai ZERAR sua ficha para a próxima. Confirmar?")) return;

    const userId = nome.toLowerCase().replace(/\s+/g, '_');
    const dadosRaw = JSON.parse(localStorage.getItem('fju_rascunho_semanal') || "{}");
    
    const dadosFechamento = {
        nome: nome,
        tribo: dadosRaw.tribo,
        projeto: dadosRaw.projeto,
        fotoPerfil: dadosRaw.fotoPerfilUrl,
        porcentagemFinal: document.getElementById('progressBar').innerText,
        dataFechamento: new Date(),
        semanaID: `Semana_${getNumeroSemana()}_${new Date().getFullYear()}`,
        respostas: dadosRaw.checkboxes || {}
    };

    db.collection("historico_semanas").add(dadosFechamento)
        .then(() => {
            return db.collection("ranking_semanal").doc(userId).set({
                nome: nome,
                tribo: dadosFechamento.tribo,
                projeto: dadosFechamento.projeto,
                fotoPerfil: dadosFechamento.fotoPerfil,
                porcentagem: "0%",
                ultimaAtualizacao: new Date(),
                respostas: {}
            });
        })
        .then(() => {
            localStorage.removeItem('fju_rascunho_semanal');
            alert("Semana finalizada com sucesso! Bom descanso.");
            location.reload();
        })
        .catch(err => alert("Erro: " + err));
}

function getNumeroSemana() {
    const date = new Date();
    const startDate = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startDate) / (24 * 60 * 60 * 1000));
    return Math.ceil(days / 7);
}

iniciarApp();