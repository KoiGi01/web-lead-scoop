-- Two-tier promo prize: correct result wins a 50% discount, exact score wins a
-- free month. Records which tier (if any) a prediction was awarded.
alter table public.worldcup_predictions
  add column if not exists prize text;

alter table public.worldcup_predictions
  drop constraint if exists worldcup_predictions_prize_check;

alter table public.worldcup_predictions
  add constraint worldcup_predictions_prize_check
  check (prize is null or prize in ('free_month', 'half_off'));
