-- Create email_subscriptions table if it doesn't exist
create table if not exists email_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  frequency text check (frequency in ('1', '3', '7', '30')) not null default '7',
  is_active boolean default false not null,
  last_sent timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id)
);

-- Enable RLS
alter table email_subscriptions enable row level security;

-- Drop existing policies if they exist
do $$ 
begin
  execute 'drop policy if exists "Users can view their own email subscriptions" on email_subscriptions';
  execute 'drop policy if exists "Users can update their own email subscriptions" on email_subscriptions';
  execute 'drop policy if exists "Users can insert their own email subscriptions" on email_subscriptions';
end $$;

-- Create policies
create policy "Users can view their own email subscriptions"
  on email_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can update their own email subscriptions"
  on email_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can insert their own email subscriptions"
  on email_subscriptions for insert
  with check (auth.uid() = user_id);

-- Create updated_at trigger
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop existing trigger if it exists
drop trigger if exists handle_email_subscriptions_updated_at on email_subscriptions;

-- Create trigger for updated_at
create trigger handle_email_subscriptions_updated_at
  before update on email_subscriptions
  for each row
  execute procedure handle_updated_at(); 