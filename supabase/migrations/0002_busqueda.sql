-- Función de búsqueda vectorial para el generador de casos por RAG.
-- Corre esto DESPUÉS de 0001_init.sql.

create or replace function buscar_fragmentos(
  query_embedding vector(1024),
  area_filtro text,
  limite int default 8
)
returns table (
  fragmento_id uuid,
  fuente_id uuid,
  titulo text,
  url_o_doi text,
  texto text,
  similitud double precision
)
language sql stable
as $$
  select
    ff.id as fragmento_id,
    f.id as fuente_id,
    f.titulo,
    f.url_o_doi,
    ff.texto,
    1 - (ff.embedding <=> query_embedding) as similitud
  from fuentes_fragmentos ff
  join fuentes f on f.id = ff.fuente_id
  where f.area = area_filtro
    and f.aprobada = true
    and ff.embedding is not null
  order by ff.embedding <=> query_embedding
  limit limite;
$$;
