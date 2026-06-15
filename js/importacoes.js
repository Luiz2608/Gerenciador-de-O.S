let arquivoFotoAtual = null;
let textoOCRAtual = "";
let dadosIAAtual = null;
let pendenciasIAAtual = [];

async function lerFotoChecklistIA() {
  const input = document.getElementById("inputFotoChecklist");
  const progress = document.getElementById("ocrProgress");
  const preview = document.getElementById("previewFotosChecklist");
  const revisao = document.getElementById("revisaoFotoChecklist");

  if (!input.files || input.files.length === 0) {
    alert("Selecione a frente e/ou verso do checklist.");
    return;
  }

  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("COLE_A_CHAVE")) {
    alert("Informe a chave do Gemini no arquivo js/config.js.");
    return;
  }

  const arquivos = Array.from(input.files);

  arquivoFotoAtual = arquivos[0];
  dadosIAAtual = null;
  pendenciasIAAtual = [];

  preview.innerHTML = "";
  revisao.innerHTML = "";

  arquivos.forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
  });

  progress.textContent = "Preparando imagens para leitura com Gemini...";

  try {
    const parts = [
      {
        text: montarPromptChecklistGemini()
      }
    ];

    for (const file of arquivos) {
      const base64 = await arquivoParaBase64(file);

      parts.push({
        inline_data: {
          mime_type: file.type || "image/jpeg",
          data: base64
        }
      });
    }

    progress.textContent = "O Gemini está lendo campos, marcações e pendências...";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts
          }
        ],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: "application/json"
        }
      })
    });

    const retorno = await resposta.json();

    if (!resposta.ok) {
      console.error(retorno);
      progress.textContent = "Erro na leitura com Gemini.";
      alert("Erro na leitura com Gemini. Veja o console.");
      return;
    }

    const texto = retorno?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let dados;

    try {
      dados = JSON.parse(texto);
    } catch (erro) {
      console.error("Resposta bruta do Gemini:", texto);
      alert("O Gemini respondeu fora do formato esperado. Veja o console.");
      return;
    }

    dadosIAAtual = dados;
    pendenciasIAAtual = dados.pendencias_detectadas || [];
    textoOCRAtual = JSON.stringify(dados, null, 2);

    renderizarRevisaoChecklistIA(dados);

    progress.textContent = `Leitura concluída com Gemini. Confiança geral: ${dados.confianca_geral || 0}%. Revise antes de salvar.`;

  } catch (erro) {
    console.error(erro);
    progress.textContent = "Erro ao processar a leitura com Gemini.";
    alert("Erro ao processar a leitura com Gemini.");
  }
}

async function chamarOpenAILeituraChecklist(imagens) {
  const content = [
    {
      type: "input_text",
      text: montarPromptLeituraChecklist()
    }
  ];

  imagens.forEach(img => {
    content.push({
      type: "input_image",
      image_url: img.dataUrl
    });
  });

  const resposta = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "leitura_checklist_colhedora",
          strict: true,
          schema: schemaChecklistIA()
        }
      }
    })
  });

  const resultado = await resposta.json();

  if (!resposta.ok) {
    console.error("Erro OpenAI:", resultado);
    throw new Error(resultado?.error?.message || "Erro na API da OpenAI.");
  }

  const texto = extrairTextoOpenAI(resultado);

  try {
    return JSON.parse(texto);
  } catch (erro) {
    console.error("Resposta bruta da I.A:", texto);
    throw new Error("A I.A retornou uma resposta fora do padrão JSON.");
  }
}

function montarPromptLeituraChecklist() {
  return `
Você é um leitor técnico de checklist operacional agrícola.

Analise as fotos de um checklist físico de colhedoras preenchido à caneta.
A foto pode conter frente e verso. O formulário usa colunas de resposta por turno A, B e C.

Tarefas:
1. Ler campos principais: frota, data, modelo, unidade, horímetro, operadores e líderes.
2. Ler as marcações do checklist: S, NS, NA e N.
3. Ler pendências manuscritas escritas pelo operador.
4. Associar pendências ao grupo/item mais provável.
5. Não salvar nada: a resposta será usada apenas como sugestão para revisão humana.

Regras:
- Não invente dados.
- Se não conseguir ler um campo, retorne vazio.
- As respostas permitidas são somente: S, NS, NA e N.
- S = Sim / Conforme.
- NS = Não satisfatório.
- NA = Não se aplica.
- N = Não / Não conforme.
- Leia cada turno separadamente: A, B e C.
- Pendências manuscritas são muito importantes. Leia qualquer observação, defeito, ressalva ou anotação do operador.
- Se uma marca estiver ambígua, use a opção mais provável e coloque confiança baixa.
- Retorne somente JSON válido, seguindo o schema.

Itens possíveis do checklist de colhedoras:
Sistema elétrico: Painel de instrumentos, Palhetas, Ar-condicionado, Farol da cabine, Farol do elevador, Farol auxiliar, Rádio amador, Girolex, Buzina, Sirene de ré, Sensor de segurança.
Condições externas: Trincas no chassi, Guarda-corpo, Estado do guarda-corpo, Suporte de segurança, Espelho retrovisor, Para-brisa, Vidro traseiro, Vidro lateral, Guarda-corpo frontal, Guarda-corpo lateral, Trava de segurança, Extintor de incêndio, Suporte do extintor, Escada de acesso, Adesivos.
Condições internas: Console, Assento, Cinto de segurança.
Elevador: Corrente, Pistão do levante, Taliscas, Engrenagens laterais, Pistão flap, Barra de segurança do pistão, Assoalho do elevador, Proteção e abraçadeira de mangueira.
Mesa do giro: Mesa, Pistão do giro, Batente da mesa.
Motor: Correias, Vazamentos, Tampa do escapamento, Acrílico pré-filtro.
Radiadores: Radiadores, Fixação da estrutura, Tampa do radiador de água.
Corte de pontas: Coletor lado direito, Coletor lado esquerdo, Mastro superior, Pistão do corte de ponta, Trava de segurança do corte de pontas.
Divisor de linhas: Divisor de linha lado direito, Divisor de linha lado esquerdo, Suporte do disco lateral direito, Suporte do disco lateral esquerdo, Cones lado direito, Cones lado esquerdo, Sapata lado direito, Sapata lado esquerdo, Suporte do pirulito externo direito, Suporte do pirulito externo esquerdo.
Corte de base: Canela lado direito, Canela lado esquerdo, Disco de corte, M51, Guia lado direito, Guia lado esquerdo.
Trem de rolo: Rolo transportador, Rolo tombador.
Picador: Facões, Borrachas lançadoras, Borrachão, Mangueiras e motores.
Extrator primário: Pá de hélice, Anel de desgaste, Capô do extrator primário, Cinta do elevador.
Extrator secundário: Pá de hélice, Anel de desgaste, Corrente do extrator secundário, Capô do extrator secundário.
Compartimento de bombas: Vazamento na caixa de bomba.
Material rodante: Esteira rodante, Desgaste material rodante, Guia da esteira rodante, Desgaste roletes, Tensionamento da esteira.
Cabine: Está limpa e organizada, Banco está funcionando todas as regulagens, Retrovisores estão isentos de trincas.

Exemplos de pendências manuscritas:
sirene não funciona, vazamento de óleo, farol queimado, cinto travando, vidro quebrado, extintor vencido, mangueira estourada, escada solta, guarda-corpo danificado.
`;
}

function schemaChecklistIA() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      frota: { type: "string" },
      data_execucao: { type: "string" },
      modelo: { type: "string" },
      unidade: { type: "string" },
      horimetro: { type: "string" },
      operador_turno_a: { type: "string" },
      operador_turno_b: { type: "string" },
      operador_turno_c: { type: "string" },
      lider_turno_a: { type: "string" },
      lider_turno_b: { type: "string" },
      lider_turno_c: { type: "string" },
      observacoes_gerais: { type: "string" },
      conclusao: { type: "string" },
      veiculo_apto: {
        anyOf: [
          { type: "boolean" },
          { type: "null" }
        ]
      },
      confianca_geral: { type: "number" },
      respostas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            grupo: { type: "string" },
            item: { type: "string" },
            turno: { type: "string", enum: ["A", "B", "C"] },
            resposta: { type: "string", enum: ["S", "NS", "NA", "N"] },
            confianca: { type: "number" },
            observacao: { type: "string" }
          },
          required: ["grupo", "item", "turno", "resposta", "confianca", "observacao"]
        }
      },
      pendencias_detectadas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            descricao: { type: "string" },
            grupo_sugerido: { type: "string" },
            item_sugerido: { type: "string" },
            turno: { type: "string" },
            resposta_origem: { type: "string" },
            criticidade: { type: "string", enum: ["Normal", "Crítico"] },
            confianca: { type: "number" }
          },
          required: ["descricao", "grupo_sugerido", "item_sugerido", "turno", "resposta_origem", "criticidade", "confianca"]
        }
      }
    },
    required: [
      "frota",
      "data_execucao",
      "modelo",
      "unidade",
      "horimetro",
      "operador_turno_a",
      "operador_turno_b",
      "operador_turno_c",
      "lider_turno_a",
      "lider_turno_b",
      "lider_turno_c",
      "observacoes_gerais",
      "conclusao",
      "veiculo_apto",
      "confianca_geral",
      "respostas",
      "pendencias_detectadas"
    ]
  };
}

function extrairTextoOpenAI(resultado) {
  if (resultado.output_text) return resultado.output_text;

  const partes = [];

  if (Array.isArray(resultado.output)) {
    resultado.output.forEach(item => {
      if (Array.isArray(item.content)) {
        item.content.forEach(content => {
          if (content.type === "output_text" && content.text) partes.push(content.text);
        });
      }
    });
  }

  return partes.join("\n");
}

function renderizarRevisaoChecklistIA(dados) {
  const revisao = document.getElementById("revisaoFotoChecklist");

  revisao.innerHTML = `
    <div class="revisao-card">
      <h4>
        Revisão da leitura por I.A
        ${dados.confianca_geral < 75 ? badgeSeguro("Revisar") : badgeSeguro("I.A lida")}
      </h4>

      <div class="form-grid">
        <input id="foto_frota" value="${htmlSeguro(dados.frota || "")}" placeholder="Frota" class="${!dados.frota ? "campo-baixa-confianca" : ""}">
        <input id="foto_modelo" value="${htmlSeguro(dados.modelo || "")}" placeholder="Modelo">
        <input id="foto_unidade" value="${htmlSeguro(dados.unidade || "")}" placeholder="Unidade">

        <input id="foto_data" value="${normalizarDataIA(dados.data_execucao)}" type="date">
        <input id="foto_horimetro" value="${htmlSeguro(dados.horimetro || "")}" placeholder="Horímetro">
        <input id="foto_tipo" value="Colhedoras" placeholder="Tipo de checklist">

        <input id="foto_operador_a" value="${htmlSeguro(dados.operador_turno_a || "")}" placeholder="Operador Turno A">
        <input id="foto_operador_b" value="${htmlSeguro(dados.operador_turno_b || "")}" placeholder="Operador Turno B">
        <input id="foto_operador_c" value="${htmlSeguro(dados.operador_turno_c || "")}" placeholder="Operador Turno C">

        <input id="foto_lider_a" value="${htmlSeguro(dados.lider_turno_a || "")}" placeholder="Líder Turno A">
        <input id="foto_lider_b" value="${htmlSeguro(dados.lider_turno_b || "")}" placeholder="Líder Turno B">
        <input id="foto_lider_c" value="${htmlSeguro(dados.lider_turno_c || "")}" placeholder="Líder Turno C">

        <textarea id="foto_observacoes" placeholder="Observações gerais">${htmlSeguro(dados.observacoes_gerais || dados.conclusao || "")}</textarea>
      </div>

      <div class="info-box" style="margin-top:14px;">
        <strong>Pendências detectadas pela I.A:</strong>
        <div id="pendenciasIABox"></div>
      </div>

      <div class="checklist-toolbar">
        <button type="button" class="btn-secondary" onclick="marcarTudoFoto('S')">Marcar tudo S</button>
        <button type="button" class="btn-secondary" onclick="marcarTudoFoto('NA')">Marcar tudo NA</button>
        <button type="button" class="btn-secondary" onclick="limparFotoRespostas()">Limpar respostas</button>
        <button type="button" class="btn-secondary" onclick="verTextoOCRFoto()">Ver JSON da I.A</button>
      </div>

      <div id="itensChecklistFoto" class="checklist-tabela"></div>

      <button class="btn-primary" onclick="salvarChecklistFotoRevisadoIA()">Salvar checklist revisado</button>
    </div>
  `;

  renderizarPendenciasIA(dados.pendencias_detectadas || []);
  renderizarChecklistDigital("foto", "itensChecklistFoto");
  aplicarSugestoesRespostasIA(dados.respostas || []);
}

function renderizarPendenciasIA(pendencias) {
  const box = document.getElementById("pendenciasIABox");
  if (!box) return;

  if (!pendencias || pendencias.length === 0) {
    box.innerHTML = `<p class="texto-apoio">Nenhuma pendência manuscrita detectada.</p>`;
    return;
  }

  box.innerHTML = pendencias.map((p, index) => `
    <div class="lista-item">
      <strong>${index + 1}. ${htmlSeguro(p.descricao || "")}</strong>
      <span>
        Grupo: ${htmlSeguro(p.grupo_sugerido || "-")} |
        Item: ${htmlSeguro(p.item_sugerido || "-")} |
        Turno: ${htmlSeguro(p.turno || "-")} |
        Criticidade: ${htmlSeguro(p.criticidade || "-")} |
        Confiança: ${p.confianca || 0}%
      </span>
    </div>
  `).join("");
}

function aplicarSugestoesRespostasIA(respostasIA) {
  if (!Array.isArray(respostasIA)) return;

  const linhas = Array.from(document.querySelectorAll("#itensChecklistFoto .item-check-row"));

  respostasIA.forEach(sugestao => {
    const grupoIA = normalizarTextoComparacao(sugestao.grupo);
    const itemIA = normalizarTextoComparacao(sugestao.item);
    const turnoIA = String(sugestao.turno || "").toUpperCase();
    const respostaIA = normalizarRespostaChecklist(sugestao.resposta);

    if (!["S", "NS", "NA", "N"].includes(respostaIA)) return;

    const linha = linhas.find(l => {
      const grupoLinha = normalizarTextoComparacao(l.dataset.grupo);
      const itemLinha = normalizarTextoComparacao(l.dataset.item);
      return grupoLinha === grupoIA && itemLinha === itemIA;
    });

    if (!linha) return;

    const select = Array.from(linha.querySelectorAll(".resposta-check"))
      .find(s => s.dataset.turno === turnoIA);

    if (select) {
      select.value = respostaIA;

      if ((sugestao.confianca || 0) < 70) {
        select.classList.add("campo-baixa-confianca");
      }
    }

    const obs = linha.querySelector(".obs-item");

    if (obs && sugestao.observacao) {
      obs.value = sugestao.observacao;
    }
  });
}

async function salvarChecklistFotoRevisadoIA() {
  const respostas = coletarRespostasChecklist("itensChecklistFoto");
  const calculo = calcularResultadoChecklist(respostas);

  const execucao = {
    frota: pegarCampo("foto_frota"),
    modelo: pegarCampo("foto_modelo"),
    unidade: pegarCampo("foto_unidade"),
    tipo_checklist: pegarCampo("foto_tipo") || "Colhedoras",
    data_execucao: pegarCampo("foto_data") || new Date().toISOString().slice(0, 10),
    horimetro: pegarCampo("foto_horimetro"),
    operador_turno_a: pegarCampo("foto_operador_a"),
    operador_turno_b: pegarCampo("foto_operador_b"),
    operador_turno_c: pegarCampo("foto_operador_c"),
    lider_turno_a: pegarCampo("foto_lider_a"),
    lider_turno_b: pegarCampo("foto_lider_b"),
    lider_turno_c: pegarCampo("foto_lider_c"),
    observacoes: pegarCampo("foto_observacoes"),
    observacoes_ia: montarResumoPendenciasIA(pendenciasIAAtual),
    resultado: calculo.resultado,
    quantidade_nao_conformidades: calculo.qtdNaoConformidades,
    veiculo_apto: calculo.resultado !== "Inapto",
    origem: "Foto + I.A",
    modo_leitura: "IA direta",
    texto_ocr: textoOCRAtual,
    json_ia: dadosIAAtual,
    confianca_ocr: dadosIAAtual?.confianca_geral || 0,
    gerou_os: false
  };

  if (!execucao.frota) {
    alert("Informe a frota antes de salvar.");
    return;
  }

  await salvarChecklistCompleto(execucao, respostas, arquivoFotoAtual, textoOCRAtual, pendenciasIAAtual);
}

async function lerFotoChecklist() {
  const input = document.getElementById("inputFotoChecklist");
  const progress = document.getElementById("ocrProgress");
  const preview = document.getElementById("previewFotosChecklist");
  const revisao = document.getElementById("revisaoFotoChecklist");

  if (!input.files || input.files.length === 0) {
    alert("Selecione a frente e/ou verso do checklist.");
    return;
  }

  const arquivos = Array.from(input.files);
  arquivoFotoAtual = arquivos[0];
  textoOCRAtual = "";
  dadosIAAtual = null;
  pendenciasIAAtual = [];

  preview.innerHTML = "";
  revisao.innerHTML = "";

  arquivos.forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
  });

  if (!window.Tesseract) {
    alert("Tesseract.js não foi carregado no index.html.");
    return;
  }

  try {
    for (let i = 0; i < arquivos.length; i++) {
      progress.textContent = `OCR tradicional lendo foto ${i + 1} de ${arquivos.length}...`;

      const resultado = await Tesseract.recognize(arquivos[i], "por", {
        logger: m => {
          if (m.status === "recognizing text") {
            progress.textContent = `OCR foto ${i + 1}: ${Math.round(m.progress * 100)}%`;
          }
        }
      });

      textoOCRAtual += `\n\n--- FOTO ${i + 1}: ${arquivos[i].name} ---\n`;
      textoOCRAtual += resultado.data.text || "";
    }

    const dados = extrairCabecalhoOCRTradicional(textoOCRAtual);
    renderizarRevisaoChecklistOCR(dados);

    progress.textContent = "OCR tradicional concluído. Revise e preencha as marcações manualmente.";
  } catch (erro) {
    console.error(erro);
    progress.textContent = "Erro no OCR tradicional.";
    alert("Erro no OCR tradicional. Veja o console.");
  }
}

function extrairCabecalhoOCRTradicional(texto) {
  const t = texto.replace(/\s+/g, " ");

  let frota = pegarRegex(t, /Frota\s*:?\s*([0-9]{3,6})/i);
  if (!frota) frota = pegarRegex(t, /\b([0-9]{3,6})\s*[-/ ]?\s*(?:CH|JOHN|CASE|COLH)/i);

  return {
    frota,
    modelo: pegarRegex(t, /Modelo\s*:?\s*([A-Z0-9 .-]{3,20})/i),
    data_execucao: normalizarDataIA(pegarRegex(t, /(\d{1,2}\/\d{1,2}\/\d{2,4})/i)),
    horimetro: pegarRegex(t, /Hor[ií]metro\s*:?\s*([0-9.,]+)/i),
    unidade: pegarRegex(t, /Unidade\s*:?\s*([A-ZÀ-Úa-zà-ú\s()]+?)\s+Hor/i),
    observacoes_gerais: "",
    conclusao: "",
    confianca_geral: 35,
    respostas: [],
    pendencias_detectadas: []
  };
}

function renderizarRevisaoChecklistOCR(dados) {
  renderizarRevisaoChecklistIA({
    ...dados,
    operador_turno_a: "",
    operador_turno_b: "",
    operador_turno_c: "",
    lider_turno_a: "",
    lider_turno_b: "",
    lider_turno_c: "",
    veiculo_apto: null
  });

  const botao = document.querySelector("#revisaoFotoChecklist .btn-primary");
  if (botao) {
    botao.setAttribute("onclick", "salvarChecklistFotoRevisadoOCR()");
  }
}

async function salvarChecklistFotoRevisadoOCR() {
  const respostas = coletarRespostasChecklist("itensChecklistFoto");
  const calculo = calcularResultadoChecklist(respostas);

  const execucao = {
    frota: pegarCampo("foto_frota"),
    modelo: pegarCampo("foto_modelo"),
    unidade: pegarCampo("foto_unidade"),
    tipo_checklist: pegarCampo("foto_tipo") || "Colhedoras",
    data_execucao: pegarCampo("foto_data") || new Date().toISOString().slice(0, 10),
    horimetro: pegarCampo("foto_horimetro"),
    operador_turno_a: pegarCampo("foto_operador_a"),
    operador_turno_b: pegarCampo("foto_operador_b"),
    operador_turno_c: pegarCampo("foto_operador_c"),
    lider_turno_a: pegarCampo("foto_lider_a"),
    lider_turno_b: pegarCampo("foto_lider_b"),
    lider_turno_c: pegarCampo("foto_lider_c"),
    observacoes: pegarCampo("foto_observacoes"),
    resultado: calculo.resultado,
    quantidade_nao_conformidades: calculo.qtdNaoConformidades,
    veiculo_apto: calculo.resultado !== "Inapto",
    origem: "Foto OCR",
    modo_leitura: "OCR tradicional",
    texto_ocr: textoOCRAtual,
    confianca_ocr: 35,
    gerou_os: false
  };

  await salvarChecklistCompleto(execucao, respostas, arquivoFotoAtual, textoOCRAtual, []);
}

function marcarTudoFoto(valorResposta) {
  document.querySelectorAll("#itensChecklistFoto .resposta-check").forEach(select => {
    select.value = valorResposta;
    select.classList.remove("campo-baixa-confianca");
  });
}

function limparFotoRespostas() {
  document.querySelectorAll("#itensChecklistFoto .resposta-check").forEach(select => {
    select.value = "";
    select.classList.remove("campo-baixa-confianca");
  });

  document.querySelectorAll("#itensChecklistFoto .obs-item").forEach(input => {
    input.value = "";
  });
}

function limparRevisaoFoto() {
  arquivoFotoAtual = null;
  textoOCRAtual = "";
  dadosIAAtual = null;
  pendenciasIAAtual = [];

  const input = document.getElementById("inputFotoChecklist");
  if (input) input.value = "";

  const progress = document.getElementById("ocrProgress");
  if (progress) progress.textContent = "";

  const preview = document.getElementById("previewFotosChecklist");
  if (preview) preview.innerHTML = "";

  const revisao = document.getElementById("revisaoFotoChecklist");
  if (revisao) revisao.innerHTML = "";
}

function verTextoOCRFoto() {
  const html = `
    <h2>Texto/JSON da leitura</h2>
    <p class="texto-apoio">Esse conteúdo é apenas apoio para conferência.</p>
    <pre>${htmlSeguro(textoOCRAtual || "Nenhum texto extraído.")}</pre>
  `;

  if (typeof abrirModal === "function") abrirModal(html);
  else alert(textoOCRAtual || "Nenhum texto extraído.");
}

function montarResumoPendenciasIA(pendencias) {
  if (!pendencias || pendencias.length === 0) return "";
  return pendencias.filter(p => p.descricao).map(p => `- ${p.descricao}`).join("\n");
}

function normalizarRespostaChecklist(valor) {
  const v = String(valor || "").trim().toUpperCase();

  if (["C", "SIM", "CONFORME", "OK"].includes(v)) return "S";
  if (["N/A", "N.A", "NÃO SE APLICA", "NAO SE APLICA"].includes(v)) return "NA";
  if (["N.S", "N/S", "NÃO SATISFATÓRIO", "NAO SATISFATORIO", "NÃO SEGURO", "NAO SEGURO"].includes(v)) return "NS";
  if (["NÃO", "NAO", "NÃO CONFORME", "NAO CONFORME"].includes(v)) return "N";

  return v;
}

function normalizarTextoComparacao(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function normalizarDataIA(data) {
  if (!data) return "";

  const texto = String(data).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

  const br = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);

  if (br) {
    let [, dia, mes, ano] = br;
    dia = dia.padStart(2, "0");
    mes = mes.padStart(2, "0");
    if (ano.length === 2) ano = `20${ano}`;
    return `${ano}-${mes}-${dia}`;
  }

  return "";
}

function pegarRegex(texto, regex) {
  const match = texto.match(regex);
  return match ? match[1].trim() : "";
}

function redimensionarImagemParaDataURL(file, maxSize = 1600, quality = 0.86) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function montarPromptChecklistGemini() {
  return `
Você é um leitor técnico de checklist operacional agrícola.

Analise as imagens enviadas. Elas são fotos de checklist físico de colhedoras preenchido à caneta.

Você deve ler:
- frota
- data de execução
- modelo
- unidade
- horímetro
- operador turno A
- operador turno B
- operador turno C
- líder turno A
- líder turno B
- líder turno C
- marcações S, NS, NA e N
- pendências escritas pelo operador
- observações gerais
- conclusão
- se o veículo está apto ou inapto

Regras:
- Não invente dados.
- Se não conseguir ler, retorne vazio.
- As respostas possíveis são somente: S, NS, NA, N.
- S = Sim / Conforme.
- NS = Não satisfatório.
- NA = Não se aplica.
- N = Não / Não conforme.
- Leia os turnos A, B e C separadamente.
- Leia qualquer pendência manuscrita do operador.
- Retorne somente JSON válido.
- Não use markdown.
- Não explique nada fora do JSON.

Itens possíveis do checklist:

Sistema elétrico:
Painel de instrumentos, Palhetas, Ar-condicionado, Farol da cabine, Farol do elevador, Farol auxiliar, Rádio amador, Girolex, Buzina, Sirene de ré, Sensor de segurança.

Condições externas:
Trincas no chassi, Guarda-corpo, Estado do guarda-corpo, Suporte de segurança, Espelho retrovisor, Para-brisa, Vidro traseiro, Vidro lateral, Guarda-corpo frontal, Guarda-corpo lateral, Trava de segurança, Extintor de incêndio, Suporte do extintor, Escada de acesso, Adesivos.

Condições internas:
Console, Assento, Cinto de segurança.

Elevador:
Corrente, Pistão do levante, Taliscas, Engrenagens laterais, Pistão flap, Barra de segurança do pistão, Assoalho do elevador, Proteção e abraçadeira de mangueira.

Mesa do giro:
Mesa, Pistão do giro, Batente da mesa.

Motor:
Correias, Vazamentos, Tampa do escapamento, Acrílico pré-filtro.

Radiadores:
Radiadores, Fixação da estrutura, Tampa do radiador de água.

Corte de pontas:
Coletor lado direito, Coletor lado esquerdo, Mastro superior, Pistão do corte de ponta, Trava de segurança do corte de pontas.

Divisor de linhas:
Divisor de linha lado direito, Divisor de linha lado esquerdo, Suporte do disco lateral direito, Suporte do disco lateral esquerdo, Cones lado direito, Cones lado esquerdo, Sapata lado direito, Sapata lado esquerdo, Suporte do pirulito externo direito, Suporte do pirulito externo esquerdo.

Corte de base:
Canela lado direito, Canela lado esquerdo, Disco de corte, M51, Guia lado direito, Guia lado esquerdo.

Trem de rolo:
Rolo transportador, Rolo tombador.

Picador:
Facões, Borrachas lançadoras, Borrachão, Mangueiras e motores.

Extrator primário:
Pá de hélice, Anel de desgaste, Capô do extrator primário, Cinta do elevador.

Extrator secundário:
Pá de hélice, Anel de desgaste, Corrente do extrator secundário, Capô do extrator secundário.

Compartimento de bombas:
Vazamento na caixa de bomba.

Material rodante:
Esteira rodante, Desgaste material rodante, Guia da esteira rodante, Desgaste roletes, Tensionamento da esteira.

Cabine:
Está limpa e organizada, Banco está funcionando todas as regulagens, Retrovisores estão isentos de trincas.

Formato obrigatório da resposta:

{
  "frota": "",
  "data_execucao": "",
  "modelo": "",
  "unidade": "",
  "horimetro": "",
  "operador_turno_a": "",
  "operador_turno_b": "",
  "operador_turno_c": "",
  "lider_turno_a": "",
  "lider_turno_b": "",
  "lider_turno_c": "",
  "observacoes_gerais": "",
  "conclusao": "",
  "veiculo_apto": null,
  "confianca_geral": 0,
  "respostas": [
    {
      "grupo": "",
      "item": "",
      "turno": "A",
      "resposta": "S",
      "confianca": 0,
      "observacao": ""
    }
  ],
  "pendencias_detectadas": [
    {
      "descricao": "",
      "grupo_sugerido": "",
      "item_sugerido": "",
      "turno": "",
      "resposta_origem": "",
      "criticidade": "Normal",
      "confianca": 0
    }
  ]
}
`;
}

function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const resultado = reader.result;
      const base64 = String(resultado).split(",")[1];
      resolve(base64);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}