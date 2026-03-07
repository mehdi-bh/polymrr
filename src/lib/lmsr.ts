// ---------------------------------------------------------------------------
// LMSR (Logarithmic Market Scoring Rule) — pure math, no database access.
//
// State: { yesShares, noShares, b }
//   yesShares: total outstanding YES shares
//   noShares:  total outstanding NO shares
//   b:         liquidity parameter (higher = more stable odds)
// ---------------------------------------------------------------------------

export interface LmsrState {
  yesShares: number;
  noShares: number;
  b: number;
}

/**
 * Cost function: C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))
 * Uses log-sum-exp trick for numerical stability.
 */
export function costFunction(qYes: number, qNo: number, b: number): number {
  const max = Math.max(qYes / b, qNo / b);
  return b * (max + Math.log(Math.exp(qYes / b - max) + Math.exp(qNo / b - max)));
}

/** Instantaneous price of YES shares (0 to 1) */
export function yesPrice(state: LmsrState): number {
  const { yesShares, noShares, b } = state;
  const max = Math.max(yesShares / b, noShares / b);
  const expYes = Math.exp(yesShares / b - max);
  const expNo = Math.exp(noShares / b - max);
  return expYes / (expYes + expNo);
}

/** Instantaneous price of NO shares (0 to 1) */
export function noPrice(state: LmsrState): number {
  return 1 - yesPrice(state);
}

/** YES odds as integer 0-100 */
export function yesOdds(state: LmsrState): number {
  return Math.round(yesPrice(state) * 100);
}

/**
 * Cost to buy `numShares` of a given side.
 * Returns the number of credits the user must pay.
 */
export function costToBuy(
  state: LmsrState,
  side: "yes" | "no",
  numShares: number
): number {
  const { yesShares, noShares, b } = state;
  const newYes = side === "yes" ? yesShares + numShares : yesShares;
  const newNo = side === "no" ? noShares + numShares : noShares;
  return costFunction(newYes, newNo, b) - costFunction(yesShares, noShares, b);
}

/**
 * Given credits to spend, calculate how many shares the user gets.
 * Uses binary search for robustness.
 */
export function sharesToBuy(
  state: LmsrState,
  side: "yes" | "no",
  credits: number
): number {
  let lo = 0;
  let hi = credits * 10;
  const epsilon = 0.001;

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const cost = costToBuy(state, side, mid);
    if (Math.abs(cost - credits) < epsilon) return mid;
    if (cost < credits) lo = mid;
    else hi = mid;
  }

  return (lo + hi) / 2;
}

/** Calculate the new state after a bet. */
export function stateAfterBet(
  state: LmsrState,
  side: "yes" | "no",
  shares: number
): LmsrState {
  return {
    yesShares: side === "yes" ? state.yesShares + shares : state.yesShares,
    noShares: side === "no" ? state.noShares + shares : state.noShares,
    b: state.b,
  };
}

/**
 * Estimate payout if this side wins.
 * Uses amount-proportional payouts: payout = (myBet / winningSideBets) * totalPool.
 * This guarantees payout >= betAmount when your side wins (no negative profit).
 */
export function estimatePayout(
  side: "yes" | "no",
  betAmount: number,
  totalPool: number,
  totalYesCredits: number,
  totalNoCredits: number,
): number {
  const newPool = totalPool + betAmount;
  const winningSideBets = (side === "yes" ? totalYesCredits : totalNoCredits) + betAmount;
  if (winningSideBets <= 0) return 0;
  return Math.floor((betAmount / winningSideBets) * newPool);
}

/** Default liquidity parameter for new markets */
export const DEFAULT_LIQUIDITY = 500;

/** Minimum bet in credits */
export const MIN_BET = 50;
