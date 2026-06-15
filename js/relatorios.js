async function gerarRelatorioWhatsApp() {
  let consultaOS = db
    .from("ordens_servico")
    .select("*")
    .order("criado_em", { ascending: false });

  let consultaChecklist = db
    .from("checklist_execucoes")
    .select("*")
    .order("criado_em", { ascending: false });

  const dataInicio = document.getElementById("filtroRelDataInicio").value;
  const dataFim = document.getElementById("filtroRelDataFim").value;
  const status = document.getElementById("filtroRelStatus").value;

  if (dataInicio) {
    consultaOS = consultaOS.gte("criado_em", `${dataInicio}T00:00:00`);
    consultaChecklist = consultaChecklist.gte("criado_em", `${dataInicio}T00:00:00`);
  }

  if (dataFim) {
    consultaOS = consultaOS.lte("criado_em", `${dataFim}T23:59:59`);
    consultaChecklist = consultaChecklist.lte("criado_em", `${dataFim}T23:59:59`);
  }

  if (status) {
    consultaOS = consultaOS.eq("status", status);
  }

  const { data: ordens, error: erroOS } = await consultaOS;
  const { data: checklists, error: erroChecklist } = await consultaChecklist;

  if (erroOS || erroChecklist) {
    console.error(erroOS || erroChecklist);
    alert("Erro ao gerar relatório.");
    return;
  }

  const listaOS = ordens || [];
  const listaChecklists = checklists || [];

  const totalOS = listaOS.length;
  const comunicadas = contarPorCampo(listaOS, "status", "Comunicada");
  const abertas = contarPorCampo(listaOS, "status", "Aberta");
  const andamento = contarPorCampo(listaOS, "status", "Em andamento");
  const aguardandoPeca = contarPorCampo(listaOS, "status", "Aguardando peça");
  const aguardandoMaoObra = contarPorCampo(listaOS, "status", "Aguardando mão de obra");
  const aguardandoTerceiro = contarPorCampo(listaOS, "status", "Aguardando terceiro");
  const finalizadas = contarPorCampo(listaOS, "status", "Finalizada");
  const canceladas = contarPorCampo(listaOS, "status", "Cancelada");
  const atrasadas = listaOS.filter(os => osEstaAtrasada(os)).length;

  const totalChecklist = listaChecklists.length;
  const aptos = contarPorCampo(listaChecklists, "resultado", "Apto");
  const ressalva = contarPorCampo(listaChecklists, "resultado", "Apto com ressalva");
  const inaptos = contarPorCampo(listaChecklists, "resultado", "Inapto");
  const geraramOS = listaChecklists.filter(c => c.gerou_os).length;
  const naoConformidades = listaChecklists.reduce((total, c) => total + (c.quantidade_nao_conformidades || 0), 0);

  const osEmAberto = listaOS.filter(os => !["Finalizada", "Cancelada"].includes(os.status));

  const checklistsPendentes = listaChecklists.filter(c =>
    ["Apto com ressalva", "Inapto"].includes(c.resultado)
  );

  let mensagem = "";

  mensagem += "RELATÓRIO DE O.S E CHECKLIST\n\n";
  mensagem += `Data da atualização: ${new Date().toLocaleString("pt-BR")}\n\n`;

  mensagem += "RESUMO DE O.S:\n";
  mensagem += `Total de O.S: ${totalOS}\n`;
  mensagem += `Comunicadas: ${comunicadas}\n`;
  mensagem += `Abertas: ${abertas}\n`;
  mensagem += `Em andamento: ${andamento}\n`;
  mensagem += `Aguardando peça: ${aguardandoPeca}\n`;
  mensagem += `Aguardando mão de obra: ${aguardandoMaoObra}\n`;
  mensagem += `Aguardando terceiro: ${aguardandoTerceiro}\n`;
  mensagem += `Finalizadas: ${finalizadas}\n`;
  mensagem += `Canceladas: ${canceladas}\n`;
  mensagem += `Atrasadas: ${atrasadas}\n\n`;

  mensagem += "O.S EM ABERTO:\n";

  if (osEmAberto.length === 0) {
    mensagem += "Nenhuma O.S em aberto.\n";
  } else {
    osEmAberto.forEach(os => {
      mensagem += `\nFrota ${os.frota} – ${os.numero_os || "O.S comunicada"} – ${os.motivo_entrada || "Sem motivo"} – Status: ${os.status} – Prioridade: ${os.prioridade || "-"} – Previsão: ${os.previsao_saida ? formatarData(os.previsao_saida) : "sem previsão"}\n`;
    });
  }

  mensagem += "\nRESUMO DE CHECKLIST:\n";
  mensagem += `Total realizado: ${totalChecklist}\n`;
  mensagem += `Aptos: ${aptos}\n`;
  mensagem += `Aptos com ressalva: ${ressalva}\n`;
  mensagem += `Inaptos: ${inaptos}\n`;
  mensagem += `Não conformidades: ${naoConformidades}\n`;
  mensagem += `Checklists que geraram O.S: ${geraramOS}\n\n`;

  mensagem += "CHECKLISTS COM PENDÊNCIA:\n";

  if (checklistsPendentes.length === 0) {
    mensagem += "Nenhum checklist com pendência.\n";
  } else {
    checklistsPendentes.forEach(item => {
      mensagem += `\nFrota ${item.frota} – ${item.tipo_checklist} – Resultado: ${item.resultado} – NC: ${item.quantidade_nao_conformidades || 0} – Gerou O.S: ${item.gerou_os ? "Sim" : "Não"}\n`;
    });
  }

  document.getElementById("mensagemWhatsApp").value = mensagem;
}

function contarPorCampo(lista, campo, valor) {
  return lista.filter(item => item[campo] === valor).length;
}

function copiarMensagemWhatsApp() {
  const campo = document.getElementById("mensagemWhatsApp");

  if (!campo.value.trim()) {
    alert("Gere a mensagem primeiro.");
    return;
  }

  campo.select();
  document.execCommand("copy");

  alert("Mensagem copiada com sucesso.");
}

async function exportarExcelResumo() {
  const { data: ordens } = await db
    .from("ordens_servico")
    .select("*")
    .order("criado_em", { ascending: false });

  const { data: checklists } = await db
    .from("checklist_execucoes")
    .select("*")
    .order("criado_em", { ascending: false });

  const wb = XLSX.utils.book_new();

  const wsOS = XLSX.utils.json_to_sheet((ordens || []).map(os => ({
    numero_os: os.numero_os,
    frota: os.frota,
    equipamento: os.equipamento,
    status: os.status,
    prioridade: os.prioridade,
    motivo: os.motivo_entrada,
    origem: os.origem,
    criado_em: os.criado_em
  })));

  const wsChecklist = XLSX.utils.json_to_sheet((checklists || []).map(c => ({
    frota: c.frota,
    modelo: c.modelo,
    tipo: c.tipo_checklist,
    resultado: c.resultado,
    nao_conformidades: c.quantidade_nao_conformidades,
    gerou_os: c.gerou_os,
    origem: c.origem,
    criado_em: c.criado_em
  })));

  XLSX.utils.book_append_sheet(wb, wsOS, "Ordens de Serviço");
  XLSX.utils.book_append_sheet(wb, wsChecklist, "Checklists");

  XLSX.writeFile(wb, "relatorio_os_checklist.xlsx");
}

function exportarPDFResumo() {
  const texto = document.getElementById("mensagemWhatsApp").value.trim();

  if (!texto) {
    alert("Gere a mensagem do relatório primeiro.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(12);
  const linhas = doc.splitTextToSize(texto, 180);

  let y = 15;

  linhas.forEach(linha => {
    if (y > 280) {
      doc.addPage();
      y = 15;
    }

    doc.text(linha, 15, y);
    y += 7;
  });

  doc.save("relatorio_os_checklist.pdf");
}