-- Teams. ids match NRL.com's team keys so the NRL.com sync can map fixtures.
-- Colours are approximate; no official logos are used (see README).
-- Add a team here (new migration) if the sync reports an unknown team key.
insert into public.teams (id, name, short_name, abbreviation, primary_color, secondary_color) values
  ('broncos',      'Brisbane Broncos',                  'Broncos',      'BRI', '#6A0F2E', '#F7B32B'),
  ('raiders',      'Canberra Raiders',                  'Raiders',      'CAN', '#5BBF21', '#FFFFFF'),
  ('bulldogs',     'Canterbury-Bankstown Bulldogs',     'Bulldogs',     'CBY', '#00539F', '#FFFFFF'),
  ('sharks',       'Cronulla-Sutherland Sharks',        'Sharks',       'CRO', '#00A9D8', '#111111'),
  ('dolphins',     'Dolphins',                          'Dolphins',     'DOL', '#E10A1D', '#F2C14E'),
  ('titans',       'Gold Coast Titans',                 'Titans',       'GLD', '#009FDF', '#FDB813'),
  ('sea-eagles',   'Manly Warringah Sea Eagles',        'Sea Eagles',   'MAN', '#6B0F2B', '#FFFFFF'),
  ('storm',        'Melbourne Storm',                   'Storm',        'MEL', '#632390', '#F9B11A'),
  ('knights',      'Newcastle Knights',                 'Knights',      'NEW', '#003B73', '#E1251B'),
  ('cowboys',      'North Queensland Cowboys',          'Cowboys',      'NQL', '#002B5C', '#FDB813'),
  ('eels',         'Parramatta Eels',                   'Eels',         'PAR', '#006EB5', '#FFD200'),
  ('panthers',     'Penrith Panthers',                  'Panthers',     'PEN', '#2A2A2A', '#E11F8F'),
  ('rabbitohs',    'South Sydney Rabbitohs',            'Rabbitohs',    'SOU', '#00843D', '#E4002B'),
  ('dragons',      'St George Illawarra Dragons',       'Dragons',      'STG', '#E2231A', '#FFFFFF'),
  ('roosters',     'Sydney Roosters',                   'Roosters',     'SYD', '#002B5C', '#E4002B'),
  ('warriors',     'New Zealand Warriors',              'Warriors',     'NZL', '#0E1A35', '#6CC24A'),
  ('wests-tigers', 'Wests Tigers',                      'Wests Tigers', 'WST', '#F68B1F', '#111111'),
  ('perth-bears',  'Perth Bears',                       'Bears',        'PER', '#D4202C', '#111111')
on conflict (id) do update set
  name = excluded.name, short_name = excluded.short_name, abbreviation = excluded.abbreviation,
  primary_color = excluded.primary_color, secondary_color = excluded.secondary_color;
