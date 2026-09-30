create extension if not exists pgcrypto;

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  phone text,
  email text,
  map_url text,
  map_embed_url text,
  image text,
  hero_images jsonb not null default '[]'::jsonb,
  facilities jsonb not null default '[]'::jsonb,
  admission_status text not null default 'Open' check (admission_status in ('Open', 'Limited Seats', 'Waitlist', 'Closed')),
  description text,
  faculty jsonb not null default '[]'::jsonb,
  gallery jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fees (
  id uuid primary key default gen_random_uuid(),
  level text not null,
  admission_fee numeric not null default 0 check (admission_fee >= 0),
  monthly_tuition numeric not null default 0 check (monthly_tuition >= 0),
  annual_charges numeric not null default 0 check (annual_charges >= 0),
  transport_fee numeric not null default 0 check (transport_fee >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_name text not null check (char_length(student_name) between 1 and 80),
  parent_name text not null check (char_length(parent_name) between 1 and 80),
  phone text not null check (phone ~ '^[0-9+() -]{7,18}$'),
  email text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  preferred_date date not null,
  preferred_time text not null,
  branch_id uuid not null references public.branches(id),
  branch_name text not null,
  visitors integer not null default 2 check (visitors between 1 and 10),
  message text not null default '' check (char_length(message) <= 600),
  status text not null default 'Pending' check (status in ('Pending', 'Confirmed', 'Rejected')),
  admin_note text not null default '' check (char_length(admin_note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.validate_booking_date()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.preferred_date < current_date then
    raise exception 'Preferred date cannot be in the past.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_booking_date on public.bookings;
create trigger validate_booking_date before insert on public.bookings
for each row execute function public.validate_booking_date();

alter table public.branches enable row level security;
alter table public.fees enable row level security;
alter table public.bookings enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "Public can read branches" on public.branches;
create policy "Public can read branches" on public.branches for select to anon, authenticated using (true);
drop policy if exists "Admins manage branches" on public.branches;
create policy "Admins manage branches" on public.branches for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read fees" on public.fees;
create policy "Public can read fees" on public.fees for select to anon, authenticated using (true);
drop policy if exists "Admins manage fees" on public.fees;
create policy "Admins manage fees" on public.fees for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Visitors can request tours" on public.bookings;
create policy "Visitors can request tours" on public.bookings for insert to anon, authenticated with check (status = 'Pending' and admin_note = '');
drop policy if exists "Admins read bookings" on public.bookings;
create policy "Admins read bookings" on public.bookings for select to authenticated using (public.is_admin());
drop policy if exists "Admins update bookings" on public.bookings;
create policy "Admins update bookings" on public.bookings for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read own admin record" on public.admin_users;
create policy "Admins read own admin record" on public.admin_users for select to authenticated using (user_id = auth.uid());

grant select on public.branches, public.fees to anon, authenticated;
grant insert on public.bookings to anon, authenticated;
grant select, update on public.bookings to authenticated;
grant select on public.admin_users to authenticated;
grant insert, update, delete on public.branches, public.fees to authenticated;

do $$
begin
  if not exists (select 1 from public.branches) then
    insert into public.branches (name, address, phone, email, map_url, map_embed_url, image, hero_images, facilities, admission_status, description, faculty, gallery) values
    ('Vidyaroopa Discovery Kids - Panjabari', 'Panjabari, Guwahati, Assam', '+91 93654 52984, +91 98643 71474', 'vidyarupadiscoverykids14@gmail.com', 'https://maps.app.goo.gl/Y1VPP8zC3BMXEj3V', 'https://www.google.com/maps?q=Vidyaroopa%20Discovery%20Kids%20Panjabari&output=embed', '/images/real/exercise-class.jpg', '["/images/real/exercise-class.jpg", "/images/real/group-activity.jpg", "/images/real/flower-craft.jpg"]', '["Safe and colourful classrooms", "Outdoor play area", "Indoor activity zone", "CCTV surveillance", "Child-safe furniture", "Play and learning materials", "Hygiene and child-friendly washrooms", "Smart learning facilities", "Extra curricular activities", "Kindergarten course for ages 2 to 6 years"]', 'Open', 'A warm pre-school branch focused on playful discovery, foundational language, early numeracy, social confidence, and safe daily routines.', '[{"name":"Branch Coordinator","role":"Pre-school Lead","qualification":"Early Childhood Education","experience":"Experienced"},{"name":"Activity Mentor","role":"Creative Learning","qualification":"Child Development Training","experience":"Experienced"},{"name":"Care Team","role":"Student Support","qualification":"First-aid and Safety Trained","experience":"Experienced"}]', '["/images/real/exercise-class.jpg", "/images/real/group-activity.jpg", "/images/real/flower-craft.jpg"]'),
    ('Vidyaroopa Discovery Kids Pre-school - Hatigaon', 'House No. 1, Bylane 2, opposite Ramibha Madhav / Amravati Marriage Hall, Hatigaon Main Road, opposite Repose, Hatigaon, Guwahati, Assam 781038', '+91 98640 47447, +91 98641 34913', 'vidyarupadiscoverykids14@gmail.com', 'https://share.google/06qCGudxcNoj2rNow', 'https://www.google.com/maps?q=Vidyaroopa%20Discovery%20Kids%20Pre-school%20Hatigaon%20Guwahati%20781038&output=embed', '/images/real/group-activity.jpg', '["/images/real/group-activity.jpg", "/images/real/activity-painting.jpg", "/images/real/independence-day.jpg"]', '["Safe and colourful classrooms", "Outdoor play area", "Indoor activity zone", "CCTV surveillance", "Child-safe furniture", "Play and learning materials", "Hygiene and child-friendly washrooms", "Smart learning facilities", "Extra curricular activities", "Kindergarten course for ages 2 to 6 years", "Open from 9:00 AM to 1:30 PM", "Established since 2008"]', 'Limited Seats', 'At Vidyaroopa Discovery Kids Pre-school, we provide a safe, secure and nurturing environment where children learn through engaging, play-based activities. Our early childhood care and education approach is designed to spark curiosity, creativity and a love for learning.', '[{"name":"Branch Coordinator","role":"Pre-school Lead","qualification":"Early Childhood Education","experience":"Experienced"},{"name":"Language Mentor","role":"Phonics and Storytelling","qualification":"Pre-primary Teaching Training","experience":"Experienced"},{"name":"Care Team","role":"Student Support","qualification":"First-aid and Safety Trained","experience":"Experienced"}]', '["/images/real/group-activity.jpg", "/images/real/activity-painting.jpg", "/images/real/flower-craft.jpg", "/images/real/independence-day.jpg", "/images/real/exercise-class.jpg"]'),
    ('Vidyaroopa Discovery Kids - Morigaon', 'Morigaon, Assam', '+91 80119 89182', 'vidyarupadiscoverykids14@gmail.com', 'https://share.google/IS84v9euN0qvX68mw', 'https://www.google.com/maps?q=Vidyaroopa%20Discovery%20Kids%20Morigaon&output=embed', '/images/real/independence-day.jpg', '["/images/real/independence-day.jpg", "/images/real/flower-craft.jpg", "/images/real/exercise-class.jpg"]', '["Safe and colourful classrooms", "Outdoor play area", "Indoor activity zone", "CCTV surveillance", "Child-safe furniture", "Play and learning materials", "Hygiene and child-friendly washrooms", "Smart learning facilities", "Extra curricular activities", "Kindergarten course for ages 2 to 6 years"]', 'Open', 'A nurturing pre-school branch for discovery-based learning, guided play, social development, and school readiness.', '[{"name":"Branch Coordinator","role":"Pre-school Lead","qualification":"Early Childhood Education","experience":"Experienced"},{"name":"Activity Mentor","role":"Sensorial Learning","qualification":"Pre-primary Teaching Training","experience":"Experienced"},{"name":"Care Team","role":"Student Support","qualification":"First-aid and Safety Trained","experience":"Experienced"}]', '["/images/real/independence-day.jpg", "/images/real/flower-craft.jpg", "/images/real/exercise-class.jpg"]');
  end if;

  if not exists (select 1 from public.fees) then
    insert into public.fees (level, admission_fee, monthly_tuition, annual_charges, transport_fee, note) values
    ('Pre-school / Kindergarten', 10000, 1600, 0, 0, 'For regular pre-school program'),
    ('Daycare - Panjabari', 6000, 7500, 0, 0, 'Monthly daycare fee'),
    ('Daycare - Panjabari Per Day', 0, 300, 0, 0, 'Per-day daycare option');
  end if;
end;
$$;
