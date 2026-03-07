-- Quest completions tracking
create table user_quest_completions (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade,
  quest_id text not null,
  reward_amount integer not null,
  completed_at timestamptz not null default now(),
  unique (user_id, quest_id)
);

alter table user_quest_completions enable row level security;
create policy "Own read" on user_quest_completions for select using (auth.uid() = user_id);

create index idx_quest_completions_user on user_quest_completions (user_id);

-- Update signup bonus from 1000 to 10000
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, x_handle, x_name, avatar_url, credits)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'user_name', ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Anonymous'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', ''),
    0
  );

  -- Grant signup quest reward
  insert into user_quest_completions (user_id, quest_id, reward_amount)
  values (new.id, 'signup', 10000);

  update profiles set credits = credits + 10000 where id = new.id;

  insert into credit_transactions (user_id, amount, reason)
  values (new.id, 10000, 'quest_reward');

  return new;
end;
$$ language plpgsql security definer;

-- RPC to complete a quest atomically (idempotent)
create or replace function complete_quest(
  p_user_id uuid,
  p_quest_id text,
  p_reward integer
) returns boolean as $$
begin
  -- Skip if already completed
  if exists (
    select 1 from user_quest_completions
    where user_id = p_user_id and quest_id = p_quest_id
  ) then
    return false;
  end if;

  insert into user_quest_completions (user_id, quest_id, reward_amount)
  values (p_user_id, p_quest_id, p_reward);

  update profiles set credits = credits + p_reward where id = p_user_id;

  insert into credit_transactions (user_id, amount, reason)
  values (p_user_id, p_reward, 'quest_reward');

  return true;
end;
$$ language plpgsql security definer;
