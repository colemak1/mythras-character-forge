-- Separate campaign rules from the mutable combat/session tracker.
-- Existing campaigns retain NULL (unconfigured) until their GM chooses.
alter table public.campaigns add column if not exists rules_settings jsonb;
