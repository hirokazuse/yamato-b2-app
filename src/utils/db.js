const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

let SQLite;
try {
  SQLite = require('sqlite3').verbose();
} catch (e) {
  console.log('sqlite3 not available, using JSON');
}

class Database {
  constructor(dbPath) {
    this.dataDir = path.dirname(dbPath);
    if (dbPath.endsWith('.db')) {
      this.mode = 'sqlite';
      this.dbPath = dbPath;
      this.db = null;
    } else {
      this.mode = 'json';
      this.dataFile = path.join(this.dataDir, 'sales.json');
    }
    this.ensureDataDir();
    if (this.mode === 'json') {
      this.ensureDataFile();
    }
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  ensureDataFile() {
    if (!fs.existsSync(this.dataFile)) {
      fs.writeFileSync(this.dataFile, JSON.stringify({ sales: [] }, null, 2));
    }
  }

  initialize() {
    if (this.mode === 'sqlite') {
      this.db = new SQLite.Database(this.dbPath);
      this.db.serialize(() => {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoiceNo TEXT,
            createdDate TEXT,
            customerName TEXT,
            postalCode TEXT,
            prefecture TEXT,
            city TEXT,
            address TEXT,
            phone TEXT,
            shippingMethod TEXT,
            subtotal INTEGER,
            tax INTEGER,
            totalAmount INTEGER,
            memo TEXT
          )
        `);
        this.db.run(`
          CREATE TABLE IF NOT EXISTS sales_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            saleId INTEGER,
            productName TEXT,
            quantity INTEGER,
            unitPrice INTEGER,
            amount INTEGER,
            FOREIGN KEY (saleId) REFERENCES sales(id)
          )
        `);
        this.db.run(`
          CREATE TABLE IF NOT EXISTS sales_quick (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            product_code TEXT,
            qty INTEGER,
            price INTEGER,
            channel TEXT DEFAULT 'quick',
            created_at TEXT
          )
        `);
        this.db.run(`
          CREATE TABLE IF NOT EXISTS sales_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            product_code TEXT,
            product_name TEXT,
            qty INTEGER NOT NULL,
            price INTEGER NOT NULL,
            cost INTEGER DEFAULT 0,
            amount INTEGER NOT NULL,
            profit INTEGER DEFAULT 0,
            channel TEXT DEFAULT 'quick',
            created_at TEXT NOT NULL
          )
        `);
        this.db.run(`
          CREATE TABLE IF NOT EXISTS products (
            product_code TEXT PRIMARY KEY,
            product_name TEXT,
            price INTEGER DEFAULT 0,
            cost INTEGER DEFAULT 0
          )
        `);
        console.log('Database initialized (SQLite mode)');
      });
    } else {
      console.log('Database initialized (JSON mode)');
    }
  }

  saveQuickSaleV2(data) {
    return new Promise((resolve, reject) => {
      const date = new Date().toISOString().split('T')[0];
      const created_at = new Date().toISOString();
      const amount = data.qty * data.price;
      const profit = amount - (data.cost || 0) * data.qty;
      if (this.mode === 'sqlite') {
        const stmt = this.db.prepare(
          'INSERT INTO sales_v2 (date, product_code, product_name, qty, price, cost, amount, profit, channel, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        stmt.run(date, data.product_code, data.product_name || null, data.qty, data.price, data.cost || 0, amount, profit, data.channel || 'quick', created_at, function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
        stmt.finalize();
      } else {
        reject(new Error('Quick sale V2 requires SQLite mode'));
      }
    });
  }

  getQuickStatsV2() {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      if (this.mode === 'sqlite') {
        this.db.get(
          'SELECT COUNT(*) as count, COALESCE(SUM(qty), 0) as total_qty, COALESCE(SUM(amount), 0) as total FROM sales_v2 WHERE date = ?',
          [today],
          (err, row) => {
            if (err) reject(err);
            else resolve({ count: row.count, total: row.total, total_qty: row.total_qty });
          }
        );
      } else {
        resolve({ count: 0, total: 0, total_qty: 0 });
      }
    });
  }

  getQuickSalesHistoryV2(limit = 50) {
    return new Promise((resolve, reject) => {
      if (this.mode === 'sqlite') {
        this.db.all(
          'SELECT * FROM sales_v2 ORDER BY id DESC LIMIT ?',
          [limit],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      } else {
        resolve([]);
      }
    });
  }

  saveQuickSale(data) {
    return new Promise((resolve, reject) => {
      const date = new Date().toISOString().split('T')[0];
      const created_at = new Date().toISOString();
      if (this.mode === 'sqlite') {
        const stmt = this.db.prepare(
          'INSERT INTO sales_quick (date, product_code, qty, price, channel, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        );
        stmt.run(date, data.product_code, data.qty, data.price, data.channel || 'quick', created_at, function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
        stmt.finalize();
      } else {
        reject(new Error('Quick sale requires SQLite mode'));
      }
    });
  }

  getProductByCode(code) {
    return new Promise((resolve, reject) => {
      if (this.mode === 'sqlite') {
        this.db.get('SELECT * FROM products WHERE product_code = ?', [code], (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      } else {
        resolve(null);
      }
    });
  }

  saveProduct(data) {
    return new Promise((resolve, reject) => {
      if (this.mode === 'sqlite') {
        const stmt = this.db.prepare(
          'INSERT OR REPLACE INTO products (product_code, product_name, price, cost) VALUES (?, ?, ?, ?)'
        );
        stmt.run(data.product_code, data.product_name, data.price || 0, data.cost || 0, function(err) {
          if (err) reject(err);
          else resolve(true);
        });
        stmt.finalize();
      } else {
        reject(new Error('Product requires SQLite mode'));
      }
    });
  }

  getQuickStats() {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      if (this.mode === 'sqlite') {
        this.db.get(
          'SELECT COUNT(*) as count, COALESCE(SUM(qty), 0) as total_qty, COALESCE(SUM(price * qty), 0) as total FROM sales_quick WHERE date = ?',
          [today],
          (err, row) => {
            if (err) reject(err);
            else resolve({ count: row.count, total: row.total, total_qty: row.total_qty });
          }
        );
      } else {
        resolve({ count: 0, total: 0, total_qty: 0 });
      }
    });
  }

  getQuickSalesHistory(limit = 50) {
    return new Promise((resolve, reject) => {
      if (this.mode === 'sqlite') {
        this.db.all(
          'SELECT * FROM sales_quick ORDER BY id DESC LIMIT ?',
          [limit],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      } else {
        resolve([]);
      }
    });
  }

  saveSale(saleData) {
    return new Promise((resolve, reject) => {
      try {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        const sale = {
          id: data.sales.length + 1,
          ...saleData
        };
        data.sales.push(sale);
        fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
        console.log('Sale saved:', sale.invoiceNo);
        resolve(sale.id);
      } catch (error) {
        console.error('saveSale error:', error);
        reject(error);
      }
    });
  }

  getSalesHistory(filters = {}) {
    return new Promise((resolve, reject) => {
      try {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        let sales = data.sales || [];

        if (filters.startDate) {
          sales = sales.filter(s => s.createdDate >= filters.startDate);
        }
        if (filters.endDate) {
          sales = sales.filter(s => s.createdDate <= filters.endDate);
        }
        if (filters.customerName) {
          sales = sales.filter(s => s.customerName.includes(filters.customerName));
        }

        sales.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
        resolve(sales);
      } catch (error) {
        console.error('getSalesHistory error:', error);
        reject(error);
      }
    });
  }

  getNextInvoiceNo() {
    return new Promise((resolve, reject) => {
      try {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        const today = format(new Date(), 'yyyyMMdd');
        const todaySales = (data.sales || []).filter(s => s.createdDate && s.createdDate.replace(/-/g, '') === today);
        const count = todaySales.length + 1;
        const invoiceNo = `${today}${String(count).padStart(3, '0')}`;
        console.log('Generated invoice no:', invoiceNo);
        resolve(invoiceNo);
      } catch (error) {
        console.error('getNextInvoiceNo error:', error);
        reject(error);
      }
    });
  }

  getStats() {
    return new Promise((resolve, reject) => {
      try {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        const today = format(new Date(), 'yyyy-MM-dd');
        const thisMonth = format(new Date(), 'yyyy-MM');

        const todaySales = (data.sales || []).filter(s => s.createdDate === today);
        const monthSales = (data.sales || []).filter(s => s.createdDate.startsWith(thisMonth));

        const todayTotal = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const monthTotal = monthSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

        resolve({
          todayCount: todaySales.length,
          todayTotal: todayTotal,
          monthCount: monthSales.length,
          monthTotal: monthTotal
        });
      } catch (error) {
        console.error('getStats error:', error);
        reject(error);
      }
    });
  }
}

module.exports = Database;
