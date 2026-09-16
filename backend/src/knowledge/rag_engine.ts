import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

export interface KnowledgeDocument {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
}

export interface SearchResult {
  id: string;
  category: string;
  title: string;
  content: string;
  score: number;
}

export class RAGEngine {
  private documents: KnowledgeDocument[] = [];
  private aiClient: GoogleGenAI | null = null;
  private documentEmbeddings: Map<string, number[]> = new Map();

  constructor() {
    this.loadCatalog();
    if (env.GEMINI_API_KEY) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      } catch (err) {
        console.warn("Could not initialize Google Gen AI client for embeddings:", err);
      }
    }
  }

  private loadCatalog(): void {
    const catalogPath = path.join(__dirname, "catalog.json");
    if (fs.existsSync(catalogPath)) {
      const data = fs.readFileSync(catalogPath, "utf-8");
      this.documents = JSON.parse(data) as KnowledgeDocument[];
    } else {
      console.warn("Catalog file not found at:", catalogPath);
    }
  }

  public getDocuments(): KnowledgeDocument[] {
    return this.documents;
  }

  // Tokenize and normalize text for vector computation
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  // Local TF-IDF and keyword similarity vector ranking
  private searchLocal(query: string, topK = 3): SearchResult[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return [];
    }

    const scored = this.documents.map((doc) => {
      const titleTokens = this.tokenize(doc.title);
      const contentTokens = this.tokenize(doc.content);
      const keywordTokens = doc.keywords.map((k) => k.toLowerCase());

      let score = 0;

      for (const token of queryTokens) {
        // Keyword exact match bonus
        if (keywordTokens.includes(token)) {
          score += 3.0;
        }
        // Title match bonus
        if (titleTokens.includes(token)) {
          score += 2.0;
        }
        // Content match
        const contentMatches = contentTokens.filter((t) => t === token).length;
        if (contentMatches > 0) {
          score += 1.0 + Math.min(contentMatches * 0.2, 1.0);
        }
        // Partial substring match
        if (keywordTokens.some((k) => k.includes(token) || token.includes(k))) {
          score += 1.0;
        }
      }

      // Normalize score by length
      const normalizedScore = score / (Math.sqrt(queryTokens.length) * 3 + 1);

      return {
        id: doc.id,
        category: doc.category,
        title: doc.title,
        content: doc.content,
        score: Math.min(Number(normalizedScore.toFixed(4)), 1.0),
      };
    });

    return scored
      .filter((doc) => doc.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  public async search(query: string, topK = 3): Promise<SearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    // Try Google Gen AI embeddings if configured
    if (this.aiClient && env.GEMINI_API_KEY) {
      try {
        const response = await this.aiClient.models.embedContent({
          model: "text-embedding-004",
          contents: query,
        });

        const embeddingValues = (response as any).embedding?.values || (response as any).embeddings?.[0]?.values;
        if (embeddingValues && embeddingValues.length > 0) {
          // Precompute document embeddings if not already cached
          await this.ensureDocumentEmbeddings();
          return this.rankByEmbedding(embeddingValues, topK);
        }
      } catch (error) {
        console.warn("Vertex / Gemini embedding call failed, falling back to local semantic retrieval:", error);
      }
    }

    // Fallback: fast TF-IDF / Keyword vector similarity
    return this.searchLocal(query, topK);
  }

  private async ensureDocumentEmbeddings(): Promise<void> {
    if (this.documentEmbeddings.size === this.documents.length || !this.aiClient) {
      return;
    }

    for (const doc of this.documents) {
      if (!this.documentEmbeddings.has(doc.id)) {
        try {
          const res = await this.aiClient.models.embedContent({
            model: "text-embedding-004",
            contents: `${doc.title}. ${doc.content}`,
          });
          const values = (res as any).embedding?.values || (res as any).embeddings?.[0]?.values;
          if (values) {
            this.documentEmbeddings.set(doc.id, values);
          }
        } catch {
          // Ignore failure and let local fallback handle
          break;
        }
      }
    }
  }

  private rankByEmbedding(queryEmbedding: number[], topK: number): SearchResult[] {
    const scored: SearchResult[] = [];

    for (const doc of this.documents) {
      const docEmbedding = this.documentEmbeddings.get(doc.id);
      if (!docEmbedding) {
        continue;
      }

      const score = this.cosineSimilarity(queryEmbedding, docEmbedding);
      scored.push({
        id: doc.id,
        category: doc.category,
        title: doc.title,
        content: doc.content,
        score: Number(score.toFixed(4)),
      });
    }

    if (scored.length === 0) {
      return this.searchLocal("", topK);
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const ragEngine = new RAGEngine();
