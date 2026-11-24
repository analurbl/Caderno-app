import type { Question } from "../types";
import { JSON_FORMAT, SYSTEM, buildExplainPrompt, buildGeneratePrompt, type ExplainInput, type GenerateInput } from "./prompts";

/**
 * Build hospedado no Claude (sem servidor próprio): a IA é chamada pela conta
 * Claude de quem está usando, através do recurso "sample" do visualizador.
 */
export const IS_PREVIEW = import.meta.env.VITE_PREVIEW === "1";

export type GeneratePayload = GenerateInput;

export interface GenerateResult {
  aviso_material: string;
  questoes: Omit<Question, "id">[];
}

/* ------------------------------------------------------------------ */
/* Modo servidor                                                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Modo hospedado no Claude                                            */
/* ------------------------------------------------------------------ */

interface SampleFn {
  (input: string, opts?: Record<string, unknown>): Promise<{ text: string; truncated: boolean }>;
  json<T>(input: string, opts?: Record<string, unknown>): Promise<T>;
}

let samplePromise: Promise<SampleFn | null> | null = null;
function getSample(): Promise<SampleFn | null> {
  const c = (window as unknown as { claude?: { use(name: string): Promise<unknown> } }).claude;
  if (!c) return Promise.resolve(null);
  samplePromise ??= c.use("sample").then((s) => (s as SampleFn | null) ?? null).catch(() => null);
  return samplePromise;
}

const SAMPLE_ERRORS: Record<string, string> = {
  not_granted: "O uso do Claude não foi permitido nesta página. Para gerar questões, recarregue e permita quando for perguntado.",
  sampling_disabled: "O Claude não está disponível para esta conta.",
  rate_limited: "Muitas solicitações ou limite de uso atingido. Aguarde um pouco e tente de novo.",
  session_expired: "Sua sessão expirou. Entre novamente no Claude e tente de novo.",
  refused: "A IA não pôde gerar este conteúdo. Tente outro assunto ou material.",
  invalid_json: "A resposta da IA veio num formato inesperado. Tente novamente.",
  prompt_too_large: "O material é grande demais. Cole um trecho menor.",
  empty_completion: "A IA não retornou nada. Tente pedir menos questões.",
};

function sampleError(e: unknown): Error {
  const code = (e as { code?: string })?.code ?? "";
  if (code === "cancelled") {
    const err = new Error("cancelado");
    err.name = "AbortError";
    return err;
  }
  return new Error(SAMPLE_ERRORS[code] ?? "O serviço de IA está indisponível agora. Tente novamente.");
}

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

/** Confere e completa o que veio da IA, descartando questões incompletas. */
export function normalizeResult(raw: unknown, formato: GenerateInput["formato"]): GenerateResult {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = Array.isArray(obj.questoes) ? obj.questoes : [];
  const questoes: Omit<Question, "id">[] = [];
  for (const item of list) {
    const q = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const enunciado = str(q.enunciado).trim();
    if (!enunciado) continue;
    const alternativas = (Array.isArray(q.alternativas) ? q.alternativas : [])
      .map((a) => ({ letra: str((a as Record<string, unknown>)?.letra).trim().toUpperCase(), texto: str((a as Record<string, unknown>)?.texto).trim() }))
      .filter((a) => a.letra && a.texto);
    const correta = str(q.correta).trim().toUpperCase();
    if (formato !== "discursiva" && (!alternativas.length || !alternativas.some((a) => a.letra === correta))) continue;
    const dif = str(q.dificuldade);
    questoes.push({
      assunto: str(q.assunto).trim() || "Geral",
      enunciado,
      alternativas: formato === "discursiva" ? [] : alternativas,
      correta: formato === "discursiva" ? "" : correta,
      resposta_esperada: str(q.resposta_esperada),
      explicacao: str(q.explicacao),
      comentarios_alternativas: (Array.isArray(q.comentarios_alternativas) ? q.comentarios_alternativas : [])
        .map((c) => ({ letra: str((c as Record<string, unknown>)?.letra).toUpperCase(), comentario: str((c as Record<string, unknown>)?.comentario) }))
        .filter((c) => c.letra && c.comentario),
      dica: str(q.dica),
      dificuldade: dif === "facil" || dif === "dificil" ? dif : "intermediaria",
      base: str(q.base) === "material_do_usuario" ? "material_do_usuario" : "conhecimento_geral",
      incerteza: str(q.incerteza),
    });
  }
  return { aviso_material: str(obj.aviso_material), questoes };
}

/* ------------------------------------------------------------------ */
/* API usada pelas telas                                               */
/* ------------------------------------------------------------------ */

export async function generateQuestions(payload: GeneratePayload, signal?: AbortSignal): Promise<GenerateResult> {
  if (!IS_PREVIEW) return post<GenerateResult>("/api/questions", payload, signal);
  const sample = await getSample();
  if (!sample) throw new Error("A IA só funciona quando o app é aberto dentro do Claude.");
  try {
    const raw = await sample.json<unknown>(`${SYSTEM}\n\n${buildGeneratePrompt(payload)}\n\n${JSON_FORMAT}`, { signal, cache: false });
    return normalizeResult(raw, payload.formato);
  } catch (e) {
    throw sampleError(e);
  }
}

export async function explainMore(payload: ExplainInput): Promise<{ text: string }> {
  if (!IS_PREVIEW) return post<{ text: string }>("/api/explain", payload);
  const sample = await getSample();
  if (!sample) throw new Error("A IA só funciona quando o app é aberto dentro do Claude.");
  try {
    const { text } = await sample(`${SYSTEM}\n\n${buildExplainPrompt(payload)}`, { cache: false });
    return { text };
  } catch (e) {
    throw sampleError(e);
  }
}

/** Salva um arquivo: no Claude, pelo recurso de downloads; fora dele, por um link. */
export async function saveFile(filename: string, data: string): Promise<void> {
  const c = (window as unknown as { claude?: { use(name: string): Promise<unknown> } }).claude;
  if (IS_PREVIEW && c) {
    const d = (await c.use("downloads").catch(() => null)) as { save(r: { filename: string; data: string }): Promise<unknown> } | null;
    if (!d) throw new Error("Não é possível salvar arquivos aqui.");
    try {
      await d.save({ filename, data });
    } catch (e) {
      if ((e as { code?: string })?.code === "declined") return;
      throw new Error("Não foi possível salvar o arquivo.");
    }
    return;
  }
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
