// scraper.js
// المسؤول عن فتح متصفح حقيقي (Puppeteer)، تصفح الصفحة، واستخراج بيانات كل إعلان
// السبب باستخدام متصفح حقيقي: الترقيم بين الصفحات بموقع cars4sale.ps شغال
// بجافاسكريبت (AJAX) مش بروابط URL عادية، فما بينفع نجيب الصفحات التالية
// بطلب HTTP بسيط، لازم نحاكي مستخدم حقيقي بينقر "التالي".

const puppeteer = require('puppeteer');
const config = require('./config');

async function launchBrowser() {
  return puppeteer.launch({
    headless: config.HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

/**
 * استخراج كل بطاقات الإعلانات الظاهرة حالياً بالصفحة
 * الطريقة معتمدة على الكلمات والنصوص الظاهرة (مو على أسماء كلاسات CSS)
 * عشان تضل شغالة حتى لو الموقع غيّر تصميمه شوي
 */
async function extractCurrentPageListings(page) {
  return page.evaluate(() => {
    const CITIES = ['نابلس', 'رام الله', 'الخليل', 'القدس', 'بيت لحم', 'جنين', 'سلفيت', 'طوباس', 'طولكرم', 'غزة', 'قلقيلية', 'أريحا'];
    const FUELS = ['بنزين', 'ديزل', 'كهربائي', 'هايبرد'];
    const TRANSMISSIONS = ['اوتومات', 'عادي'];

    const anchors = Array.from(document.querySelectorAll('a[href*="/listings/"]'));
    const seenHrefs = new Set();
    const cards = [];

    for (const a of anchors) {
      const href = a.getAttribute('href');
      if (!href || seenHrefs.has(href)) continue;

      // نطلع بالشجرة لفوق لحد ما نلاقي الحاوية اللي فيها صورة + سعر
      // (كل إعلان بيتكرر رابطه مرتين: مرة عالصورة ومرة عالعنوان، فبنوحدهم بنفس الحاوية)
      let container = a.closest('article') || a.parentElement;
      let hops = 0;
      while (container && hops < 6) {
        const text = container.textContent || '';
        const hasImg = !!container.querySelector('img');
        const hasPrice = text.includes('₪') || text.includes('السعر عند الاتصال');
        if (hasImg && hasPrice) break;
        container = container.parentElement;
        hops++;
      }
      if (!container) continue;

      seenHrefs.add(href);

      const text = container.textContent.replace(/\s+/g, ' ').trim();

      let title = (a.textContent || '').trim();
      if (!title) {
        const img = container.querySelector('img');
        title = img ? (img.getAttribute('alt') || '') : '';
      }

      // الصورة: أول img حقيقية جوا الحاوية (نتجاهل placeholder)
      const imgs = Array.from(container.querySelectorAll('img'));
      let imageUrl = '';
      for (const img of imgs) {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        if (src && !src.includes('placeholder') && !src.includes('logo')) {
          imageUrl = src;
          break;
        }
      }

      let price = '';
      const priceMatch = text.match(/([\d,٬]+)\s*₪/);
      if (priceMatch) {
        price = priceMatch[0];
      } else if (text.includes('السعر عند الاتصال')) {
        price = 'السعر عند الاتصال';
      }

      let city = '';
      for (const c of CITIES) {
        if (text.includes(c)) { city = c; break; }
      }

      let fuel = '';
      for (const f of FUELS) {
        if (text.includes(f)) { fuel = f; break; }
      }

      let transmission = '';
      for (const t of TRANSMISSIONS) {
        if (text.includes(t)) { transmission = t; break; }
      }

      let engineCc = '';
      const ccMatch = text.match(/(\d{3,5})\s*cc/i);
      if (ccMatch) engineCc = ccMatch[1] + ' cc';

      let condition = '';
      const condMatch = text.match(/فحص\s+(نخب|ممتاز|جيد|مقبول|شطب)/);
      if (condMatch) condition = condMatch[0];

      let payment = '';
      if (text.includes('كاش/نقداً')) payment = 'كاش/نقداً';
      else if (text.includes('قابل للتقسيط')) payment = 'قابل للتقسيط';

      const featured = text.includes('مميز');

      cards.push({
        url: href.startsWith('http') ? href : ('https://www.cars4sale.ps' + href),
        title,
        price,
        city,
        fuel,
        transmission,
        engineCc,
        condition,
        payment,
        featured,
        imageUrl,
      });
    }

    return cards;
  });
}

/**
 * بينقر على زر "التالي" وينتظر لحد ما تتغير محتويات الصفحة فعلياً
 * بيرجع true إذا نجح الانتقال، false إذا ما في صفحة تالية أو صار تايم-أوت
 */
async function clickNextPage(page) {
  const beforeSignature = await page.evaluate(() => {
    const as = Array.from(document.querySelectorAll('a[href*="/listings/"]'));
    return as.slice(0, 3).map((a) => a.getAttribute('href')).join('|');
  });

  const clicked = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const nextLink = links.find((a) => (a.textContent || '').trim() === 'التالي');
    if (!nextLink) return false;
    const cls = nextLink.className || '';
    if (cls.includes('disabled')) return false;
    nextLink.click();
    return true;
  });

  if (!clicked) return false;

  try {
    await page.waitForFunction(
      (prevSig) => {
        const as = Array.from(document.querySelectorAll('a[href*="/listings/"]'));
        const sig = as.slice(0, 3).map((a) => a.getAttribute('href')).join('|');
        return sig && sig !== prevSig;
      },
      { timeout: 15000 },
      beforeSignature
    );
  } catch (e) {
    return false; // ما تغير شي خلال 15 ثانية - غالباً آخر صفحة
  }

  return true;
}

/**
 * الدالة الرئيسية: بتجمع إعلانات جديدة (مو موجودة بـ seenSet) لحد ما توصل targetCount
 * أو توصل لآخر صفحة أو أقصى عدد صفحات مسموح
 */
async function collectNewListings(seenSet, targetCount) {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
  );

  await page.goto(config.SEARCH_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('a[href*="/listings/"]', { timeout: 30000 });

  const collected = [];
  let pagesVisited = 0;

  while (collected.length < targetCount && pagesVisited < config.MAX_PAGES_TO_VISIT) {
    pagesVisited++;
    const pageListings = await extractCurrentPageListings(page);

    for (const item of pageListings) {
      if (collected.length >= targetCount) break;
      if (seenSet.has(item.url)) continue;
      if (collected.some((c) => c.url === item.url)) continue;
      collected.push(item);
    }

    console.log(
      `📄 صفحة ${pagesVisited}: لقينا ${pageListings.length} إعلان بالصفحة، الجديد التراكمي: ${collected.length}/${targetCount}`
    );

    if (collected.length >= targetCount) break;

    const moved = await clickNextPage(page);
    if (!moved) {
      console.log('⛔ ما قدرنا ننتقل لصفحة تالية (يمكن آخر صفحة) - وقفنا هون.');
      break;
    }
    await new Promise((r) => setTimeout(r, config.DELAY_BETWEEN_PAGES_MS));
  }

  // ملاحظة: ما بنسكر المتصفح هون عن قصد - رح نعيد استخدام نفس الصفحة (page)
  // بعدين حتى ندخل على كل إعلان لحاله ونجيب تفاصيله (أسرع من فتح متصفح جديد كل مرة)
  return { browser, page, listings: collected };
}

module.exports = { collectNewListings, extractCurrentPageListings, clickNextPage };