-- DEN-131: allow trusted service-role certification teardown on Denarius-only team tables.
grant select,insert,update,delete on cashflow.denarius_team_invite,cashflow.denarius_tenant_member to service_role;
