create or replace function cashflow.update_financial_action_details(p_task_id uuid,p_assignee text,p_due_date date,p_expected_cash_impact numeric)
returns void language plpgsql security definer set search_path=cashflow,public,pg_temp as $$declare v_uid uuid:=auth.uid();v_task cashflow.msp_task;begin
 select*into v_task from cashflow.msp_task where id=p_task_id and owner_id=v_uid and source='WEEKLY_CLOSE'for update;
 if v_task.id is null then raise exception'action_not_found';end if;
 if char_length(trim(coalesce(p_assignee,'')))not between 2 and 120 then raise exception'invalid_assignee';end if;
 if p_due_date is null then raise exception'due_date_required';end if;
 if p_expected_cash_impact is not null and abs(p_expected_cash_impact)>1000000000000000 then raise exception'invalid_cash_impact';end if;
 update cashflow.msp_task set assignee=trim(p_assignee),due_date=p_due_date,expected_cash_impact=p_expected_cash_impact,updated_at=now()where id=p_task_id;
 insert into cashflow.msp_task_activity(tenant_id,owner_id,task_id,activity_type,body)values(v_task.tenant_id,v_uid,p_task_id,'COMMENT','Responsable, vencimiento e impacto esperado actualizados');
end$$;
revoke all on function cashflow.update_financial_action_details(uuid,text,date,numeric)from public,anon;grant execute on function cashflow.update_financial_action_details(uuid,text,date,numeric)to authenticated;
