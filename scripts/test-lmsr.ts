/**
 * LMSR math validation script.
 * Run: npx tsx scripts/test-lmsr.ts
 */

import {
  costFunction,
  yesPrice,
  noPrice,
  yesOdds,
  costToBuy,
  sharesToBuy,
  stateAfterBet,
  type LmsrState,
} from "../src/lib/lmsr";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

function approxEqual(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) < tolerance;
}

// ---------------------------------------------------------------------------
// Test 1: Initial state — even odds
// ---------------------------------------------------------------------------
console.log("\n--- Test 1: Initial state (q_yes=0, q_no=0, b=100) ---");
{
  const state: LmsrState = { yesShares: 0, noShares: 0, b: 100 };

  const pYes = yesPrice(state);
  const pNo = noPrice(state);

  assert(approxEqual(pYes, 0.5), `yesPrice = ${pYes.toFixed(4)} (expect 0.50)`);
  assert(approxEqual(pNo, 0.5), `noPrice = ${pNo.toFixed(4)} (expect 0.50)`);
  assert(approxEqual(pYes + pNo, 1.0, 0.0001), `yesPrice + noPrice = ${(pYes + pNo).toFixed(6)} (expect 1.0)`);
  assert(yesOdds(state) === 50, `yesOdds = ${yesOdds(state)} (expect 50)`);
}

// ---------------------------------------------------------------------------
// Test 2: Buying YES shares moves odds up
// ---------------------------------------------------------------------------
console.log("\n--- Test 2: Buy 50cr of YES ---");
{
  const state: LmsrState = { yesShares: 0, noShares: 0, b: 100 };

  const shares = sharesToBuy(state, "yes", 50);
  const cost = costToBuy(state, "yes", shares);

  assert(approxEqual(cost, 50, 0.1), `cost of ${shares.toFixed(2)} shares = ${cost.toFixed(2)}cr (expect ~50)`);
  assert(shares > 0, `shares = ${shares.toFixed(2)} (must be positive)`);

  const newState = stateAfterBet(state, "yes", shares);
  const newPYes = yesPrice(newState);

  assert(newPYes > 0.5, `new yesPrice = ${newPYes.toFixed(4)} (must be > 0.50)`);
  assert(approxEqual(newPYes + noPrice(newState), 1.0, 0.0001), `prices sum to 1.0`);

  // Analytically verified: 50cr buys ~83.2 shares at b=100, moving odds to ~69.7%
  // (The spec example values were rough approximations)
  assert(approxEqual(shares, 83.2, 1.0), `shares ~83.2 (got ${shares.toFixed(1)})`);
  assert(approxEqual(newPYes, 0.697, 0.02), `yesPrice ~0.697 (got ${newPYes.toFixed(3)})`);
}

// ---------------------------------------------------------------------------
// Test 3: Then buy 100cr of NO — odds should shift back
// ---------------------------------------------------------------------------
console.log("\n--- Test 3: Then buy 100cr of NO ---");
{
  const state0: LmsrState = { yesShares: 0, noShares: 0, b: 100 };

  // First: buy 50cr YES
  const yesShares = sharesToBuy(state0, "yes", 50);
  const state1 = stateAfterBet(state0, "yes", yesShares);

  // Then: buy 100cr NO
  const noShares = sharesToBuy(state1, "no", 100);
  const state2 = stateAfterBet(state1, "no", noShares);

  const finalYes = yesPrice(state2);
  assert(finalYes < yesPrice(state1), `yesPrice dropped: ${finalYes.toFixed(4)} < ${yesPrice(state1).toFixed(4)}`);
  assert(approxEqual(finalYes + noPrice(state2), 1.0, 0.0001), `prices sum to 1.0`);

  // After 50cr YES then 100cr NO, YES odds drop below 50%
  assert(finalYes < 0.5, `yesPrice < 0.50 after heavy NO bet (got ${finalYes.toFixed(3)})`);
}

// ---------------------------------------------------------------------------
// Test 4: costToBuy and sharesToBuy are inverses
// ---------------------------------------------------------------------------
console.log("\n--- Test 4: costToBuy and sharesToBuy are inverses ---");
{
  const state: LmsrState = { yesShares: 30, noShares: 70, b: 100 };

  // Forward: 200 credits → shares → cost should be ~200
  const shares = sharesToBuy(state, "yes", 200);
  const cost = costToBuy(state, "yes", shares);
  assert(approxEqual(cost, 200, 0.1), `round-trip cost = ${cost.toFixed(2)} (expect 200)`);

  // Forward: 25 shares → cost → shares should be ~25
  const c = costToBuy(state, "no", 25);
  const s = sharesToBuy(state, "no", c);
  assert(approxEqual(s, 25, 0.1), `round-trip shares = ${s.toFixed(2)} (expect 25)`);
}

// ---------------------------------------------------------------------------
// Test 5: Prices always sum to 1.0 across many states
// ---------------------------------------------------------------------------
console.log("\n--- Test 5: Prices always sum to 1.0 ---");
{
  const testCases: [number, number, number][] = [
    [0, 0, 100],
    [100, 0, 100],
    [0, 100, 100],
    [500, 200, 100],
    [0, 0, 50],
    [1000, 1000, 100],
    [50, 300, 200],
  ];
  for (const [y, n, b] of testCases) {
    const state: LmsrState = { yesShares: y, noShares: n, b };
    const sum = yesPrice(state) + noPrice(state);
    assert(approxEqual(sum, 1.0, 0.0001), `state(${y},${n},${b}): sum = ${sum.toFixed(6)}`);
  }
}

// ---------------------------------------------------------------------------
// Test 6: Cost function is monotonically increasing
// ---------------------------------------------------------------------------
console.log("\n--- Test 6: Cost is monotonic ---");
{
  const state: LmsrState = { yesShares: 20, noShares: 40, b: 100 };

  const cost10 = costToBuy(state, "yes", 10);
  const cost50 = costToBuy(state, "yes", 50);
  const cost100 = costToBuy(state, "yes", 100);

  assert(cost10 < cost50, `10 shares (${cost10.toFixed(2)}) < 50 shares (${cost50.toFixed(2)})`);
  assert(cost50 < cost100, `50 shares (${cost50.toFixed(2)}) < 100 shares (${cost100.toFixed(2)})`);
}

// ---------------------------------------------------------------------------
// Test 7: Buying more shares costs more per share (convexity)
// ---------------------------------------------------------------------------
console.log("\n--- Test 7: Convexity — marginal cost increases ---");
{
  const state: LmsrState = { yesShares: 0, noShares: 0, b: 100 };

  // Cost of first 50 shares vs next 50 shares
  const costFirst50 = costToBuy(state, "yes", 50);
  const state2 = stateAfterBet(state, "yes", 50);
  const costNext50 = costToBuy(state2, "yes", 50);

  assert(costNext50 > costFirst50, `next 50 shares (${costNext50.toFixed(2)}) > first 50 (${costFirst50.toFixed(2)})`);
}

// ---------------------------------------------------------------------------
// Test 8: Numerical stability with large values
// ---------------------------------------------------------------------------
console.log("\n--- Test 8: Numerical stability ---");
{
  const state: LmsrState = { yesShares: 5000, noShares: 0, b: 100 };
  const pYes = yesPrice(state);
  assert(!isNaN(pYes) && isFinite(pYes), `extreme state doesn't produce NaN/Inf (got ${pYes})`);
  assert(pYes > 0.99, `extreme YES dominance: ${pYes.toFixed(6)} (expect ~1.0)`);

  const state2: LmsrState = { yesShares: 0, noShares: 5000, b: 100 };
  const pYes2 = yesPrice(state2);
  assert(!isNaN(pYes2) && isFinite(pYes2), `extreme NO dominance doesn't produce NaN/Inf (got ${pYes2})`);
  assert(pYes2 < 0.01, `extreme NO dominance: ${pYes2.toFixed(6)} (expect ~0.0)`);
}

// ---------------------------------------------------------------------------
// Test 9: Zero credits = zero shares
// ---------------------------------------------------------------------------
console.log("\n--- Test 9: Edge case — zero credits ---");
{
  const state: LmsrState = { yesShares: 0, noShares: 0, b: 100 };
  const shares = sharesToBuy(state, "yes", 0);
  assert(approxEqual(shares, 0, 0.01), `0 credits = ${shares.toFixed(4)} shares (expect 0)`);
}

// ---------------------------------------------------------------------------
// Test 10: Symmetry — YES and NO are symmetric at equal state
// ---------------------------------------------------------------------------
console.log("\n--- Test 10: Symmetry ---");
{
  const state: LmsrState = { yesShares: 50, noShares: 50, b: 100 };
  const costYes = costToBuy(state, "yes", 30);
  const costNo = costToBuy(state, "no", 30);
  assert(approxEqual(costYes, costNo, 0.01), `YES cost (${costYes.toFixed(2)}) = NO cost (${costNo.toFixed(2)})`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All LMSR math tests passed.");
}
