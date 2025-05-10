-- Create tables with proper RLS
-- Note: auth.users is already provided by Supabase

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  avatar_url text,
  theme text default 'system',
  email_notifications boolean default true,
  reminder_frequency text default 'weekly',
  timezone text default 'UTC',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Entries table
create table if not exists entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  content text not null,
  mood integer check (mood >= 0 and mood <= 100),
  date timestamp with time zone default timezone('utc'::text, now()),
  is_private boolean default true,
  weather text,
  location text,
  hashtags text[] default '{}',
  image_urls text[] default '{}',
  ai_summary text default '',
  positive_affirmation text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tags table
create table if not exists tags (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text,
  usage_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Email Subscriptions table
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

-- Enable Row Level Security (if not already enabled)
do $$ 
begin
  execute 'alter table public.profiles enable row level security';
  execute 'alter table entries enable row level security';
  execute 'alter table tags enable row level security';
  execute 'alter table email_subscriptions enable row level security';
exception when others then
  null;
end $$;

-- Drop existing policies before creating new ones
do $$ 
begin
  execute 'drop policy if exists "Public profiles are viewable by everyone" on public.profiles';
  execute 'drop policy if exists "Users can insert their own profile" on public.profiles';
  execute 'drop policy if exists "Users can update their own profile" on public.profiles';
  
  execute 'drop policy if exists "Users can view own entries" on entries';
  execute 'drop policy if exists "Users can create own entries" on entries';
  execute 'drop policy if exists "Users can update own entries" on entries';
  execute 'drop policy if exists "Users can delete own entries" on entries';
  
  execute 'drop policy if exists "Users can view own tags" on tags';
  execute 'drop policy if exists "Users can create own tags" on tags';
  execute 'drop policy if exists "Users can update own tags" on tags';
  execute 'drop policy if exists "Users can delete own tags" on tags';
  
  execute 'drop policy if exists "Users can view their own email subscriptions" on email_subscriptions';
  execute 'drop policy if exists "Users can update their own email subscriptions" on email_subscriptions';
  execute 'drop policy if exists "Users can insert their own email subscriptions" on email_subscriptions';
end $$;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Entries policies
create policy "Users can view own entries"
  on entries for select
  using (auth.uid() = user_id);

create policy "Users can create own entries"
  on entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own entries"
  on entries for delete
  using (auth.uid() = user_id);

-- Tags policies
create policy "Users can view own tags"
  on tags for select
  using (auth.uid() = user_id);

create policy "Users can create own tags"
  on tags for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tags"
  on tags for update
  using (auth.uid() = user_id);

create policy "Users can delete own tags"
  on tags for delete
  using (auth.uid() = user_id);

-- Email Subscriptions policies
create policy "Users can view their own email subscriptions"
  on email_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can update their own email subscriptions"
  on email_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can insert their own email subscriptions"
  on email_subscriptions for insert
  with check (auth.uid() = user_id);

-- Create indexes if they don't exist
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'entries_user_id_date_idx') then
    create index entries_user_id_date_idx on entries(user_id, date);
  end if;
  
  if not exists (select 1 from pg_indexes where indexname = 'entries_user_id_created_at_idx') then
    create index entries_user_id_created_at_idx on entries(user_id, created_at);
  end if;
  
  if not exists (select 1 from pg_indexes where indexname = 'tags_user_id_idx') then
    create index tags_user_id_idx on tags(user_id);
  end if;
  
  if not exists (select 1 from pg_indexes where indexname = 'entries_hashtags_idx') then
    create index entries_hashtags_idx on entries using gin(hashtags);
  end if;
end $$;

-- Function to handle updated_at
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop existing triggers before creating new ones
drop trigger if exists handle_profiles_updated_at on public.profiles;
drop trigger if exists handle_entries_updated_at on entries;
drop trigger if exists handle_email_subscriptions_updated_at on email_subscriptions;

-- Add triggers for updated_at
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row
  execute procedure handle_updated_at();

create trigger handle_entries_updated_at
  before update on entries
  for each row
  execute procedure handle_updated_at();

create trigger handle_email_subscriptions_updated_at
  before update on email_subscriptions
  for each row
  execute procedure handle_updated_at();

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger for new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
select 'entry_images', 'entry_images', false
where not exists (
  select 1 from storage.buckets where id = 'entry_images'
);

-- Drop existing storage policies before creating new ones
do $$
begin
  execute 'drop policy if exists "Users can upload their own images" on storage.objects';
  execute 'drop policy if exists "Users can view their own images" on storage.objects';
  execute 'drop policy if exists "Users can delete their own images" on storage.objects';
end $$;

-- Storage policies for entry images
create policy "Users can upload their own images"
  on storage.objects for insert
  with check (
    auth.uid() = owner and
    bucket_id = 'entry_images' and
    array_length(regexp_split_to_array(name, '/'), 1) = 2
  );

create policy "Users can view their own images"
  on storage.objects for select
  using (
    auth.uid() = owner and
    bucket_id = 'entry_images'
  );

create policy "Users can delete their own images"
  on storage.objects for delete
  using (
    auth.uid() = owner and
    bucket_id = 'entry_images'
  ); 