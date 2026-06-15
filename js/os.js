document.getElementById("formOS").addEventListener("submit", async (event) => {
  event.preventDefault();

  const novaOS = {
    numero_os: valor("numero_os") || null,
    frota: valor("frota_os"),
    equipamento: valor("equipamento_os"),
    modelo: valor("modelo_os"),
    placa: valor("placa_os"),
    chassi_serie: valor("chassi_os"),
    status: valor("status_os"),
    prioridade: valor("prioridade_os"),
    previsao_saida: valor("previsao_os") || null,
    centro_custo: valor("centro_custo_os"),
    oficina: valor("oficina_os"),
    responsavel: valor("responsavel_os"),
    motivo_entrada: valor("motivo_os"),
    diagnostico_inicial: valor("diagnostico_os"),
    observacoes: valor("observacoes_os"),
    origem: "Manual",
    data_ultima_movimentacao: new Date().toISOString()
  };

  if (!novaOS.frota || !novaOS.motivo_entrada || !novaOS.status || !novaOS.prioridade) {
    alert("Preencha frota, motivo, status e prioridade.");
    return;
  }

  const { data, error } = await db
    .from("ordens_servico")
    .insert([novaOS])
    .select()
    .single();

  if (error) {
    console.error(error);
    alert("Erro ao salvar O.S.");
    return;
  }

  await registrarHistorico(
    "ordens_servico",
    data.id,
    "criação",
    "-",
    "O.S criada",
    "O.S cadastrada manualmente."
  );

  alert("O.S salva com sucesso.");

  document.getElementById("formOS").reset();

  await atualizarTudo();
  abrirSubAba("osLista");
});

function valor(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

async function carregarOS() {
  let consulta = db
    .from("ordens_servico")
    .select("*")
    .order("criado_em", { ascending: false });

  const frota = document.getElementById("filtroFrotaOS")?.value.trim();
  const numero = document.getElementById("filtroNumeroOS")?.value.trim();
  const status = document.getElementById("filtroStatusOS")?.value;
  const prioridade = document.getElementById("filtroPrioridadeOS")?.value;

  if (frota) consulta = consulta.ilike("frota", `%${frota}%`);
  if (numero) consulta = consulta.ilike("numero_os", `%${numero}%`);
  if (status) consulta = consulta.eq("status", status);
  if (prioridade) consulta = consulta.eq("prioridade", prioridade);

  const { data, error } = await consulta;

  if (error) {
    console.error(error);
    alert("Erro ao carregar O.S.");
    return;
  }

  const tabela = document.getElementById("tabelaOS");
  if (!tabela) return;

  tabela.innerHTML = "";

  if (!data || data.length === 0) {
    tabela.innerHTML = `<tr><td colspan="9">Nenhuma O.S encontrada.</td></tr>`;
    return;
  }

  data.forEach(os => {
    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${escapeHtml(os.numero_os || "Comunicada")}</td>
      <td>${escapeHtml(os.frota || "-")}</td>
      <td>${escapeHtml(os.equipamento || os.modelo || "-")}</td>
      <td>${escapeHtml(os.motivo_entrada || "-")}</td>
      <td>${criarBadge(os.status)}</td>
      <td>${criarBadge(os.prioridade)}</td>
      <td>${formatarData(os.previsao_saida)}</td>
      <td>${escapeHtml(os.origem || "-")}</td>
      <td>${montarAcoesOS(os)}</td>
    `;

    tabela.appendChild(linha);
  });
}

function montarAcoesOS(os) {
  let html = "";

  html += `<button class="acao-mini" onclick="visualizarOS('${os.id}')">Ver</button>`;

  if (os.status === "Comunicada") {
    html += `<button class="acao-mini" onclick="transformarEmAberta('${os.id}')">Abrir</button>`;
  }

  if (!["Finalizada", "Cancelada"].includes(os.status)) {
    html += `
      <button class="acao-mini" onclick="alterarStatusOS('${os.id}', '${escapeHtml(os.status)}')">Status</button>
      <button class="acao-mini" onclick="finalizarOS('${os.id}')">Finalizar</button>
      <button class="acao-mini" onclick="cancelarOS('${os.id}')">Cancelar</button>
    `;
  }

  html += `<button class="acao-mini" onclick="verHistorico('${os.id}')">Histórico</button>`;

  return html;
}

async function visualizarOS(id) {
  const { data: os, error } = await db
    .from("ordens_servico")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !os) {
    alert("Erro ao visualizar O.S.");
    return;
  }

  const { data: anexos } = await db
    .from("anexos")
    .select("*")
    .eq("origem", "ordens_servico")
    .eq("origem_id", id)
    .order("criado_em", { ascending: false });

  const anexosHtml = (anexos || []).map(a => `
    <li><a href="${a.url_publica}" target="_blank">${escapeHtml(a.nome_arquivo)}</a></li>
  `).join("");

  abrirModal(`
    <h2>O.S ${escapeHtml(os.numero_os || "Comunicada")}</h2>
    <p>${criarBadge(os.status)} ${criarBadge(os.prioridade)}</p>

    <div class="form-grid" style="margin-top:16px;">
      <input value="Frota: ${escapeHtml(os.frota || "-")}" readonly>
      <input value="Equipamento: ${escapeHtml(os.equipamento || "-")}" readonly>
      <input value="Modelo: ${escapeHtml(os.modelo || "-")}" readonly>
      <input value="Centro de custo: ${escapeHtml(os.centro_custo || "-")}" readonly>
      <input value="Oficina: ${escapeHtml(os.oficina || "-")}" readonly>
      <input value="Horímetro: ${escapeHtml(os.horimetro || "-")}" readonly>
    </div>

    <h3 style="margin-top:18px;">Motivo</h3>
    <pre>${escapeHtml(os.motivo_entrada || "-")}</pre>

    <h3>Diagnóstico inicial</h3>
    <pre>${escapeHtml(os.diagnostico_inicial || "-")}</pre>

    <h3>Serviço executado</h3>
    <pre>${escapeHtml(os.servico_executado || "-")}</pre>

    <h3>Anexos</h3>
    <ul>${anexosHtml || "<li>Nenhum anexo.</li>"}</ul>
  `);
}

async function transformarEmAberta(id) {
  const numero = prompt("Informe o número oficial da O.S:");

  if (!numero) {
    alert("Número da O.S obrigatório.");
    return;
  }

  const { data: antiga } = await db
    .from("ordens_servico")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await db
    .from("ordens_servico")
    .update({
      numero_os: numero,
      status: "Aberta",
      data_abertura: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      data_ultima_movimentacao: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao transformar em O.S aberta.");
    return;
  }

  await registrarHistorico("ordens_servico", id, "status", antiga?.status || "Comunicada", "Aberta", "O.S comunicada transformada em O.S aberta.");

  alert("O.S comunicada transformada em aberta.");

  await atualizarTudo();
}

async function alterarStatusOS(id, statusAtual) {
  const novoStatus = prompt(
    "Informe o novo status exatamente como abaixo:\n\nComunicada\nAberta\nEm andamento\nAguardando peça\nAguardando mão de obra\nAguardando terceiro\nFinalizada\nCancelada",
    statusAtual
  );

  const statusPermitidos = [
    "Comunicada",
    "Aberta",
    "Em andamento",
    "Aguardando peça",
    "Aguardando mão de obra",
    "Aguardando terceiro",
    "Finalizada",
    "Cancelada"
  ];

  if (!novoStatus || !statusPermitidos.includes(novoStatus)) {
    alert("Status inválido.");
    return;
  }

  if (novoStatus === "Finalizada") {
    await finalizarOS(id);
    return;
  }

  if (novoStatus === "Cancelada") {
    await cancelarOS(id);
    return;
  }

  const { error } = await db
    .from("ordens_servico")
    .update({
      status: novoStatus,
      atualizado_em: new Date().toISOString(),
      data_ultima_movimentacao: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao alterar status.");
    return;
  }

  await registrarHistorico("ordens_servico", id, "status", statusAtual, novoStatus, "Status alterado manualmente.");

  alert("Status alterado com sucesso.");

  await atualizarTudo();
}

async function finalizarOS(id) {
  const servicoExecutado = prompt("Informe o serviço executado:");

  if (!servicoExecutado) {
    alert("Serviço executado é obrigatório para finalizar.");
    return;
  }

  const responsavel = prompt("Informe o responsável pelo fechamento:");

  if (!responsavel) {
    alert("Responsável pelo fechamento é obrigatório.");
    return;
  }

  const { data: antiga } = await db
    .from("ordens_servico")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await db
    .from("ordens_servico")
    .update({
      status: "Finalizada",
      servico_executado: servicoExecutado,
      responsavel_fechamento: responsavel,
      data_fechamento: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      data_ultima_movimentacao: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao finalizar O.S.");
    return;
  }

  await registrarHistorico("ordens_servico", id, "status", antiga?.status || "-", "Finalizada", `Serviço executado: ${servicoExecutado}`);

  alert("O.S finalizada com sucesso.");

  await atualizarTudo();
}

async function cancelarOS(id) {
  const motivo = prompt("Informe o motivo do cancelamento:");

  if (!motivo) {
    alert("Para cancelar uma O.S, o motivo é obrigatório.");
    return;
  }

  const { data: antiga } = await db
    .from("ordens_servico")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await db
    .from("ordens_servico")
    .update({
      status: "Cancelada",
      motivo_cancelamento: motivo,
      data_cancelamento: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      data_ultima_movimentacao: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao cancelar O.S.");
    return;
  }

  await registrarHistorico("ordens_servico", id, "status", antiga?.status || "-", "Cancelada", `Motivo do cancelamento: ${motivo}`);

  alert("O.S cancelada com sucesso.");

  await atualizarTudo();
}

async function verHistorico(id) {
  const { data, error } = await db
    .from("historico_alteracoes")
    .select("*")
    .eq("origem_id", id)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error(error);
    alert("Erro ao carregar histórico.");
    return;
  }

  if (!data || data.length === 0) {
    alert("Nenhum histórico encontrado.");
    return;
  }

  const html = data.map(item => `
    <div class="lista-item">
      <strong>${formatarData(item.criado_em)} - ${escapeHtml(item.campo_alterado || "-")}</strong>
      <span>De: ${escapeHtml(item.valor_anterior || "-")}</span><br>
      <span>Para: ${escapeHtml(item.valor_novo || "-")}</span><br>
      <span>Obs.: ${escapeHtml(item.observacao || "-")}</span>
    </div>
  `).join("");

  abrirModal(`<h2>Histórico</h2>${html}`);
}