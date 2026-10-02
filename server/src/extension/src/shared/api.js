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
    const error = await response.text();
    throw new Error(error);
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
