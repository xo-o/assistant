import { GuardrailCheckResult } from "./injection_filter.js";

const OUT_OF_SCOPE_PATTERNS = [
  /receta\s+(de\s+)?(un\s+|una\s+)?(cocina|comida|postre|torta|pastel|chocolate|pizza)/i,
  /pastel\s+de\s+chocolate/i,
  /c[oó]mo\s+cocinar/i,
  /qu[ií]mica\s+org[aá]nica/i,
  /c[oó]digo\s+en\s+(python|javascript|typescript|c\+\+|java|rust|html)/i,
  /escribe\s+un\s+script/i,
  /qui[eé]n\s+gan[oó]\s+el\s+mundial\s+de/i,
  /poema\s+de\s+amor/i,
  /consejo\s+(m[eé]dico|legal|financiero\s+de\s+cripto)/i,
  /qu[eé]\s+medicamento\s+tomar/i,
  /escribe\s+un\s+ensayo\s+sobre/i,
];

// Automotive & Financing keywords whitelist
const AUTOMOTIVE_KEYWORDS = [
  "auto", "carro", "vehiculo", "vehículo", "suv", "sedan", "sedán", "hatchback",
  "pickup", "crossover", "motor", "hibrido", "híbrido", "electrico", "eléctrico",
  "gasolina", "combustible", "test drive", "cotizacion", "cotización", "marca",
  "modelo", "llantas", "neumaticos", "frenos", "mantenimiento", "camioneta",
  "manejo", "conducir", "potencia", "torque", "comprar", "precio", "kilometros",
  "pandero", "fondo colectivo", "fondos colectivos", "sorteo", "remate", "asamblea",
  "cuota", "certificado", "financiamiento", "credito", "crédito"
];

export function checkOutOfScope(userInput: string): GuardrailCheckResult {
  if (!userInput) {
    return { blocked: false };
  }

  // Check explicit out-of-scope triggers
  for (const pattern of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(userInput)) {
      return {
        blocked: true,
        reason: "OUT_OF_SCOPE_DETECTED",
        response: "Mi especialidad es ayudarte a encontrar el auto ideal y resolver dudas sobre vehículos 😊 Cuéntame si te puedo guiar con algún modelo.",
      };
    }
  }

  return { blocked: false };
}
