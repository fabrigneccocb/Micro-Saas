-- Esquema inicial — Simulador de casos de psicología (MVP, área clínica)
-- Corre esto en Supabase: Dashboard → SQL Editor → pega y ejecuta.
-- Ver white paper, sección 3.2 (arquitectura de datos).

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ===================== Perfiles =====================
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  rol text not null default 'estudiante' check (rol in ('estudiante', 'psicologo_asesor', 'admin')),
  theta_clinica double precision not null default 0,  -- habilidad estimada (modelo Elo, ver src/adaptativo/elo.ts)
  creado_en timestamptz not null default now()
);
alter table perfiles enable row level security;
create policy "perfiles: el usuario ve y edita el suyo"
  on perfiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ===================== Biblioteca de fuentes (RAG) =====================
create table if not exists fuentes (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('clinica', 'educativa', 'organizacional', 'forense')),
  titulo text not null,
  url_o_doi text,
  tipo text not null default 'articulo' check (tipo in ('manual', 'articulo', 'caso_publicado', 'guia')),
  texto_completo text not null,            -- el documento ya limpio, lo que se trocea para RAG
  cargado_por uuid references perfiles(id),
  aprobada boolean not null default false, -- lista blanca: nada se usa hasta que un psicólogo asesor la aprueba
  creado_en timestamptz not null default now()
);
create index if not exists fuentes_area_idx on fuentes(area);

create table if not exists fuentes_fragmentos (
  id uuid primary key default gen_random_uuid(),
  fuente_id uuid not null references fuentes(id) on delete cascade,
  orden int not null,
  texto text not null,
  embedding vector(1024),  -- voyage-3.5 = 1024 dimensiones; ajustar si cambias de modelo de embeddings
  creado_en timestamptz not null default now()
);
create index if not exists fuentes_fragmentos_embedding_idx
  on fuentes_fragmentos using hnsw (embedding vector_cosine_ops);

-- ===================== Casos =====================
create table if not exists casos (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('clinica', 'educativa', 'organizacional', 'forense')),
  subcategoria text not null,
  modo text not null check (modo in ('predeterminado', 'libre')),
  variables_libres jsonb,                  -- solo si modo = 'libre'
  generado_por text not null default 'rag-v1',
  dificultad double precision not null default 0, -- delta del modelo Elo (ver 3.2.4)
  contenido jsonb not null,                -- persona, modelo_cognitivo, divulgacion, riesgo, principios, formulacion_referencia
  fuentes_citadas jsonb not null,          -- [{fuente_id, fragmento_id, fragmento_usado}]
  verificado_muestreo boolean not null default false,
  reutilizaciones int not null default 0,
  creado_en timestamptz not null default now()
);
create index if not exists casos_area_subcat_idx on casos(area, subcategoria, modo);

-- ===================== Sesiones y turnos =====================
create table if not exists sesiones (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references perfiles(id) on delete cascade,
  caso_id uuid not null references casos(id),
  estado text not null default 'en_curso' check (estado in ('en_curso', 'pausada_crisis', 'cerrada')),
  iniciada_en timestamptz not null default now(),
  cerrada_en timestamptz
);
alter table sesiones enable row level security;
create policy "sesiones: el estudiante ve y crea las suyas"
  on sesiones for all
  using (auth.uid() = estudiante_id)
  with check (auth.uid() = estudiante_id);

create table if not exists turnos (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references sesiones(id) on delete cascade,
  orden int not null,
  autor text not null check (autor in ('estudiante', 'consultante', 'sistema')),
  contenido text not null,
  marcado_riesgo boolean not null default false,
  creado_en timestamptz not null default now()
);
create index if not exists turnos_sesion_idx on turnos(sesion_id, orden);
alter table turnos enable row level security;
create policy "turnos: visibles solo para el dueño de la sesión"
  on turnos for all
  using (exists (select 1 from sesiones s where s.id = sesion_id and s.estudiante_id = auth.uid()))
  with check (exists (select 1 from sesiones s where s.id = sesion_id and s.estudiante_id = auth.uid()));

-- ===================== Evaluaciones =====================
create table if not exists evaluaciones (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null unique references sesiones(id) on delete cascade,
  formulacion_estudiante text not null,
  cie11_estudiante text,
  resultado jsonb not null,       -- { puntaje, por_criterio: [...], citas_del_caso: [...] }
  modelo_evaluador text not null,
  creado_en timestamptz not null default now()
);
alter table evaluaciones enable row level security;
create policy "evaluaciones: visibles solo para el dueño de la sesión"
  on evaluaciones for all
  using (exists (select 1 from sesiones s where s.id = sesion_id and s.estudiante_id = auth.uid()))
  with check (exists (select 1 from sesiones s where s.id = sesion_id and s.estudiante_id = auth.uid()));

-- ===================== Auditoría de fidelidad por muestreo =====================
create table if not exists auditorias_fidelidad (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references casos(id),
  revisado_por uuid references perfiles(id),
  fiel_a_la_fuente boolean,
  notas text,
  creado_en timestamptz not null default now()
);

-- Nota: las tablas fuentes, fuentes_fragmentos y casos NO llevan RLS por fila de usuario
-- (son contenido compartido entre todos los estudiantes). Restringe su escritura a
-- rol psicologo_asesor/admin a nivel de API (ver src/app/api/admin/*), no aquí.
