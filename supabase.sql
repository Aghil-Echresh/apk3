create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null,
  type text not null check (type in ('deposit','withdraw')),
  amount numeric(14,0) not null check (amount > 0),
  note text,
  receipt_path text,
  created_at timestamptz not null default now()
);

-- Ownership-safe relationship: a transaction can only point to a customer
-- belonging to the same authenticated user.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'customers_id_user_id_key'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers add constraint customers_id_user_id_key unique (id, user_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_customer_owner_fk'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_customer_owner_fk
      foreign key (customer_id, user_id)
      references public.customers(id, user_id)
      on delete cascade;
  end if;
end $$;

create index if not exists customers_user_id_idx on public.customers(user_id);
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_customer_id_idx on public.transactions(customer_id);

alter table public.customers enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "customers own rows" on public.customers;
create policy "customers own rows"
on public.customers
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "transactions own rows" on public.transactions;
create policy "transactions own rows"
on public.transactions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do update set public = false;

drop policy if exists "receipt upload own folder" on storage.objects;
create policy "receipt upload own folder"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "receipt read own folder" on storage.objects;
create policy "receipt read own folder"
on storage.objects
for select to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);
