const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = '/Users/seritahirokazu/Library/Application Support/yamato-b2-app/sales.db';
const filePath = path.join(__dirname, '..', 'products.tsv');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      product_code TEXT PRIMARY KEY,
      product_name TEXT,
      price INTEGER,
      cost INTEGER
    )
  `);

  if (!fs.existsSync(filePath)) {
    console.error('❌ products.tsv が見つかりません');
    db.close();
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');

  if (lines.length < 2) {
    console.error('❌ データがありません');
    db.close();
    process.exit(1);
  }

  const dataLines = lines.slice(1);

  db.run('BEGIN TRANSACTION');

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO products
    (product_code, product_name, price, cost)
    VALUES (?, ?, ?, ?)
  `);

  let count = 0;

  for (const line of dataLines) {
    const [code, name, price, cost] = line.split('\t');

    if (!code) continue;

    stmt.run(
      code.trim(),
      (name || '').trim(),
      parseInt(price) || 0,
      parseInt(cost) || 0
    );

    count++;
  }

  stmt.finalize();

  db.run('COMMIT', () => {
    console.log(`✅ 商品マスタ取込完了: ${count}件`);
    db.close();
  });
});