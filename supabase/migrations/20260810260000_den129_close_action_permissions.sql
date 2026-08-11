-- DEN-129: safely reuse owner-scoped financial RPCs for authorized members.
create or replace function cashflow.denarius_run_as_tenant_owner(p_tenant_id uuid,p_permission text,p_operation text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=cashflow,public,pg_temp as $$
declare v_caller uuid:=auth.uid();v_owner uuid;v_result jsonb;
begin
 if v_caller is null then raise exception'authentication_required';end if;
 if not cashflow.denarius_has_permission(p_tenant_id,p_permission) then raise exception'permission_denied';end if;
 select owner_id into v_owner from cashflow.tenant where id=p_tenant_id;
 if v_owner is null then raise exception'tenant_not_found';end if;
 perform set_config('request.jwt.claim.sub',v_owner::text,true);
 case p_operation
  when'alerts.read'then v_result:=cashflow.financial_alert_center(p_tenant_id,coalesce((p_payload->>'as_of')::date,current_date));
  when'close.read'then v_result:=cashflow.weekly_close_workspace(p_tenant_id,coalesce((p_payload->>'as_of')::date,current_date));
  when'close.inputs.read'then v_result:=cashflow.unit_economics_input_context(p_tenant_id,p_payload->>'period');
  when'close.inputs'then perform cashflow.save_unit_economics_input(p_tenant_id,p_payload->>'period',(p_payload->>'acquisition_spend')::numeric,(p_payload->>'delivery_costs')::numeric,(p_payload->>'units_sold')::integer,(p_payload->>'customers_acquired')::integer);v_result:='{"ok":true}'::jsonb;
  when'close.complete'then v_result:=cashflow.complete_weekly_close_with_plan(p_tenant_id,(p_payload->>'as_of')::date,true,p_payload->>'note');
  when'action.read'then v_result:=cashflow.financial_action_plan_workspace(p_tenant_id);
  when'action.outcome'then v_result:=cashflow.weekly_action_outcome(p_tenant_id);
  else raise exception'operation_not_allowed';
 end case;
 perform set_config('request.jwt.claim.sub',v_caller::text,true);
 return v_result;
exception when others then perform set_config('request.jwt.claim.sub',v_caller::text,true);raise;
end$$;

create or replace function cashflow.denarius_update_action_status(p_task_id uuid,p_status text,p_comment text default null)
returns void language plpgsql security definer set search_path=cashflow,public,pg_temp as $$declare v_caller uuid:=auth.uid();v_owner uuid;v_tenant uuid;begin
 select tenant_id,owner_id into v_tenant,v_owner from cashflow.msp_task where id=p_task_id and source='WEEKLY_CLOSE';
 if v_tenant is null or not(cashflow.denarius_has_permission(v_tenant,'close.manage')or cashflow.denarius_has_permission(v_tenant,'operations.write'))then raise exception'permission_denied';end if;
 perform set_config('request.jwt.claim.sub',v_owner::text,true);perform cashflow.update_financial_task_status(p_task_id,p_status,p_comment);perform set_config('request.jwt.claim.sub',v_caller::text,true);
exception when others then perform set_config('request.jwt.claim.sub',v_caller::text,true);raise;end$$;

create or replace function cashflow.denarius_update_action_details(p_task_id uuid,p_assignee text,p_due_date date,p_expected_cash_impact numeric)
returns void language plpgsql security definer set search_path=cashflow,public,pg_temp as $$declare v_caller uuid:=auth.uid();v_owner uuid;v_tenant uuid;begin
 select tenant_id,owner_id into v_tenant,v_owner from cashflow.msp_task where id=p_task_id and source='WEEKLY_CLOSE';
 if v_tenant is null or not cashflow.denarius_has_permission(v_tenant,'close.manage')then raise exception'permission_denied';end if;
 perform set_config('request.jwt.claim.sub',v_owner::text,true);perform cashflow.update_financial_action_details(p_task_id,p_assignee,p_due_date,p_expected_cash_impact);perform set_config('request.jwt.claim.sub',v_caller::text,true);
exception when others then perform set_config('request.jwt.claim.sub',v_caller::text,true);raise;end$$;

revoke all on function cashflow.denarius_run_as_tenant_owner(uuid,text,text,jsonb),cashflow.denarius_update_action_status(uuid,text,text),cashflow.denarius_update_action_details(uuid,text,date,numeric) from public,anon;
grant execute on function cashflow.denarius_run_as_tenant_owner(uuid,text,text,jsonb),cashflow.denarius_update_action_status(uuid,text,text),cashflow.denarius_update_action_details(uuid,text,date,numeric) to authenticated;
