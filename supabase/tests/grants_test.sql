-- Data API grants are explicit, not Supabase defaults. Run with: npx supabase test db
begin;
select plan(3);

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and not (has_table_privilege('service_role', c.oid, 'select')
          and has_table_privilege('service_role', c.oid, 'insert')
          and has_table_privilege('service_role', c.oid, 'update')
          and has_table_privilege('service_role', c.oid, 'delete'))),
  0,
  'service_role can read and write every public table'
);

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and not (has_table_privilege('authenticated', c.oid, 'select')
          and has_table_privilege('authenticated', c.oid, 'insert')
          and has_table_privilege('authenticated', c.oid, 'update')
          and has_table_privilege('authenticated', c.oid, 'delete'))),
  0,
  'authenticated can reach every public table (RLS decides the rows)'
);

select ok(
  has_table_privilege('anon', 'public.courses', 'select')
  and has_table_privilege('anon', 'public.layouts', 'select')
  and has_table_privilege('anon', 'public.holes', 'select'),
  'anon can read the course catalog'
);

select * from finish();
rollback;
