const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const Database = require('./src/utils/db');
const { generateInvoicePDF } = require('./src/utils/pdf');
const { generateB2CSV, generateFullCSV } = require('./src/utils/csv');

let mainWindow;
let db;

app.on('ready', () => {
  const dbPath = path.join(app.getPath('userData'), 'sales.db');
  console.log('DB PATH:', dbPath);
  db = new Database(dbPath);
  db.initialize();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('src/index.html');

  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle('save-sale', async (event, saleData) => {
  try {
    const result = await db.saveSale(saleData);
    return { success: true, id: result };
  } catch (error) {
    console.error('save-sale error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-sales-history', async (event, filters = {}) => {
  try {
    const sales = await db.getSalesHistory(filters);
    return { success: true, data: sales };
  } catch (error) {
    console.error('get-sales-history error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-invoice-no', async (event) => {
  try {
    const invoiceNo = await db.getNextInvoiceNo();
    return { success: true, invoiceNo };
  } catch (error) {
    console.error('get-invoice-no error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('generate-invoice-pdf', async (event, saleData) => {
  try {
    const filePath = await dialog.showSaveDialog(mainWindow, {
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      defaultPath: `invoice_${saleData.invoiceNo}.pdf`
    });

    if (filePath.canceled) return { success: false };

    await generateInvoicePDF(saleData, filePath.filePath);
    return { success: true, path: filePath.filePath };
  } catch (error) {
    console.error('generate-invoice-pdf error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-b2-csv', async (event, filters = {}) => {
  try {
    const filePath = await dialog.showSaveDialog(mainWindow, {
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      defaultPath: `yamato_b2_${new Date().toISOString().split('T')[0]}.csv`
    });

    if (filePath.canceled) return { success: false };

    const sales = await db.getSalesHistory(filters);
    await generateB2CSV(sales, filePath.filePath);
    return { success: true, path: filePath.filePath };
  } catch (error) {
    console.error('export-b2-csv error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-full-csv', async (event, filters = {}) => {
  try {
    const filePath = await dialog.showSaveDialog(mainWindow, {
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      defaultPath: `sales_history_${new Date().toISOString().split('T')[0]}.csv`
    });

    if (filePath.canceled) return { success: false };

    const sales = await db.getSalesHistory(filters);
    await generateFullCSV(sales, filePath.filePath);
    return { success: true, path: filePath.filePath };
  } catch (error) {
    console.error('export-full-csv error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-stats', async (event) => {
  try {
    const stats = await db.getStats();
    return { success: true, data: stats };
  } catch (error) {
    console.error('get-stats error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-quick-sale', async (event, data) => {
  try {
    const id = await db.saveQuickSale(data);
    return { success: true, id };
  } catch (error) {
    console.error('save-quick-sale error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-quick-stats', async (event) => {
  try {
    const stats = await db.getQuickStats();
    return { success: true, data: stats };
  } catch (error) {
    console.error('get-quick-stats error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-quick-history', async (event, limit = 50) => {
  try {
    const sales = await db.getQuickSalesHistory(limit);
    return { success: true, data: sales };
  } catch (error) {
    console.error('get-quick-history error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-product', async (event, code) => {
  try {
    const product = await db.getProductByCode(code);
    return { success: true, data: product };
  } catch (error) {
    console.error('get-product error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-product', async (event, data) => {
  try {
    await db.saveProduct(data);
    return { success: true };
  } catch (error) {
    console.error('save-product error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-quick-sale-v2', async (event, data) => {
  try {
    const id = await db.saveQuickSaleV2(data);
    return { success: true, id };
  } catch (error) {
    console.error('save-quick-sale-v2 error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-quick-stats-v2', async (event) => {
  try {
    const stats = await db.getQuickStatsV2();
    return { success: true, data: stats };
  } catch (error) {
    console.error('get-quick-stats-v2 error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-quick-history-v2', async (event, limit = 50) => {
  try {
    const sales = await db.getQuickSalesHistoryV2(limit);
    return { success: true, data: sales };
  } catch (error) {
    console.error('get-quick-history-v2 error:', error);
    return { success: false, error: error.message };
  }
});
