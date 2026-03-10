-- Fix leaderboard profit calculation.
-- credits_won = actual payouts received (from credit_transactions)
-- credits_lost = total amount bet on resolved markets (the cost)
-- profit = payouts - cost

create or replace view leaderboard as
select
  user_id, x_handle, x_name, avatar_url,
  total_predictions, win_rate, credits_won, credits_lost, current_streak,
  credits_won - credits_lost as profit
from (
  select
    p.id as user_id,
    p.x_handle,
    p.x_name,
    p.avatar_url,
    count(b.id)::integer as total_predictions,
    coalesce(round(
      count(case when m.resolved_outcome = b.side then 1 end)::numeric
      / nullif(count(case when m.status = 'resolved' then 1 end), 0) * 100
    ), 0)::integer as win_rate,
    coalesce(sum(
      case when m.resolved_outcome = b.side then
        coalesce((select ct.amount from credit_transactions ct where ct.ref_bet_id = b.id and ct.reason = 'bet_won' limit 1), 0)
      else 0 end
    ), 0)::integer as credits_won,
    coalesce(sum(case when m.status = 'resolved' then b.amount else 0 end), 0)::integer as credits_lost,
    0::integer as current_streak
  from profiles p
  left join bets b on b.user_id = p.id
  left join markets m on m.id = b.market_id
  group by p.id, p.x_handle, p.x_name, p.avatar_url
) lb
order by credits_won - credits_lost desc;
