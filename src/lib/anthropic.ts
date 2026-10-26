// Cliente único de Anthropic, reutilizado por todo el backend.
import Anthropic from "@anthropic-ai/sdk";

let _cliente: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!_cliente) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "Falta ANTHROPIC_API_KEY. Revisa docs/DESPLIEGUE.md, paso de variables de entorno."
      );
    }
    _cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _cliente;
}
