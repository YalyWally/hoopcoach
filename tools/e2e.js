import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/shot_01_onboarding.png' });

  // Step 0: basics
  await page.fill('input[placeholder="Your name"]', 'Playwright Test Player');
  await page.fill('input[type=number] >> nth=0', '17');
  const numberInputs = await page.$$('input[type=number]');
  await numberInputs[1].fill('75');
  await numberInputs[2].fill('180');
  await page.click('button:has-text("Next")');

  // Step 1: goals
  await page.click('button:has-text("Improve Shooting")');
  await page.click('button:has-text("Improve Ball Handling")');
  await page.click('button:has-text("Increase Speed")');
  await page.screenshot({ path: '/tmp/shot_02_goals.png' });
  await page.click('button:has-text("Next")');

  // Step 2: schedule (defaults are fine)
  await page.click('button:has-text("Next")');

  // Step 3: equipment (defaults fine)
  await page.click('button:has-text("Next")');

  // Step 4: nutrition/restrictions
  await page.screenshot({ path: '/tmp/shot_03_final_step.png' });
  await page.click('button:has-text("Create My Profile")');

  await page.waitForURL('**/assessment', { timeout: 15000 });
  await page.screenshot({ path: '/tmp/shot_04_assessment.png', fullPage: true });

  // fill a few assessment fields then submit (rest optional)
  const testInputs = await page.$$('input[type=number]');
  for (let i = 0; i < Math.min(6, testInputs.length); i++) {
    await testInputs[i].fill(String(10 + i));
  }
  await page.click('button:has-text("Submit Assessment")');
  await page.waitForSelector('text=Assessment Complete', { timeout: 15000 });
  await page.screenshot({ path: '/tmp/shot_05_assessment_result.png' });

  await page.click('button:has-text("See My Program")');
  await page.waitForURL('**/home', { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/shot_06_home.png', fullPage: true });

  await page.click('a:has-text("Train")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/shot_07_train.png', fullPage: true });

  await page.click('a:has-text("Progress")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/shot_08_progress.png', fullPage: true });

  await page.click('a:has-text("Plan")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/shot_09_plan.png', fullPage: true });

  await page.click('a:has-text("Nutrition")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/shot_10_nutrition.png', fullPage: true });
  // log a manual-ish meal (will hit AI estimate path, unavailable without key)
  await page.fill('textarea', 'Grilled chicken sandwich with fries');
  await page.click('button:has-text("Log It")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/shot_11_nutrition_logged.png', fullPage: true });

  await page.click('a:has-text("Coach")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/shot_12_coach.png', fullPage: true });
  await page.click('button:has-text("🛠 Fix My Plan")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/shot_13_coach_fixplan.png', fullPage: true });

  console.log('CONSOLE/PAGE ERRORS:', JSON.stringify(errors, null, 2));
  await browser.close();
})().catch((e) => { console.error('E2E FAILED:', e); process.exit(1); });
