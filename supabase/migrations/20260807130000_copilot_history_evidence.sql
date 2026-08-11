create table if not exists cashflow.copilot_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references cashflow.tenant(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  question text not null check(char_length(question) between 1 and 500),
  answer_summary text not null check(char_length(answer_summary) between 1 and 2000),
  tool_name text not null check(tool_name in ('get_cash_position','get_runway_and_burn','list_overdue_invoices','get_cash_projection','get_restricted_cash','explain_metric','get_financial_summary','explain_projection_point','simulate_scenario')),
  as_of date not null,
  deep_link text not null check(deep_link ~ '^/[a-z0-9/#-]+$'),
  evidence jsonb not null default '[]'::jsonb check(jsonb_typeof(evidence)='array' and jsonb_array_length(evidence)<=6),
  created_at timestamptz not null default now()
);
create index if not exists copilot_history_owner_created on cashflow.copilot_history(owner_id,tenant_id,created_at desc);
alter table cashflow.copilot_history enable row level security;
revoke all on cashflow.copilot_history from public,anon;
grant select,insert,delete on cashflow.copilot_history to authenticated;
grant all on cashflow.copilot_history to service_role;
drop policy if exists copilot_history_own on cashflow.copilot_history;
create policy copilot_history_own on cashflow.copilot_history for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());

create or replace function cashflow.save_copilot_history(p_tenant_id uuid,p_question text,p_answer_summary text,p_tool_name text,p_as_of date,p_deep_link text,p_evidence jsonb)
returns uuid language plpgsql security definer set search_path=cashflow,public,pg_temp as $$
declare v_owner uuid:=auth.uid();v_id uuid;
begin
  if v_owner is null then raise exception 'authentication_required';end if;
  if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_owner) then raise exception 'tenant_not_found';end if;
  if jsonb_typeof(p_evidence)<>'array' or jsonb_array_length(p_evidence)>6 then raise exception 'invalid_evidence';end if;
  insert into cashflow.copilot_history(tenant_id,owner_id,question,answer_summary,tool_name,as_of,deep_link,evidence)
  values(p_tenant_id,v_owner,trim(p_question),trim(p_answer_summary),p_tool_name,p_as_of,p_deep_link,p_evidence) returning id into v_id;
  return v_id;
end $$;

create or replace function cashflow.list_copilot_history(p_tenant_id uuid,p_tool_name text default null,p_limit integer default 50)
returns setof cashflow.copilot_history language sql stable security definer set search_path=cashflow,public,pg_temp as $$
  select * from cashflow.copilot_history where tenant_id=p_tenant_id and owner_id=auth.uid() and (p_tool_name is null or tool_name=p_tool_name) order by created_at desc limit least(greatest(p_limit,1),100)
$$;

create or replace function cashflow.delete_copilot_history(p_tenant_id uuid,p_entry_id uuid default null)
returns integer language plpgsql security definer set search_path=cashflow,public,pg_temp as $$
declare v_count integer;
begin
  delete from cashflow.copilot_history where tenant_id=p_tenant_id and owner_id=auth.uid() and (p_entry_id is null or id=p_entry_id);
  get diagnostics v_count=row_count;return v_count;
end $$;

revoke all on function cashflow.save_copilot_history(uuid,text,text,text,date,text,jsonb) from public,anon;
revoke all on function cashflow.list_copilot_history(uuid,text,integer) from public,anon;
revoke all on function cashflow.delete_copilot_history(uuid,uuid) from public,anon;
grant execute on function cashflow.save_copilot_history(uuid,text,text,text,date,text,jsonb) to authenticated;
grant execute on function cashflow.list_copilot_history(uuid,text,integer) to authenticated;
grant execute on function cashflow.delete_copilot_history(uuid,uuid) to authenticated;

insert into supabase_migrations.schema_migrations(version,name,statements) values('20260807130000','copilot_history_evidence',array['tenant-scoped deletable copilot history with minimal evidence and deep links']) on conflict(version) do nothing;
