alter table cashflow.tenant add column if not exists financial_onboarding_completed_at timestamptz;

create or replace function cashflow.complete_financial_onboarding(
  p_tenant_id uuid, p_account_name text, p_opening_balance numeric,
  p_monthly_income numeric, p_monthly_costs numeric,
  p_first_projection_date date default current_date
) returns jsonb language plpgsql security definer set search_path = cashflow, public as $$
declare v_owner uuid := auth.uid(); v_account_id uuid;
begin
  if v_owner is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_owner) then raise exception 'tenant_not_found'; end if;
  if exists(select 1 from cashflow.bank_account where tenant_id=p_tenant_id and owner_id=v_owner) then raise exception 'onboarding_already_completed'; end if;
  if char_length(trim(p_account_name)) < 1 or char_length(p_account_name) > 80 then raise exception 'invalid_account_name'; end if;
  if p_opening_balance < 0 or p_monthly_income < 0 or p_monthly_costs < 0 then raise exception 'negative_amount'; end if;
  if p_monthly_income = 0 and p_monthly_costs = 0 then raise exception 'projection_requires_cashflow'; end if;
  if p_first_projection_date < current_date or p_first_projection_date > current_date + 62 then raise exception 'invalid_projection_date'; end if;

  insert into cashflow.bank_account(tenant_id,owner_id,name,currency,current_balance)
  values(p_tenant_id,v_owner,trim(p_account_name),'CLP',round(p_opening_balance,2)) returning id into v_account_id;
  if p_monthly_income > 0 then
    insert into cashflow.recurring_transaction(tenant_id,owner_id,type,name,amount,frequency,next_date,currency)
    values(p_tenant_id,v_owner,'IN','Ingresos mensuales estimados',round(p_monthly_income,2),'MONTHLY',p_first_projection_date,'CLP');
  end if;
  if p_monthly_costs > 0 then
    insert into cashflow.recurring_transaction(tenant_id,owner_id,type,name,amount,frequency,next_date,currency)
    values(p_tenant_id,v_owner,'OUT','Costos fijos mensuales',round(p_monthly_costs,2),'MONTHLY',p_first_projection_date,'CLP');
  end if;
  update cashflow.tenant set financial_onboarding_completed_at=now(),updated_at=now() where id=p_tenant_id and owner_id=v_owner;
  return jsonb_build_object('account_id',v_account_id,'completed_at',now(),'projection_date',p_first_projection_date);
end $$;

revoke all on function cashflow.complete_financial_onboarding(uuid,text,numeric,numeric,numeric,date) from public;
grant execute on function cashflow.complete_financial_onboarding(uuid,text,numeric,numeric,numeric,date) to authenticated;
