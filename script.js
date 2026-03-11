// ================================
// Sistema de facturación RAPIZ, S.R.L.
// Diseñado para trabajar en navegador sin dependencias de instalación.
// ================================

const STORAGE_KEYS = {
  config: "rapiz_config",
  history: "rapiz_history",
  counter: "rapiz_counter"
};

const defaultConfig = {
  company: "RAPIZ, S.R.L.",
  rnc: "1-33-49219-9",
  address: "Calle Duarte No. 1, El Puerto, Villa Altagracia, San Cristóbal",
  phones: "829-228-7162 / 809-519-3117",
  email: "rapiz.com.do@gmail.com",
  slogan: "Más que velocidad"
};

const el = {
  invoiceNumber: document.getElementById("invoiceNumber"),
  fiscalNumber: document.getElementById("fiscalNumber"),
  invoiceDate: document.getElementById("invoiceDate"),
  dueDate: document.getElementById("dueDate"),
  clientName: document.getElementById("clientName"),
  clientTaxId: document.getElementById("clientTaxId"),
  clientPhone: document.getElementById("clientPhone"),
  clientEmail: document.getElementById("clientEmail"),
  clientAddress: document.getElementById("clientAddress"),
  notes: document.getElementById("notes"),
  itemsBody: document.getElementById("itemsBody"),
  discount: document.getElementById("discount"),
  taxRate: document.getElementById("taxRate"),
  subtotal: document.getElementById("subtotal"),
  taxTotal: document.getElementById("taxTotal"),
  grandTotal: document.getElementById("grandTotal"),
  invoicePreview: document.getElementById("invoicePreview"),
  historyList: document.getElementById("historyList"),
  searchHistory: document.getElementById("searchHistory"),
  btnAddRow: document.getElementById("btnAddRow"),
  btnSaveConfig: document.getElementById("btnSaveConfig"),
  btnNueva: document.getElementById("btnNueva"),
  btnGuardar: document.getElementById("btnGuardar"),
  btnImprimir: document.getElementById("btnImprimir"),
  btnPDF: document.getElementById("btnPDF"),
  cfgCompany: document.getElementById("cfgCompany"),
  cfgRnc: document.getElementById("cfgRnc"),
  cfgAddress: document.getElementById("cfgAddress"),
  cfgPhones: document.getElementById("cfgPhones"),
  cfgEmail: document.getElementById("cfgEmail"),
  cfgSlogan: document.getElementById("cfgSlogan")
};

function parseMoney(v) {
  return Number.parseFloat(v) || 0;
}

function fmtCurrency(value) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP"
  }).format(value || 0);
}

function getConfig() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.config)) || { ...defaultConfig };
}

function setConfig(config) {
  localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(config));
}

function getHistory() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.history)) || [];
}

function setHistory(history) {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
}

function getCounter() {
  return Number(localStorage.getItem(STORAGE_KEYS.counter)) || 1;
}

function setCounter(counter) {
  localStorage.setItem(STORAGE_KEYS.counter, String(counter));
}

function formatInvoiceNumber(counter) {
  return `RAP-${String(counter).padStart(6, "0")}`;
}

function createItemRow(item = {}) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input type="text" class="item-desc" value="${item.description || ""}" placeholder="Servicio fibra óptica / Equipo" /></td>
    <td><input type="number" class="item-qty" min="0" step="1" value="${item.quantity || 1}" /></td>
    <td><input type="number" class="item-price" min="0" step="0.01" value="${item.price || 0}" /></td>
    <td><input type="number" class="item-tax" min="0" step="0.01" value="${item.taxRate ?? ""}" placeholder="Usar general" /></td>
    <td class="item-total">${fmtCurrency(0)}</td>
    <td><button type="button" class="remove-row">✕</button></td>
  `;

  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", updateAll);
  });

  row.querySelector(".remove-row").addEventListener("click", () => {
    row.remove();
    if (!el.itemsBody.children.length) createItemRow();
    updateAll();
  });

  el.itemsBody.appendChild(row);
}

function collectItems() {
  return [...el.itemsBody.querySelectorAll("tr")].map((row) => ({
    description: row.querySelector(".item-desc").value.trim(),
    quantity: parseMoney(row.querySelector(".item-qty").value),
    price: parseMoney(row.querySelector(".item-price").value),
    taxRate: row.querySelector(".item-tax").value === "" ? null : parseMoney(row.querySelector(".item-tax").value)
  }));
}

function recalculate() {
  const generalTax = parseMoney(el.taxRate.value);
  const discount = parseMoney(el.discount.value);
  const items = collectItems();
  let subtotal = 0;
  let taxAmount = 0;

  [...el.itemsBody.querySelectorAll("tr")].forEach((row, idx) => {
    const item = items[idx];
    const lineBase = item.quantity * item.price;
    const lineTaxRate = item.taxRate ?? generalTax;
    const lineTax = lineBase * (lineTaxRate / 100);
    const lineTotal = lineBase + lineTax;

    subtotal += lineBase;
    taxAmount += lineTax;

    row.querySelector(".item-total").textContent = fmtCurrency(lineTotal);
  });

  const total = Math.max(subtotal + taxAmount - discount, 0);

  el.subtotal.value = fmtCurrency(subtotal);
  el.taxTotal.value = fmtCurrency(taxAmount);
  el.grandTotal.value = fmtCurrency(total);

  return { subtotal, taxAmount, total, discount, items, generalTax };
}

function currentInvoiceData() {
  const totals = recalculate();
  return {
    invoiceNumber: el.invoiceNumber.value,
    fiscalNumber: el.fiscalNumber.value.trim(),
    invoiceDate: el.invoiceDate.value,
    dueDate: el.dueDate.value,
    clientName: el.clientName.value.trim(),
    clientTaxId: el.clientTaxId.value.trim(),
    clientPhone: el.clientPhone.value.trim(),
    clientEmail: el.clientEmail.value.trim(),
    clientAddress: el.clientAddress.value.trim(),
    notes: el.notes.value.trim(),
    ...totals,
    createdAt: new Date().toISOString()
  };
}

function renderPreview() {
  const cfg = getConfig();
  const data = currentInvoiceData();
  const itemRows = data.items
    .filter((i) => i.description || i.price || i.quantity)
    .map((item) => {
      const base = item.quantity * item.price;
      const taxRate = item.taxRate ?? data.generalTax;
      const lineTax = base * (taxRate / 100);
      return `
      <tr>
        <td>${item.description || "-"}</td>
        <td>${item.quantity}</td>
        <td>${fmtCurrency(item.price)}</td>
        <td>${taxRate}%</td>
        <td>${fmtCurrency(base + lineTax)}</td>
      </tr>`;
    })
    .join("");

  el.invoicePreview.innerHTML = `
    <div class="preview-header">
      <div>
        <h3 class="preview-title">${cfg.company}</h3>
        <p><strong>RNC:</strong> ${cfg.rnc}</p>
        <p>${cfg.address}</p>
        <p><strong>Tel:</strong> ${cfg.phones}</p>
        <p><strong>Email:</strong> ${cfg.email}</p>
        <p><em>${cfg.slogan}</em></p>
      </div>
      <div>
        <h3>FACTURA</h3>
        <p><strong>No:</strong> ${data.invoiceNumber}</p>
        <p><strong>NCF:</strong> ${data.fiscalNumber || "N/A"}</p>
        <p><strong>Fecha:</strong> ${data.invoiceDate || "N/A"}</p>
        <p><strong>Vence:</strong> ${data.dueDate || "N/A"}</p>
      </div>
    </div>
    <p><strong>Cliente:</strong> ${data.clientName || "N/A"}</p>
    <p><strong>RNC/Cédula:</strong> ${data.clientTaxId || "N/A"} | <strong>Tel:</strong> ${data.clientPhone || "N/A"}</p>
    <p><strong>Correo:</strong> ${data.clientEmail || "N/A"}</p>
    <p><strong>Dirección:</strong> ${data.clientAddress || "N/A"}</p>
    <table class="preview-table">
      <thead>
        <tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>ITBIS</th><th>Total</th></tr>
      </thead>
      <tbody>${itemRows || '<tr><td colspan="5">Sin conceptos</td></tr>'}</tbody>
    </table>
    <p><strong>Subtotal:</strong> ${fmtCurrency(data.subtotal)}</p>
    <p><strong>Impuesto:</strong> ${fmtCurrency(data.taxAmount)}</p>
    <p><strong>Descuento:</strong> ${fmtCurrency(data.discount)}</p>
    <p><strong>Total general:</strong> ${fmtCurrency(data.total)}</p>
    <p><strong>Notas:</strong> ${data.notes || "-"}</p>
  `;
}

function updateAll() {
  recalculate();
  renderPreview();
}

function fillConfigForm() {
  const cfg = getConfig();
  el.cfgCompany.value = cfg.company;
  el.cfgRnc.value = cfg.rnc;
  el.cfgAddress.value = cfg.address;
  el.cfgPhones.value = cfg.phones;
  el.cfgEmail.value = cfg.email;
  el.cfgSlogan.value = cfg.slogan;
}

function saveConfigFromForm() {
  const cfg = {
    company: el.cfgCompany.value.trim(),
    rnc: el.cfgRnc.value.trim(),
    address: el.cfgAddress.value.trim(),
    phones: el.cfgPhones.value.trim(),
    email: el.cfgEmail.value.trim(),
    slogan: el.cfgSlogan.value.trim()
  };
  setConfig(cfg);
  renderPreview();
  alert("Configuración guardada.");
}

function renderHistory(filter = "") {
  const history = getHistory();
  const q = filter.toLowerCase().trim();
  const filtered = history.filter((inv) =>
    [inv.invoiceNumber, inv.fiscalNumber, inv.clientName].join(" ").toLowerCase().includes(q)
  );

  if (!filtered.length) {
    el.historyList.innerHTML = '<div class="history-item">No hay resultados.</div>';
    return;
  }

  el.historyList.innerHTML = filtered
    .map(
      (inv) => `
      <div class="history-item">
        <div>
          <strong>${inv.invoiceNumber}</strong> - ${inv.clientName || "Cliente"}<br/>
          NCF: ${inv.fiscalNumber || "N/A"} | ${inv.invoiceDate || "Sin fecha"}
        </div>
        <div>
          <strong>${fmtCurrency(inv.total)}</strong>
          <button class="btn small" data-load="${inv.invoiceNumber}">Cargar</button>
        </div>
      </div>`
    )
    .join("");

  el.historyList.querySelectorAll("[data-load]").forEach((btn) => {
    btn.addEventListener("click", () => loadInvoice(btn.dataset.load));
  });
}

function loadInvoice(invoiceNumber) {
  const inv = getHistory().find((h) => h.invoiceNumber === invoiceNumber);
  if (!inv) return;

  el.invoiceNumber.value = inv.invoiceNumber;
  el.fiscalNumber.value = inv.fiscalNumber;
  el.invoiceDate.value = inv.invoiceDate;
  el.dueDate.value = inv.dueDate;
  el.clientName.value = inv.clientName;
  el.clientTaxId.value = inv.clientTaxId;
  el.clientPhone.value = inv.clientPhone;
  el.clientEmail.value = inv.clientEmail;
  el.clientAddress.value = inv.clientAddress;
  el.notes.value = inv.notes;
  el.discount.value = inv.discount;
  el.taxRate.value = inv.generalTax;

  el.itemsBody.innerHTML = "";
  inv.items.forEach((item) => createItemRow(item));
  updateAll();
}

function newInvoice() {
  const counter = getCounter();
  el.invoiceNumber.value = formatInvoiceNumber(counter);
  el.fiscalNumber.value = "";
  el.invoiceDate.value = new Date().toISOString().slice(0, 10);
  el.dueDate.value = "";
  el.clientName.value = "";
  el.clientTaxId.value = "";
  el.clientPhone.value = "";
  el.clientEmail.value = "";
  el.clientAddress.value = "";
  el.notes.value = "";
  el.discount.value = 0;
  el.taxRate.value = 18;
  el.itemsBody.innerHTML = "";
  createItemRow();
  updateAll();
}

function saveInvoice() {
  const data = currentInvoiceData();
  if (!data.clientName) {
    alert("Debe indicar el nombre del cliente.");
    return;
  }

  const history = getHistory();
  const idx = history.findIndex((h) => h.invoiceNumber === data.invoiceNumber);
  if (idx >= 0) history[idx] = data;
  else history.unshift(data);
  setHistory(history);

  const currentCounter = getCounter();
  const currentNumber = formatInvoiceNumber(currentCounter);
  if (data.invoiceNumber === currentNumber) {
    setCounter(currentCounter + 1);
  }

  renderHistory(el.searchHistory.value);
  alert("Factura guardada correctamente.");
}

function printInvoice() {
  window.print();
}

async function downloadPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const canvas = await html2canvas(el.invoicePreview, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = 190;
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 10, 10, width, height);
    pdf.save(`${el.invoiceNumber.value || "factura"}.pdf`);
  } catch (error) {
    console.error(error);
    alert("No fue posible generar el PDF.");
  }
}

function bindEvents() {
  [
    el.fiscalNumber,
    el.invoiceDate,
    el.dueDate,
    el.clientName,
    el.clientTaxId,
    el.clientPhone,
    el.clientEmail,
    el.clientAddress,
    el.notes,
    el.discount,
    el.taxRate
  ].forEach((input) => input.addEventListener("input", updateAll));

  el.btnAddRow.addEventListener("click", () => {
    createItemRow();
    updateAll();
  });

  el.btnSaveConfig.addEventListener("click", saveConfigFromForm);
  el.btnNueva.addEventListener("click", newInvoice);
  el.btnGuardar.addEventListener("click", saveInvoice);
  el.btnImprimir.addEventListener("click", printInvoice);
  el.btnPDF.addEventListener("click", downloadPDF);
  el.searchHistory.addEventListener("input", (e) => renderHistory(e.target.value));
}

function init() {
  fillConfigForm();
  bindEvents();
  newInvoice();
  renderHistory();
}

init();
