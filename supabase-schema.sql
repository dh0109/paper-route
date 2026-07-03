-- 종이길 데이터베이스 스키마
-- Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요.

create table if not exists listings (
  id bigint generated always as identity primary key,
  store text not null,
  addr text not null,
  kg numeric not null default 0,
  items text default '종이박스',
  note text default '',
  status text not null default 'available', -- available | claimed | taken
  claimed_until timestamptz,
  created_at timestamptz not null default now()
);

-- 데모용 공개 정책 (심사 기간 동안 로그인 없이 읽기/쓰기 허용)
-- 실서비스 전환 시에는 점주/어르신 인증을 붙이고 정책을 좁혀야 합니다.
alter table listings enable row level security;

create policy "demo read" on listings for select using (true);
create policy "demo insert" on listings for insert with check (true);
create policy "demo update" on listings for update using (true);

-- 시드 데이터 (어르신 화면이 비어있지 않도록)
insert into listings (store, addr, kg, items, note, status) values
  ('상도곱창 본점', '상도로 214 앞', 12, '종이박스, 신문지', '납작하게 접혀 있음', 'available'),
  ('행복슈퍼', '성대로1길 7 앞', 4, '종이박스', '', 'available');
