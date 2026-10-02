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
};
