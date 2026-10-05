const SELECTOR_CAMPO_COLABORADOR = "#formNFCe\\:colaborador";
const SELECTOR_BOTOES_FINALIZAR =
  "#formNFCe\\:btn-finalizar-pv, #formNFCe\\:btn-finalizar-nfce";
const SELECTOR_VALOR_VENDA = "#formNFCe\\:totalVenda";

// Mensagem exibida quando a venda e iniciada sem indicador selecionado.
const AVISO_CAMPO_OBRIGATORIO = "Preencha todos os campos necessarios";
const AVISO_LISTA_INDISPONIVEL =
  "Não foi possível carregar os indicadores. Verifique a conexão.";
const AVISO_CREDITO_FALHOU =
  "Não foi possível creditar os pontos. Verifique a conexão.";

const DEBOUNCE_BUSCA_MS = 300;
const DEBOUNCE_LIBERACAO_PONTUACAO_MS = 1500;
// A API limita as respostas (100 por padrão), entao a carga inicial pede tudo
// que ela aceita e a busca por nome cobre o restante.
const LIMITE_CARGA_INICIAL = 999;
const LIMITE_POR_BUSCA = 100;

let pontuacaoEmProcessamento = false;
let temporizadorLiberacaoPontuacao = null;
let temporizadorBusca = null;
let requisicaoEmCurso = 0;

window.indicadorSelecionadoId = null;

const estadoIndicador = {
  select: null,
};

function normalizarTexto(texto) {
  return (texto || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Aceita "1.234,56", "R$ 1.234,56", "1234,56" e "1234.56".
function parseValorMonetario(texto) {
  const limpo = (texto || "").replace(/[^\d.,-]/g, "");

  if (!limpo) return null;

  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;

  const valor = parseFloat(normalizado);
  return Number.isFinite(valor) ? valor : null;
}

// Procura o numero do pedido entre os campos conhecidos do PDV. Nenhum
// candidato e obrigatorio: quando o Codxis nao mostra nenhum deles, a venda
// fica sem numero e ele pode ser preenchido depois no modal de Historico.
function capturarNumeroPedido() {
  for (const seletor of CONFIG.SELETORES_NUMERO_PEDIDO) {
    const elemento = document.querySelector(seletor);
    if (!elemento) continue;

    const texto = (elemento.value || elemento.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    if (texto.length > 1 && texto.length <= 40 && /\d/.test(texto)) {
      return texto;
    }
  }

  return null;
}

function mostrarAviso(mensagem) {
  let aviso = document.getElementById("codxis-aviso-indicador");

  if (!aviso) {
    aviso = document.createElement("div");
    aviso.id = "codxis-aviso-indicador";
    aviso.className = "codxis-aviso";
    aviso.setAttribute("role", "alert");
    document.body.appendChild(aviso);
  }

  aviso.textContent = mensagem;
  aviso.classList.add("visivel");

  clearTimeout(aviso.timerOcultar);
  aviso.timerOcultar = setTimeout(() => aviso.classList.remove("visivel"), 4000);
}

function getWrapperCampo() {
  return document.querySelector(".custom-field-wrapper");
}

function marcarCampoInvalido(invalido) {
  getWrapperCampo()?.classList.toggle("field-invalid", invalido);
}

function createSearchableSelect({
  placeholder = "",
  searchPlaceholder = "Pesquisar...",
  onSearch = null,
}) {
  const container = document.createElement("div");
  container.className = "custom-select-container";
  container.dataset.selected = "false";

  const trigger = document.createElement("div");
  trigger.className = "custom-select-trigger";

  const triggerText = document.createElement("span");
  triggerText.className = "custom-select-text";
  triggerText.textContent = placeholder;

  const arrow = document.createElement("span");
  arrow.className = "custom-select-arrow";
  arrow.textContent = "›";

  trigger.appendChild(triggerText);
  trigger.appendChild(arrow);

  const dropdown = document.createElement("div");
  dropdown.className = "custom-select-dropdown";

  const searchWrapper = document.createElement("div");
  searchWrapper.className = "custom-select-search-wrapper";

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = searchPlaceholder;
  searchInput.className = "custom-select-search";
  searchInput.autocomplete = "off";

  const searchIcon = document.createElement("span");
  searchIcon.className = "custom-select-search-icon";
  searchIcon.textContent = "\u{1F50D}";

  searchWrapper.appendChild(searchInput);
  searchWrapper.appendChild(searchIcon);

  const list = document.createElement("ul");
  list.className = "custom-select-list";

  const message = document.createElement("div");
  message.className = "custom-select-message";
  message.style.display = "none";

  dropdown.appendChild(searchWrapper);
  dropdown.appendChild(list);
  dropdown.appendChild(message);

  container.appendChild(trigger);
  container.appendChild(dropdown);

  let opcoesAtuais = [];

  function fecharDropdown() {
    dropdown.style.display = "none";
  }

  function abrirDropdown() {
    dropdown.style.display = "block";
    searchInput.focus();
  }

  function selecionarOpcao(opcao) {
    window.indicadorSelecionadoId = opcao.value;
    triggerText.textContent = opcao.label;
    container.dataset.selected = "true";
    marcarCampoInvalido(false);
  }

  function renderOpcoes() {
    list.innerHTML = "";
    message.style.display = "none";

    if (!opcoesAtuais.length) {
      message.textContent = "Nenhum indicador encontrado.";
      message.style.display = "block";
      return;
    }

    opcoesAtuais.forEach((opcao) => {
      const li = document.createElement("li");
      li.textContent = opcao.label;
      li.className = "custom-select-item";

      li.addEventListener("click", () => {
        selecionarOpcao(opcao);
        fecharDropdown();
      });

      list.appendChild(li);
    });
  }

  searchInput.addEventListener("input", (event) => {
    const termo = event.target.value;

    if (onSearch) {
      onSearch(termo);
      return;
    }

    const alvo = termo.trim().toLowerCase();
    renderOpcoes();
    if (alvo) {
      Array.from(list.children).forEach((li) => {
        li.style.display = li.textContent.toLowerCase().includes(alvo)
          ? ""
          : "none";
      });
    }
  });

  trigger.addEventListener("click", () => {
    if (dropdown.style.display === "block") {
      fecharDropdown();
    } else {
      abrirDropdown();
    }
  });

  document.addEventListener("click", (event) => {
    if (!container.contains(event.target)) fecharDropdown();
  });

  return {
    container,

    setOpcoes(opcoes) {
      opcoesAtuais = opcoes.slice();
      renderOpcoes();
    },

    setMensagemLista(texto, rotuloAcao, aoClicarAcao) {
      opcoesAtuais = [];
      list.innerHTML = "";
      message.innerHTML = "";

      const textoMensagem = document.createElement("span");
      textoMensagem.textContent = texto;
      message.appendChild(textoMensagem);

      if (rotuloAcao && aoClicarAcao) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "custom-select-retry";
        botao.textContent = rotuloAcao;
        botao.addEventListener("click", (event) => {
          event.stopPropagation();
          aoClicarAcao();
        });
        message.appendChild(botao);
      }

      message.style.display = "block";
    },

    reset() {
      window.indicadorSelecionadoId = null;
      triggerText.textContent = placeholder;
      container.dataset.selected = "false";
      searchInput.value = "";
    },

    abrir: abrirDropdown,
  };
}

function createFieldWithLabel(labelText, selectElement) {
  const fieldWrapper = document.createElement("div");
  fieldWrapper.className = "custom-field-wrapper";
  fieldWrapper.dataset.required = "true";

  const label = document.createElement("label");
  label.textContent = labelText;
  label.className = "form-label required";

  fieldWrapper.appendChild(label);
  fieldWrapper.appendChild(selectElement);

  return fieldWrapper;
}

function montarOpcoes(indicadores) {
  const alvos = CONFIG.INDICADOR_NAO_IDENTIFICADO || [];

  const prioritarios = [];
  const demais = [];

  indicadores.forEach((indicador) => {
    const nomeNormalizado = normalizarTexto(indicador.nome);
    const ehPrioritario = alvos.some((alvo) =>
      nomeNormalizado.includes(normalizarTexto(alvo)),
    );

    const opcao = {
      value: indicador.id,
      label: indicador.apelido
        ? `${indicador.nome} (${indicador.apelido})`
        : indicador.nome,
    };

    if (ehPrioritario) prioritarios.push(opcao);
    else demais.push(opcao);
  });

  return [...prioritarios, ...demais];
}

async function carregarIndicadores(termo = "") {
  const requisicao = ++requisicaoEmCurso;
  const busca = termo.trim();

  try {
    const response = await listarIndicadores({
      ativo: true,
      nome: busca || undefined,
      limit: busca ? LIMITE_POR_BUSCA : LIMITE_CARGA_INICIAL,
    });

    if (requisicao !== requisicaoEmCurso) return;

    const indicadores = response?.data || [];

    if (!indicadores.length) {
      estadoIndicador.select?.setMensagemLista(
        busca
          ? "Nenhum indicador encontrado."
          : AVISO_LISTA_INDISPONIVEL,
        "Tentar novamente",
        () => {
          estadoIndicador.select?.setMensagemLista("Carregando...");
          carregarIndicadores(termo);
        },
      );
      return;
    }

    estadoIndicador.select?.setOpcoes(montarOpcoes(indicadores));
  } catch (err) {
    if (requisicao !== requisicaoEmCurso) return;

    console.error("[Indicador] Erro ao carregar indicadores:", err);
    estadoIndicador.select?.setMensagemLista(
      AVISO_LISTA_INDISPONIVEL,
      "Tentar novamente",
      () => {
        estadoIndicador.select?.setMensagemLista("Carregando...");
        carregarIndicadores(termo);
      },
    );
  }
}

function agendarBusca(termo) {
  clearTimeout(temporizadorBusca);
  temporizadorBusca = setTimeout(
    () => carregarIndicadores(termo),
    DEBOUNCE_BUSCA_MS,
  );
}

function initSelectIndicador() {
  const targetElement = document.querySelector(SELECTOR_CAMPO_COLABORADOR);
  if (!targetElement) return false;

  const parent = targetElement.parentElement.parentElement;
  if (!parent) return false;
  if (parent.querySelector(".custom-field-wrapper")) return true;

  const select = createSearchableSelect({
    placeholder: "Selecione um indicador",
    onSearch: agendarBusca,
  });

  const field = createFieldWithLabel("Indicador", select.container);
  const firstChild = parent.children[0];
  parent.insertBefore(field, firstChild ? firstChild.nextSibling : null);

  estadoIndicador.select = select;
  marcarCampoInvalido(true);
  select.setMensagemLista("Carregando...");
  carregarIndicadores();

  return true;
}

function observarCriacaoDoCampo() {
  if (initSelectIndicador()) return;

  const observer = new MutationObserver(() => {
    if (initSelectIndicador()) observer.disconnect();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function bloquearFinalizacaoSemIndicador(event) {
  if (window.indicadorSelecionadoId) return;
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest(SELECTOR_BOTOES_FINALIZAR)) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  marcarCampoInvalido(true);
  mostrarAviso(AVISO_CAMPO_OBRIGATORIO);

  const wrapper = getWrapperCampo();
  wrapper?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  estadoIndicador.select?.abrir();
}

async function aplicarPontosIndicador(tipoVenda) {
  const indicadorId = window.indicadorSelecionadoId;

  if (!indicadorId) {
    console.warn("[Indicador] Finalização sem indicador selecionado.");
    return;
  }

  if (pontuacaoEmProcessamento) {
    console.warn("[Indicador] Pontuação já está sendo processada.");
    return;
  }

  const spanValor = document.querySelector(SELECTOR_VALOR_VENDA);
  if (!spanValor) {
    console.warn("[Indicador] Valor da venda não encontrado.");
    return;
  }

  const valorVenda = parseValorMonetario(spanValor.textContent);

  if (!valorVenda || valorVenda <= 0) {
    console.warn("[Indicador] Valor da venda inválido.");
    return;
  }

  const numeroPedido = capturarNumeroPedido();
  const referenciaVenda = montarReferenciaVenda(tipoVenda, numeroPedido);

  pontuacaoEmProcessamento = true;
  clearTimeout(temporizadorLiberacaoPontuacao);
  temporizadorLiberacaoPontuacao = setTimeout(() => {
    pontuacaoEmProcessamento = false;
  }, DEBOUNCE_LIBERACAO_PONTUACAO_MS);

  try {
    await window.adicionarPontos(indicadorId, valorVenda, referenciaVenda);

    registrarVendaHistorico({
      indicadorId,
      referencia: referenciaVenda,
      pedido: numeroPedido,
      tipo: tipoVenda,
      valor: valorVenda,
      pontos: Math.floor(valorVenda / CONFIG.PONTOS_VALOR_REAIS),
      data: new Date().toISOString(),
      origem: "local",
      editavel: true,
    });

    console.log(
      `[Indicador] Pontos creditados. Indicador: ${indicadorId}, Valor: ${valorVenda}, Tipo: ${tipoVenda}, Pedido: ${numeroPedido || "não identificado"}`,
    );
  } catch (err) {
    console.error("[Indicador] Erro ao aplicar pontos:", err);
    mostrarAviso(AVISO_CREDITO_FALHOU);
  } finally {
    estadoIndicador.select?.reset();
    marcarCampoInvalido(true);
  }
}

function initVendaListeners() {
  document.addEventListener("click", bloquearFinalizacaoSemIndicador, true);

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const btnPV = event.target.closest("#formNFCe\\:btn-finalizar-pv");
    const btnNFCe = event.target.closest("#formNFCe\\:btn-finalizar-nfce");

    if (btnPV) aplicarPontosIndicador("PV");
    else if (btnNFCe) aplicarPontosIndicador("NFCe");
  });
}

initVendaListeners();
observarCriacaoDoCampo();

// Permite confirmar no console qual build esta rodando no PDV antes de
// testar qualquer comportamento novo.
console.info(
  `[Indicador] PDV Codxis v${CONFIG.VERSAO_EXTENSAO} — Indicador obrigatorio ativo.`,
);
