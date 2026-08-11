create or replace function cashflow.preview_transaction_import(p_account_id uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = cashflow, public as $$
declare v_owner uuid := auth.uid(); v_result jsonb;
begin
  if v_owner is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from cashflow.bank_account where id=p_account_id and owner_id=v_owner) then raise exception 'account_not_found'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 500 then raise exception 'rows_limit'; end if;

  select jsonb_agg(jsonb_build_object('row', ordinal, 'fingerprint', fingerprint,
    'duplicate', occurrence > 1 or exists(select 1 from cashflow.transaction t where t.owner_id=v_owner and t.account_id=p_account_id and t.import_fingerprint=fingerprint)) order by ordinal)
  into v_result from (
    select ordinal, fingerprint, row_number() over(partition by fingerprint order by ordinal) occurrence
    from (
      select ordinal, cashflow.transaction_import_fingerprint(
        (item->>'date')::date, item->>'type', (item->>'amount')::numeric, item->>'description', item->>'reference') fingerprint
      from jsonb_array_elements(p_rows) with ordinality r(item, ordinal)
    ) fingerprints
  ) normalized;
  return coalesce(v_result, '[]'::jsonb);
end $$;

revoke all on function cashflow.preview_transaction_import(uuid,jsonb) from public;
grant execute on function cashflow.preview_transaction_import(uuid,jsonb) to authenticated;
