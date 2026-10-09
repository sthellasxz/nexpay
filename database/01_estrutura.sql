-- =====================================================================
-- NexPay — estrutura do banco de dados (PostgreSQL / Supabase)
-- Baseado no diagrama da documentação do Projeto Integrador.
-- Usuários, senhas criptografadas e tokens ficam a cargo do Supabase Auth
-- (tabela auth.users); aqui guardamos só o perfil de cada usuário.
-- =====================================================================

-- ---------- Tipos ----------
create type public.tipo_dispositivo as enum ('maquininha', 'celular');
create type public.tipo_taxa as enum ('debito', 'credito_vista', 'credito_parcelado', 'pix');
create type public.tipo_usuario as enum ('admin', 'comum');

-- ---------- Marcas ----------
create table public.marcas (
  id                   bigint generated always as identity primary key,
  nome                 text not null unique,
  slug                 text not null unique,
  descricao            text,
  grupo                text,                       -- empresa/banco dono da marca
  participacao_mercado text,
  avaliacao            numeric(2,1) check (avaliacao between 0 and 5),
  total_usuarios       text,
  fundacao             smallint,
  site_url             text,
  imagem_url           text,
  cor                  text,                       -- cor da marca (hex) para os cards
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table public.vantagens_marcas (
  id         bigint generated always as identity primary key,
  marca_id   bigint not null references public.marcas(id) on delete cascade,
  vantagem   text not null,
  created_at timestamptz not null default now()
);
create index vantagens_marcas_marca_idx on public.vantagens_marcas (marca_id);

-- ---------- Maquininhas (inclui apps de celular / tap to pay) ----------
create table public.maquininhas (
  id                    bigint generated always as identity primary key,
  marca_id              bigint not null references public.marcas(id) on delete cascade,
  modelo                text not null,
  slug                  text not null unique,
  tipo                  public.tipo_dispositivo not null default 'maquininha',
  descricao             text,
  imagem_url            text,
  fonte_url             text,                      -- de onde vieram as taxas/preço
  preco                 numeric(10,2) not null default 0 check (preco >= 0),
  aluguel_mensal        numeric(10,2) not null default 0 check (aluguel_mensal >= 0),
  conexao               text[] not null default '{}',  -- ex.: {chip,wifi,bluetooth,nfc}
  imprime_comprovante   boolean not null default false,
  aceita_pix            boolean not null default true,
  precisa_celular       boolean not null default false,
  prazo_recebimento     text,
  requisitos            text,
  publico               text,                      -- PF, PJ, PF e PJ
  avaliacao             numeric(2,1) check (avaliacao between 0 and 5),
  volume_mensal         text check (volume_mensal in ('pequeno', 'medio', 'grande')),
  popular               boolean not null default false,
  pros                  text[] not null default '{}',
  contras               text[] not null default '{}',
  observacao_taxas      text,
  taxas_atualizadas_em  date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index maquininhas_marca_idx on public.maquininhas (marca_id);

-- ---------- Taxas ----------
-- credito_parcelado usa a coluna parcelas (2 a 12); os demais tipos ficam com parcelas nula.
create table public.taxas (
  id            bigint generated always as identity primary key,
  maquininha_id bigint not null references public.maquininhas(id) on delete cascade,
  tipo          public.tipo_taxa not null,
  parcelas      smallint check (parcelas between 2 and 12),
  valor         numeric(5,2) not null check (valor >= 0),
  descricao     text,
  created_at    timestamptz not null default now(),
  constraint taxas_parcelas_ok check ((tipo = 'credito_parcelado') = (parcelas is not null)),
  constraint taxas_unica unique nulls not distinct (maquininha_id, tipo, parcelas)
);

-- ---------- Especificações técnicas ----------
create table public.especificacoes (
  id            bigint generated always as identity primary key,
  maquininha_id bigint not null references public.maquininhas(id) on delete cascade,
  tipo          text not null,                     -- Tela, Bateria, Peso...
  valor         text not null,
  created_at    timestamptz not null default now()
);
create index especificacoes_maquininha_idx on public.especificacoes (maquininha_id);

-- ---------- Recursos (N:N) ----------
create table public.recursos (
  id         bigint generated always as identity primary key,
  nome       text not null unique,
  descricao  text,
  created_at timestamptz not null default now()
);

create table public.maquininha_recursos (
  maquininha_id bigint not null references public.maquininhas(id) on delete cascade,
  recurso_id    bigint not null references public.recursos(id) on delete cascade,
  primary key (maquininha_id, recurso_id)
);
create index maquininha_recursos_recurso_idx on public.maquininha_recursos (recurso_id);

-- ---------- Tipos de negócio (N:N) ----------
create table public.tipos_negocio (
  id         bigint generated always as identity primary key,
  nome       text not null unique,
  slug       text not null unique,
  descricao  text,
  created_at timestamptz not null default now()
);

create table public.maquininha_tipo_negocio (
  maquininha_id   bigint not null references public.maquininhas(id) on delete cascade,
  tipo_negocio_id bigint not null references public.tipos_negocio(id) on delete cascade,
  primary key (maquininha_id, tipo_negocio_id)
);
create index maquininha_tipo_negocio_tipo_idx on public.maquininha_tipo_negocio (tipo_negocio_id);

-- ---------- Usuários (perfil ligado ao Supabase Auth) ----------
create table public.perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text,
  tipo       public.tipo_usuario not null default 'comum',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.favoritos (
  usuario_id    uuid not null references public.perfis(id) on delete cascade,
  maquininha_id bigint not null references public.maquininhas(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (usuario_id, maquininha_id)
);
create index favoritos_maquininha_idx on public.favoritos (maquininha_id);

-- ---------- Logs de recomendações ----------
create table public.logs_recomendacoes (
  id                        bigint generated always as identity primary key,
  usuario_id                uuid references auth.users(id) on delete set null,
  tipo_negocio              text,
  faturamento_mensal        numeric(12,2),
  ticket_medio              numeric(12,2),
  local_venda               text,
  conectividade             text,
  orcamento                 numeric(10,2),
  prioridade                text,
  mix_pagamentos            jsonb,               -- % débito, crédito, parcelado, pix
  maquininha_recomendada_id bigint references public.maquininhas(id) on delete set null,
  pontuacao                 integer,
  compatibilidade           numeric(5,2),
  custo_mensal_estimado     numeric(12,2),
  created_at                timestamptz not null default now()
);
create index logs_recomendacoes_maquininha_idx on public.logs_recomendacoes (maquininha_recomendada_id);
create index logs_recomendacoes_usuario_idx on public.logs_recomendacoes (usuario_id);

-- ---------- Contato ----------
create table public.contatos (
  id         bigint generated always as identity primary key,
  nome       text not null check (char_length(nome) between 2 and 100),
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  assunto    text check (char_length(assunto) <= 150),
  mensagem   text not null check (char_length(mensagem) between 5 and 3000),
  lida       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Logs do registro (alterações feitas no painel admin) ----------
create table public.logs_admin (
  id          bigint generated always as identity primary key,
  tabela      text not null,
  acao        text not null,                      -- INSERT, UPDATE, DELETE
  registro_id text,
  usuario_id  uuid,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- Funções e gatilhos
-- =====================================================================

-- Atualiza updated_at automaticamente
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger marcas_updated_at before update on public.marcas
  for each row execute function public.set_updated_at();
create trigger maquininhas_updated_at before update on public.maquininhas
  for each row execute function public.set_updated_at();
create trigger perfis_updated_at before update on public.perfis
  for each row execute function public.set_updated_at();

-- Verifica se quem está logado é administrador
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and tipo = 'admin'
  );
$$;

-- Cria o perfil automaticamente quando alguém se cadastra
create function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil();

-- Registra no log toda alteração de catálogo (RF013 / Logs do Registro)
create function public.registrar_log() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.logs_admin (tabela, acao, registro_id, usuario_id)
  values (tg_table_name, tg_op,
          case when tg_op = 'DELETE' then old.id::text else new.id::text end,
          auth.uid());
  return coalesce(new, old);
end $$;

create trigger log_marcas after insert or update or delete on public.marcas
  for each row execute function public.registrar_log();
create trigger log_maquininhas after insert or update or delete on public.maquininhas
  for each row execute function public.registrar_log();
create trigger log_taxas after insert or update or delete on public.taxas
  for each row execute function public.registrar_log();

revoke execute on function public.criar_perfil() from public, anon, authenticated;
revoke execute on function public.registrar_log() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- =====================================================================
-- Segurança (Row Level Security)
-- =====================================================================
alter table public.marcas                  enable row level security;
alter table public.vantagens_marcas        enable row level security;
alter table public.maquininhas             enable row level security;
alter table public.taxas                   enable row level security;
alter table public.especificacoes          enable row level security;
alter table public.recursos                enable row level security;
alter table public.maquininha_recursos     enable row level security;
alter table public.tipos_negocio           enable row level security;
alter table public.maquininha_tipo_negocio enable row level security;
alter table public.perfis                  enable row level security;
alter table public.favoritos               enable row level security;
alter table public.logs_recomendacoes      enable row level security;
alter table public.contatos                enable row level security;
alter table public.logs_admin              enable row level security;

-- Catálogo: todo mundo lê, só admin altera
do $$
declare t text;
begin
  foreach t in array array['marcas','vantagens_marcas','maquininhas','taxas','especificacoes',
                           'recursos','maquininha_recursos','tipos_negocio','maquininha_tipo_negocio']
  loop
    execute format('create policy "leitura publica" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "admin insere" on public.%I for insert to authenticated with check ((select public.is_admin()))', t);
    execute format('create policy "admin edita" on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('create policy "admin exclui" on public.%I for delete to authenticated using ((select public.is_admin()))', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Perfis: cada um vê o seu (admin vê todos) e só pode mudar o próprio nome
create policy "ver perfil" on public.perfis for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "editar proprio perfil" on public.perfis for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant select on public.perfis to authenticated;
grant update (nome) on public.perfis to authenticated;

-- Favoritos: só do próprio usuário
create policy "meus favoritos" on public.favoritos for all to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
grant select, insert, delete on public.favoritos to authenticated;

-- Recomendações: qualquer visitante registra; admin vê todas, usuário vê as suas
create policy "registrar recomendacao" on public.logs_recomendacoes for insert to anon, authenticated
  with check (usuario_id is null or usuario_id = (select auth.uid()));
create policy "ver recomendacoes" on public.logs_recomendacoes for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.is_admin()));
grant insert on public.logs_recomendacoes to anon, authenticated;
grant select on public.logs_recomendacoes to authenticated;

-- Contato: qualquer visitante envia; só admin lê, marca como lida e exclui
create policy "enviar contato" on public.contatos for insert to anon, authenticated
  with check (lida = false);
create policy "admin le contatos" on public.contatos for select to authenticated
  using ((select public.is_admin()));
create policy "admin edita contatos" on public.contatos for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin exclui contatos" on public.contatos for delete to authenticated
  using ((select public.is_admin()));
grant insert on public.contatos to anon, authenticated;
grant select, update, delete on public.contatos to authenticated;

-- Logs do registro: só admin lê (quem grava é o gatilho)
create policy "admin le logs" on public.logs_admin for select to authenticated
  using ((select public.is_admin()));
grant select on public.logs_admin to authenticated;

-- is_admin só é usada por quem está logado (o painel admin chama via /rpc/is_admin)
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
