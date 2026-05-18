create or replace function public.spend_credits(p_amount integer)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_CREDIT_AMOUNT' using errcode = 'P0001';
  end if;

  update public.user_credits
     set balance = balance - p_amount,
         updated_at = now()
   where user_id = v_user_id
     and balance >= p_amount
   returning balance into v_balance;

  if v_balance is null then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;

  return v_balance;
end;
$$;

create or replace function public.grant_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_stripe_customer_id text default null
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_balance integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = 'P0001';
  end if;

  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED' using errcode = 'P0001';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_CREDIT_AMOUNT' using errcode = 'P0001';
  end if;

  insert into public.user_credits (user_id, balance, plan, stripe_customer_id)
  values (p_user_id, p_amount, 'free', p_stripe_customer_id)
  on conflict (user_id) do update
    set balance = public.user_credits.balance + excluded.balance,
        stripe_customer_id = coalesce(p_stripe_customer_id, public.user_credits.stripe_customer_id),
        updated_at = now()
  returning balance into v_balance;

  return v_balance;
end;
$$;

revoke all on function public.spend_credits(integer) from public;
grant execute on function public.spend_credits(integer) to authenticated;

revoke all on function public.grant_user_credits(uuid, integer, text) from public;
grant execute on function public.grant_user_credits(uuid, integer, text) to service_role;
