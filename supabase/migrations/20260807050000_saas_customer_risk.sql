create or replace function cashflow.saas_customer_risk(p_tenant_id uuid)
returns jsonb language plpgsql stable security invoker set search_path=cashflow,public as $$
declare v_uid uuid:=auth.uid(); v_total numeric; v_accounts jsonb; v_top1 numeric; v_top3 numeric; v_risk numeric; v_risk_count int;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from cashflow.tenant where id=p_tenant_id and owner_id=v_uid) then raise exception 'tenant_not_found'; end if;
  select coalesce(sum(current_mrr),0) into v_total from cashflow.saas_subscription where tenant_id=p_tenant_id and owner_id=v_uid and status='ACTIVE';
  with customer_base as (
    select c.id,c.name,sum(s.current_mrr) mrr,
      (select e.event_type from cashflow.saas_mrr_event e join cashflow.saas_subscription se on se.id=e.subscription_id where se.customer_id=c.id and e.owner_id=v_uid order by e.effective_date desc,e.created_at desc limit 1) last_event,
      (select max(e.effective_date) from cashflow.saas_mrr_event e join cashflow.saas_subscription se on se.id=e.subscription_id where se.customer_id=c.id and e.owner_id=v_uid) last_event_date,
      exists(select 1 from cashflow.saas_mrr_event e join cashflow.saas_subscription se on se.id=e.subscription_id where se.customer_id=c.id and e.owner_id=v_uid and e.event_type='CONTRACTION' and e.effective_date>=current_date-90) recent_contraction
    from cashflow.saas_customer c join cashflow.saas_subscription s on s.customer_id=c.id and s.status='ACTIVE'
    where c.tenant_id=p_tenant_id and c.owner_id=v_uid group by c.id,c.name
  ), scored as (
    select *,case when v_total>0 then mrr/v_total else 0 end share,
      greatest(0,100-(case when recent_contraction then 35 else 0 end)-(case when v_total>0 and mrr/v_total>=.4 then 30 when v_total>0 and mrr/v_total>=.2 then 15 else 0 end)) score
    from customer_base
  )
  select coalesce(jsonb_agg(jsonb_build_object('customer_id',id,'customer',name,'mrr',mrr,'share',share,'score',score,
    'risk_level',case when score<55 then 'HIGH' when score<80 then 'MEDIUM' else 'LOW' end,
    'last_event',last_event,'last_event_date',last_event_date,
    'reasons',jsonb_strip_nulls(jsonb_build_object('recent_contraction',case when recent_contraction then true end,'concentration',case when share>=.2 then true end))) order by score asc,mrr desc),'[]'::jsonb),
    coalesce(max(share),0),coalesce(sum(mrr) filter(where score<80),0),count(*) filter(where score<80)
  into v_accounts,v_top1,v_risk,v_risk_count from scored;
  with ranked as (select sum(current_mrr) mrr from cashflow.saas_subscription where tenant_id=p_tenant_id and owner_id=v_uid and status='ACTIVE' group by customer_id order by mrr desc limit 3)
  select case when v_total>0 then coalesce(sum(mrr),0)/v_total else 0 end into v_top3 from ranked;
  return jsonb_build_object('total_mrr',v_total,'top_customer_concentration',v_top1,'top_three_concentration',v_top3,'at_risk_mrr',v_risk,'at_risk_customers',v_risk_count,'accounts',v_accounts);
end $$;
revoke all on function cashflow.saas_customer_risk(uuid) from public;
grant execute on function cashflow.saas_customer_risk(uuid) to authenticated;
