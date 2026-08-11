-- DEN-106: unit economics explícitos y cierre semanal auditable.
create table if not exists cashflow.unit_economics_input(
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references cashflow.tenant(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,period date not null,
  acquisition_spend numeric(18,2) not null default 0 check(acquisition_spend>=0),
  delivery_costs numeric(18,2) not null default 0 check(delivery_costs>=0),
  units_sold numeric(18,2) check(units_sold>0),customers_acquired integer check(customers_acquired>0),
  updated_at timestamptz not null default now(),unique(tenant_id,period)
);
create table if not exists cashflow.weekly_financial_close(
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references cashflow.tenant(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,week_start date not null,as_of date not null,
  status text not null check(status in('CLOSED','CLOSED_WITH_RISKS')),snapshot jsonb not null,
  note text check(note is null or char_length(note)<=500),closed_at timestamptz not null default now(),unique(tenant_id,week_start)
);
alter table cashflow.unit_economics_input enable row level security;alter table cashflow.weekly_financial_close enable row level security;
drop policy if exists cf_unit_economics_input_own on cashflow.unit_economics_input;create policy cf_unit_economics_input_own on cashflow.unit_economics_input for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists cf_weekly_financial_close_own on cashflow.weekly_financial_close;create policy cf_weekly_financial_close_own on cashflow.weekly_financial_close for select to authenticated using(owner_id=auth.uid());
revoke all on cashflow.unit_economics_input,cashflow.weekly_financial_close from public,anon;grant select on cashflow.unit_economics_input,cashflow.weekly_financial_close to authenticated;

create or replace function cashflow.save_unit_economics_input(p_tenant_id uuid,p_period text,p_acquisition_spend numeric,p_delivery_costs numeric,p_units_sold numeric default null,p_customers_acquired integer default null)
returns void language plpgsql security definer set search_path=cashflow,public,pg_temp as $$ declare v_uid uuid:=auth.uid();v_period date:=to_date(p_period||'-01','YYYY-MM-DD');begin
 if v_uid is null then raise exception 'authentication_required';end if;if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_uid)then raise exception 'tenant_not_found';end if;
 if p_acquisition_spend<0 or p_delivery_costs<0 or coalesce(p_units_sold,1)<=0 or coalesce(p_customers_acquired,1)<=0 then raise exception 'invalid_input';end if;
 insert into cashflow.unit_economics_input(tenant_id,owner_id,period,acquisition_spend,delivery_costs,units_sold,customers_acquired)values(p_tenant_id,v_uid,v_period,p_acquisition_spend,p_delivery_costs,p_units_sold,p_customers_acquired)
 on conflict(tenant_id,period)do update set acquisition_spend=excluded.acquisition_spend,delivery_costs=excluded.delivery_costs,units_sold=excluded.units_sold,customers_acquired=excluded.customers_acquired,updated_at=now();end $$;

create or replace function cashflow.unit_economics(p_tenant_id uuid,p_period text default to_char(current_date,'YYYY-MM'))
returns jsonb language plpgsql stable security invoker set search_path=cashflow,public as $$
declare v_uid uuid:=auth.uid();v_model text;v_start date:=to_date(p_period||'-01','YYYY-MM-DD');v_end date:=(v_start+interval '1 month')::date;v_acq numeric;v_delivery numeric;v_units numeric;v_acquired int;v_revenue numeric:=0;v_customers int:=0;v_new int:=0;v_churn numeric;v_arpa numeric;v_margin numeric;v_cac numeric;v_ltv numeric;v_ratio numeric;v_payback numeric;v_missing text[]:='{}';v_assessment text:='INCOMPLETE';v_reasons jsonb:='[]';
begin
 select business_model into v_model from cashflow.tenant where id=p_tenant_id and owner_id=v_uid;if v_model is null then raise exception 'tenant_not_found';end if;
 select acquisition_spend,delivery_costs,units_sold,customers_acquired into v_acq,v_delivery,v_units,v_acquired from cashflow.unit_economics_input where tenant_id=p_tenant_id and owner_id=v_uid and period=v_start;
 if v_acq is null then v_missing:=array_append(v_missing,'acquisition_spend');v_missing:=array_append(v_missing,'delivery_costs');v_acq:=0;v_delivery:=0;end if;
 if v_model='startup-saas' then
  select coalesce(sum(current_mrr),0),count(distinct customer_id) into v_revenue,v_customers from cashflow.saas_subscription where tenant_id=p_tenant_id and owner_id=v_uid and status='ACTIVE';
  select count(distinct s.customer_id) into v_new from cashflow.saas_mrr_event e join cashflow.saas_subscription s on s.id=e.subscription_id where e.tenant_id=p_tenant_id and e.owner_id=v_uid and e.event_type in('NEW','REACTIVATION') and e.effective_date>=v_start and e.effective_date<v_end;
  v_new:=coalesce(v_acquired,v_new);select coalesce((cashflow.saas_retention_metrics(p_tenant_id,1)#>>'{current,logo_churn}')::numeric,null) into v_churn;
  v_arpa:=case when v_customers>0 then v_revenue/v_customers end;v_margin:=case when v_revenue>0 then (v_revenue-v_delivery)/v_revenue end;v_cac:=case when v_new>0 then v_acq/v_new end;
  v_ltv:=case when v_churn>0 and v_arpa is not null then v_arpa*v_margin/v_churn end;v_ratio:=case when v_cac>0 and v_ltv is not null then v_ltv/v_cac end;v_payback:=case when v_arpa*v_margin>0 then v_cac/(v_arpa*v_margin) end;
  if v_customers=0 then v_missing:=array_append(v_missing,'active_customers');end if;if v_new=0 then v_missing:=array_append(v_missing,'customers_acquired');end if;if v_churn is null or v_churn=0 then v_missing:=array_append(v_missing,'measurable_logo_churn');end if;
  if cardinality(v_missing)=0 then if v_margin>0 and v_ratio>=3 and v_payback<=12 and v_churn<=.05 then v_assessment:='HEALTHY';v_reasons:=jsonb_build_array('LTV/CAC ≥ 3','Payback ≤ 12 meses','Churn mensual ≤ 5%');elsif v_margin<=0 or v_ratio<1 or v_payback>24 then v_assessment:='UNVIABLE';v_reasons:=jsonb_build_array('La economía por cliente no recupera adecuadamente su costo');else v_assessment:='WATCH';v_reasons:=jsonb_build_array('La unidad contribuye, pero aún no cumple todos los umbrales saludables');end if;end if;
 elsif v_model='pyme-tradicional' then
  select coalesce(sum(total_amount),0) into v_revenue from cashflow.invoice where tenant_id=p_tenant_id and owner_id=v_uid and type='AR' and status<>'CANCELLED' and issue_date>=v_start and issue_date<v_end;
  if v_units is null then v_missing:=array_append(v_missing,'units_sold');end if;if v_acquired is null then v_missing:=array_append(v_missing,'customers_acquired');end if;
  v_arpa:=case when v_acquired>0 then v_revenue/v_acquired end;v_margin:=case when v_revenue>0 then(v_revenue-v_delivery)/v_revenue end;v_cac:=case when v_acquired>0 then v_acq/v_acquired end;v_ratio:=case when v_cac>0 then(v_arpa-v_cac)/v_cac end;
  if cardinality(v_missing)=0 then if v_revenue>0 and v_margin>=.3 and coalesce(v_arpa-v_cac,0)>0 then v_assessment:='HEALTHY';v_reasons:=jsonb_build_array('Margen de contribución ≥ 30%','Ingreso por cliente supera CAC');elsif v_revenue=0 or v_margin<=0 or coalesce(v_arpa-v_cac,0)<=0 then v_assessment:='UNVIABLE';v_reasons:=jsonb_build_array('La contribución por unidad o cliente no cubre su costo');else v_assessment:='WATCH';v_reasons:=jsonb_build_array('Existe contribución positiva, pero el margen todavía es estrecho');end if;end if;
 else raise exception 'unsupported_business_model';end if;
 return jsonb_build_object('period',p_period,'business_model',v_model,'assessment',v_assessment,'reasons',v_reasons,'missing_inputs',to_jsonb(v_missing),'metrics',jsonb_build_object('revenue_or_mrr',v_revenue,'active_customers',v_customers,'customers_acquired',coalesce(v_acquired,v_new),'units_sold',v_units,'acquisition_spend',v_acq,'delivery_costs',v_delivery,'arpa',v_arpa,'gross_or_contribution_margin',v_margin,'cac',v_cac,'ltv',v_ltv,'ltv_cac_ratio',v_ratio,'cac_payback_months',v_payback));
end $$;

create or replace function cashflow.weekly_close_workspace(p_tenant_id uuid,p_as_of date default current_date)
returns jsonb language plpgsql stable security invoker set search_path=cashflow,public as $$ declare v_uid uuid:=auth.uid();v_core jsonb;v_alerts jsonb;v_unit jsonb;v_history jsonb;begin
 if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_uid)then raise exception 'tenant_not_found';end if;v_core:=cashflow.financial_core_metrics(p_tenant_id,p_as_of);v_alerts:=cashflow.financial_alert_center(p_tenant_id,p_as_of);v_unit:=cashflow.unit_economics(p_tenant_id,to_char(p_as_of,'YYYY-MM'));
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'week_start',week_start,'as_of',as_of,'status',status,'snapshot',snapshot,'note',note,'closed_at',closed_at)order by week_start desc),'[]')into v_history from(select * from cashflow.weekly_financial_close where tenant_id=p_tenant_id and owner_id=v_uid order by week_start desc limit 12)h;
 return jsonb_build_object('week_start',date_trunc('week',p_as_of)::date,'as_of',p_as_of,'core',v_core,'alerts',v_alerts,'unit_economics',v_unit,'checklist',jsonb_build_array(jsonb_build_object('id','data','label','Revisar caja y burn','done',true),jsonb_build_object('id','alerts','label','Revisar alertas críticas','done',coalesce((v_alerts#>>'{summary,critical}')::int,0)=0),jsonb_build_object('id','economics','label','Completar unit economics','done',v_unit->>'assessment'<>'INCOMPLETE')),'history',v_history);end $$;

create or replace function cashflow.complete_weekly_close(p_tenant_id uuid,p_as_of date,p_acknowledged boolean,p_note text default null)
returns uuid language plpgsql security definer set search_path=cashflow,public,pg_temp as $$ declare v_uid uuid:=auth.uid();v_workspace jsonb;v_id uuid;v_critical int;begin
 if not p_acknowledged then raise exception 'acknowledgement_required';end if;if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_uid)then raise exception 'tenant_not_found';end if;v_workspace:=cashflow.weekly_close_workspace(p_tenant_id,p_as_of);v_critical:=coalesce((v_workspace#>>'{alerts,summary,critical}')::int,0);
 insert into cashflow.weekly_financial_close(tenant_id,owner_id,week_start,as_of,status,snapshot,note)values(p_tenant_id,v_uid,date_trunc('week',p_as_of)::date,p_as_of,case when v_critical>0 then'CLOSED_WITH_RISKS'else'CLOSED'end,v_workspace-'history',nullif(trim(p_note),''))on conflict(tenant_id,week_start)do update set as_of=excluded.as_of,status=excluded.status,snapshot=excluded.snapshot,note=excluded.note,closed_at=now() returning id into v_id;return v_id;end $$;

revoke all on function cashflow.save_unit_economics_input(uuid,text,numeric,numeric,numeric,integer),cashflow.unit_economics(uuid,text),cashflow.weekly_close_workspace(uuid,date),cashflow.complete_weekly_close(uuid,date,boolean,text) from public,anon;
grant execute on function cashflow.save_unit_economics_input(uuid,text,numeric,numeric,numeric,integer),cashflow.unit_economics(uuid,text),cashflow.weekly_close_workspace(uuid,date),cashflow.complete_weekly_close(uuid,date,boolean,text) to authenticated;
