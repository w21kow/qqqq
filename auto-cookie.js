const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

puppeteer.use(StealthPlugin());

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateFingerprint() {
  const screens = [
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1280, height: 800 }
  ];
  const screen = screens[Math.floor(Math.random() * screens.length)];
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  ];
  const platforms = ['Win32', 'Win64', 'Intel Mac OS X', 'X11; Linux x86_64'];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  return {
    userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
    viewport: screen,
    platform: platform
  };
}

// advanced mouse movement with bezier curve
async function humanMouseMove(page, startX, startY, endX, endY) {
  const steps = Math.floor(Math.random() * 25) + 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const x = startX + (endX - startX) * easeT + (Math.random() - 0.5) * 3;
    const y = startY + (endY - startY) * easeT + (Math.random() - 0.5) * 3;
    await page.mouse.move(x, y);
    await delay(Math.random() * 2 + 1);
  }
}

async function humanScroll(page) {
  const scrolls = Math.floor(Math.random() * 4) + 2;
  for (let i = 0; i < scrolls; i++) {
    const amount = Math.random() * 300 + 80;
    const steps = Math.floor(Math.random() * 8) + 4;
    for (let j = 0; j < steps; j++) {
      await page.evaluate((amt) => { window.scrollBy(0, amt / 5); }, amount);
      await delay(Math.random() * 30 + 15);
    }
    await delay(Math.random() * 600 + 200);
  }
}


async function setupAdvancedStealth(page) {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = {
      runtime: {},
      loadTimes: () => ({}),
      csi: () => ({}),
      app: {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' }
      }
    };
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format', enabledPlugin: Plugin },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', enabledPlugin: Plugin },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '', enabledPlugin: Plugin }
      ]
    });
    Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en-US', 'en'] });
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      if (type === 'image/png' && this.width === 280 && this.height === 60) {
        const context = this.getContext('2d');
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] ^= Math.floor(Math.random() * 3);
        }
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, arguments);
    };
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      if (param === 37445) return 'Intel Inc.';
      if (param === 37446) return 'Intel Iris OpenGL Engine';
      return getParameter.apply(this, arguments);
    };
    const audioContext = window.AudioContext || window.webkitAudioContext;
    if (audioContext) {
      const originalCreateOscillator = audioContext.prototype.createOscillator;
      audioContext.prototype.createOscillator = function() {
        const oscillator = originalCreateOscillator.apply(this, arguments);
        const originalStart = oscillator.start;
        oscillator.start = function() {
          const noise = Math.random() * 0.0001;
          arguments[0] += noise;
          return originalStart.apply(this, arguments);
        };
        return oscillator;
      };
    }
    Object.defineProperty(screen, 'availWidth', { get: () => window.innerWidth });
    Object.defineProperty(screen, 'availHeight', { get: () => window.innerHeight });
    if (navigator.getBattery) {
      navigator.getBattery = () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true
      });
    }
    if (navigator.connection) {
      Object.defineProperty(navigator.connection, 'rtt', { get: () => 50 });
      Object.defineProperty(navigator.connection, 'downlink', { get: () => 10 });
      Object.defineProperty(navigator.connection, 'effectiveType', { get: () => '4g' });
    }
    delete navigator.__proto__.webdriver;
    const originalToString = Function.prototype.toString;
    Function.prototype.toString = function() {
      if (this === navigator.permissions.query) {
        return 'function query() { [native code] }';
      }
      return originalToString.apply(this, arguments);
    };
  });
}


async function solveTurnstile(page) {
  const turnstile = await page.$('input[type="checkbox"][name="cf-turnstile-response"]');
  if (turnstile) {
    const box = await turnstile.boundingBox();
    if (box) {
      await humanMouseMove(page, 100, 100, box.x + box.width / 2, box.y + box.height / 2);
      await delay(Math.random() * 300 + 200);
      await turnstile.click({ delay: Math.random() * 100 + 50 });
      await delay(2000);
    }
  }
}


async function solveCaptcha(page) {
  const captchaButtons = await page.$$('button, input[type="submit"], .btn', '.button', '.btn');
  for (const btn of captchaButtons) {
    try {
      const box = await btn.boundingBox();
      if (box) {
        await humanMouseMove(page, 100, 100, box.x + box.width / 2, box.y + box.height / 2);
        await delay(Math.random() * 200 + 100);
        await btn.click({ delay: Math.random() * 100 + 50 });
        await delay(2000);
        return true;
      }
    } catch (e) {

    }
  }
  return false;
}


async function handleChallenge(page, maxWait = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const isChallenge = await page.evaluate(() => {
        const title = document.title.toLowerCase();
        const body = document.body ? document.body.innerText.toLowerCase() : '';
        return title.includes('just a moment') || title.includes('checking your browser') ||
               body.includes('checking your browser') || body.includes('cloudflare') ||
               document.querySelector('#challenge-form') !== null ||
               document.querySelector('.cf-browser-verification') !== null ||
               document.querySelector('#cf-wrapper') !== null ||
               document.querySelector('input[name="cf-turnstile-response"]') !== null ||
               document.querySelector('input[name="g-recaptcha-response"]') !== null ||
               document.querySelector('iframe[title="recaptcha"]') !== null;
      });
      if (!isChallenge) return true;
      await delay(1000);
    } catch (e) {
      await delay(1000);
    }
  }
  return false;
}


async function handleNetplacesChallenge(page) {
  await delay(8000);
  

  const isChallenge = await page.evaluate(() => {
    const title = document.title.toLowerCase();
    return title.includes('just a moment') || 
           title.includes('checking your browser') ||
           document.querySelector('.cf-challenge') ||
           document.querySelector('.cf-browser-verification') ||
           document.querySelector('input[name="cf-turnstile-response"]') ||
           document.querySelector('input[name="g-recaptcha-response"]');
  });
  
  if (isChallenge) {
    console.log('Netplaces.ru challenge detected, solving...');
    

    const challengeElements = await page.$$('input[type="checkbox"], button, .btn, .button');
    
    for (const element of challengeElements) {
      try {
        const box = await element.boundingBox();
        if (box) {

          await humanMouseMove(page, 100, 100, box.x + box.width / 2, box.y + box.height / 2);
          await delay(Math.random() * 200 + 100);
          

          if (element.type === 'checkbox' || element.tagName === 'BUTTON') {
            await element.click({ delay: Math.random() * 100 + 50 });
            await delay(2000);
          } else {
            await element.hover().catch(() => {});
            await delay(Math.random() * 300 + 100);
          }
        }
      } catch (e) {

      }
    }
    

    await delay(10000);
  }
}


async function getCookies(url, options = {}) {
  const {
    headless = true,
    timeout = 120000,
    waitFor = 8000,
    userAgent = null,
    proxy = null,
    solveCaptcha = false,
    solveTurnstile = false
  } = options;

  const safeTimeout = Number.isFinite(timeout) && timeout > 0 ? timeout : 120000;
  const safeWaitFor = Number.isFinite(waitFor) && waitFor > 0 ? waitFor : 8000;
  const fingerprint = generateFingerprint();
  const finalUserAgent = userAgent || fingerprint.userAgent;

  let browser;
  let cookies = null;

  try {
    const launchOptions = {
      headless: headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
        `--window-size=${fingerprint.viewport.width},${fingerprint.viewport.height}`,
        '--disable-infobars',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-networking',
        '--disable-breakpad',
        '--disable-component-extensions-with-background-pages',
        '--disable-extensions',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
        '--disable-ipc-flooding-protection',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--no-first-run',
        '--enable-automation=false',
        '--password-store=basic',
        '--use-mock-keychain',
        '--no-service-autorun',
        '--export-tagged-pdf',
        '--no-pings',
        '--no-default-browser-check',
        '--no-experiments',
        '--disable-default-apps',
        '--mute-audio',
        '--no-zygote',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-gpu-compositing',
        '--disable-software-rasterizer',
        ...(proxy ? [`--proxy-server=${proxy}`] : [])
      ],
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ['--enable-automation']
    };

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();


    await setupAdvancedStealth(page);


    await page.setUserAgent(finalUserAgent);
    await page.setViewport({
      width: fingerprint.viewport.width,
      height: fingerprint.viewport.height,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false
    });


    const chromeVersion = finalUserAgent.match(/Chrome\/(\d+)/)?.[1] || '129';
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Sec-CH-UA': `"Chromium";v="${chromeVersion}", "Not;A=Brand";v="99", "Google Chrome";v="${chromeVersion}"`,
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': `"${fingerprint.platform}"`,
      'Cache-Control': 'max-age=0',
      'DNT': '1'
    });


    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();
      if (resourceType === 'image' && !url.includes('captcha') && !url.includes('challenge')) {
        request.abort();
      } else if (resourceType === 'font') {
        request.abort();
      } else if (resourceType === 'media') {
        request.abort();
      } else if (url.includes('google-analytics') || url.includes('googletagmanager') ||
                 url.includes('facebook.com/tr') || url.includes('doubleclick.net')) {
        request.abort();
      } else {
        request.continue();
      }
    });


    let navigationSuccess = false;
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: safeTimeout
      });
      navigationSuccess = true;
    } catch (error) {
      if (error?.name === 'TimeoutError') {
        console.warn('timeout на domcontentloaded, пробую networkidle2');
        try {
          await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: safeTimeout
          });
          navigationSuccess = true;
        } catch (e) {
          console.warn('timeout на networkidle2, продолжаю с текущим состоянием');
          navigationSuccess = true;
        }
      } else {
        throw error;
      }
    }

    if (!navigationSuccess) {
      throw new Error('не удалось загрузить страницу');
    }


    if (url.includes('netplaces.ru')) {
      console.log('Обработка netplaces.ru...');
      await handleNetplacesChallenge(page);
    }


    await delay(2000);

    // Solve challenges
    const cfHandled = await handleChallenge(page, 30000);
    if (cfHandled) {
      console.log('Cloudflare challenge обработан');
    }
    if (solveTurnstile) {
      await solveTurnstile(page);
    }
    if (solveCaptcha) {
      const solved = await solveCaptcha(page);
      if (!solved) {
        console.warn('не удалось решить captcha');
      }
    }


    const startX = Math.random() * 200 + 100;
    const startY = Math.random() * 200 + 100;
    const endX = Math.random() * 800 + 400;
    const endY = Math.random() * 600 + 300;
    await humanMouseMove(page, startX, startY, endX, endY);
    await delay(Math.random() * 500 + 300);
    await humanScroll(page);

    await delay(Math.max(safeWaitFor, 5000));

    const stillOnChallenge = await page.evaluate(() => {
      const title = document.title.toLowerCase();
      return title.includes('just a moment') || title.includes('checking your browser');
    });
    if (stillOnChallenge) {
      console.warn('все еще на challenge странице, жду еще');
      await delay(5000);
    }

    // Get cookies
    const pageCookies = await page.cookies();
    if (pageCookies.length > 0) {
      cookies = pageCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    }

    await browser.close();
    return cookies;

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

// save cookies to file
function saveCookiesToFile(cookies, filename = 'cookies.txt') {
  try {
    fs.writeFileSync(filename, cookies, 'utf8');
    console.log(`Cookies сохранены в ${filename}`);
    return true;
  } catch (error) {
    console.error('Ошибка при сохранении cookies:', error.message);
    return false;
  }
}

// main function for vorota-zabor-dn.ru
async function getVorotaCookies(saveToFile = false) {
  const url = 'https://vorota-zabor-dn.ru/';
  try {
    console.log('Начинаю получение cookies с', url);
    const cookies = await getCookies(url, {
      headless: true,
      timeout: 30000,
      waitFor: 5000,
      solveTurnstile: true,
      solveCaptcha: true
    });

    if (cookies) {
      console.log('\n=== Cookies успешно получены ===');
      console.log(cookies);
      console.log('\n===============================\n');
      if (saveToFile) {
        saveCookiesToFile(cookies);
      }
      return cookies;
    } else {
      console.log('Cookies не получены');
      return null;
    }
  } catch (error) {
    console.error('Ошибка при получении cookies:', error.message);
    throw error;
  }
}

if (require.main === module) {
  const saveToFile = process.argv.includes('--save');
  const showBrowser = process.argv.includes('--show');
  getVorotaCookies(saveToFile)
    .then(cookies => {
      if (cookies) {
        console.log('Готово! Используй эти cookies в своих запросах.');
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = {
  getCookies,
  getVorotaCookies,
  saveCookiesToFile
};
