const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  saveSale: (saleData) => ipcRenderer.invoke('save-sale', saleData),
  getSalesHistory: (filters) => ipcRenderer.invoke('get-sales-history', filters),
  getInvoiceNo: () => ipcRenderer.invoke('get-invoice-no'),
  generateInvoicePDF: (saleData) => ipcRenderer.invoke('generate-invoice-pdf', saleData),
  exportB2CSV: (filters) => ipcRenderer.invoke('export-b2-csv', filters),
  exportFullCSV: (filters) => ipcRenderer.invoke('export-full-csv', filters),
  getStats: () => ipcRenderer.invoke('get-stats'),
  saveQuickSale: (data) => ipcRenderer.invoke('save-quick-sale', data),
  getQuickStats: () => ipcRenderer.invoke('get-quick-stats'),
  getQuickHistory: (limit) => ipcRenderer.invoke('get-quick-history', limit),
  getProduct: (code) => ipcRenderer.invoke('get-product', code),
  saveProduct: (data) => ipcRenderer.invoke('save-product', data),
  saveQuickSaleV2: (data) => ipcRenderer.invoke('save-quick-sale-v2', data),
  getQuickStatsV2: () => ipcRenderer.invoke('get-quick-stats-v2'),
  getQuickHistoryV2: (limit) => ipcRenderer.invoke('get-quick-history-v2', limit)
});
