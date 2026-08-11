alter table cashflow.transaction
  add column if not exists import_fingerprint text,
  add column if not exists import_batch_id uuid,
  add column if not exists source_reference text;

create table if not exists cashflow.transaction_import_batch (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cashflow.tenant(id) on delete cascade,
  account_id uuid not null references cashflow.bank_account(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 180),
  total_rows integer not null check (total_rows between 1 and 500),
  inserted_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table cashflow.transaction add constraint transaction_import_batch_id_fkey
    foreign key (import_batch_id) references cashflow.transaction_import_batch(id) on delete set null;
exception when duplicate_object then null; end $$;

alter table cashflow.transaction_import_batch enable row level security;
drop policy if exists transaction_import_batch_owner on cashflow.transaction_import_batch;
create policy transaction_import_batch_owner on cashflow.transaction_import_batch
  for select to authenticated using (owner_id = auth.uid());

create or replace function cashflow.transaction_import_fingerprint(
  p_date date, p_type text, p_amount numeric, p_description text, p_reference text
) returns text language sql immutable set search_path = cashflow, public as $$
  select md5(concat_ws('|', p_date::text, upper(trim(p_type)), round(abs(p_amount), 2)::text,
    lower(regexp_replace(trim(coalesce(p_description, '')), '\s+', ' ', 'g')),
    lower(trim(coalesce(p_reference, '')))))
$$;

update cashflow.transaction
set import_fingerprint = cashflow.transaction_import_fingerprint(transaction_date, type, amount, category, source_reference)
where import_fingerprint is null;

with ranked as (
  select id, import_fingerprint, row_number() over(partition by owner_id,account_id,import_fingerprint order by created_at,id) position
  from cashflow.transaction where import_fingerprint is not null
)
update cashflow.transaction t set import_fingerprint = ranked.import_fingerprint || ':legacy:' || t.id::text
from ranked where ranked.id=t.id and ranked.position>1;

create unique index if not exists transaction_import_fingerprint_unique
  on cashflow.transaction(owner_id, account_id, import_fingerprint)
  where import_fingerprint is not null;

create or replace function cashflow.preview_transaction_import(p_account_id uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = cashflow, public as $$
declare v_owner uuid := auth.uid(); v_result jsonb;
begin
  if v_owner is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from cashflow.bank_account where id=p_account_id and owner_id=v_owner) then raise exception 'account_not_found'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 500 then raise exception 'rows_limit'; end if;

  select jsonb_agg(jsonb_build_object('row', ordinal, 'fingerprint', fingerprint,
    'duplicate', exists(select 1 from cashflow.transaction t where t.owner_id=v_owner and t.account_id=p_account_id and t.import_fingerprint=fingerprint)) order by ordinal)
  into v_result from (
    select ordinal, cashflow.transaction_import_fingerprint(
      (item->>'date')::date, item->>'type', (item->>'amount')::numeric, item->>'description', item->>'reference') fingerprint
    from jsonb_array_elements(p_rows) with ordinality r(item, ordinal)
  ) normalized;
  return coalesce(v_result, '[]'::jsonb);
end $$;

create or replace function cashflow.import_transactions_csv(p_account_id uuid, p_file_name text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = cashflow, public as $$
declare v_owner uuid := auth.uid(); v_tenant uuid; v_batch uuid; v_item jsonb; v_fp text; v_inserted int := 0; v_duplicates int := 0; v_count int;
begin
  if v_owner is null then raise exception 'authentication_required'; end if;
  select tenant_id into v_tenant from cashflow.bank_account where id=p_account_id and owner_id=v_owner;
  if v_tenant is null then raise exception 'account_not_found'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'rows_required'; end if;
  v_count := jsonb_array_length(p_rows);
  if v_count < 1 or v_count > 500 then raise exception 'rows_limit'; end if;
  if char_length(trim(p_file_name)) < 1 or char_length(p_file_name) > 180 then raise exception 'invalid_file_name'; end if;

  insert into cashflow.transaction_import_batch(tenant_id,account_id,owner_id,file_name,total_rows)
  values(v_tenant,p_account_id,v_owner,trim(p_file_name),v_count) returning id into v_batch;

  for v_item in select value from jsonb_array_elements(p_rows) loop
    if coalesce(v_item->>'type','') not in ('IN','OUT') or (v_item->>'amount')::numeric <= 0 then raise exception 'invalid_row'; end if;
    v_fp := cashflow.transaction_import_fingerprint((v_item->>'date')::date,v_item->>'type',(v_item->>'amount')::numeric,v_item->>'description',v_item->>'reference');
    insert into cashflow.transaction(account_id,owner_id,amount,type,category,transaction_date,source_reference,import_fingerprint,import_batch_id)
    values(p_account_id,v_owner,abs((v_item->>'amount')::numeric),v_item->>'type',nullif(trim(v_item->>'description'),''),(v_item->>'date')::date,nullif(trim(v_item->>'reference'),''),v_fp,v_batch)
    on conflict (owner_id,account_id,import_fingerprint) where import_fingerprint is not null do nothing;
    if found then v_inserted:=v_inserted+1; else v_duplicates:=v_duplicates+1; end if;
  end loop;

  update cashflow.transaction_import_batch set inserted_rows=v_inserted,duplicate_rows=v_duplicates where id=v_batch;
  return jsonb_build_object('batch_id',v_batch,'inserted',v_inserted,'duplicates',v_duplicates,'total',v_count);
end $$;

revoke all on function cashflow.preview_transaction_import(uuid,jsonb) from public;
revoke all on function cashflow.import_transactions_csv(uuid,text,jsonb) from public;
grant execute on function cashflow.preview_transaction_import(uuid,jsonb) to authenticated;
grant execute on function cashflow.import_transactions_csv(uuid,text,jsonb) to authenticated;
grant select on cashflow.transaction_import_batch to authenticated;
