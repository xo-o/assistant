export interface GuardrailCheckResult {
  blocked: boolean;
  reason?: string;
  response?: string;
}

const INJECTION_PATTERNS = [
  /ignora\s+(todas\s+)?(tus\s+)?(instrucciones|reglas|directivas)/i,
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /revela\s+(tu\s+)?(system\s+)?prompt/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /cu[aá]l\s+es\s+tu\s+(system\s+)?prompt/i,
  /what\s+is\s+your\s+(system\s+)?prompt/i,
  /eres\s+dan\b/i,
  /\byou\s+are\s+dan\b/i,
  /do\s+anything\s+now/i,
  /modo\s+(desarrollador|mantenimiento|root|jailbreak)/i,
  /developer\s+mode/i,
  /olvida\s+(todo\s+)?lo\s+anterior/i,
  /forget\s+everything\s+above/i,
  /act[uú]a\s+como\s+un\s+(hacker|ia\s+sin\s+restricciones)/i,
  /pretend\s+you\s+have\s+no\s+rules/i,
];

export function checkPromptInjection(userInput: string): GuardrailCheckResult {
  if (!userInput) {
    return { blocked: false };
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(userInput)) {
      return {
        blocked: true,
        reason: "PROMPT_INJECTION_DETECTED",
        response: "No puedo realizar esa acción 😊 ¿En qué te ayudo respecto a tu búsqueda de auto?",
      };
    }
  }

  return { blocked: false };
}
