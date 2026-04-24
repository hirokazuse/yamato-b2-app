const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');

function generateB2CSV(sales, filePath) {
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'customerManagementNo', title: 'お客様管理番号' },
      { id: 'shippingType', title: '送り状種類' },
      { id: 'coolCategory', title: 'クール区分' },
      { id: 'shippingDate', title: '出荷予定日' },
      { id: 'timeSlot', title: '配達時間帯' },
      { id: 'recipientPhone', title: 'お届け先電話番号' },
      { id: 'recipientPostalCode', title: 'お届け先郵便番号' },
      { id: 'recipientAddress', title: 'お届け先住所' },
      { id: 'recipientApartment', title: 'お届け先アパートマンション名' },
      { id: 'recipientName', title: 'お届け先名' },
      { id: 'shipperPhone', title: 'ご依頼主電話番号' },
      { id: 'shipperPostalCode', title: 'ご依頼主郵便番号' },
      { id: 'shipperAddress', title: 'ご依頼主住所' },
      { id: 'shipperName', title: 'ご依頼主名' },
      { id: 'productName', title: '品名１' },
      { id: 'collectAmount', title: 'ｺﾚｸﾄ代金引換額（税込)' },
      { id: 'taxAmount', title: '内消費税額等' }
    ],
    encoding: 'utf8'
  });

  const SHIPPER_PHONE = '0432358546';
  const SHIPPER_POSTAL = '2840044';
  const SHIPPER_ADDRESS = '千葉県四街道市和良比278-2';
  const SHIPPER_NAME = 'アジアンネットショップラマニ';

  const records = sales.map(sale => {
    const shippingType = sale.shipping_method === 'コレクト' ? '2' : '0';
    const shippingDate = sale.created_date.replace(/-/g, '/');
    const fullAddress = `${sale.prefecture}${sale.city}${sale.address}`;
    
    return {
      customerManagementNo: sale.invoice_no,
      shippingType: shippingType,
      coolCategory: '0',
      shippingDate: shippingDate,
      timeSlot: '',
      recipientPhone: sale.phone,
      recipientPostalCode: sale.postal_code.replace(/-/g, ''),
      recipientAddress: fullAddress,
      recipientApartment: '',
      recipientName: sale.customer_name,
      shipperPhone: SHIPPER_PHONE,
      shipperPostalCode: SHIPPER_POSTAL,
      shipperAddress: SHIPPER_ADDRESS,
      shipperName: SHIPPER_NAME,
      productName: sale.items && sale.items.length > 0 ? sale.items[0].product_name : '',
      collectAmount: shippingType === '2' ? sale.total_amount.toString() : '',
      taxAmount: shippingType === '2' ? sale.tax.toString() : ''
    };
  });

  return csvWriter.writeRecords(records);
}

function generateFullCSV(sales, filePath) {
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'invoice_no', title: '納品書番号' },
      { id: 'created_date', title: '出荷日' },
      { id: 'customer_name', title: '顧客名' },
      { id: 'postal_code', title: '郵便番号' },
      { id: 'prefecture', title: '都道府県' },
      { id: 'city', title: '市区町村' },
      { id: 'address', title: '番地' },
      { id: 'phone', title: '電話番号' },
      { id: 'shipping_method', title: '配送方法' },
      { id: 'subtotal', title: '小計' },
      { id: 'tax', title: '消費税' },
      { id: 'total_amount', title: '合計金額' },
      { id: 'product_names', title: '商品' },
      { id: 'quantities', title: '数量' },
      { id: 'unit_prices', title: '単価' },
      { id: 'amounts', title: '金額' },
      { id: 'memo', title: 'メモ' }
    ],
    encoding: 'utf8'
  });

  const records = sales.map(sale => {
    const items = sale.items || [];
    return {
      invoice_no: sale.invoice_no,
      created_date: sale.created_date,
      customer_name: sale.customer_name,
      postal_code: sale.postal_code,
      prefecture: sale.prefecture,
      city: sale.city,
      address: sale.address,
      phone: sale.phone,
      shipping_method: sale.shipping_method,
      subtotal: sale.subtotal,
      tax: sale.tax,
      total_amount: sale.total_amount,
      product_names: items.map(i => i.product_name).join(' / '),
      quantities: items.map(i => i.quantity).join(' / '),
      unit_prices: items.map(i => i.unit_price).join(' / '),
      amounts: items.map(i => i.amount).join(' / '),
      memo: sale.memo || ''
    };
  });

  return csvWriter.writeRecords(records);
}

module.exports = {
  generateB2CSV,
  generateFullCSV
};
