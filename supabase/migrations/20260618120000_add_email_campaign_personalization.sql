alter table public.email_campaigns
  add column if not exists signature text not null default '',
  add column if not exists image_url text,
  add column if not exists font_family text not null default 'Arial, sans-serif';
