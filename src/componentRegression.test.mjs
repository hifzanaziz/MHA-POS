import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8');

function between(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.notEqual(a, -1, `Missing ${start}`);
  assert.notEqual(b, -1, `Missing ${end}`);
  return source.slice(a, b);
}

test('Dashboard does not contain Production SKU search/sort state', () => {
  const block = between('function Dashboard(', 'function OrderTaking(');
  assert.equal(block.includes('filterAndSortProductSkus'), false);
  assert.equal(block.includes('setSort('), false);
});

test('RecipeManagement does not contain Production SKU search/sort state', () => {
  const block = between('function RecipeManagement(', 'function Production(');
  assert.equal(block.includes('filterAndSortProductSkus'), false);
  assert.equal(block.includes('setSort('), false);
});

const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

test('App shell includes modern brand and system status treatment', () => {
  const block = between('function AppShell(', 'function StatCard(');
  assert.equal(block.includes('brand-mark'), true);
  assert.equal(block.includes('system-status'), true);
  assert.equal(styles.includes('--electric:'), true);
  assert.equal(styles.includes('backdrop-filter:'), true);
});
