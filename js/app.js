document.addEventListener("DOMContentLoaded", async () => {
  configurarBibliotecas();
  preencherDataChecklist();
  renderizarChecklistDigital();
  await atualizarTudo();
});

function configurarBibliotecas() {
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
}

function preencherDataChecklist() {
  const campo = document.getElementById("data_checklist");
  if (campo && !campo.value) {
    campo.value = new Date().toISOString().slice(0, 10);
  }
}

async function atualizarTudo() {
  await carregarOS();
  await carregarChecklists();
  await carregarDashboard();

  const el = document.getElementById("ultimaAtualizacao");
  if (el) {
    el.textContent = new Date().toLocaleString("pt-BR");
  }
}

function abrirTela(nomeTela) {
  document.querySelectorAll(".tela").forEach(tela => tela.classList.remove("ativa"));
  document.querySelectorAll(".menu-btn").forEach(botao => botao.classList.remove("active"));

  document.getElementById(nomeTela).classList.add("ativa");

  document.querySelectorAll(".menu-btn").forEach(botao => {
    const texto = botao.textContent.toLowerCase();

    if (
      (nomeTela === "dashboard" && texto.includes("centro")) ||
      (nomeTela === "os" && texto.includes("o.s")) ||
      (nomeTela === "checklist" && texto.includes("checklist")) ||
      (nomeTela === "relatorios" && texto.includes("relatórios")) ||
      (nomeTela === "config" && texto.includes("configurações"))
    ) {
      botao.classList.add("active");
    }
  });

  const titulos = {
    dashboard: "Centro de Comando",
    os: "Módulo de O.S",
    checklist: "Módulo de Checklist",
    relatorios: "Relatórios",
    config: "Configurações"
  };

  document.getElementById("tituloTela").textContent = titulos[nomeTela] || "Sistema";
}

function abrirSubAba(id) {
  const grupoPai = document.getElementById(id).closest(".tela");

  grupoPai.querySelectorAll(".subtela").forEach(item => item.classList.remove("ativa"));
  grupoPai.querySelectorAll(".aba-btn").forEach(btn => btn.classList.remove("active"));

  document.getElementById(id).classList.add("ativa");

  const botoes = Array.from(grupoPai.querySelectorAll(".aba-btn"));
  const indice = Array.from(grupoPai.querySelectorAll(".subtela")).findIndex(el => el.id === id);

  if (botoes[indice]) {
    botoes[indice].classList.add("active");
  }
}

async function carregarDashboard() {
  const { data: ordens, error: erroOS } = await db
    .from("ordens_servico")
    .select("*")
    .order("criado_em", { ascending: false });

  const { data: checklists, error: erroChecklist } = await db
    .from("checklist_execucoes")
    .select("*")
    .order("criado_em", { ascending: false });

  if (erroOS || erroChecklist) {
    console.error(erroOS || erroChecklist);
    return;
  }

  const listaOS = ordens || [];
  const listaChecklists = checklists || [];

  const abertas = listaOS.filter(os => !["Finalizada", "Cancelada"].includes(os.status));
  const atrasadas = listaOS.filter(os => osEstaAtrasada(os));
  const aguardando = listaOS.filter(os =>
    ["Aguardando peça", "Aguardando mão de obra", "Aguardando terceiro"].includes(os.status)
  );

  const pendenciasChecklist = listaChecklists.filter(c =>
    ["Apto com ressalva", "Inapto"].includes(c.resultado)
  );

  const finalizadas = listaOS.filter(os => os.status === "Finalizada").length;
  const conclusao = listaOS.length ? Math.round((finalizadas / listaOS.length) * 100) : 0;

  setText("cmdAberto", abertas.length);
  setText("cmdAtrasadas", atrasadas.length);
  setText("cmdAguardando", aguardando.length);
  setText("cmdPendenciasChecklist", pendenciasChecklist.length);
  setText("cmdConclusao", `${conclusao}%`);

  montarFilaOS(abertas);
  montarAlertasOS(atrasadas, aguardando);
  montarChecklistsRecentes(listaChecklists);
  montarResumoStatusOS(listaOS);
}

function montarFilaOS(lista) {
  const container = document.getElementById("filaOS");
  if (!container) return;

  container.innerHTML = "";

  const ordenadas = [...lista].sort((a, b) => {
    const pesos = { "Crítica": 1, "Alta": 2, "Média": 3, "Baixa": 4 };
    return (pesos[a.prioridade] || 5) - (pesos[b.prioridade] || 5);
  });

  if (ordenadas.length === 0) {
    container.innerHTML = `<div class="lista-item">Nenhuma O.S em aberto no momento.</div>`;
    return;
  }

  ordenadas.slice(0, 10).forEach(os => {
    const div = document.createElement("div");

    let classePrioridade = "media";
    if (os.prioridade === "Crítica") classePrioridade = "critica";
    if (os.prioridade === "Alta") classePrioridade = "alta";

    div.className = `item-fila ${classePrioridade}`;

    div.innerHTML = `
      <div>
        <h4>Frota ${escapeHtml(os.frota)} ${os.numero_os ? "– O.S " + escapeHtml(os.numero_os) : "– Comunicada"}</h4>
        <p>${escapeHtml(os.motivo_entrada || "Sem motivo informado")}</p>
        <p>Status: ${escapeHtml(os.status)} | Prioridade: ${escapeHtml(os.prioridade || "-")} | Origem: ${escapeHtml(os.origem || "-")}</p>
      </div>
      <div>${criarBadge(os.status)}</div>
    `;

    container.appendChild(div);
  });
}

function montarAlertasOS(atrasadas, aguardando) {
  const container = document.getElementById("alertasOS");
  if (!container) return;

  container.innerHTML = "";

  if (atrasadas.length === 0 && aguardando.length === 0) {
    container.innerHTML = `<div class="lista-item">Nenhum alerta crítico no momento.</div>`;
    return;
  }

  atrasadas.slice(0, 6).forEach(os => {
    const div = document.createElement("div");
    div.className = "alerta-item";
    div.innerHTML = `
      <strong>O.S atrasada</strong><br>
      Frota ${escapeHtml(os.frota)} – ${escapeHtml(os.numero_os || "Comunicada")}<br>
      Previsão: ${formatarData(os.previsao_saida)}
    `;
    container.appendChild(div);
  });

  aguardando.slice(0, 6).forEach(os => {
    const div = document.createElement("div");
    div.className = "lista-item";
    div.innerHTML = `
      <strong>${escapeHtml(os.status)}</strong>
      <span>Frota ${escapeHtml(os.frota)} – ${escapeHtml(os.motivo_entrada || "Sem motivo")}</span>
    `;
    container.appendChild(div);
  });
}

function montarChecklistsRecentes(lista) {
  const container = document.getElementById("checklistsRecentes");
  if (!container) return;

  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = `<div class="lista-item">Nenhum checklist realizado.</div>`;
    return;
  }

  lista.slice(0, 7).forEach(item => {
    const div = document.createElement("div");
    div.className = "lista-item";

    div.innerHTML = `
      <strong>Frota ${escapeHtml(item.frota)} – ${escapeHtml(item.tipo_checklist)}</strong>
      <span>${formatarData(item.criado_em)} | Resultado: ${escapeHtml(item.resultado || "-")} | NC: ${item.quantidade_nao_conformidades || 0}</span>
    `;

    container.appendChild(div);
  });
}

function montarResumoStatusOS(lista) {
  const container = document.getElementById("resumoStatusOS");
  if (!container) return;

  container.innerHTML = "";

  const contagem = {};

  lista.forEach(os => {
    contagem[os.status] = (contagem[os.status] || 0) + 1;
  });

  if (Object.keys(contagem).length === 0) {
    container.innerHTML = `<div class="lista-item">Nenhuma O.S cadastrada.</div>`;
    return;
  }

  Object.keys(contagem).forEach(status => {
    const div = document.createElement("div");
    div.className = "status-linha";
    div.innerHTML = `
      <span>${escapeHtml(status)}</span>
      <strong>${contagem[status]}</strong>
    `;
    container.appendChild(div);
  });
}

function osEstaAtrasada(os) {
  if (!os.previsao_saida) return false;
  if (["Finalizada", "Cancelada"].includes(os.status)) return false;

  return new Date(os.previsao_saida) < new Date();
}

function formatarData(data) {
  if (!data) return "-";

  return new Date(data).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function formatarDataCurta(data) {
  if (!data) return "-";

  return new Date(data).toLocaleDateString("pt-BR");
}

function criarBadge(texto) {
  let classe = "badge-amarelo";

  if (["Finalizada", "Apto", "Baixa"].includes(texto)) classe = "badge-verde";
  if (["Comunicada", "Aberta", "Em andamento"].includes(texto)) classe = "badge-azul";
  if (["Cancelada", "Inapto", "Crítica", "Alta"].includes(texto)) classe = "badge-vermelho";
  if (["Apto com ressalva", "Aguardando peça", "Aguardando mão de obra", "Aguardando terceiro"].includes(texto)) classe = "badge-amarelo";

  return `<span class="badge ${classe}">${escapeHtml(texto || "-")}</span>`;
}

function setText(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

function escapeHtml(texto) {
  if (texto === null || texto === undefined) return "";

  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizarNomeArquivo(nome) {
  return String(nome || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .toLowerCase();
}

async function uploadArquivo(file, origem, origemId, textoExtraido = "") {
  if (!file || !origemId) return null;

  const nomeLimpo = normalizarNomeArquivo(file.name);
  const caminho = `${origem}/${origemId}/${Date.now()}_${nomeLimpo}`;

  const { error: erroUpload } = await db.storage
    .from("anexos")
    .upload(caminho, file, { upsert: true });

  if (erroUpload) {
    console.error("Erro no upload:", erroUpload);
    alert("Registro salvo, mas houve erro ao anexar o arquivo.");
    return null;
  }

  const { data: publicData } = db.storage
    .from("anexos")
    .getPublicUrl(caminho);

  const urlPublica = publicData?.publicUrl || null;

  await db.from("anexos").insert([{
    origem,
    origem_id: origemId,
    nome_arquivo: file.name,
    tipo_arquivo: file.type,
    caminho_arquivo: caminho,
    url_publica: urlPublica,
    texto_extraido: textoExtraido
  }]);

  return urlPublica;
}

async function registrarHistorico(origem, origemId, campo, valorAnterior, valorNovo, observacao) {
  const { error } = await db
    .from("historico_alteracoes")
    .insert([{
      origem,
      origem_id: origemId,
      campo_alterado: campo,
      valor_anterior: valorAnterior,
      valor_novo: valorNovo,
      observacao
    }]);

  if (error) {
    console.error("Erro ao registrar histórico:", error);
  }
}

function abrirModal(html) {
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modalDetalhes").classList.remove("hidden");
}

function fecharModal() {
  document.getElementById("modalDetalhes").classList.add("hidden");
  document.getElementById("modalBody").innerHTML = "";
}