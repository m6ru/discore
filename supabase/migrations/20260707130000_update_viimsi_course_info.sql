-- Update Viimsi discgolfipark address and operator contact (seed upserts do not overwrite location/details).
update public.courses
set
  location = 'Linnakumetsa, Lubja küla, Viimsi vald, Harju maakond',
  details = E'Viimsi Discgolf MTÜ\n+372 5866 3727\nViimsidiscgolfclub@gmail.com'
where slug = 'viimsi-discgolfipark';
