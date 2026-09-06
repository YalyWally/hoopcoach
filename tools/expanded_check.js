import { chromium } from 'playwright';

const PLAYER_ID = process.argv[2] || 'player_jskOhTU1At32';

async function main() {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

  await page.goto('http://localhost:5173/');
  await page.evaluate((id) => localStorage.setItem('hc_player_id', id), PLAYER_ID);
  await page.reload();
  await page.waitForSelector('.bottom-nav', { timeout: 10000 });
  console.log('✓ App loaded with seeded player');

  // Settings page via gear icon
  await page.click('a[title="Settings"]');
  await page.waitForSelector('text=Push Notifications', { timeout: 5000 });
  console.log('✓ Settings page reachable via gear icon');
  const notifSection = await page.textContent('body');
  if (!notifSection.includes('Notification Types')) throw new Error('Notification Types section missing');
  console.log('✓ Notification Types section present');
  // toggle a pref
  await page.click('text=Meal reminders >> xpath=../.. >> button');
  await page.waitForTimeout(300);
  console.log('✓ Toggled a notification pref (no crash)');

  // Go to Plan -> Meal Plan tab
  await page.goto('http://localhost:5173/plan');
  await page.waitForSelector('text=Meal Plan', { timeout: 8000 }).catch(() => {});
  await page.click('button:has-text("Meal Plan")').catch(async () => {
    await page.click('text=Meal Plan');
  });
  await page.waitForTimeout(800);
  const planBody = await page.textContent('body');
  if (!/breakfast|Breakfast/i.test(planBody)) throw new Error('Meal plan content not rendering');
  console.log('✓ Meal Plan tab renders recipes');

  // Grocery tab
  await page.click('button:has-text("Grocery")').catch(async () => { await page.click('text=Grocery'); });
  await page.waitForTimeout(800);
  const groceryBody = await page.textContent('body');
  if (!/Protein|protein/i.test(groceryBody)) throw new Error('Grocery list content not rendering');
  console.log('✓ Grocery List tab renders categories');

  // Calendar sync tab
  await page.click('button:has-text("Sync")').catch(async () => { await page.click('text=Sync'); });
  await page.waitForTimeout(800);
  const syncBody = await page.textContent('body');
  if (!/calendar|\.ics|subscribe/i.test(syncBody)) throw new Error('Calendar sync content not rendering');
  if (!/Away Game vs Central/.test(syncBody)) throw new Error('Imported external event not showing in sync view');
  console.log('✓ Calendar Sync tab renders subscribe URL + imported event');

  // Nutrition page -> scan card + food prefs
  await page.goto('http://localhost:5173/nutrition');
  await page.waitForTimeout(600);
  const nutriBody = await page.textContent('body');
  if (!/Scan Meal/i.test(nutriBody)) throw new Error('Scan Meal card missing');
  if (!/Food Preferences/i.test(nutriBody)) throw new Error('Food Preferences card missing');
  console.log('✓ Nutrition page has Scan Meal + Food Preferences cards');

  // Coach page basic load
  await page.goto('http://localhost:5173/coach');
  await page.waitForTimeout(600);
  console.log('✓ Coach page loaded');

  await browser.close();

  const realErrors = errors.filter((e) => !/favicon|ResizeObserver/i.test(e));
  if (realErrors.length) {
    console.log('--- console/page errors ---');
    realErrors.forEach((e) => console.log(e));
    process.exitCode = 1;
  } else {
    console.log('✓ No console/page errors detected');
  }
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
