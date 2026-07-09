-- Cleanup orphan course rows after seed upserted canonical slugs/layouts.
-- Replaces layout-move approach: seed migration already created correct rows on canonical courses.

delete from public.courses
where slug in (
  'puhalepa-dg-park',
  'vooremae-discgolfi-park',
  'holstre-polli-kollane-discgolfipark',
  'holstre-polli-discgolfi-park',
  'korvemaa-discgolfi-park',
  'korvemaa-discgolfipark-pro',
  'kunda-discgolfi-park-edasijoudnute',
  'kunda-discgolfi-park-harjutus'
);
