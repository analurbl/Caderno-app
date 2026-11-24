import type { Alternative, Banca, Dificuldade, Formato, Question } from "../types";

export interface GeneratePayload {
  banca: Banca;
  bancaOutra?: string;
  quantidade: number;
  dificuldade: Dificuldade;
  formato: Formato;
  materia?: string;
  assuntos: string[];
  conteudo?: string;
  incluirComentarios: boolean;
  pontosFracos: string[];
  evitar: string[];
}

export interface GenerateResult {
  aviso_material: string;
  questoes: Omit<Question, "id">[];
}

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new Error("Sem conexão com o servidor. Verifique sua internet e tente novamente.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || "Não foi possível concluir agora. Tente novamente.");
  return data as T;
}

export function generateQuestions(payload: GeneratePayload, signal?: AbortSignal) {
  return post<GenerateResult>("/api/questions", payload, signal);
}

export function explainMore(payload: {
  materia?: string;
  assunto?: string;
  enunciado: string;
  alternativas: Alternative[];
  correta: string;
  escolhida?: string;
  explicacao?: string;
  duvida?: string;
}) {
  return post<{ text: string }>("/api/explain", payload);
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
