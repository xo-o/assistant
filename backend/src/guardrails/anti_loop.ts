export interface AntiLoopContext {
  knownName?: string | null;
  knownVehicle?: string | null;
  knownUse?: string | null;
  recentAssistantMessages?: string[];
}

export function applyAntiLoopGuard(candidateText: string, context: AntiLoopContext): string {
  let processed = candidateText.trim();

  // If user name is already known or conversation is ongoing, strip rogue greeting loops
  if (context.knownName && context.knownName.trim().length > 0) {
    if (context.recentAssistantMessages && context.recentAssistantMessages.length > 0) {
      // Remove redundant "Hola Soy Luis..." in turns after the opening greeting
      processed = processed
        .replace(/^(?:¡?hola!?\s*[👋😊]*\s*)?(?:soy\s+luis[,\s]+tu\s+asesor\s+automotriz[.\s]*)/i, "")
        .replace(/^Hola\s*👋\s*Soy\s+Luis[,\s]+tu\s+asesor\s+automotriz[.\s]*/i, "")
        .trim();
    }

    const nameQuestions = [
      /¿con\s+qui[eé]n\s+tengo\s+el\s+gusto\??/gi,
      /¿c[oó]mo\s+te\s+llamas\??/gi,
      /¿cu[aá]l\s+es\s+tu\s+nombre\??/gi,
      /¿me\s+dices\s+tu\s+nombre\??/gi,
    ];

    for (const q of nameQuestions) {
      if (q.test(processed)) {
        // If there is already substantial content in the response, just strip the question
        const withoutQuestion = processed.replace(q, "").trim();
        if (withoutQuestion.length > 25) {
          processed = withoutQuestion;
        } else {
          processed = `¿En qué más te puedo orientar hoy, ${context.knownName}?`;
        }
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
