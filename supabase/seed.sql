-- Local development only. Teams are loaded by migration 20261122000100_teams.sql.

-- DEMO fixtures for local development only (season 2027, dated relative to
-- now: round 1 finished last week, round 2 starts in 2 days, round 3 next
-- week). Delete these before importing the real draw:
--   delete from public.fixtures where external_id like 'demo-%';
with pairs(round, idx, home, away, home_score, away_score) as (values
  (1, 0, 'storm', 'panthers', 18, 16), (1, 1, 'broncos', 'roosters', 24, 30),
  (1, 2, 'sharks', 'eels', 22, 12), (1, 3, 'rabbitohs', 'dragons', 20, 20),
  (1, 4, 'cowboys', 'titans', 34, 10), (1, 5, 'knights', 'raiders', 14, 26),
  (1, 6, 'warriors', 'sea-eagles', 28, 6), (1, 7, 'bulldogs', 'wests-tigers', 16, 12),
  (2, 0, 'panthers', 'broncos', null, null), (2, 1, 'roosters', 'rabbitohs', null, null),
  (2, 2, 'eels', 'bulldogs', null, null), (2, 3, 'dragons', 'sharks', null, null),
  (2, 4, 'titans', 'dolphins', null, null), (2, 5, 'raiders', 'storm', null, null),
  (2, 6, 'sea-eagles', 'cowboys', null, null), (2, 7, 'wests-tigers', 'warriors', null, null),
  (3, 0, 'storm', 'broncos', null, null), (3, 1, 'dolphins', 'panthers', null, null),
  (3, 2, 'sharks', 'roosters', null, null), (3, 3, 'rabbitohs', 'eels', null, null),
  (3, 4, 'knights', 'cowboys', null, null), (3, 5, 'bulldogs', 'raiders', null, null),
  (3, 6, 'warriors', 'titans', null, null), (3, 7, 'wests-tigers', 'dragons', null, null)
)
insert into public.fixtures
  (season, round, home_team_id, away_team_id, kickoff_at, venue, status, home_score, away_score, external_id)
select 2027, p.round, p.home, p.away,
       date_trunc('hour', now())
         + make_interval(days => (p.round - 1) * 7 - 5)   -- r1: -5d, r2: +2d, r3: +9d
         + make_interval(hours => p.idx * 6),             -- games 6h apart
       null,
       case when p.home_score is not null then 'completed' else 'scheduled' end,
       p.home_score, p.away_score,
       'demo-' || p.round || '-' || p.idx
from pairs p
on conflict (external_id) do nothing;
