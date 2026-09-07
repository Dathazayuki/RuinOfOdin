import { expect, test, type Page } from '@playwright/test';
import { DECK } from '../../packages/shared/cards';

const storageKey = 'core-battle-custom-deck';

async function seedDeck(page: Page, deck: readonly string[]) {
  await page.goto('/');
  await page.evaluate(({ key, cards }) => localStorage.setItem(key, JSON.stringify(cards)), { key: storageKey, cards: deck });
  await page.reload();
}

async function assertImages(page: Page) {
  await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
}

test('deck builder enforces limits, saves edits, resets and cancels without saving', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Active deck' })).toContainText('Your Deck: 30 Cards');
  await assertImages(page);
  await page.screenshot({ path: testInfo.outputPath('lobby-desktop.png') });
  await page.getByRole('button', { name: 'Edit Deck' }).click();
  await expect(page.locator('.builder-card')).toHaveCount(11);
  await expect(page.getByRole('button', { name: 'Add Goblin', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Remove Goblin', exact: true }).click();
  await expect(page.locator('.deck-count')).toHaveText('29 / 30 Cards');
  await expect(page.getByRole('button', { name: 'Save & Ready' })).toBeDisabled();
  await page.getByRole('button', { name: 'Add Goblin', exact: true }).click();
  await page.getByRole('button', { name: 'Add Mage', exact: true }).click();
  await expect(page.locator('.deck-count')).toHaveText('31 / 30 Cards');
  await expect(page.getByRole('button', { name: 'Save & Ready' })).toBeDisabled();
  await page.getByRole('button', { name: 'Reset to Starter Deck' }).click();
  await expect(page.getByRole('group', { name: 'Mage copies', exact: true })).toContainText('1 / 3');
  await page.getByRole('button', { name: 'Remove Heal', exact: true }).click();
  await page.getByRole('button', { name: 'Add Mage', exact: true }).click();
  await expect(page.locator('.deck-summary')).toContainText('16 Units');
  await assertImages(page);
  await page.screenshot({ path: testInfo.outputPath('deck-builder-desktop.png') });
  await page.getByRole('button', { name: 'Save & Ready' }).click();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Active deck' })).toContainText('16 Units');
  const saved = await page.evaluate(key => localStorage.getItem(key), storageKey);
  await page.getByRole('button', { name: 'Edit Deck' }).click();
  await page.getByRole('button', { name: 'Remove Mage', exact: true }).click();
  await page.getByRole('button', { name: 'Close deck builder' }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(saved);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('lobby-mobile.png') });
  await page.getByRole('button', { name: 'Edit Deck' }).click();
  await expect(page.getByRole('button', { name: 'Save & Ready' })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('deck-builder-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Reset to Starter Deck' }).click();
  await page.getByRole('button', { name: 'Save & Ready' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const mode of ['solo', 'create', 'join'] as const) {
  test(`incomplete saved deck opens builder before ${mode}`, async ({ page }) => {
    await seedDeck(page, DECK.slice(1));
    await expect(page.getByRole('region', { name: 'Active deck' })).toContainText('29 Cards');
    if (mode === 'solo') await page.getByRole('button', { name: 'Play against bot' }).click();
    if (mode === 'create') await page.getByRole('button', { name: 'Create a room' }).click();
    if (mode === 'join') {
      await page.getByRole('textbox', { name: 'Room code' }).fill('ABCDEF');
      await page.getByRole('button', { name: 'Join', exact: true }).click();
    }
    await expect(page.getByRole('dialog', { name: 'Deck Builder' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save & Ready' })).toBeDisabled();
    await expect(page.locator('.battle-layout, .waiting')).toHaveCount(0);
  });
}

test('solo begins the player action phase with five mana', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play against bot' }).click();
  await expect(page.getByRole('button', { name: 'End turn' })).toBeEnabled({ timeout: 20_000 });
  await expect(page.locator('.mana-display strong')).toHaveText('5');
  await expect(page.locator('.mana-display')).toContainText('/ 5 MANA');
  await assertImages(page);
  await page.screenshot({ path: testInfo.outputPath('solo-desktop.png') });
});

test('custom multiplayer decks, turn-one protection, immediate turn-two attack and reconnect', async ({ browser }, testInfo) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const pages = await Promise.all(contexts.map(context => context.newPage()));
  const [host, guest] = pages as [Page, Page];
  const errors: string[] = [];
  for (const page of pages) page.on('pageerror', error => errors.push(error.message));
  try {
    // Different legal decks also exercise independent per-player storage/payloads.
    const hostDeck = [...DECK.filter(id => id !== 'heal'), 'guardian', 'mage', 'mage'];
    const guestDeck = [...DECK.filter(id => id !== 'poison'), 'guardian', 'mage', 'mage'];
    await seedDeck(host, hostDeck);
    await seedDeck(guest, guestDeck);
    await host.getByRole('button', { name: 'Create a room' }).click();
    await expect(host.locator('.room-code')).toBeVisible();
    const code = (await host.locator('.room-code').innerText()).trim();
    await guest.getByRole('textbox', { name: 'Room code' }).fill(code);
    await guest.getByRole('button', { name: 'Join', exact: true }).click();
    for (const page of pages) await expect(page.locator('.round-pill strong')).toHaveText('01');
    const first = await host.getByRole('button', { name: 'End turn' }).isEnabled() ? host : guest;
    const second = first === host ? guest : host;
    await expect(first.locator('.mana-display strong')).toHaveText('5');
    // The shuffled opener can contain only spells. Advance without a summon in that rare
    // case; the deterministic engine suite independently verifies Turn 1 summons.
    const firstUnit = first.locator('.hand .card.unit:not(:disabled)').first();
    const hasFirstUnit = await firstUnit.count() > 0;
    if (hasFirstUnit) {
      await firstUnit.click();
      await first.getByRole('button', { name: 'Friendly empty lane 1', exact: true }).click();
      await expect(first.getByText('ROUND 1 WAIT', { exact: true })).toBeVisible();
    }
    await first.getByRole('button', { name: 'End turn' }).click();
    await expect(second.getByRole('button', { name: 'End turn' })).toBeEnabled();
    await expect(second.locator('.round-pill strong')).toHaveText('02');
    await expect(second.locator('.your-core .core-health strong')).toHaveText('30');
    await expect(second.locator('.mana-display strong')).toHaveText('5');
    const secondUnit = second.locator('.hand .card.unit:not(:disabled)').first();
    // Fail explicitly if this random opener cannot demonstrate the requested attack.
    await expect(secondUnit).toBeVisible();
    const attack = Number((await secondUnit.getAttribute('aria-label'))?.match(/(\d+) attack/)?.[1]);
    await secondUnit.click();
    await second.getByRole('button', { name: 'Friendly empty lane 2', exact: true }).click();
    await expect(second.getByText('ROUND 1 WAIT', { exact: true })).toHaveCount(0);
    await second.getByRole('button', { name: 'End turn' }).click();
    await expect(first.locator('.round-pill strong')).toHaveText('03');
    await expect(first.locator('.your-core .core-health strong')).toHaveText(String(30 - attack));
    await expect(first.locator('.mana-display strong')).toHaveText('5');
    await first.reload();
    await expect(first.locator('.round-pill strong')).toHaveText('03');
    await expect(first.getByRole('button', { name: 'End turn' })).toBeEnabled();
    await expect(first.locator('.your-core .core-health strong')).toHaveText(String(30 - attack));
    await assertImages(first);
    await first.screenshot({ path: testInfo.outputPath('multiplayer-reconnected.png') });
    testInfo.annotations.push({ type: 'turn-one-summon', description: String(hasFirstUnit) });
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map(context => context.close()));
  }
});
