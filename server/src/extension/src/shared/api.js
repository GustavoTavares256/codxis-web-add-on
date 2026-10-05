async function apiFetch(endpoint, options = {}) {
  const { headers: customHeaders = {}, ...fetchOptions } = options;
  const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CONFIG.API_KEY,
      ...customHeaders,
    },
    ...fetchOptions,
  });

  if (!response.ok) {
    const error = new Error(await response.text());
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function cadastrarIndicador(dados) {
  return apiFetch("/", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

async function listarIndicadores(filtros = {}) {
  const params = new URLSearchParams();

  if (filtros.nome) params.append("nome", filtros.nome);
  if (filtros.cpf) params.append("cpf", filtros.cpf);
  if (filtros.apelido) params.append("apelido", filtros.apelido);
  if (filtros.pontos_min) params.append("pontos_min", filtros.pontos_min);
  if (filtros.pontos_max) params.append("pontos_max", filtros.pontos_max);
  if (filtros.ativo !== undefined && filtros.ativo !== null)
    params.append("ativo", String(Boolean(filtros.ativo)));
  if (filtros.order_by) params.append("order_by", filtros.order_by);
  if (filtros.order_dir) params.append("order_dir", filtros.order_dir);
  if (filtros.page) params.append("page", filtros.page);
  if (filtros.limit) params.append("limit", filtros.limit);

  const query = params.toString();
  return apiFetch(`/${query ? `?${query}` : ""}`);
}

async function buscarIndicador(id) {
  return apiFetch(`/${id}`);
}

async function atualizarIndicador(id, dados) {
  return apiFetch(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

async function adicionarPontos(id, valorLiquidoVenda, referenciaVenda) {
  return apiFetch(`/${id}/pontuacao`, {
    method: "POST",
    // Permite que o navegador conclua a requisição mesmo quando o Codxis
    // recarrega ou troca de página logo após a finalização da venda.
    keepalive: true,
    body: JSON.stringify({
      valor_liquido_venda: valorLiquidoVenda,
      referencia_venda: referenciaVenda,
    }),
  });
}

async function excluirIndicador(id) {
  return apiFetch(`/${id}`, {
    method: "DELETE",
  });
}

async function rescatarPontos(id, pontos, observacao = "") {
  return apiFetch(`/${id}/resgate`, {
    method: "POST",
    body: JSON.stringify({
      pontos: pontos,
      observacao: observacao,
    }),
  });
}

window.cadastrarIndicador = cadastrarIndicador;
window.listarIndicadores = listarIndicadores;
window.buscarIndicador = buscarIndicador;
window.atualizarIndicador = atualizarIndicador;
window.adicionarPontos = adicionarPontos;
window.excluirIndicador = excluirIndicador;
window.rescatarPontos = rescatarPontos;

// Rotas ja testadas e inexistentes: um 404 nao muda dentro da sessao, entao
// deixar de repetir a chamada evita 404 a cada abertura do Historico.
const rotasHistoricoSemLeitura = new Set();

function normalizarHistoricoRemoto(resposta, indicadorId) {
  const lista = Array.isArray(resposta)
    ? resposta
    : resposta?.data || resposta?.pontuacoes || resposta?.historico;

  if (!Array.isArray(lista)) return null;

  return lista.map((item) => ({
    indicadorId,
    referencia: item.referencia_venda || null,
    pedido:
      item.numero_pedido || extrairPedidoDaReferencia(item.referencia_venda),
    tipo: item.tipo || null,
    valor: Number.isFinite(Number(item.valor_liquido_venda))
      ? Number(item.valor_liquido_venda)
      : null,
    pontos: Number.isFinite(Number(item.pontos)) ? Number(item.pontos) : null,
    data: item.created_at || item.data || null,
    origem: "api",
    editavel: false,
  }));
}

// Tenta as rotas de leitura do extrato. Hoje nenhuma existe e o retorno e
// null; assim que o backend criar uma delas, o Historico passa a trazer as
// vendas de todas as maquinas sem nenhuma alteracao aqui.
async function buscarHistoricoIndicador(id) {
  for (const rota of CONFIG.ROTAS_HISTORICO_API) {
    if (rotasHistoricoSemLeitura.has(rota)) continue;

    try {
      const resposta = await apiFetch(rota.replace("{id}", id));
      const itens = normalizarHistoricoRemoto(resposta, id);
      if (itens) return itens;
    } catch (erro) {
      if (erro.status === 404) rotasHistoricoSemLeitura.add(rota);
    }
  }

  return null;
}

window.buscarHistoricoIndicador = buscarHistoricoIndicador;
