-- DEN-119: sandbox PyME editable, reiniciable y aislado para administradores Denarius.
alter table cashflow.tenant add column if not exists is_demo boolean not null default false;
create unique index if not exists denarius_one_demo_per_owner on cashflow.tenant(owner_id) where is_demo;
create table if not exists cashflow.demo_reset_audit(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 tenant_id uuid not null,reset_at timestamptz not null default now()
);
alter table cashflow.demo_reset_audit enable row level security;
drop policy if exists demo_reset_audit_own on cashflow.demo_reset_audit;
create policy demo_reset_audit_own on cashflow.demo_reset_audit for select to authenticated using(owner_id=auth.uid());

create or replace function cashflow.reset_denarius_demo_pyme() returns cashflow.tenant
language plpgsql security definer set search_path=cashflow,public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_tenant cashflow.tenant;v_account uuid;v_close uuid;v_today date:=current_date;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if coalesce(auth.jwt()->'app_metadata'->>'denarius_role','')<>'platform_admin' then raise exception 'ADMIN_REQUIRED';end if;
 delete from cashflow.tenant where owner_id=v_uid and is_demo=true;
 insert into cashflow.tenant(owner_id,name,business_model,business_model_source,business_model_diagnosed_at,business_profile,default_tax_rate,ppm_rate,country_code,base_currency,timezone,company_context_completed_at,financial_onboarding_completed_at,terms_accepted_at,privacy_accepted_at,legal_version,is_demo)
 values(v_uid,'Comercial Andes · Demo','pyme-tradicional','manual',now(),'{}',19,0.0125,'CL','CLP','America/Santiago',now(),now(),now(),now(),'2026-08-10',true) returning * into v_tenant;
 insert into cashflow.bank_account(tenant_id,owner_id,name,currency,current_balance)values(v_tenant.id,v_uid,'Cuenta corriente demo','CLP',0)returning id into v_account;
 insert into cashflow.transaction(account_id,owner_id,type,amount,category,transaction_date)values
 (v_account,v_uid,'IN',7200000,'Ventas',v_today-25),(v_account,v_uid,'IN',5400000,'Cobranza',v_today-12),
 (v_account,v_uid,'OUT',3100000,'Nómina',v_today-10),(v_account,v_uid,'OUT',1050000,'Operación',v_today-5);
 update cashflow.bank_account set current_balance=18450000 where id=v_account;
 insert into cashflow.invoice(tenant_id,owner_id,type,status,total_amount,currency,contact_name,issue_date,due_date,source_system)values
 (v_tenant.id,v_uid,'AR','PENDING',3200000,'CLP','Cliente Norte Demo',v_today-35,v_today-8,'MANUAL'),
 (v_tenant.id,v_uid,'AR','PENDING',3000000,'CLP','Cliente Centro Demo',v_today-15,v_today+8,'MANUAL'),
 (v_tenant.id,v_uid,'AP','PENDING',2200000,'CLP','Proveedor Demo',v_today-20,v_today+4,'MANUAL');
 insert into cashflow.recurring_transaction(tenant_id,owner_id,name,type,amount,currency,frequency,next_date)values
 (v_tenant.id,v_uid,'Nómina','OUT',3100000,'CLP','MONTHLY',v_today+20),(v_tenant.id,v_uid,'Arriendo','OUT',900000,'CLP','MONTHLY',v_today+7),(v_tenant.id,v_uid,'Ventas base','IN',6200000,'CLP','MONTHLY',v_today+15);
 insert into cashflow.unit_economics_input(tenant_id,owner_id,period,acquisition_spend,delivery_costs,units_sold,customers_acquired)values(v_tenant.id,v_uid,date_trunc('month',v_today)::date,650000,7100000,42,8);
 insert into cashflow.weekly_financial_close(tenant_id,owner_id,week_start,as_of,status,snapshot,note,closed_at)
 values(v_tenant.id,v_uid,date_trunc('week',v_today-7)::date,v_today-7,'CLOSED_WITH_RISKS',jsonb_build_object('core',jsonb_build_object('current_cash',16600000),'alerts',jsonb_build_object('summary',jsonb_build_object('critical',1,'warning',2,'info',0)),'unit_economics',jsonb_build_object('assessment','WATCH'),'checklist','[]'::jsonb),'Demo: cierre anterior con riesgos priorizados',now()-interval '7 days')returning id into v_close;
 insert into cashflow.msp_task(tenant_id,owner_id,weekly_close_id,title,priority,status,assignee,due_date,source,deep_link,expected_cash_impact)values
 (v_tenant.id,v_uid,v_close,'Cobrar factura crítica de $3,2M','URGENT','IN_PROGRESS','Gerencia',v_today+2,'WEEKLY_CLOSE','/operations#collections',3200000),
 (v_tenant.id,v_uid,v_close,'Confirmar IVA y proveedores','HIGH','OPEN','Administración',v_today+4,'WEEKLY_CLOSE','/operations#recurring',-2200000),
 (v_tenant.id,v_uid,v_close,'Proteger margen de la semana','MEDIUM','DONE','Gerencia',v_today-1,'WEEKLY_CLOSE','/weekly-close',850000);
 insert into cashflow.denarius_user_preference(owner_id,active_tenant_id)values(v_uid,v_tenant.id)on conflict(owner_id)do update set active_tenant_id=excluded.active_tenant_id,updated_at=now();
 insert into cashflow.demo_reset_audit(owner_id,tenant_id)values(v_uid,v_tenant.id);
 return v_tenant;
end $$;
revoke all on cashflow.demo_reset_audit from anon;
grant select on cashflow.demo_reset_audit to authenticated;
revoke all on function cashflow.reset_denarius_demo_pyme() from public,anon;
grant execute on function cashflow.reset_denarius_demo_pyme() to authenticated;
