const MODELO_COLHEDORAS = [
  {
    grupo: "Sistema elétrico",
    itens: [
      ["Painel de instrumentos", "Crítico"],
      ["Palhetas", "Normal"],
      ["Ar-condicionado", "Normal"],
      ["Farol da cabine", "Normal"],
      ["Farol do elevador", "Normal"],
      ["Farol auxiliar", "Normal"],
      ["Rádio amador", "Normal"],
      ["Girolex", "Crítico"],
      ["Buzina", "Crítico"],
      ["Sirene de ré", "Crítico"],
      ["Sensor de segurança", "Crítico"]
    ]
  },
  {
    grupo: "Condições externas",
    itens: [
      ["Trincas no chassi", "Crítico"],
      ["Guarda-corpo", "Crítico"],
      ["Estado do guarda-corpo", "Normal"],
      ["Suporte de segurança", "Crítico"],
      ["Espelho retrovisor", "Normal"],
      ["Para-brisa", "Normal"],
      ["Vidro traseiro", "Normal"],
      ["Vidro lateral", "Normal"],
      ["Guarda-corpo frontal", "Crítico"],
      ["Guarda-corpo lateral", "Crítico"],
      ["Trava de segurança", "Crítico"],
      ["Extintor de incêndio", "Crítico"],
      ["Suporte do extintor", "Normal"],
      ["Escada de acesso", "Crítico"],
      ["Adesivos", "Normal"]
    ]
  },
  {
    grupo: "Condições internas",
    itens: [
      ["Console", "Normal"],
      ["Assento", "Normal"],
      ["Cinto de segurança", "Crítico"]
    ]
  },
  {
    grupo: "Elevador",
    itens: [
      ["Corrente", "Crítico"],
      ["Pistão do levante", "Crítico"],
      ["Taliscas", "Normal"],
      ["Engrenagens laterais", "Normal"],
      ["Pistão flap", "Normal"],
      ["Barra de segurança do pistão", "Crítico"],
      ["Assoalho do elevador", "Normal"],
      ["Proteção e abraçadeira de mangueira", "Normal"]
    ]
  },
  {
    grupo: "Mesa do giro",
    itens: [
      ["Mesa", "Normal"],
      ["Pistão do giro", "Normal"],
      ["Batente da mesa", "Normal"]
    ]
  },
  {
    grupo: "Motor",
    itens: [
      ["Correias", "Normal"],
      ["Vazamentos", "Crítico"],
      ["Tampa do escapamento", "Normal"],
      ["Acrílico pré-filtro", "Normal"]
    ]
  },
  {
    grupo: "Radiadores",
    itens: [
      ["Radiadores", "Normal"],
      ["Fixação da estrutura", "Normal"],
      ["Tampa do radiador de água", "Normal"]
    ]
  },
  {
    grupo: "Corte de pontas",
    itens: [
      ["Coletor lado direito", "Normal"],
      ["Coletor lado esquerdo", "Normal"],
      ["Mastro superior", "Normal"],
      ["Pistão do corte de ponta", "Normal"],
      ["Trava de segurança do corte de pontas", "Crítico"]
    ]
  },
  {
    grupo: "Divisor de linhas",
    itens: [
      ["Divisor de linha lado direito", "Normal"],
      ["Divisor de linha lado esquerdo", "Normal"],
      ["Suporte do disco lateral direito", "Normal"],
      ["Suporte do disco lateral esquerdo", "Normal"],
      ["Cones lado direito", "Normal"],
      ["Cones lado esquerdo", "Normal"],
      ["Sapata lado direito", "Normal"],
      ["Sapata lado esquerdo", "Normal"],
      ["Suporte do pirulito externo direito", "Normal"],
      ["Suporte do pirulito externo esquerdo", "Normal"]
    ]
  },
  {
    grupo: "Corte de base",
    itens: [
      ["Canela lado direito", "Normal"],
      ["Canela lado esquerdo", "Normal"],
      ["Disco de corte", "Crítico"],
      ["M51", "Normal"],
      ["Guia lado direito", "Normal"],
      ["Guia lado esquerdo", "Normal"]
    ]
  },
  {
    grupo: "Trem de rolo",
    itens: [
      ["Rolo transportador", "Normal"],
      ["Rolo tombador", "Normal"]
    ]
  },
  {
    grupo: "Picador",
    itens: [
      ["Facões", "Crítico"],
      ["Borrachas lançadoras", "Normal"],
      ["Borrachão", "Normal"],
      ["Mangueiras e motores", "Crítico"]
    ]
  },
  {
    grupo: "Extrator primário",
    itens: [
      ["Pá de hélice", "Normal"],
      ["Anel de desgaste", "Normal"],
      ["Capô do extrator primário", "Normal"],
      ["Cinta do elevador", "Normal"]
    ]
  },
  {
    grupo: "Extrator secundário",
    itens: [
      ["Pá de hélice", "Normal"],
      ["Anel de desgaste", "Normal"],
      ["Corrente do extrator secundário", "Normal"],
      ["Capô do extrator secundário", "Normal"]
    ]
  },
  {
    grupo: "Compartimento de bombas",
    itens: [
      ["Vazamento na caixa de bomba", "Crítico"]
    ]
  },
  {
    grupo: "Material rodante",
    itens: [
      ["Esteira rodante", "Crítico"],
      ["Desgaste material rodante", "Normal"],
      ["Guia da esteira rodante", "Normal"],
      ["Desgaste roletes", "Normal"],
      ["Tensionamento da esteira", "Crítico"]
    ]
  },
  {
    grupo: "Cabine",
    itens: [
      ["Está limpa e organizada", "Normal"],
      ["Banco está funcionando todas as regulagens", "Normal"],
      ["Retrovisores estão isentos de trincas", "Normal"]
    ]
  }
];

document.addEventListener("DOMContentLoaded", () => {
  preencherDataChecklistLocal();
  renderizarChecklistDigital();

  const form = document.getElementById("formChecklistDigital");

  if (form) {
    form.addEventListener("submit", async event => {
      event.preventDefault();

      const dados = coletarDadosChecklistDigital();

      if (!dados.execucao.frota) {
        alert("Informe a frota.");
        return;
      }

      await salvarChecklistCompleto(dados.execucao, dados.respostas, null, "", []);
    });
  }
});

function preencherDataChecklistLocal() {
  const campo = document.getElementById("data_checklist");

  if (campo && !campo.value) {
    campo.value = new Date().toISOString().slice(0, 10);
  }
}

function renderizarChecklistDigital(prefixo = "digital", containerId = "itensChecklistDigital") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  MODELO_COLHEDORAS.forEach((grupo, grupoIndex) => {
    const divGrupo = document.createElement("div");
    divGrupo.className = "grupo-checklist";

    let html = `<h4>${htmlSeguro(grupo.grupo)}</h4>`;

    grupo.itens.forEach((item, itemIndex) => {
      const descricao = item[0];
      const criticidade = item[1];
      const idBase = `${prefixo}_${grupoIndex}_${itemIndex}`;

      html += `
        <div class="item-check-row" data-grupo="${htmlSeguro(grupo.grupo)}" data-item="${htmlSeguro(descricao)}" data-criticidade="${htmlSeguro(criticidade)}">
          <span>
            ${htmlSeguro(descricao)}
            <small>(${htmlSeguro(criticidade)})</small>
          </span>

          ${selectResposta(`${idBase}_A`, "A")}
          ${selectResposta(`${idBase}_B`, "B")}
          ${selectResposta(`${idBase}_C`, "C")}

          <input type="text" class="obs-item" placeholder="Pendência/observação do item">
        </div>
      `;
    });

    divGrupo.innerHTML = html;
    container.appendChild(divGrupo);
  });
}

function selectResposta(id, turno) {
  return `
    <select id="${id}" class="resposta-check" data-turno="${turno}">
      <option value="">Turno ${turno}</option>
      <option value="S">S - Sim / Conforme</option>
      <option value="NS">NS - Não satisfatório</option>
      <option value="NA">NA - Não se aplica</option>
      <option value="N">N - Não conforme</option>
    </select>
  `;
}

function marcarTudoChecklist(valorResposta) {
  document.querySelectorAll("#itensChecklistDigital .resposta-check").forEach(select => {
    select.value = valorResposta;
  });
}

function limparChecklistDigital() {
  document.querySelectorAll("#itensChecklistDigital .resposta-check").forEach(select => {
    select.value = "";
    select.classList.remove("campo-baixa-confianca");
  });

  document.querySelectorAll("#itensChecklistDigital .obs-item").forEach(input => {
    input.value = "";
  });
}

function coletarDadosChecklistDigital() {
  const respostas = coletarRespostasChecklist("itensChecklistDigital");
  const calculo = calcularResultadoChecklist(respostas);

  const execucao = {
    frota: pegarCampo("frota_checklist"),
    modelo: pegarCampo("modelo_checklist"),
    unidade: pegarCampo("unidade_checklist"),
    frente: pegarCampo("frente_checklist"),
    tipo_checklist: pegarCampo("tipo_checklist") || "Colhedoras",
    data_execucao: pegarCampo("data_checklist") || new Date().toISOString().slice(0, 10),
    horimetro: pegarCampo("horimetro_checklist"),
    operador_turno_a: pegarCampo("operador_a_checklist"),
    operador_turno_b: pegarCampo("operador_b_checklist"),
    operador_turno_c: pegarCampo("operador_c_checklist"),
    lider_turno_a: pegarCampo("lider_a_checklist"),
    lider_turno_b: pegarCampo("lider_b_checklist"),
    lider_turno_c: pegarCampo("lider_c_checklist"),
    resultado: calculo.resultado,
    quantidade_nao_conformidades: calculo.qtdNaoConformidades,
    observacoes: pegarCampo("observacoes_checklist"),
    veiculo_apto: calculo.resultado !== "Inapto",
    origem: "Manual",
    modo_leitura: "Manual",
    gerou_os: false
  };

  return { execucao, respostas };
}

function coletarRespostasChecklist(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  const respostas = [];
  const linhas = Array.from(container.querySelectorAll(".item-check-row"));

  linhas.forEach(linha => {
    const grupo = linha.dataset.grupo;
    const item = linha.dataset.item;
    const criticidade = linha.dataset.criticidade;
    const observacao = linha.querySelector(".obs-item")?.value.trim() || "";

    linha.querySelectorAll(".resposta-check").forEach(select => {
      if (!select.value) return;

      respostas.push({
        grupo,
        item,
        turno: select.dataset.turno,
        resposta: select.value,
        criticidade,
        observacao,
        nao_conformidade: ["NS", "N"].includes(select.value)
      });
    });
  });

  return respostas;
}

function calcularResultadoChecklist(respostas) {
  const naoConformes = respostas.filter(r => ["NS", "N"].includes(r.resposta));
  const criticos = naoConformes.filter(r => r.criticidade === "Crítico");

  let resultado = "Apto";

  if (criticos.length > 0) {
    resultado = "Inapto";
  } else if (naoConformes.length > 0) {
    resultado = "Apto com ressalva";
  }

  return {
    resultado,
    qtdNaoConformidades: naoConformes.length
  };
}

async function salvarChecklistCompleto(execucao, respostas, arquivoFoto = null, textoOCR = "", pendencias = []) {
  if (!execucao.frota) {
    alert("Informe a frota antes de salvar.");
    return;
  }

  const { data: checklistSalvo, error: erroChecklist } = await db
    .from("checklist_execucoes")
    .insert([execucao])
    .select()
    .single();

  if (erroChecklist) {
    console.error(erroChecklist);
    alert("Erro ao salvar checklist: " + (erroChecklist.message || JSON.stringify(erroChecklist)));
    return;
  }

  if (arquivoFoto) {
    await anexarFotoChecklist(arquivoFoto, checklistSalvo.id, textoOCR);
  }

  if (respostas.length > 0) {
    const respostasParaSalvar = respostas.map(r => ({
      checklist_id: checklistSalvo.id,
      grupo: r.grupo,
      item: r.item,
      turno: r.turno,
      resposta: r.resposta,
      criticidade: r.criticidade,
      observacao: r.observacao,
      nao_conformidade: r.nao_conformidade
    }));

    const { error: erroRespostas } = await db
      .from("checklist_respostas")
      .insert(respostasParaSalvar);

    if (erroRespostas) {
      console.error(erroRespostas);
      alert("Checklist salvo, mas houve erro ao salvar respostas.");
      return;
    }
  }

  if (pendencias && pendencias.length > 0) {
    const pendenciasParaSalvar = pendencias
      .filter(p => p.descricao)
      .map(p => ({
        checklist_id: checklistSalvo.id,
        descricao: p.descricao || "",
        grupo_sugerido: p.grupo_sugerido || "",
        item_sugerido: p.item_sugerido || "",
        turno: p.turno || "",
        resposta_origem: p.resposta_origem || "",
        criticidade: p.criticidade || "Normal",
        confianca: p.confianca || 0
      }));

    if (pendenciasParaSalvar.length > 0) {
      await db.from("checklist_pendencias").insert(pendenciasParaSalvar);
    }
  }

  if (typeof registrarHistorico === "function") {
    await registrarHistorico(
      "checklist_execucoes",
      checklistSalvo.id,
      "criação",
      "-",
      "Checklist criado",
      `Checklist salvo com resultado ${execucao.resultado}.`
    );
  }

  const naoConformes = respostas.filter(r => r.nao_conformidade);

  if (naoConformes.length > 0 || (pendencias && pendencias.length > 0)) {
    const gerarOS = confirm("Existe pendência ou item não conforme. Deseja gerar uma O.S comunicada?");

    if (gerarOS) {
      await gerarOSPorChecklist(checklistSalvo.id, execucao, naoConformes, pendencias);
    }
  }

  alert("Checklist salvo com sucesso.");

  document.getElementById("formChecklistDigital")?.reset();
  preencherDataChecklistLocal();
  limparChecklistDigital();
  limparRevisaoFoto?.();

  if (typeof atualizarTudo === "function") await atualizarTudo();
  if (typeof abrirSubAba === "function") abrirSubAba("checkLista");
}

async function anexarFotoChecklist(arquivoFoto, checklistId, textoOCR) {
  if (typeof uploadArquivo === "function") {
    const url = await uploadArquivo(arquivoFoto, "checklist_execucoes", checklistId, textoOCR);

    if (url) {
      await db.from("checklist_execucoes").update({ foto_url: url }).eq("id", checklistId);
    }
  }
}

async function gerarOSPorChecklist(checklistId, checklist, naoConformes, pendencias = []) {
  const resumoNaoConformes = naoConformes
    .slice(0, 10)
    .map(r => `${r.grupo} / ${r.item} / Turno ${r.turno} (${r.resposta})${r.observacao ? " - " + r.observacao : ""}`)
    .join("; ");

  const resumoPendencias = pendencias
    .slice(0, 10)
    .filter(p => p.descricao)
    .map(p => p.descricao)
    .join("; ");

  const existeCritico =
    naoConformes.some(r => r.criticidade === "Crítico") ||
    pendencias.some(p => p.criticidade === "Crítico");

  let motivo = `Checklist da frota ${checklist.frota}${checklist.frente ? ", Frente/Local " + checklist.frente : ""} com pendência.`;

  if (resumoNaoConformes) {
    motivo += ` Itens não conformes: ${resumoNaoConformes}.`;
  }

  if (resumoPendencias) {
    motivo += ` Pendências relatadas pelo operador: ${resumoPendencias}.`;
  }

  const novaOS = {
    numero_os: null,
    status: "Comunicada",
    frota: checklist.frota,
    equipamento: checklist.tipo_checklist || "Checklist",
    modelo: checklist.modelo || "",
    motivo_entrada: motivo,
    prioridade: existeCritico ? "Crítica" : "Média",
    origem: "Checklist",
    checklist_id: checklistId,
    observacoes: [checklist.frente ? `Frente/Local: ${checklist.frente}` : "", checklist.observacoes || checklist.observacoes_ia || ""].filter(Boolean).join("\n"),
    data_ultima_movimentacao: new Date().toISOString()
  };

  const { data: osSalva, error: erroOS } = await db
    .from("ordens_servico")
    .insert([novaOS])
    .select()
    .single();

  if (erroOS) {
    console.error(erroOS);
    alert("Erro ao gerar O.S pelo checklist.");
    return;
  }

  await db.from("checklist_execucoes").update({ gerou_os: true }).eq("id", checklistId);

  await db
    .from("checklist_respostas")
    .update({ gerou_os: true, os_id: osSalva.id })
    .eq("checklist_id", checklistId)
    .eq("nao_conformidade", true);

  await db
    .from("checklist_pendencias")
    .update({ gerou_os: true, os_id: osSalva.id })
    .eq("checklist_id", checklistId);

  if (typeof registrarHistorico === "function") {
    await registrarHistorico(
      "ordens_servico",
      osSalva.id,
      "origem",
      "-",
      "Checklist",
      `O.S comunicada gerada pelo checklist da frota ${checklist.frota}.`
    );
  }
}

async function carregarChecklists() {
  const { data, error } = await db
    .from("checklist_execucoes")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error(error);
    alert("Erro ao carregar checklists.");
    return;
  }

  const tabela = document.getElementById("tabelaChecklists");
  if (!tabela) return;

  tabela.innerHTML = "";

  if (!data || data.length === 0) {
    tabela.innerHTML = `<tr><td colspan="9">Nenhum checklist cadastrado.</td></tr>`;
    return;
  }

  data.forEach(checklist => {
    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${dataCurta(checklist.data_execucao || checklist.criado_em)}</td>
      <td>${htmlSeguro(checklist.frota || "-")}</td>
      <td>${htmlSeguro(checklist.frente || "-")}</td>
      <td>${htmlSeguro(checklist.modelo || "-")}</td>
      <td>${htmlSeguro(checklist.tipo_checklist || "-")}</td>
      <td>${badgeSeguro(checklist.resultado)}</td>
      <td>${checklist.quantidade_nao_conformidades || 0}</td>
      <td>${checklist.gerou_os ? "Sim" : "Não"}</td>
      <td>
        <button class="acao-mini" onclick="visualizarChecklist('${checklist.id}')">Ver</button>
        <button class="acao-mini" onclick="exportarChecklistPDF('${checklist.id}')">PDF</button>
        <button class="acao-mini" onclick="copiarResumoChecklistSupervisor('${checklist.id}')">Copiar</button>
      </td>
    `;

    tabela.appendChild(linha);
  });
}

async function visualizarChecklist(id) {
  const { data: checklist, error } = await db
    .from("checklist_execucoes")
    .select("*")
    .eq("id", id)
    .single();

  const { data: respostas } = await db
    .from("checklist_respostas")
    .select("*")
    .eq("checklist_id", id)
    .order("grupo");

  const { data: pendencias } = await db
    .from("checklist_pendencias")
    .select("*")
    .eq("checklist_id", id)
    .order("criado_em");

  if (error || !checklist) {
    alert("Erro ao visualizar checklist.");
    return;
  }

  const respostasHtml = (respostas || []).map(r => `
    <tr>
      <td>${htmlSeguro(r.grupo)}</td>
      <td>${htmlSeguro(r.item)}</td>
      <td>${htmlSeguro(r.turno)}</td>
      <td>${badgeSeguro(r.resposta)}</td>
      <td>${htmlSeguro(r.criticidade)}</td>
      <td>${htmlSeguro(r.observacao || "-")}</td>
    </tr>
  `).join("");

  const pendenciasHtml = (pendencias || []).map(p => `
    <div class="lista-item">
      <strong>${htmlSeguro(p.descricao)}</strong>
      <span>${htmlSeguro(p.grupo_sugerido || "-")} / ${htmlSeguro(p.item_sugerido || "-")} / ${htmlSeguro(p.criticidade || "Normal")}</span>
    </div>
  `).join("");

  const html = `
    <h2>Checklist - Frota ${htmlSeguro(checklist.frota)}</h2>
    <p>${badgeSeguro(checklist.resultado)} | Não conformidades: ${checklist.quantidade_nao_conformidades || 0}</p>

    ${checklist.foto_url ? `<p style="margin-top:12px;"><a href="${checklist.foto_url}" target="_blank">Abrir foto original</a></p>` : ""}

    <div class="actions-row" style="margin-top:14px;">
      <button class="btn-secondary" onclick="exportarChecklistPDF('${id}')">Exportar PDF</button>
      <button class="btn-secondary" onclick="copiarResumoChecklistSupervisor('${id}')">Copiar resumo</button>
    </div>

    <div class="form-grid" style="margin-top:16px;">
      <input value="Modelo: ${htmlSeguro(checklist.modelo || "-")}" readonly>
      <input value="Unidade: ${htmlSeguro(checklist.unidade || "-")}" readonly>
      <input value="Frente/Local: ${htmlSeguro(checklist.frente || "-")}" readonly>
      <input value="Horímetro: ${htmlSeguro(checklist.horimetro || "-")}" readonly>
    </div>

    <h3 style="margin-top:18px;">Pendências detectadas</h3>
    ${pendenciasHtml || `<div class="lista-item">Nenhuma pendência registrada.</div>`}

    <h3 style="margin-top:18px;">Respostas</h3>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Grupo</th>
            <th>Item</th>
            <th>Turno</th>
            <th>Resp.</th>
            <th>Criticidade</th>
            <th>Obs.</th>
          </tr>
        </thead>
        <tbody>${respostasHtml || `<tr><td colspan="6">Sem respostas.</td></tr>`}</tbody>
      </table>
    </div>
  `;

  if (typeof abrirModal === "function") abrirModal(html);
  else alert("Detalhes carregados. Seu projeto atual não possui modal de visualização.");
}


async function buscarChecklistCompleto(id) {
  const { data: checklist, error } = await db
    .from("checklist_execucoes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !checklist) {
    alert("Erro ao carregar checklist.");
    return null;
  }

  const { data: respostas } = await db
    .from("checklist_respostas")
    .select("*")
    .eq("checklist_id", id)
    .order("grupo");

  const { data: pendencias } = await db
    .from("checklist_pendencias")
    .select("*")
    .eq("checklist_id", id)
    .order("criado_em");

  const { data: ordens } = await db
    .from("ordens_servico")
    .select("numero_os, status, prioridade, criado_em")
    .eq("checklist_id", id)
    .order("criado_em", { ascending: false });

  return {
    checklist,
    respostas: respostas || [],
    pendencias: pendencias || [],
    ordens: ordens || []
  };
}

function montarResumoChecklistSupervisor(dados) {
  const { checklist, respostas, pendencias, ordens } = dados;
  const naoConformes = respostas.filter(r => ["NS", "N"].includes(r.resposta));
  const osGerada = ordens && ordens.length > 0 ? ordens[0] : null;

  const linhas = [];
  linhas.push("CHECKLIST OPERACIONAL");
  linhas.push("");
  linhas.push(`Data: ${dataCurta(checklist.data_execucao || checklist.criado_em)}`);
  linhas.push(`Frota: ${checklist.frota || "-"}`);
  linhas.push(`Frente/Local: ${checklist.frente || "-"}`);
  linhas.push(`Modelo: ${checklist.modelo || "-"}`);
  linhas.push(`Unidade: ${checklist.unidade || "-"}`);
  linhas.push(`Tipo: ${checklist.tipo_checklist || "-"}`);
  linhas.push(`Horímetro: ${checklist.horimetro || "-"}`);
  linhas.push("");
  linhas.push(`Resultado: ${checklist.resultado || "-"}`);
  linhas.push(`Não conformidades: ${checklist.quantidade_nao_conformidades || 0}`);
  linhas.push(`Gerou O.S: ${checklist.gerou_os ? "Sim" : "Não"}${osGerada ? " - " + (osGerada.numero_os || "Comunicada") + " / " + osGerada.status : ""}`);
  linhas.push("");

  linhas.push("OPERADORES / LÍDERES");
  linhas.push(`Operador A: ${checklist.operador_turno_a || "-"}`);
  linhas.push(`Operador B: ${checklist.operador_turno_b || "-"}`);
  linhas.push(`Operador C: ${checklist.operador_turno_c || "-"}`);
  linhas.push(`Líder A: ${checklist.lider_turno_a || "-"}`);
  linhas.push(`Líder B: ${checklist.lider_turno_b || "-"}`);
  linhas.push(`Líder C: ${checklist.lider_turno_c || "-"}`);
  linhas.push("");

  linhas.push("PENDÊNCIAS / NÃO CONFORMIDADES");

  if (naoConformes.length === 0 && pendencias.length === 0) {
    linhas.push("Nenhuma pendência registrada.");
  }

  naoConformes.forEach((r, index) => {
    linhas.push(`${index + 1}. ${r.grupo || "-"} / ${r.item || "-"} / Turno ${r.turno || "-"}`);
    linhas.push(`   Resposta: ${r.resposta || "-"} | Criticidade: ${r.criticidade || "-"}`);
    if (r.observacao) linhas.push(`   Observação: ${r.observacao}`);
  });

  pendencias.forEach((p, index) => {
    linhas.push(`${naoConformes.length + index + 1}. ${p.descricao || "-"}`);
    linhas.push(`   Grupo/Item: ${p.grupo_sugerido || "-"} / ${p.item_sugerido || "-"} | Criticidade: ${p.criticidade || "Normal"}`);
  });

  if (checklist.observacoes) {
    linhas.push("");
    linhas.push("OBSERVAÇÕES GERAIS");
    linhas.push(checklist.observacoes);
  }

  return linhas.join("\n");
}

async function copiarResumoChecklistSupervisor(id) {
  const dados = await buscarChecklistCompleto(id);
  if (!dados) return;

  const resumo = montarResumoChecklistSupervisor(dados);

  try {
    await navigator.clipboard.writeText(resumo);
  } catch (erro) {
    const area = document.createElement("textarea");
    area.value = resumo;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  alert("Resumo do checklist copiado para enviar ao supervisor.");
}

async function exportarChecklistPDF(id) {
  const dados = await buscarChecklistCompleto(id);
  if (!dados) return;

  if (!window.jspdf) {
    alert("Biblioteca jsPDF não carregada.");
    return;
  }

  const resumo = montarResumoChecklistSupervisor(dados);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text("Gerenciador de O.S", 15, 14);
  doc.setFontSize(11);

  const linhas = doc.splitTextToSize(resumo, 180);
  let y = 24;

  linhas.forEach(linha => {
    if (y > 280) {
      doc.addPage();
      y = 15;
    }
    doc.text(linha, 15, y);
    y += 6;
  });

  const nome = normalizarNomeArquivo(`checklist_frota_${dados.checklist.frota || "sem_frota"}_${dados.checklist.data_execucao || "sem_data"}.pdf`);
  doc.save(nome);
}

function pegarCampo(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function htmlSeguro(texto) {
  if (typeof escapeHtml === "function") return escapeHtml(texto);

  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function badgeSeguro(texto) {
  if (typeof criarBadge === "function") return criarBadge(texto);
  return `<span class="badge">${htmlSeguro(texto || "-")}</span>`;
}

function dataCurta(data) {
  if (typeof formatarDataCurta === "function") return formatarDataCurta(data);
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR");
}
