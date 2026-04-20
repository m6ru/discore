insert into public.courses (name, location, lat, lng, details, slug, source_url)
values (
  'Coolbet Järve Discgolfipark',
  'Järve, Harjumaa',
  59.3766653,
  24.7484086,
  'Eesti populaarseim discgolfipark. Disc Golf Fanatics MTÜ, +372 53734097, info@discgolffanatics.com',
  'jarve',
  'https://www.discgolfirajad.ee/park/coolbet-jarve-discgolfipark-pro-18/'
);

insert into public.layouts (course_id, name, total_par, total_distance_m, slug, map_url)
values (
  (select id from public.courses where name = 'Coolbet Järve Discgolfipark' limit 1),
  'Pro 18',
  62,
  2092,
  'pro-18',
  'https://www.discgolfirajad.ee/wp-content/uploads/2019/05/jarve-pro-rada.png'
);

insert into public.holes (layout_id, hole_number, par, distance_m, notes)
select
  (
    select l.id
    from public.layouts l
    join public.courses c on l.course_id = c.id
    where l.slug = 'pro-18'
    and c.slug = 'jarve'
    limit 1
  ),
  hole_number, par, distance_m, notes
from (values
  (1,  4, 163, 'OB vasakul - Tavaline OB reegel.'),
  (2,  3,  88, null),
  (3,  4, 124, null),
  (4,  3,  82, null),
  (5,  3,  83, null),
  (6,  3, 107, null),
  (7,  4, 175, 'MANDATORY - Kohustuslik rajapunkt. Mängida mööda paremalt. Eksimuse korral tuleb suunduda Drop Zone''i. Pro tiialalt mandoni 67m. Drop Zone''st korvini 112m.'),
  (8,  3,  79, 'SAARERADA - Avavise peab maanduma tähistatud saarel. Eksimuse korral tuleb suunduda Drop Zone''i ja lisandub +1 vise tulemusele. Drop Zone''st ja edasi kehtib tavaline OB reegel. Saareni 50m, Drop Zone''st korvi 22m. OB korvist vasakul ~9m ja taga ~7m.'),
  (9,  3, 101, null),
  (10, 4, 162, null),
  (11, 4, 128, null),
  (12, 3,  85, null),
  (13, 4, 148, 'OB vasakul ja paremal (punased tokid). Eksimuse korral kehtib tavaline OB reegel. Lisandub +1 vise tulemusele. HAZARD ala (märgistatud kollaste tokkidega) - alale sattudes jätkad mängu sealt, kus ketas maandus. Lisandub +1 vise tulemusele. Tiialalt HZ''ni ~96m, üle Hazardi ~122m.'),
  (14, 3,  84, null),
  (15, 3, 101, null),
  (16, 4, 151, null),
  (17, 4, 155, 'OB vasakul, paremal ning korvi taga. Eksimuse korral kehtib tavaline OB reegel. Lisandub +1 vise tulemusele.'),
  (18, 3,  76, 'Avavise peab jõudma üle OB ala (punased tokid). Eksimuse korral tuleb suunduda Drop Zone''i ja lisandub +1 vise tulemusele. Tiialalt üle OB ala ~50 meetrit.')
) as t(hole_number, par, distance_m, notes);
