// excelWriter.js
// بيضيف الإعلانات الجديدة لملف إكسل. إذا الملف مش موجود بينشئه بالهيدرز،
// وإذا موجود بيفتحه ويزيد الصفوف الجديدة تحت (append) من غير ما يمسح القديم.

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const config = require('./config');

const COLUMNS = [
  { header: 'رابط الإعلان', key: 'url', width: 45 },
  { header: 'العنوان', key: 'title', width: 28 },
  { header: 'السعر', key: 'price', width: 16 },
  { header: 'المدينة', key: 'city', width: 12 },
  { header: 'نوع الوقود', key: 'fuel', width: 12 },
  { header: 'ناقل الحركة', key: 'transmission', width: 12 },
  { header: 'حجم المحرك', key: 'engineCc', width: 12 },
  { header: 'حالة الفحص', key: 'condition', width: 12 },
  { header: 'طريقة الدفع', key: 'payment', width: 14 },
  { header: 'مميز؟', key: 'featuredLabel', width: 8 },
  { header: 'رابط الصورة الرئيسية', key: 'imageUrl', width: 45 },

  // === أعمدة التفاصيل الكاملة (من صفحة الإعلان الداخلية) ===
  { header: 'الوصف الكامل', key: 'description', width: 50 },
  { header: 'رقم الإعلان', key: 'listingNumber', width: 14 },
  { header: 'تاريخ النشر', key: 'publishDate', width: 18 },
  { header: 'عدد المشاهدات', key: 'viewCount', width: 14 },
  { header: 'أصل السيارة', key: 'origin', width: 14 },
  { header: 'نوع الغيار (تفصيلي)', key: 'gearType', width: 14 },
  { header: 'الوقود (تفصيلي)', key: 'fuelDetail', width: 14 },
  { header: 'حجم المحرك (تفصيلي)', key: 'engineCcDetail', width: 16 },
  { header: 'عداد السيارة', key: 'mileage', width: 16 },
  { header: 'نوع القيادة', key: 'driveType', width: 12 },
  { header: 'عدد الملاك', key: 'ownerCount', width: 16 },
  { header: 'لون السيارة', key: 'color', width: 12 },
  { header: 'لون الداخلية', key: 'interiorColor', width: 14 },
  { header: 'حالة الدهان', key: 'paintCondition', width: 14 },
  { header: 'حالة الداخلية', key: 'interiorCondition', width: 14 },
  { header: 'استهلاك المدينة (كم/لتر)', key: 'fuelEconomyCity', width: 18 },
  { header: 'استهلاك الطريق السريع (كم/لتر)', key: 'fuelEconomyHighway', width: 20 },

  { header: 'تاريخ السحب', key: 'scrapedAt', width: 20 },
];

async function appendListingsToExcel(listings) {
  const filePath = path.resolve(__dirname, config.EXCEL_FILE);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  let sheet;

  if (fs.existsSync(filePath)) {
    await workbook.xlsx.readFile(filePath);
    sheet = workbook.getWorksheet('الإعلانات');
    if (!sheet) {
      sheet = workbook.addWorksheet('الإعلانات');
    }
  } else {
    sheet = workbook.addWorksheet('الإعلانات');
  }

  // *** هاد هو التصليح الأساسي ***
  // لازم نربط أسماء الأعمدة (key) بالشيت في كل مرة، سواء كان الشيت جديد
  // أو محمّل من ملف موجود من قبل. من غير هاد السطر، addRow(object) ما
  // بيعرف يحط كل قيمة بعمودها الصحيح لما الملف يكون موجود مسبقاً،
  // وبيضيف صفوف فاضية بدل البيانات الحقيقية (وهاي كانت المشكلة بالضبط).
  sheet.columns = COLUMNS;
  if (!sheet.views || sheet.views.length === 0) {
    sheet.views = [{ rightToLeft: true }];
  }

  for (const item of listings) {
    sheet.addRow({
      ...item,
      featuredLabel: item.featured ? 'نعم' : 'لا',
      scrapedAt: new Date().toLocaleString('ar-EG'),
    });
  }

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

module.exports = { appendListingsToExcel };