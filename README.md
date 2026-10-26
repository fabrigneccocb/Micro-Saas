# Simulador de casos de psicología con agentes de IA

Práctica de entrevista clínica para estudiantes de psicología en Colombia: un
agente de IA representa al "paciente" (consultante) y otro evalúa la
entrevista contra una rúbrica, citando siempre el caso. Los casos se generan
por RAG (recuperación aumentada) sobre una biblioteca curada de fuentes
reales, nunca libremente y nunca sin cita trazable.

Este repositorio es el MVP: solo área clínica, solo canal de texto. El
diseño completo (4 áreas, roadmap de neuropsicología y voz, justificación
legal y de costos) está en el white paper de investigación — pide el enlace
si lo necesitas.

**¿Primera vez aquí?** Empieza por [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md)
— es el manual paso a paso para crear las cuentas necesarias y publicar la
app, sin que necesites tocar código.

## Estructura

```
src/
  app/            páginas y rutas de API (Next.js App Router)
  rag/            generador de casos (RAG + cita + verificación de fidelidad)
  simulacion/     agentes consultante/evaluador, seguridad en tiempo real
  adaptativo/     modelo de dificultad (Elo)
  types/          esquemas de dominio (Zod)
supabase/migrations/   esquema SQL, en orden
scripts/          utilidades de línea de comandos (carga masiva de fuentes)
docs/             manual de despliegue
```

## Desarrollo local

```bash
cp .env.example .env.local   # y llena los valores (ver docs/DESPLIEGUE.md)
npm install
npm run dev
```
