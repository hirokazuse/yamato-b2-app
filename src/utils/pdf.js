const PDFDocument = require('pdfkit');
const fs = require('fs');
const { format, parse } = require('date-fns');
const { ja } = require('date-fns/locale');

const SHIPPER_INFO = {
  name: 'アジアンネットショップラマニ',
  address: '千葉県四街道市和良比278-2',
  phone: '0432358546'
};

function generateInvoicePDF(saleData, filePath) {
  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);

  doc
    .font('Courier')
    .fontSize(20)
    .text('納品書（控）', { align: 'center' })
    .fontSize(10);

  doc.moveTo(30, 80).lineTo(550, 80).stroke();

  const createdDate = parse(saleData.createdDate, 'yyyy-MM-dd', new Date());
  const dateStr = format(createdDate, 'yyyy年M月d日', { locale: ja });
  
  doc.fontSize(10);
  doc.text(`日付: ${dateStr}`, 60, 90);
  doc.text(`No. ${saleData.invoiceNo}`, 400, 90);

  doc.fontSize(12).text(saleData.customerName + ' 様', 60, 130);
  doc.fontSize(10).text('登録番号: Correct', 60, 150);

  doc.moveTo(30, 180).lineTo(550, 180).stroke();

  const tableTop = 200;
  const colWidths = { name: 280, quantity: 60, price: 90, amount: 90 };
  const colPositions = {
    name: 40,
    quantity: colWidths.name + 50,
    price: colWidths.name + 120,
    amount: colWidths.name + 210
  };

  doc.fontSize(10).font('Courier-Bold');
  doc.text('品名', colPositions.name, tableTop);
  doc.text('数量', colPositions.quantity, tableTop);
  doc.text('単価', colPositions.price, tableTop);
  doc.text('金額', colPositions.amount, tableTop);

  doc.moveTo(30, tableTop + 20).lineTo(550, tableTop + 20).stroke();

  doc.font('Courier');
  let currentY = tableTop + 30;
  const itemHeight = 40;

  saleData.items.forEach((item, index) => {
    doc.fontSize(9);
    doc.text(item.productName, colPositions.name, currentY, { width: colWidths.name });
    doc.text(item.quantity.toString(), colPositions.quantity, currentY, { align: 'right' });
    doc.text(item.unitPrice.toLocaleString(), colPositions.price, currentY, { align: 'right' });
    doc.text(item.amount.toLocaleString() + '-', colPositions.amount, currentY, { align: 'right' });

    currentY += itemHeight;
  });

  currentY += 10;
  doc.moveTo(30, currentY).lineTo(550, currentY).stroke();

  currentY += 15;
  doc.fontSize(10).font('Courier-Bold');
  doc.text('小計', 320, currentY);
  doc.text(saleData.subtotal.toLocaleString() + '-', colPositions.amount, currentY, { align: 'right' });

  currentY += 20;
  doc.text('消費税（10%）', 320, currentY);
  doc.text(saleData.tax.toLocaleString() + '-', colPositions.amount, currentY, { align: 'right' });

  currentY += 25;
  doc.font('Courier-Bold').fontSize(12);
  doc.text('合計金額', 320, currentY);
  doc.text(saleData.totalAmount.toLocaleString() + '-', colPositions.amount - 40, currentY, { align: 'right' });

  currentY += 40;
  doc.fontSize(10).font('Courier');
  const shippingMethodLabel = saleData.shippingMethod === 'コレクト' ? 'コレクト（代金引換）' : '発払い';
  doc.text(shippingMethodLabel, 60, currentY);

  doc.moveTo(30, currentY + 25).lineTo(550, currentY + 25).stroke();

  currentY += 45;
  doc.fontSize(10).font('Courier-Bold');
  doc.text(SHIPPER_INFO.name, 60, currentY);
  doc.fontSize(9).font('Courier');
  currentY += 20;
  doc.text(SHIPPER_INFO.address, 60, currentY);
  currentY += 15;
  doc.text('TEL: ' + SHIPPER_INFO.phone, 60, currentY);

  doc.end();

  return new Promise((resolve) => {
    stream.on('finish', () => {
      resolve(filePath);
    });
  });
}

module.exports = { generateInvoicePDF };
