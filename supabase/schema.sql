create table if not exists public.persons (
  id text primary key,
  name text not null,
  phone text,
  email text,
  notes text,
  "isMe" boolean,
  "deletedAt" timestamptz,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null
);

create table if not exists public.debts (
  id text primary key,
  "debtorId" text not null,
  "creditorId" text not null,
  amount numeric not null check (amount >= 0),
  description text,
  "transactionDate" date not null,
  "dueDate" date,
  status text not null check (status in ('ACTIVE', 'PARTIAL', 'PAID', 'CANCELLED')),
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null
);

create table if not exists public.payments (
  id text primary key,
  "debtId" text not null references public.debts(id) on delete cascade,
  amount numeric not null check (amount > 0),
  "paymentDate" date not null,
  notes text,
  "createdAt" timestamptz not null
);

create table if not exists public.app_settings (
  id text primary key check (id = 'settings'),
  "myPersonId" text,
  theme text not null default 'light' check (theme in ('light', 'dark', 'system'))
);

alter table public.persons enable row level security;
alter table public.debts enable row level security;
alter table public.payments enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "authenticated users can manage persons" on public.persons;
create policy "authenticated users can manage persons" on public.persons for all to authenticated using (true) with check (true);
drop policy if exists "authenticated users can manage debts" on public.debts;
create policy "authenticated users can manage debts" on public.debts for all to authenticated using (true) with check (true);
drop policy if exists "authenticated users can manage payments" on public.payments;
create policy "authenticated users can manage payments" on public.payments for all to authenticated using (true) with check (true);
drop policy if exists "authenticated users can manage settings" on public.app_settings;
create policy "authenticated users can manage settings" on public.app_settings for all to authenticated using (true) with check (true);

alter table public.persons replica identity full;
alter table public.debts replica identity full;
alter table public.payments replica identity full;
alter table public.app_settings replica identity full;
do $$
begin
  begin alter publication supabase_realtime add table public.persons; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.debts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.payments; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.app_settings; exception when duplicate_object then null; end;
end;
$$;

create or replace function public.add_payment_and_update_debt(
  payment_id text,
  payment_debt_id text,
  payment_amount numeric,
  payment_date date,
  payment_notes text,
  payment_created_at timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  debt_row public.debts;
  paid_total numeric;
  next_status text;
begin
  select * into debt_row from public.debts where id = payment_debt_id for update;
  if not found then raise exception 'Hutang tidak ditemukan'; end if;
  select coalesce(sum(amount), 0) into paid_total from public.payments where "debtId" = payment_debt_id;
  paid_total := paid_total + payment_amount;
  next_status := case when paid_total >= debt_row.amount then 'PAID' when paid_total > 0 then 'PARTIAL' else 'ACTIVE' end;
  insert into public.payments (id, "debtId", amount, "paymentDate", notes, "createdAt") values (payment_id, payment_debt_id, payment_amount, payment_date, payment_notes, payment_created_at);
  update public.debts set status = next_status, "updatedAt" = now() where id = payment_debt_id;
  return jsonb_build_object('id', payment_id, 'debtId', payment_debt_id, 'amount', payment_amount, 'paymentDate', payment_date, 'notes', payment_notes, 'createdAt', payment_created_at);
end;
$$;

grant execute on function public.add_payment_and_update_debt(text, text, numeric, date, text, timestamptz) to authenticated;