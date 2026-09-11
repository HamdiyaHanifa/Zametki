-- ============================================================
--  Настройка базы для приложения «Заметки»
--  Открыть в Supabase: SQL Editor -> New query -> вставить -> Run
--  Запускается один раз.
-- ============================================================

-- 1. Таблица: одна строка на одного пользователя.
--    В поле data лежат все холсты, заметки и корзина целиком.
create table if not exists public.zametki_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2. Включаем защиту на уровне строк.
--    Без неё любой человек в интернете смог бы прочитать чужие заметки,
--    потому что ключ приложения виден в коде сайта.
alter table public.zametki_state enable row level security;

-- 3. Правила: каждый видит и меняет ТОЛЬКО свою строку.
drop policy if exists "свои заметки: читать" on public.zametki_state;
create policy "свои заметки: читать"
  on public.zametki_state for select
  using (auth.uid() = user_id);

drop policy if exists "свои заметки: создавать" on public.zametki_state;
create policy "свои заметки: создавать"
  on public.zametki_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "свои заметки: изменять" on public.zametki_state;
create policy "свои заметки: изменять"
  on public.zametki_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "свои заметки: удалять" on public.zametki_state;
create policy "свои заметки: удалять"
  on public.zametki_state for delete
  using (auth.uid() = user_id);

-- 4. Проверка: должно вернуть rowsecurity = true
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'zametki_state';
