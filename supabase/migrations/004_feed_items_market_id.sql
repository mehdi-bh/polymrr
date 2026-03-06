-- Add market_id to feed_items view so feed links go to the correct market
drop view if exists feed_items;
create view feed_items as
select
  b.id,
  b.market_id,
  p.x_handle as user_x_handle,
  b.side,
  s.name as startup_name,
  m.question as market_question,
  b.amount,
  b.created_at
from bets b
join profiles p on p.id = b.user_id
join markets m on m.id = b.market_id
join startups s on s.slug = m.startup_slug
order by b.created_at desc
limit 20;
