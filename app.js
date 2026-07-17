'use strict';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const TEMPLATE_DEFAULTS = {
  contractNumber: '797/07-ТП/2026',
  customerFullName: 'Голдин Сергей Александрович',
  customerShortName: 'Голдин С.А.',
  deliveryAddress: 'Московская область, г. Балашиха, мкр-н Салтыковка, ул. Дубровинская д. 9а',
  deliveryAddressSpec: 'Московская область, г. Балашиха, мкр-н Салтыковка, ул. Дубровинская д.9а.',
  phone: '+ 7 (925) 805-21-07',
  contractDay: '13',
  contractMonth: '6',
  contractYear: '2026',
  advancePercent: '10',
  deliveryFrom: '19.07.2026',
  deliveryTo: '22.07.2026',
  region: 'Московская область',
  items: [
    { name: 'Брусчатка «Новый город – Листопад» 6см', unit: 'м²', qty: '80', price: '1200' },
    { name: 'Бордюр 400/200/50 Листопад', unit: 'шт', qty: '80', price: '170' },
    { name: '', unit: '', qty: '', price: '' },
    { name: 'Доставка манипулятор', unit: 'рейс', qty: '1', price: '14000' },
    { name: '', unit: '', qty: '', price: '' },
    { name: '', unit: '', qty: '', price: '' },
  ],
};

let templateBuffer = null;

function formatNumber(value) {
  const num = Number(String(value).replace(/\s/g, '').replace(',', '.')) || 0;
  const parts = num.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${intPart},${parts[1]}`;
}

function formatNumberPlain(value) {
  const num = Number(String(value).replace(/\s/g, '').replace(',', '.')) || 0;
  const intPart = Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return intPart;
}

function formatAdvanceRemainder(value) {
  const num = Number(String(value).replace(/\s/g, '').replace(',', '.')) || 0;
  const intPart = Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${intPart} руб. 00 коп.`;
}

function parseNumericInput(value) {
  const normalized = String(value ?? '').replace(/[^0-9,.-]/g, '').replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function parseAdvancePercent(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return 0;
  }
  const percentValue = raw.replace(/%/g, '').trim();
  return parseNumericInput(percentValue);
}

function toShortName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return fullName.trim();
  }
  const initials = parts.slice(1).map((part) => `${part[0]}.`).join('');
  return `${parts[0]} ${initials}`;
}

function formatContractDate(day, monthIndex, year) {
  return `«${day}» ${MONTHS[monthIndex]} ${year} г.`;
}

function parseItemRow(row) {
  const qty = Number(String(row.qty).replace(/\s/g, '').replace(',', '.')) || 0;
  const price = Number(String(row.price).replace(/\s/g, '').replace(',', '.')) || 0;
  const sum = qty * price;
  return {
    ...row,
    qty: row.qty ? String(row.qty) : '',
    price: row.price ? String(row.price) : '',
    sum,
    sumFormatted: sum ? formatNumberPlain(sum) : '',
  };
}

function readFormData() {
  const customerFullName = document.getElementById('customerFullName').value.trim();
  const autoShort = document.getElementById('autoShortName').checked;
  const customerShortName = autoShort
    ? toShortName(customerFullName)
    : document.getElementById('customerShortName').value.trim();

  const items = Array.from(document.querySelectorAll('#specBody tr')).map((row) =>
    parseItemRow({
      name: row.querySelector('.item-name').value.trim(),
      unit: row.querySelector('.item-unit').value.trim(),
      qty: row.querySelector('.item-qty').value.trim(),
      price: row.querySelector('.item-price').value.trim(),
    })
  );

  const total = items.reduce((acc, item) => acc + item.sum, 0);
  const advancePercentInput = document.getElementById('advancePercent').value.trim();
  const advanceAmountInput = document.getElementById('advanceAmount').value.trim();
  const advancePercent = parseAdvancePercent(advancePercentInput);
  const advanceAmount = parseNumericInput(advanceAmountInput);

  let advance = 0;
  if (advanceAmountInput) {
    advance = advanceAmount;
  } else {
    advance = Math.round(total * advancePercent) / 100;
  }

  const remainder = total - advance;

  const day = document.getElementById('contractDay').value.trim();
  const month = Number(document.getElementById('contractMonth').value);
  const year = document.getElementById('contractYear').value.trim();
  const contractDate = formatContractDate(day, month, year);
  const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
  const deliveryAddressSpec = deliveryAddress.replace(/\s*д\.\s*/i, ' д.').replace(/\s+$/, '') + (deliveryAddress.endsWith('.') ? '' : '.');

  return {
    contractNumber: document.getElementById('contractNumber').value.trim(),
    customerFullName,
    customerShortName,
    deliveryAddress,
    deliveryAddressSpec,
    phone: document.getElementById('phone').value.trim(),
    contractDate,
    region: document.getElementById('region').value.trim(),
    deliveryPeriod: `${document.getElementById('deliveryFrom').value.trim()} -${document.getElementById('deliveryTo').value.trim()} гг.`,
    total,
    totalFormatted: formatNumber(total),
    totalRubles: `${formatNumber(total)} рублей`,
    advancePercent,
    advance,
    advanceFormatted: formatAdvanceRemainder(advance),
    remainder,
    remainderFormatted: formatAdvanceRemainder(remainder),
    items,
  };
}

function updateSummary() {
  const data = readFormData();
  document.getElementById('totalPreview').textContent = `${data.totalFormatted} ₽`;
  document.getElementById('advancePreview').textContent = data.advanceFormatted;
  document.getElementById('remainderPreview').textContent = data.remainderFormatted;

  if (document.getElementById('autoShortName').checked) {
    document.getElementById('customerShortName').value = data.customerShortName;
  }

  document.querySelectorAll('#specBody tr').forEach((row, index) => {
    const item = data.items[index];
    row.querySelector('.item-sum').textContent = item.sumFormatted ? `${item.sumFormatted}` : '—';
  });
}

function shouldAddReplacement(from, to) {
  if (!from || from === to) {
    return false;
  }
  return !(typeof from === 'string' && /^\d+$/.test(from) && from.length <= 1);
}

function buildReplacements(data) {
  const oldTotal = '123 600,00';
  const oldAdvance = '13 000 руб. 00 коп.';
  const oldRemainder = '110 600 руб. 00 коп.';
  const oldDate = formatContractDate(
    TEMPLATE_DEFAULTS.contractDay,
    Number(TEMPLATE_DEFAULTS.contractMonth),
    TEMPLATE_DEFAULTS.contractYear
  );
  const oldDeliveryPeriod = `${TEMPLATE_DEFAULTS.deliveryFrom} -${TEMPLATE_DEFAULTS.deliveryTo} гг.`;

  const replacements = [
    [TEMPLATE_DEFAULTS.contractNumber, data.contractNumber],
    [TEMPLATE_DEFAULTS.customerFullName, data.customerFullName],
    [TEMPLATE_DEFAULTS.customerShortName, data.customerShortName],
    [TEMPLATE_DEFAULTS.deliveryAddress, data.deliveryAddress],
    [TEMPLATE_DEFAULTS.deliveryAddressSpec, data.deliveryAddressSpec],
    [TEMPLATE_DEFAULTS.phone, data.phone],
    [oldDate, data.contractDate],
    [TEMPLATE_DEFAULTS.region, data.region],
    [oldDeliveryPeriod, data.deliveryPeriod],
    [oldTotal, data.totalFormatted],
    [`${oldTotal} ₽`, `${data.totalFormatted} ₽`],
    [`${oldTotal} рублей`, `${data.totalFormatted} рублей`],
    [oldAdvance, data.advanceFormatted],
    [oldRemainder, data.remainderFormatted],
    [`${TEMPLATE_DEFAULTS.advancePercent}%`, `${data.advancePercent}%`],
  ];

  const oldItems = TEMPLATE_DEFAULTS.items.map(parseItemRow);
  data.items.forEach((item, index) => {
    const oldItem = oldItems[index];
    if (!oldItem) {
      return;
    }

    if (oldItem.name || item.name) {
      replacements.push([oldItem.name, item.name]);
    }
    if (oldItem.unit || item.unit) {
      replacements.push([oldItem.unit, item.unit]);
    }
    if (oldItem.qty || item.qty) {
      replacements.push([oldItem.qty, item.qty]);
    }
    if (oldItem.price || item.price) {
      replacements.push([oldItem.price, item.price]);
    }
    if (oldItem.sumFormatted || item.sumFormatted) {
      replacements.push([oldItem.sumFormatted, item.sumFormatted]);
    }
  });

  return replacements
    .filter(([from, to]) => shouldAddReplacement(from, to))
    .sort((a, b) => b[0].length - a[0].length);
}

function clearForm() {
  document.getElementById('contractNumber').value = '';
  document.getElementById('customerFullName').value = '';
  document.getElementById('customerShortName').value = '';
  document.getElementById('deliveryAddress').value = '';
  document.getElementById('phone').value = '';
  document.getElementById('contractDay').value = '';
  document.getElementById('contractMonth').value = '6';
  document.getElementById('contractYear').value = '';
  document.getElementById('advancePercent').value = '';
  document.getElementById('advanceAmount').value = '';
  document.getElementById('deliveryFrom').value = '';
  document.getElementById('deliveryTo').value = '';
  document.getElementById('region').value = '';

  const body = document.getElementById('specBody');
  body.innerHTML = '';
  updateSummary();
}

function fillFormDefaults() {
  document.getElementById('contractNumber').value = TEMPLATE_DEFAULTS.contractNumber;
  document.getElementById('customerFullName').value = TEMPLATE_DEFAULTS.customerFullName;
  document.getElementById('customerShortName').value = TEMPLATE_DEFAULTS.customerShortName;
  document.getElementById('deliveryAddress').value = TEMPLATE_DEFAULTS.deliveryAddress;
  document.getElementById('phone').value = TEMPLATE_DEFAULTS.phone;
  document.getElementById('contractDay').value = TEMPLATE_DEFAULTS.contractDay;
  document.getElementById('contractMonth').value = TEMPLATE_DEFAULTS.contractMonth;
  document.getElementById('contractYear').value = TEMPLATE_DEFAULTS.contractYear;
  document.getElementById('advancePercent').value = TEMPLATE_DEFAULTS.advancePercent;
  document.getElementById('advanceAmount').value = '';
  document.getElementById('deliveryFrom').value = TEMPLATE_DEFAULTS.deliveryFrom;
  document.getElementById('deliveryTo').value = TEMPLATE_DEFAULTS.deliveryTo;
  document.getElementById('region').value = TEMPLATE_DEFAULTS.region;

  const body = document.getElementById('specBody');
  body.innerHTML = '';
  TEMPLATE_DEFAULTS.items.forEach((item) => addSpecRow(item));
  updateSummary();
}

function addSpecRow(item = { name: '', unit: '', qty: '', price: '' }) {
  const body = document.getElementById('specBody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" class="item-name" value="${escapeAttr(item.name)}" placeholder="Наименование"></td>
    <td><input type="text" class="item-unit" value="${escapeAttr(item.unit)}" placeholder="м²"></td>
    <td><input type="text" class="item-qty" value="${escapeAttr(item.qty)}" placeholder="0"></td>
    <td><input type="text" class="item-price" value="${escapeAttr(item.price)}" placeholder="0"></td>
    <td class="item-sum">—</td>
    <td><button type="button" class="btn-icon remove-row" title="Удалить">×</button></td>
  `;
  body.appendChild(row);
  bindRowInputs(row);
  updateSummary();
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function bindRowInputs(row) {
  row.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', updateSummary);
  });
  row.querySelector('.remove-row').addEventListener('click', () => {
    row.remove();
    updateSummary();
  });
}

async function loadTemplateBuffer(source) {
  if (source instanceof ArrayBuffer) {
    templateBuffer = source;
    return;
  }
  const response = await fetch('template.docx');
  if (!response.ok) {
    throw new Error('Не удалось загрузить template.docx');
  }
  templateBuffer = await response.arrayBuffer();
}

function setStatus(message, type = 'info') {
  const el = document.getElementById('status');
  el.textContent = message;
  el.dataset.type = type;
}

async function generateDocument() {
  try {
    setStatus('Формируем документ...', 'info');
    document.getElementById('generateBtn').disabled = true;

    if (!templateBuffer) {
      await loadTemplateBuffer();
    }

    const data = readFormData();
    const replacements = buildReplacements(data);
    const blob = DocxReplacer.applyReplacementsToDocx(templateBuffer.slice(0), replacements);

    const safeNumber = data.contractNumber.replace(/[\\/]/g, '-');
    const fileName = `Договор ${safeNumber}.docx`;
    saveAs(blob, fileName);
    setStatus(`Готово: ${fileName}`, 'success');
  } catch (error) {
    console.error(error);
    setStatus(`Ошибка: ${error.message}`, 'error');
  } finally {
    document.getElementById('generateBtn').disabled = false;
  }
}

function bindEvents() {
  document.getElementById('contractForm').addEventListener('input', updateSummary);
  document.getElementById('autoShortName').addEventListener('change', updateSummary);
  document.getElementById('addRowBtn').addEventListener('click', () => addSpecRow());
  document.getElementById('clearBtn').addEventListener('click', clearForm);
  document.getElementById('resetBtn').addEventListener('click', fillFormDefaults);
  document.getElementById('generateBtn').addEventListener('click', generateDocument);

  document.getElementById('templateFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    templateBuffer = await file.arrayBuffer();
    setStatus(`Шаблон загружен: ${file.name}`, 'success');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  fillFormDefaults();
  bindEvents();

  try {
    await loadTemplateBuffer();
    setStatus('Шаблон загружен. Заполните данные и нажмите «Скачать договор».', 'success');
  } catch (_error) {
    setStatus('Выберите файл шаблона (template.docx или Договор.docx).', 'info');
  }
});
