// index.js
// شغّل هاد الملف يدوياً كل مرة بدك تسحب فيها 50 إعلان جديد بكل تفاصيلهم:
//   node index.js
// أو:
//   npm run scrape

const config = require('./config');
const { loadSeen, saveSeen } = require('./store');
const { collectNewListings } = require('./scraper');
const { extractListingDetails } = require('./detailScraper');
const { appendListingsToExcel } = require('./excelWriter');

async function main() {
  console.log('🚀 بدء عملية السحب من cars4sale.ps ...');

  const seen = loadSeen();
  console.log(`ℹ️  عدد الإعلانات المسحوبة بمرات سابقة (رح نتجاهلها): ${seen.size}`);

  // المرحلة 1: نجمع 50 رابط إعلان جديد من صفحة القائمة (زي ما كان قبل)
  const { browser, page, listings: newListings } = await collectNewListings(seen, config.TARGET_COUNT);

  if (newListings.length === 0) {
    console.log('❌ ما لقينا ولا إعلان جديد. الاحتمالات:');
    console.log('   1) كل الإعلانات المتاحة حالياً انسحبت قبل هيك.');
    console.log('   2) الموقع غيّر تصميمه (جرب HEADLESS:false بالـ config وشوف شو صاير).');
    console.log('   3) في مشكلة اتصال بالإنترنت.');
    await browser.close();
    return;
  }

  // المرحلة 2 (جديدة): ندخل على كل إعلان لحاله ونجيب كل تفاصيله الكاملة
  console.log(`🔎 رح ندخل على كل إعلان لحاله ونجيب تفاصيله الكاملة (${newListings.length} إعلان)...`);
  console.log('   ⏳ هاي الخطوة أبطأ من قبل لأنها بتفتح صفحة لكل إعلان لحاله، خليك صبور.');

  for (let i = 0; i < newListings.length; i++) {
    const item = newListings[i];
    console.log(`   📃 (${i + 1}/${newListings.length}) ${item.title || item.url}`);
    const details = await extractListingDetails(page, item.url);
    Object.assign(item, details);
    await new Promise((r) => setTimeout(r, config.DELAY_BETWEEN_PAGES_MS));
  }

  await browser.close();

  // المرحلة 3: نكتب كل شي بملف الإكسل (بدون أي تحميل صور - الصورة الرئيسية بتضل رابط بس)
  const excelPath = await appendListingsToExcel(newListings);

  // بنعلّم الإعلانات كـ "مسحوبة" بس بعد ما نتأكد إنه كل شي انكتب بنجاح بالإكسل
  for (const item of newListings) {
    seen.add(item.url);
  }
  saveSeen(seen);

  console.log('──────────────────────────────────────────');
  console.log(`✅ تم بنجاح! انسحب ${newListings.length} إعلان جديد مع كامل تفاصيله، وانضافوا لملف الإكسل.`);
  console.log(`📊 ملف الإكسل: ${excelPath}`);
  console.log(`🗂️  إجمالي الإعلانات المحفوظة بسجل "تم سحبها" (لن تتكرر مستقبلاً): ${seen.size}`);
}

main().catch((err) => {
  console.error('💥 صار خطأ غير متوقع أثناء التشغيل:');
  console.error(err);
  process.exit(1);
});