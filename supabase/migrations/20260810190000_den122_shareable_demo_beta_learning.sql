-- DEN-122: demos provisionables por cualquier usuario autenticado de la beta.
-- Las funciones siguen creando datos únicamente con auth.uid(); RLS y owner_id aíslan cada copia.
do $$ declare v_ddl text; begin
  select pg_get_functiondef('cashflow.reset_denarius_demo_pyme()'::regprocedure) into v_ddl;
  v_ddl := replace(v_ddl, 'if coalesce(auth.jwt()->''app_metadata''->>''denarius_role'','''')<>''platform_admin'' then raise exception ''ADMIN_REQUIRED'';end if;', '');
  execute v_ddl;
  select pg_get_functiondef('cashflow.reset_denarius_demo_startup()'::regprocedure) into v_ddl;
  v_ddl := replace(v_ddl, 'if coalesce(auth.jwt()->''app_metadata''->>''denarius_role'','''')<>''platform_admin''then raise exception''ADMIN_REQUIRED'';end if;', '');
  execute v_ddl;
end $$;
comment on function cashflow.reset_denarius_demo_pyme() is 'Provisions an isolated PyME demo copy for the authenticated closed-beta user.';
comment on function cashflow.reset_denarius_demo_startup() is 'Provisions an isolated Startup demo copy for the authenticated closed-beta user.';
