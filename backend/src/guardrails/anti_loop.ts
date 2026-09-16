export interface AntiLoopContext {
  knownName?: string | null;
  knownVehicle?: string | null;
  knownUse?: string | null;
  recentAssistantMessages?: string[];
}

export function applyAntiLoopGuard(candidateText: string, context: AntiLoopContext): string {
  let processed = candidateText;

  // If user name is already known, ensure the assistant doesn't ask for the name again
  if (context.knownName && context.knownName.trim().length > 0) {
    const nameQuestions = [
      /¿con\s+qui[eé]n\s+tengo\s+el\s+gusto\??/gi,
      /¿c[oó]mo\s+te\s+llamas\??/gi,
      /¿cu[aá]l\s+es\s+tu\s+nombre\??/gi,
      /¿me\s+dices\s+tu\s+nombre\??/gi,
    ];

    for (const q of nameQuestions) {
      if (q.test(processed)) {
        processed = processed.replace(q, `¿En qué más te puedo orientar hoy, ${context.knownName}?`);
      }
    }
  }

  // Prevent exact identical duplicate responses
  if (context.recentAssistantMessages && context.recentAssistantMessages.length > 0) {
    const lastMsg = context.recentAssistantMessages[context.recentAssistantMessages.length - 1];
    if (lastMsg && lastMsg.trim() === processed.trim()) {
      processed += " ¿Tienes alguna duda puntual sobre algún modelo o especificación?";
    }
  }

  return processed;
}
