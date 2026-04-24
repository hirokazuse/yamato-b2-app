document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

setTimeout(() => {
  loadDashboard();
  initializeInputForm();
  initializeQuickInput();
}, 500);

async function loadDashboard() {
  try {
    const result = await window.api.getStats();
    if (result.success) {
      const stats = result.data;
      document.getElementById('todayCount').textContent = stats.todayCount || 0;
      document.getElementById('todayTotal').textContent = '¥' + (stats.todayTotal || 0).toLocaleString();
      document.getElementById('monthCount').textContent = stats.monthCount || 0;
      document.getElementById('monthTotal').textContent = '¥' + (stats.monthTotal || 0).toLocaleString();
    }

    const historyResult = await window.api.getSalesHistory({});
    if (historyResult.success) {
      const sales = historyResult.data.slice(0, 10);
      const tbody = document.getElementById('recentSalesBody');
      tbody.innerHTML = '';
      
      sales.forEach(sale => {
        const row = document.createElement('tr');
        const dateStr = sale.createdDate || '未設定';
        row.innerHTML = `
          <td>${dateStr}</td>
          <td>${sale.invoiceNo}</td>
          <td>${sale.customerName}</td>
          <td>¥${sale.totalAmount.toLocaleString()}</td>
          <td><span class="status-badge ${sale.shippingMethod === 'コレクト' ? 'status-pending' : 'status-paid'}">${sale.shippingMethod}</span></td>
        `;
        tbody.appendChild(row);
      });
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

let itemCount = 0;

function initializeInputForm() {
  const addItemBtn = document.getElementById('addItemBtn');
  if (!addItemBtn) {
    console.error('addItemBtn not found');
    return;
  }

  addItemBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addItemRow();
  });

  addItemRow();

  const form = document.getElementById('inputForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  const container = document.getElementById('itemsContainer');
  if (container) {
    container.addEventListener('change', (e) => {
      if (e.target.name === 'quantity' || e.target.name === 'unitPrice') {
        updateItemAmount(e.target);
        calculateTotals();
      }
    });
  }
}

function addItemRow() {
  const container = document.getElementById('itemsContainer');
  if (!container) return;

  const itemId = itemCount++;
  
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input type="text" name="productName" placeholder="商品名" required>
    <input type="number" name="quantity" placeholder="数量" min="1" value="1" required>
    <input type="number" name="unitPrice" placeholder="単価" min="1" required>
    <input type="number" name="amount" placeholder="金額" readonly style="background: #f9f9f9;">
    <button type="button" class="btn-delete" data-id="${itemId}">削除</button>
  `;

  row.querySelector('.btn-delete').addEventListener('click', (e) => {
    e.preventDefault();
    row.remove();
    calculateTotals();
  });

  container.appendChild(row);
  console.log('Item row added');
}

function updateItemAmount(input) {
  const row = input.closest('.item-row');
  if (!row) return;

  const quantity = parseFloat(row.querySelector('[name="quantity"]').value) || 0;
  const unitPrice = parseFloat(row.querySelector('[name="unitPrice"]').value) || 0;
  const amountInput = row.querySelector('[name="amount"]');
  amountInput.value = (quantity * unitPrice).toLocaleString('ja-JP');
}

function calculateTotals() {
  let subtotal = 0;
  
  document.querySelectorAll('.item-row').forEach(row => {
    const quantity = parseFloat(row.querySelector('[name="quantity"]').value) || 0;
    const unitPrice = parseFloat(row.querySelector('[name="unitPrice"]').value) || 0;
    subtotal += quantity * unitPrice;
  });

  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  document.getElementById('subtotal').textContent = '¥' + subtotal.toLocaleString();
  document.getElementById('tax').textContent = '¥' + tax.toLocaleString();
  document.getElementById('totalAmount').textContent = '¥' + total.toLocaleString();
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const customerName = document.getElementById('customerName').value;
  const postalCode = document.getElementById('postalCode').value;
  const prefecture = document.getElementById('prefecture').value;
  const city = document.getElementById('city').value;
  const address = document.getElementById('address').value;
  const phone = document.getElementById('phone').value;
  const shippingMethod = document.getElementById('shippingMethod').value;
  const memo = document.getElementById('memo').value;

  const items = [];
  document.querySelectorAll('.item-row').forEach(row => {
    const productName = row.querySelector('[name="productName"]').value;
    const quantity = parseInt(row.querySelector('[name="quantity"]').value) || 0;
    const unitPrice = parseInt(row.querySelector('[name="unitPrice"]').value) || 0;
    const amount = quantity * unitPrice;

    if (productName && quantity && unitPrice) {
      items.push({
        productName,
        quantity,
        unitPrice,
        amount
      });
    }
  });

  if (items.length === 0) {
    showMessage('商品を1つ以上入力してください', 'error');
    return;
  }

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax = Math.floor(subtotal * 0.1);
  const totalAmount = subtotal + tax;

  const invoiceResult = await window.api.getInvoiceNo();
  if (!invoiceResult.success) {
    showMessage('採番エラー: ' + invoiceResult.error, 'error');
    return;
  }

  const saleData = {
    invoiceNo: invoiceResult.invoiceNo,
    createdDate: new Date().toISOString().split('T')[0],
    customerName,
    postalCode,
    prefecture,
    city,
    address,
    phone,
    shippingMethod,
    subtotal,
    tax,
    totalAmount,
    memo,
    items
  };

  const saveResult = await window.api.saveSale(saleData);
  if (!saveResult.success) {
    showMessage('保存エラー: ' + saveResult.error, 'error');
    return;
  }

  const pdfResult = await window.api.generateInvoicePDF(saleData);
  if (!pdfResult.success) {
    showMessage('PDF生成エラー: ' + pdfResult.error, 'error');
    return;
  }

  showMessage(`✅ 納品書を保存しました: ${saleData.invoiceNo}`, 'success');

  document.getElementById('inputForm').reset();
  document.getElementById('itemsContainer').innerHTML = '';
  itemCount = 0;
  addItemRow();
  calculateTotals();

  loadDashboard();
}

function showMessage(message, type) {
  const messageEl = document.getElementById('inputMessage');
  messageEl.className = type;
  messageEl.textContent = message;
  
  setTimeout(() => {
    messageEl.textContent = '';
    messageEl.className = '';
  }, 5000);
}

async function loadHistory() {
  const startDate = document.getElementById('filterStartDate').value;
  const endDate = document.getElementById('filterEndDate').value;
  const customerName = document.getElementById('filterCustomerName').value;

  const filters = {};
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;
  if (customerName) filters.customerName = customerName;

  const result = await window.api.getSalesHistory(filters);
  if (!result.success) {
    console.error('Error loading history:', result.error);
    return;
  }

  const tbody = document.getElementById('historyTableBody');
  tbody.innerHTML = '';

  result.data.forEach(sale => {
    const products = (sale.items || []).map(i => i.productName).join(', ');
    const quantities = (sale.items || []).map(i => i.quantity).join(', ');
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${sale.createdDate}</td>
      <td>${sale.invoiceNo}</td>
      <td>${sale.customerName}</td>
      <td>${products}</td>
      <td>${quantities}</td>
      <td>¥${sale.totalAmount.toLocaleString()}</td>
      <td><span class="status-badge ${sale.shippingMethod === 'コレクト' ? 'status-pending' : 'status-paid'}">${sale.shippingMethod}</span></td>
    `;
    tbody.appendChild(row);
  });
}

const searchBtn = document.getElementById('searchBtn');
if (searchBtn) {
  searchBtn.addEventListener('click', loadHistory);
}

const exportB2Btn = document.getElementById('exportB2Btn');
if (exportB2Btn) {
  exportB2Btn.addEventListener('click', async () => {
    const startDate = document.getElementById('exportStartDate').value;
    const endDate = document.getElementById('exportEndDate').value;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await window.api.exportB2CSV(filters);
    if (result.success) {
      alert('✅ ヤマトB2用CSVを出力しました: ' + result.path);
    } else {
      alert('❌ エラー: ' + result.error);
    }
  });
}

const exportFullBtn = document.getElementById('exportFullBtn');
if (exportFullBtn) {
  exportFullBtn.addEventListener('click', async () => {
    const startDate = document.getElementById('exportStartDate').value;
    const endDate = document.getElementById('exportEndDate').value;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await window.api.exportFullCSV(filters);
    if (result.success) {
      alert('✅ 全項目CSVを出力しました: ' + result.path);
    } else {
      alert('❌ エラー: ' + result.error);
    }
  });
}

let isProcessing = false;
let isNewMode = false;
let currentCode = '';

function playBeep(freq = 800, duration = 100, type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type === 'success' ? 'sine' : 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (e) {}
}

function setNewMode(enabled, productName = '', price = 0) {
  isNewMode = enabled;
  const nameInput = document.getElementById('productNameInput');
  const priceInput = document.getElementById('priceInput');
  const scanInput = document.getElementById('scanInput');

  if (!nameInput || !priceInput) return;

  if (enabled) {
    nameInput.value = '';
    nameInput.removeAttribute('readonly');
    nameInput.style.background = '#fff3cd';
    priceInput.value = '';
    priceInput.removeAttribute('readonly');
    priceInput.style.background = '#fff3cd';
    scanInput.style.background = '#fff3cd';
    scanResult('⚠️ 未登録。商品名と価格を入力', 'warning');
  } else {
    nameInput.value = productName;
    nameInput.setAttribute('readonly', 'true');
    nameInput.style.background = '#f9f9f9';
    priceInput.value = price;
    priceInput.setAttribute('readonly', 'true');
    priceInput.style.background = '#f9f9f9';
    scanInput.style.background = '#ffffff';
  }
}

function resetInputs() {
  const scanInput = document.getElementById('scanInput');
  const nameInput = document.getElementById('productNameInput');
  const priceInput = document.getElementById('priceInput');

  isNewMode = false;
  currentCode = '';

  if (scanInput) {
    scanInput.value = '';
    scanInput.style.background = '#ffffff';
  }
  if (nameInput) {
    nameInput.value = '';
    nameInput.setAttribute('readonly', 'true');
    nameInput.style.background = '#f9f9f9';
  }
  if (priceInput) {
    priceInput.value = 0;
    priceInput.setAttribute('readonly', 'true');
    priceInput.style.background = '#f9f9f9';
  }

  if (scanInput) scanInput.focus();
}

function initializeQuickInput() {
  const scanInput = document.getElementById('scanInput');
  const nameInput = document.getElementById('productNameInput');
  const priceInput = document.getElementById('priceInput');

  if (!scanInput) return;

  scanInput.focus();
  setInterval(() => {
    if (document.activeElement !== scanInput && document.activeElement !== nameInput && document.activeElement !== priceInput) {
      scanInput.focus();
    }
  }, 500);

  scanInput.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter' || isProcessing) return;
    isProcessing = true;

    const code = scanInput.value.trim();
    if (!code) {
      isProcessing = false;
      return;
    }

    currentCode = code;
    const product = await window.api.getProduct(code);

    if (!product || !product.success || !product.data) {
      setNewMode(true);
      nameInput.focus();
      isProcessing = false;
      return;
    }

    const p = product.data;
    setNewMode(false, p.product_name, p.price);

    const result = await window.api.saveQuickSaleV2({
      product_code: code,
      product_name: p.product_name,
      qty: 1,
      price: p.price,
      cost: p.cost || 0,
      channel: 'quick'
    });

    if (!result.success) {
      playBeep(200, 400, 'error');
      scanResult('❌ 保存失敗', 'error');
      isProcessing = false;
      return;
    }

    playBeep(1000, 80, 'success');
    scanResult(`✔ ${p.product_name} ¥${p.price.toLocaleString()}`, 'success');
    loadQuickStats();
    loadQuickHistory();
    resetInputs();
    isProcessing = false;
  });

  nameInput.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter' || !isNewMode || isProcessing) return;
    nameInput.blur();
    priceInput.focus();
  });

  priceInput.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter' || !isNewMode || isProcessing) return;
    isProcessing = true;

    const name = nameInput.value.trim();
    const price = parseInt(priceInput.value) || 0;

    if (!name || !price) {
      playBeep(300, 200, 'error');
      scanResult('❌ 商品名と価格を入力', 'error');
      isProcessing = false;
      return;
    }

    await window.api.saveProduct({
      product_code: currentCode,
      product_name: name,
      price: price,
      cost: 0
    });

    const result = await window.api.saveQuickSaleV2({
      product_code: currentCode,
      product_name: name,
      qty: 1,
      price: price,
      cost: 0,
      channel: 'quick'
    });

    if (!result.success) {
      playBeep(200, 400, 'error');
      scanResult('❌ 保存失敗', 'error');
      isProcessing = false;
      return;
    }

    playBeep(1000, 80, 'success');
    scanResult(`✔ 新規登録 ${name} ¥${price.toLocaleString()}`, 'success');
    loadQuickStats();
    loadQuickHistory();
    resetInputs();
    isProcessing = false;
  });

  loadQuickStats();
  loadQuickHistory();

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'quick') {
        setTimeout(() => scanInput.focus(), 100);
      }
    });
  });
}

function scanResult(text, type) {
  const el = document.getElementById('scanResult');
  if (!el) return;
  el.textContent = text;
  el.className = type;
  el.style.color = type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#27ae60';

  const duration = type === 'error' ? 1000 : 500;
  setTimeout(() => {
    el.textContent = '';
    el.className = '';
  }, duration);
}

async function loadQuickStats() {
  try {
    const result = await window.api.getQuickHistoryV2(5);
    const tbody = document.getElementById('quickHistoryBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (result.success && result.data) {
      result.data.forEach(sale => {
        const row = document.createElement('tr');
        const time = sale.created_at ? sale.created_at.split('T')[1].substring(0, 5) : '';
        row.innerHTML = `
          <td>${time}</td>
          <td>${sale.product_code}</td>
          <td>${sale.product_name || ''}</td>
          <td>${sale.qty}</td>
          <td>¥${(sale.price || 0).toLocaleString()}</td>
          <td>¥${(sale.amount || 0).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
      });
    }
  } catch (error) {
    console.error('loadQuickHistory error:', error);
  }
}
