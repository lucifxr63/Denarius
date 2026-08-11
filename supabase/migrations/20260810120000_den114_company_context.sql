-- DEN-114: contexto mínimo y consentimiento versionado para altas nuevas.
alter table cashflow.tenant add column if not exists country_code text,add column if not exists base_currency text,add column if not exists timezone text,add column if not exists company_context_completed_at timestamptz,add column if not exists terms_accepted_at timestamptz,add column if not exists privacy_accepted_at timestamptz,add column if not exists legal_version text;
update cashflow.tenant set country_code=coalesce(country_code,'CL'),base_currency=coalesce(base_currency,'CLP'),timezone=coalesce(timezone,'America/Santiago'),company_context_completed_at=coalesce(company_context_completed_at,now()) where company_context_completed_at is null and created_at<now();
create or replace function cashflow.save_company_context(p_tenant_id uuid,p_name text,p_country_code text,p_base_currency text,p_timezone text,p_accept_terms boolean,p_accept_privacy boolean,p_legal_version text)
returns cashflow.tenant language plpgsql security definer set search_path=cashflow,public,pg_temp as $$declare v_tenant cashflow.tenant;begin
 if auth.uid()is null then raise exception'authentication_required';end if;if char_length(trim(p_name))not between 2 and 120 then raise exception'invalid_company_name';end if;
 if p_country_code<>'CL'or p_base_currency<>'CLP'or p_timezone<>'America/Santiago'then raise exception'unsupported_company_context';end if;
 if not p_accept_terms or not p_accept_privacy or p_legal_version<>'2026-08-10'then raise exception'consent_required';end if;
 update cashflow.tenant set name=trim(p_name),country_code=p_country_code,base_currency=p_base_currency,timezone=p_timezone,company_context_completed_at=now(),terms_accepted_at=now(),privacy_accepted_at=now(),legal_version=p_legal_version,updated_at=now()where id=p_tenant_id and owner_id=auth.uid()returning*into v_tenant;
 if v_tenant.id is null then raise exception'tenant_not_found';end if;return v_tenant;end$$;
revoke all on function cashflow.save_company_context(uuid,text,text,text,text,boolean,boolean,text)from public,anon;grant execute on function cashflow.save_company_context(uuid,text,text,text,text,boolean,boolean,text)to authenticated;
