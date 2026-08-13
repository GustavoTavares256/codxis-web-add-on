console.log("[DEBUG] content.js carregado");
console.log("[AUTO-UPDATER]");
console.log(
  "%c=== SCRIPT REMOTO CARREGADO COM SUCESSO! ===",
  "color: #ff0000; font-size: 16px; font-weight: bold;",
);

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const url = args[0]?.url || args[0];
  const method = args[1]?.method || "GET";

  console.log("[DEBUG] Fetch interceptado:", method, url);

  const response = await originalFetch(...args);

  const clone = response.clone();
  clone
    .json()
    .then((data) => {
      console.log("[DEBUG] Resposta fetch:", url, data);
    })
    .catch(() => {});

  return response;
};

const originalXHR = window.XMLHttpRequest;
window.XMLHttpRequest = function () {
  const xhr = new originalXHR();
  const originalOpen = xhr.open;

  xhr.open = function (...args) {
    console.log("[DEBUG] XHR aberto:", args[1], args[0]);
    return originalOpen.apply(this, args);
  };

  xhr.addEventListener("load", () => {
    console.log("[DEBUG] XHR carregado:", xhr.responseURL, xhr.response);
  });

  return xhr;
};

window.indicadorSelecionadoId = null;
let pontuacaoEmProcessamento = false;

function createSearchableSelect({
  options,
  placeholder = "",
  searchPlaceholder = "Pesquisar...",
}) {
  const container = document.createElement("div");
  container.className = "custom-select-container";

  const trigger = document.createElement("div");
  trigger.className = "custom-select-trigger";

  const triggerText = document.createElement("span");
  triggerText.className = "custom-select-text";
  triggerText.textContent = placeholder;

  const arrow = document.createElement("span");
  arrow.className = "custom-select-arrow";
  arrow.innerHTML = "&#8250;";

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

  const searchIcon = document.createElement("span");
  searchIcon.className = "custom-select-search-icon";
  searchIcon.innerHTML = "&#128269;";

  searchWrapper.appendChild(searchInput);
  searchWrapper.appendChild(searchIcon);

  const list = document.createElement("ul");
  list.className = "custom-select-list";

  function renderOptions(filter = "") {
    list.innerHTML = "";

    options
      .filter((opt) => opt.label.toLowerCase().includes(filter.toLowerCase()))
      .forEach((opt) => {
        const li = document.createElement("li");
        li.textContent = opt.label;
        li.className = "custom-select-item";

        li.addEventListener("click", () => {
          triggerText.textContent = opt.label;
          dropdown.style.display = "none";
          window.indicadorSelecionadoId = opt.value;
          console.log(
            "[DEBUG] Indicador selecionado - id:",
            opt.value,
            "label:",
            opt.label,
          );
        });

        list.appendChild(li);
      });
  }

  renderOptions();

  searchInput.addEventListener("input", (e) => {
    renderOptions(e.target.value);
  });

  trigger.addEventListener("click", () => {
    dropdown.style.display =
      dropdown.style.display === "block" ? "none" : "block";
    searchInput.focus();
  });

  document.addEventListener("click", (event) => {
    if (!container.contains(event.target)) {
      dropdown.style.display = "none";
    }
  });

  dropdown.appendChild(searchWrapper);
  dropdown.appendChild(list);

  container.appendChild(trigger);
  container.appendChild(dropdown);

  return container;
}

function createFieldWithLabel(labelText, selectElement) {
  const fieldWrapper = document.createElement("div");
  fieldWrapper.className = "custom-field-wrapper";

  const label = document.createElement("label");
  label.textContent = labelText;
  label.className = "form-label";

  fieldWrapper.appendChild(label);
  fieldWrapper.appendChild(selectElement);

  return fieldWrapper;
}

function waitForElement(selector, callback, maxAttempts = 10) {
  let attempts = 0;
  const interval = setInterval(() => {
    const element = document.querySelector(selector);
    if (element) {
      clearInterval(interval);
      callback(element);
    }
    attempts++;
    if (attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 500);
}

function initSelectIndicador() {
  const targetElement = document.querySelector("#formNFCe\\:colaborador");
  if (!targetElement) return;

  const parent = targetElement.parentElement.parentElement;
  if (parent.querySelector(".custom-field-wrapper")) return;

  const select = createSearchableSelect({
    options: [],
    placeholder: "Selecione um indicador",
  });

  const field = createFieldWithLabel("Indicador", select);
  const firstChild = parent.children[0];
  parent.insertBefore(field, firstChild.nextSibling);

  loadIndicadores(select, createSearchableSelect);
}

async function loadIndicadores(selectElement, createFn) {
  try {
    const response = await listarIndicadores({ ativo: true, limit: 999 });
    if (!response.data || !response.data.length) return;

    const options = response.data.map((indicador) => ({
      value: indicador.id,
      label: indicador.apelido
        ? `${indicador.nome} (${indicador.apelido})`
        : indicador.nome,
    }));

    const newSelect = createFn({
      options: options,
      placeholder: "Selecione um indicador",
    });

    const field = createFieldWithLabel("Indicador", newSelect);
    const parent = selectElement.parentElement.parentElement;
    const oldField = parent.querySelector(".custom-field-wrapper");

    if (oldField) {
      parent.replaceChild(field, oldField);
    }
  } catch (err) {
    console.error("Erro ao carregar indicadores:", err);
  }
}

waitForElement("#formNFCe\\:colaborador", initSelectIndicador);

async function aplicarPontosIndicador(tipoVenda) {
  console.log("[DEBUG] aplicarPontosIndicador chamado - tipo:", tipoVenda);

  if (!window.indicadorSelecionadoId) {
    console.log("[DEBUG] Nenhum indicador selecionado, abortando");
    return;
  }

  if (pontuacaoEmProcessamento) {
    console.log("[DEBUG] Pontuação já está sendo processada, ignorando clique duplicado");
    return;
  }

  const spanValor = document.querySelector("#formNFCe\\:totalVenda");
  if (!spanValor) {
    console.log("[DEBUG] Span de valor não encontrado");
    return;
  }

  const valorText = spanValor.textContent;
  const valorVenda = parseFloat(valorText.replace(/\./g, "").replace(",", "."));

  if (!valorVenda || valorVenda <= 0) {
    console.log("[DEBUG] Valor inválido, abortando");
    return;
  }

  const referenciaVenda = `${tipoVenda}-${Date.now()}`;
  pontuacaoEmProcessamento = true;

  try {
    await window.adicionarPontos(
      window.indicadorSelecionadoId,
      valorVenda,
      referenciaVenda,
    );
    console.log(
      `Pontos aplicados! Indicador: ${window.indicadorSelecionadoId}, Valor: ${valorVenda}, Tipo: ${tipoVenda}`,
    );
  } catch (err) {
    pontuacaoEmProcessamento = false;
    console.error("Erro ao aplicar pontos:", err);
  }
}

function initVendaListeners() {
  console.log("[DEBUG] initVendaListeners executado");

  document.addEventListener("click", (event) => {
    const btnPV = event.target.closest("#formNFCe\\:btn-finalizar-pv");
    const btnNFCe = event.target.closest("#formNFCe\\:btn-finalizar-nfce");

    if (btnPV) {
      console.log("[DEBUG] Click detectado no botão PV");
      aplicarPontosIndicador("PV");
    } else if (btnNFCe) {
      console.log("[DEBUG] Click detectado no botão NFCe");
      aplicarPontosIndicador("NFCe");
    }
  });
}

initVendaListeners();
