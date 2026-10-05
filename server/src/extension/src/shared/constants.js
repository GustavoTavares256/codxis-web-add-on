const CONFIG = {
  API_BASE:
    "https://iofeislqynfuerypxrpt.supabase.co/functions/v1/indicadores-api",
  API_KEY: "codxistop123",
  USER_TYPES_HIDE_PONTOS: ["vendedores"],
  // Trecho (normalizado: sem acentos e em minusculas) que identifica o
  // indicador padrao para vendas sem pintor identificado. Esses indicadores
  // aparecem no topo da lista do PDV.
  INDICADOR_NAO_IDENTIFICADO: ["nao identificad"],
  CHECK_USER_INTERVAL_MS: 5000, // verificar a cada 5 segundos
  TARGET_URL: "web.codxis.api.br/sistema/pages/privado/index",
  STORAGE_KEY_HIDE_PONTOS: "codxis_hide_pontos",
  STORAGE_KEY_CHECK_TIMESTAMP: "codxis_hide_pontos_ts",
  PONTOS_VALOR_REAIS: 0.5,
  // Acompanha a versao do manifest.json. Existe para o console mostrar com
  // clareza qual build esta rodando no PDV, evitando testar codigo antigo.
  VERSAO_EXTENSAO: "1.0.10",

  // ---- Historico de vendas por indicador ----
  STORAGE_KEY_HISTORICO: "codxis_historico_vendas",
  LIMITE_HISTORICO_POR_INDICADOR: 300,
  // Candidatos para o numero do pedido na tela do PDV. Se o Codxis nao
  // exibir nenhum deles, a venda fica sem numero e ele pode ser preenchido
  // depois no modal de Historico.
  SELETORES_NUMERO_PEDIDO: [
    "#formNFCe\\:numeroPedido",
    "#formNFCe\\:numeroVenda",
    "#formNFCe\\:numeroDocumento",
    "#formNFCe\\:numeroCupom",
    "#formNFCe\\:codigoVenda",
    "#formNFCe\\:idVenda",
    "[data-numero-pedido]",
  ],
  // A API recebe o credito da pontuacao mas nao expoe a leitura do extrato.
  // Assim que existir uma rota de leitura, o Historico passa a ser completo
  // e compartilhado entre maquinas.
  ROTAS_HISTORICO_API: ["/{id}/pontuacao", "/{id}/historico"],
};

// A API credita a pontuacao mas nao expoe a leitura do extrato, entao o PDV
// guarda uma copia local por indicador. Quando existir rota de leitura na
// API, ela vira a fonte completa (e valera para outras maquinas).
function lerHistoricoLocal() {
  try {
    const bruto = localStorage.getItem(CONFIG.STORAGE_KEY_HISTORICO);
    const mapa = bruto ? JSON.parse(bruto) : {};
    return mapa && typeof mapa === "object" ? mapa : {};
  } catch (erro) {
    console.warn("[Historico] Nao foi possivel ler o historico local:", erro);
    return {};
  }
}

function salvarHistoricoLocal(mapa) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY_HISTORICO, JSON.stringify(mapa));
    return true;
  } catch (erro) {
    console.warn("[Historico] Nao foi possivel salvar o historico local:", erro);
    return false;
  }
}

function listarHistoricoLocal(indicadorId) {
  const lista = lerHistoricoLocal()[indicadorId];
  return Array.isArray(lista) ? lista : [];
}

function registrarVendaHistorico(registro) {
  const mapa = lerHistoricoLocal();
  const lista = listarHistoricoLocal(registro.indicadorId).filter(
    (venda) => venda.referencia !== registro.referencia,
  );

  lista.unshift(registro);
  mapa[registro.indicadorId] = lista.slice(
    0,
    CONFIG.LIMITE_HISTORICO_POR_INDICADOR,
  );

  return salvarHistoricoLocal(mapa) ? registro : null;
}

function atualizarPedidoHistorico(indicadorId, referencia, pedido) {
  const mapa = lerHistoricoLocal();
  const lista = listarHistoricoLocal(indicadorId);
  const venda = lista.find((item) => item.referencia === referencia);

  if (!venda) return false;

  venda.pedido = pedido || null;
  venda.editavel = true;
  mapa[indicadorId] = lista;

  return salvarHistoricoLocal(mapa);
}

// A referencia enviada a API e "TIPO-<pedido>-<timestamp>" quando o numero
// do pedido aparece no PDV. Assim o numero real ja fica gravado no extrato
// do servidor, sem abrir mao para repetir o credito da mesma venda.
function montarReferenciaVenda(tipo, pedido) {
  return pedido ? `${tipo}-${pedido}-${Date.now()}` : `${tipo}-${Date.now()}`;
}

function extrairPedidoDaReferencia(referencia) {
  const partes = String(referencia || "").split("-");
  if (partes.length < 3) return null;

  const timestamp = partes[partes.length - 1];
  if (!/^\d{10,}$/.test(timestamp)) return null;

  return partes.slice(1, -1).join("-") || null;
}
