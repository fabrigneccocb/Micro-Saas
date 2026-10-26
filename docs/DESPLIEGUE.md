# Manual de despliegue — paso a paso

Esto asume que no tienes ninguna cuenta creada todavía. Sigue el orden: cada
paso te da un valor que necesitas pegar en `.env.local` (para probar en tu
computador) y luego en Vercel (para que quede publicado).

No necesitas tocar código para nada de esto — solo copiar y pegar valores.

---

## 0. Lo que vas a tener al final

- La app corriendo en una URL pública de Vercel (gratis para empezar).
- Una base de datos en Supabase (gratis para empezar).
- Los agentes de IA corriendo con tu propia cuenta de Anthropic (pagas por uso,
  ver white paper sección 1.7 — unos pocos centavos por sesión de estudiante).
- Pagos con Wompi (opcional al principio — puedes probar sin cobrar primero).

---

## 1. Cuenta de Anthropic (los agentes de IA)

1. Ve a [console.anthropic.com](https://console.anthropic.com) y crea una cuenta.
2. Agrega un método de pago en **Settings → Billing** (los agentes cobran por uso, no hay plan gratuito ilimitado).
3. Ve a **Settings → API Keys → Create Key**. Dale un nombre como `simulador-prod`.
4. Copia la clave (empieza con `sk-ant-...`) — **solo se muestra una vez**. Guárdala en un lugar seguro.
5. Esa clave va en la variable `ANTHROPIC_API_KEY`.

## 2. Cuenta de Voyage AI (embeddings para la búsqueda RAG)

Anthropic no tiene su propia API de embeddings; usamos Voyage AI, que es el socio que ellos mismos recomiendan.

1. Ve a [dash.voyageai.com](https://dash.voyageai.com) y crea una cuenta (tiene capa gratuita generosa para empezar).
2. Ve a **API Keys** y crea una.
3. Esa clave va en `VOYAGE_API_KEY`.

## 3. Supabase (base de datos, autenticación, almacenamiento)

1. Ve a [supabase.com](https://supabase.com) → **Start your project** → crea cuenta (puedes entrar con GitHub, el mismo usuario `fabrigneccocb`).
2. **New project**. Nombre: `simulador-casos-psicologia`. Elige una contraseña de base de datos fuerte y **guárdala** (la pide Supabase, no la necesitas para las variables de entorno). Región: la más cercana a Colombia (normalmente `us-east-1` o similar, Supabase te la muestra).
3. Espera ~2 minutos a que se cree el proyecto.
4. Ve a **Project Settings (ícono de engranaje) → Data API**. Copia:
   - **Project URL** → va en `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → va en `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Ve a **Project Settings → API Keys → Service role** (o "secret"). Copia esa clave → va en `SUPABASE_SERVICE_ROLE_KEY`. **Nunca la pongas en código que corre en el navegador ni la subas a un repo público sin cifrar** — ya está excluida en `.gitignore` porque vive solo en `.env.local` y en las variables de entorno de Vercel.
6. Ve a **SQL Editor** (menú izquierdo). Abre, en este orden, cada archivo de `supabase/migrations/` de este repositorio, pega su contenido completo, y dale **Run**:
   1. `0001_init.sql`
   2. `0002_busqueda.sql`
   3. `0003_trigger_perfil.sql`
7. Ve a **Authentication → Providers** y confirma que **Email** está habilitado (lo está por defecto).
8. (Opcional pero recomendado) En **Authentication → Email Templates**, puedes personalizar el correo de confirmación más adelante; para probar, el que viene por defecto funciona.

### Convertirte en "psicólogo asesor" (para cargar fuentes en `/admin/fuentes`)

1. Regístrate normalmente en tu propia app una vez esté corriendo (paso 6).
2. En Supabase, ve a **Table Editor → perfiles**, busca tu fila (por tu correo, en la tabla `auth.users` si no reconoces el id), y cambia la columna `rol` de `estudiante` a `psicologo_asesor`.
3. O corre en el **SQL Editor**:
   ```sql
   update perfiles set rol = 'psicologo_asesor' where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
   ```

## 4. Probar en tu computador (opcional, antes de publicar)

Necesitas [Node.js](https://nodejs.org) instalado (versión 20 o más reciente).

```bash
git clone https://github.com/fabrigneccocb/micro-saas.git
cd micro-saas
cp .env.example .env.local
# abre .env.local y pega los valores que ya copiaste arriba
npm install
npm run dev
```

Abre `http://localhost:3000`.

## 5. Vercel (publicar la app)

1. Ve a [vercel.com](https://vercel.com) → **Sign up** → entra con tu cuenta de GitHub `fabrigneccocb`.
2. **Add New → Project**. Busca y selecciona el repositorio `micro-saas`.
3. En **Environment Variables**, pega TODAS las variables de `.env.example` con sus valores reales (las mismas que pusiste en `.env.local`). Hazlo para los tres entornos (Production, Preview, Development) — Vercel te deja marcarlos todos a la vez.
4. Click **Deploy**. Toma 1-3 minutos.
5. Cuando termine, te da una URL como `micro-saas-tuusuario.vercel.app`. Esa es tu app pública.

## 6. Cargar la primera fuente y probar el flujo completo

1. Entra a tu URL de Vercel, **Crear cuenta**, confirma el correo.
2. Conviértete en psicólogo asesor (paso 3, sección "Convertirte en...").
3. Ve a `/admin/fuentes`, carga una fuente real de psicología clínica (puedes copiar un artículo académico de acceso abierto, un capítulo de guía clínica, etc. — texto completo, no solo el resumen).
4. Apriétale **Aprobar**.
5. Ve a `/areas` → Clínica debería aparecer habilitada ahora.
6. Elige una subcategoría, modo predeterminado, y empieza una entrevista de prueba.

## 7. Wompi (pagos) — cuando quieras empezar a cobrar

1. Ve a [comercios.wompi.co](https://comercios.wompi.co) y crea una cuenta de comercio (pide NIT o cédula, y datos bancarios para que te paguen).
2. En el panel, ve a **Desarrolladores → Llaves API**. En modo "Sandbox" (pruebas) ya tienes llaves de prueba automáticamente.
3. Copia la **Llave pública** → `PAYMENT_PUBLIC_KEY`, la **Llave privada** → `PAYMENT_PRIVATE_KEY`, y el **Secreto de eventos** (para webhooks) → `PAYMENT_WEBHOOK_SECRET`.
4. La integración de cobro (checkout de Wompi + webhook de confirmación) todavía no está en este MVP — queda para cuando valides que el flujo de entrevista funciona bien. Te aviso cuándo tocarlo.

---

## Si algo falla

- **"Falta ANTHROPIC_API_KEY"**: no pegaste la variable en Vercel, o la pegaste en el entorno equivocado (Production vs Preview). Revísalo en **Project Settings → Environment Variables**.
- **Error generando el caso: "No hay fuentes aprobadas para el área..."**: aún no aprobaste ninguna fuente en `/admin/fuentes` para esa área.
- **No puedes entrar a `/admin/fuentes`**: tu usuario sigue con rol `estudiante`. Repite el paso de SQL de la sección 3.
- **La página de Supabase dice que faltan extensiones**: confirma que corriste `0001_init.sql` completo (crea `vector` y `pgcrypto`) antes de los otros dos archivos.
