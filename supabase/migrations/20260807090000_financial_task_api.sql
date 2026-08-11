-- API neutral para tareas financieras; conserva tablas legacy para evitar una migración destructiva.
begin;
create or replace function cashflow.create_financial_task(p_tenant_id uuid,p_title text,p_priority text,p_assignee text,p_due_date date,p_subscription_id uuid default null,p_source text default 'MANUAL')returns uuid language sql volatile security invoker set search_path=cashflow,public as $$select cashflow.create_msp_task(p_tenant_id,p_title,p_priority,p_assignee,p_due_date,p_subscription_id,p_source)$$;
create or replace function cashflow.update_financial_task_status(p_task_id uuid,p_status text,p_comment text default null)returns void language sql volatile security invoker set search_path=cashflow,public as $$select cashflow.update_msp_task_status(p_task_id,p_status,p_comment)$$;
create or replace function cashflow.comment_financial_task(p_task_id uuid,p_body text)returns void language sql volatile security invoker set search_path=cashflow,public as $$select cashflow.comment_msp_task(p_task_id,p_body)$$;
create or replace function cashflow.financial_task_workspace(p_tenant_id uuid)returns jsonb language sql stable security invoker set search_path=cashflow,public as $$select cashflow.msp_task_workspace(p_tenant_id)$$;
revoke all on function cashflow.create_financial_task(uuid,text,text,text,date,uuid,text),cashflow.update_financial_task_status(uuid,text,text),cashflow.comment_financial_task(uuid,text),cashflow.financial_task_workspace(uuid) from public,anon;
grant execute on function cashflow.create_financial_task(uuid,text,text,text,date,uuid,text),cashflow.update_financial_task_status(uuid,text,text),cashflow.comment_financial_task(uuid,text),cashflow.financial_task_workspace(uuid) to authenticated;
comment on function cashflow.create_financial_task(uuid,text,text,text,date,uuid,text) is 'API vigente de tareas financieras; reemplaza el nombre legacy create_msp_task';
insert into supabase_migrations.schema_migrations(version,name,statements)values('20260807090000','financial_task_api',array['neutral financial task API over legacy storage'])on conflict(version)do nothing;
commit;
