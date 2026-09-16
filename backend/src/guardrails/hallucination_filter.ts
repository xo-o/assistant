export function applyAntiHallucinationFilter(text: string): string {
  let result = text;

  // Pattern: promising closed binding prices
  const pricePromises = [
    /el\s+precio\s+final\s+(cerrado\s+)?es\s+de\s+\$?\d+/i,
    /te\s+garantizo\s+el\s+precio\s+de\s+\$?\d+/i,
  ];

  for (const pattern of pricePromises) {
    if (pattern.test(result)) {
      result += " (Recuerda que los precios finales y promociones vigentes se coordinan directamente con el concesionario oficial).";
      break;
    }
  }

  // Pattern: claiming physical stock in dealership
  const stockPromises = [
    /tenemos\s+\d+\s+unidades\s+(disponibles\s+)?en\s+tienda/i,
    /hay\s+stock\s+inmediato\s+en\s+concesionario/i,
  ];

  for (const pattern of stockPromises) {
    if (pattern.test(result)) {
      result += " (La disponibilidad física de unidades varía día a día según cada sede).";
      break;
    }
  }

  return result;
}
