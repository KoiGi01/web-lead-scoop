-- A prediction is now ONE bet on ONE market:
--   result — only Home/Draw/Away picked (pred_outcome); no scoreline
--   exact  — only the scoreline picked (pred_home/pred_away)
-- So the scoreline columns become nullable and we record the bet type + outcome.
alter table public.worldcup_predictions
  alter column pred_home drop not null,
  alter column pred_away drop not null;

alter table public.worldcup_predictions
  add column if not exists bet_type text,
  add column if not exists pred_outcome text;

alter table public.worldcup_predictions
  drop constraint if exists worldcup_predictions_bet_type_check;
alter table public.worldcup_predictions
  add constraint worldcup_predictions_bet_type_check
  check (bet_type is null or bet_type in ('result', 'exact'));

alter table public.worldcup_predictions
  drop constraint if exists worldcup_predictions_pred_outcome_check;
alter table public.worldcup_predictions
  add constraint worldcup_predictions_pred_outcome_check
  check (pred_outcome is null or pred_outcome in ('home', 'draw', 'away'));
