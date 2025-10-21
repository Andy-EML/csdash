-- Adds support for muted device warnings and per-supply order workflow

-- Enum for warning scope (device-level vs per toner colour)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'warning_scope') then
    create type warning_scope as enum ('all', 'black', 'cyan', 'magenta', 'yellow', 'waste');
  end if;
end $$;

-- Table to track dismissed warnings per device
create table if not exists device_warning_overrides (
  id uuid primary key default gen_random_uuid(),
  device_id text references "Gas_Gage"(device_id),
  serial_number text not null,
  scope warning_scope not null default 'all',
  dismissed_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_device_warning_overrides_serial_scope
  on device_warning_overrides (serial_number, scope);

-- Simple trigger to keep updated_at in sync
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_device_warning_overrides_updated_at
  on device_warning_overrides;

create trigger set_device_warning_overrides_updated_at
  before update on device_warning_overrides
  for each row
  execute procedure set_updated_at();
