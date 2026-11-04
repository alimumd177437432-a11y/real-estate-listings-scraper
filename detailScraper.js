// detailScraper.js
// بيدخل على صفحة الإعلان الداخلية لحاله (مثلاً /listings/seat-ibiza-2017-2/)
// وبيسحب كل التفاصيل الإضافية الموجودة بس جوا تلك الصفحة:
// الوصف الكامل، اللون، العداد، نوع القيادة، عدد الملاك، حالة الدهان
// والداخلية، استهلاك الوقود، رقم الإعلان، تاريخ النشر، عدد المشاهدات.
//
// نفس فكرة scraper.js: الاستخراج معتمد على الكلمات والنصوص الظاهرة
// (labels) مش على أسماء كلاسات CSS، حتى يضل شغال حتى لو تصميم
// الموقع تغيّر شوي.

const config = require('./config');

async function extractListingDetails(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await page.waitForSelector('body', { timeout: 15000 });

    const raw = await page.evaluate(() => document.body.innerText || '');

    const grab = (regex) => {
      const m = raw.match(regex);
      return m ? m[1].trim() : '';
    };

    const listingNumber = grab(/إعلان\s*#\s*(\d+)/);
    const publishDate = grab(/نُشر في\s*:\s*([^\n]+)/);
    const viewCount = grab(/مشاهدة\s*:\s*([\d,٬]+)/);

    const engineCcDetail = grab(/([\d,٬]+)\s*\(CC\)\s*حجم المحرك/);
    const origin = grab(/(خصوصي|عمومي|حكومي|تأجير|تدريب)\s*أصل السيارة/);
    const gearType = grab(/(اوتومات|عادي)\s*نوع الغيار/);
    const fuelDetail = grab(/(بنزين|ديزل|كهربائي|هايبرد)\s*الوقود/);
    const mileage = grab(/([\d,٬]+\s*\(\+\s*كم\))\s*عداد السيارة/);
    const driveType = grab(/(أمامي|خلفي|رباعي)\s*نوع القيادة/);
    const ownerCount = grab(/(المالك\s*\S+)\s*مالك/);

    const color = grab(/لون السيارة:\s*([^\n]+)/);
    const interiorColor = grab(/داخلية السيارة:\s*([^\n]+)/);
    const paintCondition = grab(/حالة الدهان:\s*([^\n]+)/);
    const interiorCondition = grab(/حالة الداخلية:\s*([^\n]+)/);

    const fuelEconomyCity = grab(/(\d+)\s*داخل المدينة كم\s*\/\s*لتر/);
    const fuelEconomyHighway = grab(/(\d+)\s*خارجي\s*\/\s*سفر كم\s*\/\s*لتر/);

    // الوصف الحر يلي كاتبه صاحب الإعلان - موجود تحت عنوان "تفاصيل الإعلان"
    // وقبل قسم "روابط مفيدة" (أو "المعلن" لو ماكانش في روابط مفيدة)
    let description = grab(/تفاصيل الإعلان\s*([\s\S]{0,2000}?)\s*روابط مفيدة/);
    if (!description) {
      description = grab(/تفاصيل الإعلان\s*([\s\S]{0,1500}?)\s*(?:المعلن|اعلانات مماثلة)/);
    }

    return {
      listingNumber,
      publishDate,
      viewCount,
      engineCcDetail,
      origin,
      gearType,
      fuelDetail,
      mileage,
      driveType,
      ownerCount,
      color,
      interiorColor,
      paintCondition,
      interiorCondition,
      fuelEconomyCity,
      fuelEconomyHighway,
      description,
    };
  } catch (err) {
    console.error(`⚠️  فشل جلب تفاصيل الإعلان ${url}: ${err.message}`);
    return {}; // إذا فشل، منرجع كائن فاضي حتى الأعمدة تضل موجودة بس فاضية، وما يوقف باقي السحب
  }
}

module.exports = { extractListingDetails };