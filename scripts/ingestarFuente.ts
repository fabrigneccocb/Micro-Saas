// CLI para cargar muchas fuentes sin pasar una por una por /admin/fuentes.
// Uso:
//   npm run ingesta:fuentes -- --area clinica --tipo articulo \
//     --titulo "Nombre del artículo" --archivo ./mis-fuentes/articulo1.txt \
//     [--url https://doi.org/...]
//
// El archivo debe ser texto plano (.txt) con el texto completo de la fuente.
// Queda cargada con aprobada=false — apruébala en /admin/fuentes antes de
// que el generador de casos pueda usarla (lista blanca cerrada, 5.2.2).
import { readFileSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import path from "path";

// Carga .env.local a mano (este script corre fuera de Next.js, que es quien
// normalmente hace esto automáticamente).
const envPath = path.resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const linea of readFileSync(envPath, "utf-8").split("\n")) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
}

function leerArg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const area = leerArg("area");
  const titulo = leerArg("titulo");
  const archivo = leerArg("archivo");
  const tipo = leerArg("tipo") ?? "articulo";
  const url = leerArg("url");

  if (!area || !titulo || !archivo) {
    console.error(
      "Uso: npm run ingesta:fuentes -- --area clinica --titulo \"...\" --archivo ruta.txt [--url ...] [--tipo articulo]"
    );
    process.exit(1);
  }
  if (!["clinica", "educativa", "organizacional", "forense"].includes(area)) {
    console.error(`Área inválida: ${area}`);
    process.exit(1);
  }

  const textoCompleto = readFileSync(archivo, "utf-8");
  if (textoCompleto.length < 200) {
    console.error("El archivo es muy corto — pega el texto completo de la fuente, no un resumen.");
    process.exit(1);
  }

  // Imports dinámicos: así el script falla con un mensaje claro de ".env.local
  // falta" ANTES de intentar resolver imports que necesitan esas variables.
  const { crearClienteAdmin } = await import("../src/lib/supabase/server");
  const { trocear, generarEmbedding } = await import("../src/rag/embeddings");

  const admin = crearClienteAdmin();
  const fuenteId = randomUUID();

  const { error } = await admin.from("fuentes").insert({
    id: fuenteId,
    area,
    titulo,
    url_o_doi: url ?? null,
    tipo,
    texto_completo: textoCompleto,
    aprobada: false,
  });
  if (error) {
    console.error("Error guardando la fuente:", error.message);
    process.exit(1);
  }

  const fragmentos = trocear(textoCompleto);
  console.log(`Indexando ${fragmentos.length} fragmentos...`);
  for (let i = 0; i < fragmentos.length; i++) {
    const texto = fragmentos[i]!;
    const embedding = await generarEmbedding(texto, "document");
    await admin.from("fuentes_fragmentos").insert({ fuente_id: fuenteId, orden: i, texto, embedding });
    process.stdout.write(`\r  ${i + 1}/${fragmentos.length}`);
  }
  console.log(`\nListo. Fuente "${titulo}" cargada (id ${fuenteId}), sin aprobar todavía.`);
  console.log("Apruébala en /admin/fuentes para activarla en el generador de casos.");
}

main();
