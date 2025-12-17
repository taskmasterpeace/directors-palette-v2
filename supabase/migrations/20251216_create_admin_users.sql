
create table if not exists admin_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table admin_users enable row level security;

-- Only service role can insert/delete (handled by code/manual)
create policy "Allow read access to authenticated users"
  on admin_users for select
  to authenticated
  using (true);
