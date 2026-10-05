function createModal() {
  const PONTOS_VALOR_REAIS = 0.5;

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  const overlay = document.createElement("div");
  overlay.id = "custom-modal-overlay";

  const modal = document.createElement("div");
  modal.id = "custom-modal";

  const closeBtn = document.createElement("button");
  closeBtn.className = "modal-close";
  closeBtn.textContent = "×";

  closeBtn.addEventListener("click", () => {
    const overlay = document.getElementById("custom-modal-overlay");
    overlay.classList.remove("active");
  });

  const content = document.createElement("div");
  content.id = "custom-modal-content";

  modal.appendChild(closeBtn);
  modal.appendChild(content);
  overlay.appendChild(modal);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("active");
    }
  });

  document.body.appendChild(overlay);
}

function renderCadastroForm() {
  return `
    <div class="row" id="cadastro-indicadores">
      <div class="form-body">
        <div class="col-12 subtitle-divider-margin">
          <h1 class="subtitle">Cadastro de Indicador</h1>
         <div class="subtitle-divider"> </div>
        </div>

        <div class="col-10 col-md-10">
          <label class="form-label">Nome*</label>
          <input
            type="text"
            id="nome"
            class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
            maxlength="150"
          />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">CPF</label>
          <input
            type="text"
            id="cpf"
            class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
            maxlength="14"
            placeholder="000.000.000-00"
          />
        </div>

        <div class="col-10 col-md-10">
          <label class="form-label">Apelido</label>
          <input
            type="text"
            id="apelido"
            class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
          />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Data de Nascimento</label>
          <input
            type="date"
            id="data_nascimento"
            class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
          />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Telefone</label>
          <input
            type="text"
            id="telefone"
            class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
            maxlength="20"
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>

      <div id="cadastro-error" class="error-message" style="display: none;"></div>

      <div class="form-footer">
        <button
          id="btnSalvar"
          class="ui-button ui-widget ui-state-default ui-corner-all"
        >
          Salvar
        </button>
      </div>
    </div>
  `;
}

function renderConsultarForm() {
  return `
    <div id="consultar-indicadores">
      <div class="col-12 subtitle-divider-margin">
        <h1 class="subtitle">Consulta de Indicadores</h1>
        <div class="subtitle-divider"></div>
      </div>

      <div class="filtros-toggle">
        <button id="btnToggleFiltros" class="ui-button ui-widget ui-state-default ui-corner-all">
          Mostrar Filtros
        </button>
      </div>

      <div id="filtros-container" class="filtros-container" style="display: none;">
        <div class="filtros-row">
          <div class="filtro-item">
            <label class="form-label">Nome</label>
            <input
              type="text"
              id="filtro-nome"
              class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
              placeholder="Filtrar por nome"
            />
          </div>
          <div class="filtro-item">
            <label class="form-label">CPF</label>
            <input
              type="text"
              id="filtro-cpf"
              class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
              placeholder="000.000.000-00"
              maxlength="14"
            />
          </div>
          <div class="filtro-item">
            <label class="form-label">Apelido</label>
            <input
              type="text"
              id="filtro-apelido"
              class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
              placeholder="Filtrar por apelido"
            />
          </div>
        </div>
        <div class="filtros-row">
          <div class="filtro-item">
            <label class="form-label">Pontos Mín</label>
            <input
              type="number"
              id="filtro-pontos-min"
              class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
              placeholder="0"
              min="0"
            />
          </div>
          <div class="filtro-item">
            <label class="form-label">Pontos Máx</label>
            <input
              type="number"
              id="filtro-pontos-max"
              class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
              placeholder="999999"
              min="0"
            />
          </div>
        </div>
        <div class="filtros-actions">
          <button
            id="btnConsultar"
            class="ui-button ui-widget ui-state-default ui-corner-all"
          >
            Consultar
          </button>
        </div>
      </div>

      <div id="consulta-error" class="error-message" style="display: none;"></div>

      <div class="tabela-container">
        <table id="tabela-indicadores" class="indicadores-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Pontos</th>
              <th>Valor (R$)</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="tabela-corpo">
            <tr class="empty-row">
              <td colspan="4">Nenhum indicador encontrado. Realize uma consulta.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderEditarForm(indicador) {
  return `
    <div id="editar-indicador">
      <div class="col-12 subtitle-divider-margin">
        <h1 class="subtitle">Editar Indicador</h1>
        <div class="subtitle-divider"></div>
      </div>

      <div class="form-body">
        <div class="col-12 col-md-12">
          <label class="form-label">Nome*</label>
          <input
            type="text"
            id="nome"
            class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
            maxlength="150"
          />
        </div>

        <div class="col-12 col-md-12">
          <label class="form-label">Apelido</label>
          <input
            type="text"
            id="apelido"
            class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
          />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Data de Nascimento</label>
          <input
            type="date"
            id="data_nascimento"
            class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
          />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Telefone</label>
          <input
            type="text"
            id="telefone"
            class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
            maxlength="20"
          />
        </div>
      </div>

      <div id="edit-error" class="error-message" style="display: none;"></div>

      <div class="form-footer">
        <button
          id="btnCancelarEditar"
          class="ui-button ui-widget ui-state-default ui-corner-all"
          style="margin-right: 10px;"
        >
          Cancelar
        </button>
        <button
          id="btnSalvarEditar"
          class="ui-button ui-widget ui-state-default ui-corner-all"
          data-id="${indicador.id}"
        >
          Salvar
        </button>
      </div>
    </div>
  `;
}

function renderAdicionarPontosForm(indicador) {
  return `
    <div id="adicionar-pontos">
      <div class="col-12 subtitle-divider-margin">
        <h1 class="subtitle">Adicionar Pontos - ${indicador.nome}</h1>
        <div class="subtitle-divider"></div>
      </div>

      <div class="form-body">
        <div class="col-12 col-md-12">
          <label class="form-label">Valor da Venda (R$)*</label>
          <input
            type="number"
            id="pontos-valor"
            class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
            placeholder="0,00"
            min="0.01"
            step="0.01"
          />
        </div>

        <div class="col-12 col-md-12">
          <label class="form-label">Referência da Venda</label>
          <input
            type="text"
            id="pontos-referencia"
            class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
            placeholder="Código ou número da venda"
            maxlength="100"
          />
        </div>

        <div class="pontos-info">
          <small>1 ponto a cada R$ 100,00 (1%) do valor líquido</small>
        </div>
      </div>

      <div id="pontos-error" class="error-message" style="display: none;"></div>

      <div class="form-footer">
        <button
          id="btnCancelarPontos"
          class="ui-button ui-widget ui-state-default ui-corner-all"
          style="margin-right: 10px;"
        >
          Cancelar
        </button>
        <button
          id="btnSalvarPontos"
          class="ui-button ui-widget ui-state-default ui-corner-all"
          data-id="${indicador.id}"
        >
          Adicionar Pontos
        </button>
      </div>
    </div>
  `;
}

function renderExcluirConfirm(indicador) {
  return `
    <div id="excluir-indicador">
      <div class="col-12 subtitle-divider-margin">
        <h1 class="subtitle">Excluir Indicador</h1>
        <div class="subtitle-divider"></div>
      </div>

      <div class="confirm-message">
        <p>Tem certeza que deseja excluir o indicador <strong>${indicador.nome}</strong>?</p>
        <p class="warning-text">Esta ação não pode ser desfeita.</p>
      </div>

      <div id="excluir-error" class="error-message" style="display: none;"></div>

      <div class="form-footer">
        <button
          id="btnCancelarExcluir"
          class="ui-button ui-widget ui-state-default ui-corner-all"
          style="margin-right: 10px;"
        >
          Cancelar
        </button>
        <button
          id="btnConfirmarExcluir"
          class="ui-button ui-widget ui-state-default ui-corner-all ui-button-danger"
          data-id="${indicador.id}"
        >
          Excluir
        </button>
      </div>
    </div>
  `;
}

function renderResgatarPontosForm(indicador) {
  const pontosAtuais = indicador.pontos || 0;
  const valorMaximo = pontosAtuais * PONTOS_VALOR_REAIS;

  return `
    <div id="resgatar-pontos">
      <div class="col-12 subtitle-divider-margin">
        <h1 class="subtitle">Resgatar Pontos - ${indicador.nome}</h1>
        <div class="subtitle-divider"></div>
      </div>

      <div class="resgate-info">
        <p><strong>Pontos disponíveis:</strong> ${pontosAtuais.toLocaleString("pt-BR")}</p>
        <p><strong>Valor disponível:</strong> ${formatCurrency(valorMaximo)}</p>
      </div>

      <div class="form-body">
        <div class="col-12 col-md-12">
          <label class="form-label">Pontos a Resgatar*</label>
          <input
            type="number"
            id="resgate-pontos"
            class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
            placeholder="0"
            min="0.01"
            step="0.01"
            max="${pontosAtuais}"
          />
        </div>

        <div class="col-12 col-md-12">
          <label class="form-label">Observação</label>
          <input
            type="text"
            id="resgate-observacao"
            class="ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all form-input"
            placeholder="Observação opcional"
            maxlength="255"
          />
        </div>

        <div class="pontos-info">
          <small>1 ponto = R$0,50</small>
        </div>
      </div>

      <div id="resgate-error" class="error-message" style="display: none;"></div>

      <div class="form-footer">
        <button
          id="btnCancelarResgate"
          class="ui-button ui-widget ui-state-default ui-corner-all"
          style="margin-right: 10px;"
        >
          Cancelar
        </button>
        <button
          id="btnConfirmarResgate"
          class="ui-button ui-widget ui-state-default ui-corner-all"
          data-id="${indicador.id}"
        >
          Resgatar Pontos
        </button>
      </div>
    </div>
  `;
}

function renderHistoricoForm(dados) {
  const { indicador, itens, parcial } = dados;

  const totalPontos = itens.reduce(
    (soma, venda) => soma + (Number(venda.pontos) || 0),
    0,
  );

  const avisoFonte = parcial
    ? `<div class="historico-fonte">
         <strong>Histórico parcial:</strong> a API ainda não disponibiliza a
         leitura das vendas, então aqui aparecem apenas as registradas neste
         computador. Para ver as vendas de outras máquinas é necessário
         criar a rota de leitura no backend.
       </div>`
    : "";

  const linhas = itens.length
    ? itens
        .map(
          (venda) => `
      <tr>
        <td>${formatarDataHora(venda.data)}</td>
        <td>${venda.tipo || "-"}</td>
        <td>
          ${
            venda.editavel
              ? `<input
                   type="text"
                   class="historico-pedido"
                   data-indicador="${indicador.id}"
                   data-referencia="${venda.referencia || ""}"
                   value="${venda.pedido || ""}"
                   placeholder="informar"
                   maxlength="40"
                 />`
              : venda.pedido || "-"
          }
        </td>
        <td>${venda.valor != null ? formatCurrency(venda.valor) : "-"}</td>
        <td>${venda.pontos != null ? venda.pontos.toLocaleString("pt-BR") : "-"}</td>
      </tr>`,
        )
        .join("")
    : `<tr class="empty-row">
         <td colspan="5">Nenhuma venda registrada para este indicador.</td>
       </tr>`;

  return `
    <div id="historico">
      <div class="col-12 subtitle-divider-margin">
        <h1 class="subtitle">Histórico de Vendas - ${indicador.nome}</h1>
        <div class="subtitle-divider"></div>
      </div>

      ${avisoFonte}

      <div class="historico-resumo">
        <p><strong>Vendas:</strong> ${itens.length}</p>
        <p><strong>Pontos creditados:</strong> ${totalPontos.toLocaleString("pt-BR")}</p>
        <p><strong>Saldo atual:</strong> ${(indicador.pontos || 0).toLocaleString("pt-BR")}</p>
      </div>

      <div class="historico-container">
        <table class="historico-tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Pedido</th>
              <th>Valor</th>
              <th>Pontos</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>

      <div class="form-footer">
        <button
          id="btnExportarHistorico"
          class="ui-button ui-widget ui-state-default ui-corner-all"
          style="margin-right: 10px;"
        >
          Exportar CSV
        </button>
        <button
          id="btnFecharHistorico"
          class="ui-button ui-widget ui-state-default ui-corner-all"
        >
          Fechar
        </button>
      </div>
    </div>
  `;
}

function openCustomModal(type, data = null) {
  try {
    const overlay = document.getElementById("custom-modal-overlay");
    const content = document.getElementById("custom-modal-content");

    if (!overlay || !content) {
      console.error("Modal elements not found");
      return;
    }

    content.innerHTML = "";

    if (type === "Cadastrar") {
      content.innerHTML = renderCadastroForm();

      const btnSalvar = document.getElementById("btnSalvar");
      if (btnSalvar) btnSalvar.addEventListener("click", window.handleCadastro);

      const cpfInput = document.getElementById("cpf");
      if (cpfInput)
        cpfInput.addEventListener("input", (e) => {
          e.target.value = window.formatCPF(e.target.value);
        });
    }

    if (type === "Consultar") {
      content.innerHTML = renderConsultarForm();

      const cpfInput = document.getElementById("filtro-cpf");
      if (cpfInput)
        cpfInput.addEventListener("input", (e) => {
          e.target.value = window.formatCPF(e.target.value);
        });

      const btnToggleFiltros = document.getElementById("btnToggleFiltros");
      if (btnToggleFiltros)
        btnToggleFiltros.addEventListener("click", () => {
          const filtrosContainer = document.getElementById("filtros-container");
          const btn = document.getElementById("btnToggleFiltros");
          if (filtrosContainer && btn) {
            if (filtrosContainer.style.display === "none") {
              filtrosContainer.style.display = "block";
              btn.textContent = "Ocultar Filtros";
            } else {
              filtrosContainer.style.display = "none";
              btn.textContent = "Mostrar Filtros";
            }
          }
        });

      const btnConsultar = document.getElementById("btnConsultar");
      if (btnConsultar)
        btnConsultar.addEventListener("click", window.handleConsultar);

      window.carregarLista({ ativo: true });
      window.setupTabelaEventListeners();
    }

    if (type === "Editar" && data) {
      content.innerHTML = renderEditarForm(data);

      const nomeInput = document.getElementById("nome");
      const apelidoInput = document.getElementById("apelido");
      const dataNascimentoInput = document.getElementById("data_nascimento");
      const telefoneInput = document.getElementById("telefone");
      if (nomeInput) nomeInput.value = data.nome || "";
      if (apelidoInput) apelidoInput.value = data.apelido || "";
      if (dataNascimentoInput)
        dataNascimentoInput.value = data.data_nascimento || "";
      if (telefoneInput) telefoneInput.value = data.telefone || "";

      const btnCancelar = document.getElementById("btnCancelarEditar");
      const btnSalvar = document.getElementById("btnSalvarEditar");
      if (btnCancelar)
        btnCancelar.addEventListener("click", () =>
          openCustomModal("Consultar"),
        );
      if (btnSalvar) btnSalvar.addEventListener("click", window.handleEditar);
    }

    if (type === "AdicionarPontos" && data) {
      content.innerHTML = renderAdicionarPontosForm(data);

      const btnCancelar = document.getElementById("btnCancelarPontos");
      const btnSalvar = document.getElementById("btnSalvarPontos");
      if (btnCancelar)
        btnCancelar.addEventListener("click", () =>
          openCustomModal("Consultar"),
        );
      if (btnSalvar)
        btnSalvar.addEventListener("click", window.handleAdicionarPontos);
    }

    if (type === "Excluir" && data) {
      content.innerHTML = renderExcluirConfirm(data);

      const btnCancelar = document.getElementById("btnCancelarExcluir");
      const btnConfirmar = document.getElementById("btnConfirmarExcluir");
      if (btnCancelar)
        btnCancelar.addEventListener("click", () =>
          openCustomModal("Consultar"),
        );
      if (btnConfirmar)
        btnConfirmar.addEventListener("click", window.handleExcluir);
    }

    if (type === "ResgatarPontos" && data) {
      content.innerHTML = renderResgatarPontosForm(data);

      const btnCancelar = document.getElementById("btnCancelarResgate");
      const btnConfirmar = document.getElementById("btnConfirmarResgate");
      if (btnCancelar)
        btnCancelar.addEventListener("click", () =>
          openCustomModal("Consultar"),
        );
      if (btnConfirmar)
        btnConfirmar.addEventListener("click", window.handleResgatarPontos);
    }

    if (type === "Historico" && data) {
      content.innerHTML = renderHistoricoForm(data);

      const btnFechar = document.getElementById("btnFecharHistorico");
      if (btnFechar)
        btnFechar.addEventListener("click", () =>
          openCustomModal("Consultar"),
        );

      const btnExportar = document.getElementById("btnExportarHistorico");
      if (btnExportar)
        btnExportar.addEventListener("click", () =>
          window.exportarHistoricoCSV(data.indicador, data.itens),
        );

      // Salva o numero do pedido assim que o campo perde o foco.
      content.addEventListener("change", (e) => {
        if (e.target.classList?.contains("historico-pedido")) {
          window.salvarPedidoHistorico(e.target);
        }
      });
    }

    overlay.classList.add("active");
  } catch (error) {
    console.error("Error opening modal:", error);
  }
}

window.openCustomModal = openCustomModal;
