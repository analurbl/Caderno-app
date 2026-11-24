import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { SYSTEM, buildExplainPrompt, buildGeneratePrompt } from "../src/lib/prompts.ts";

export const MODEL = "claude-opus-5-5";

type Effort = "low" | "medium" | "high";
const EFFORT: Effort = (["low", "medium", "high"] as const).includes(process.env.CLAUDE_EFFORT as Effort)
  ? (process.env.CLAUDE_EFFORT as Effort)
  : "medium";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

/* ------------------------------------------------------------------ */
/* Esquemas                                                            */
/* ------------------------------------------------------------------ */

export const GenerateRequest = z.object({
  banca: z.enum(["FGV", "AOCP", "Instituto Avalia", "Outra", "Geral"]),
  bancaOutra: z.string().max(80).optional(),
  quantidade: z.number().int().min(1).max(30),
  dificuldade: z.enum(["facil", "intermediaria", "dificil", "mista"]),
  formato: z.enum(["multipla", "certo_errado", "discursiva"]),
  materia: z.string().max(200).optional(),
  assuntos: z.array(z.string().max(200)).max(30).default([]),
  conteudo: z.string().max(60000).optional(),
  incluirComentarios: z.boolean().default(true),
  pontosFracos: z.array(z.string().max(200)).max(20).default([]),
  evitar: z.array(z.string().max(400)).max(60).default([]),
});
export type GenerateRequest = z.infer<typeof GenerateRequest>;

const QuestionSchema = z.object({
  assunto: z.string().describe("Assunto da questão, usando um dos assuntos informados quando houver."),
  enunciado: z.string(),
  alternativas: z
    .array(z.object({ letra: z.string(), texto: z.string() }))
    .describe("Múltipla escolha: A a E. Certo/errado: C (Certo) e E (Errado). Discursiva: lista vazia."),
  correta: z.string().describe("Letra correta. Discursiva: string vazia."),
  resposta_esperada: z.string().describe("Discursiva: resposta modelo e pontos-chave. Outros formatos: string vazia."),
  explicacao: z.string().describe("Explicação didática de por que a resposta está correta."),
  comentarios_alternativas: z
    .array(z.object({ letra: z.string(), comentario: z.string() }))
    .describe("Por que cada alternativa incorreta está errada. Vazio se comentários desativados."),
  dica: z.string().describe("Dica de prova ou ponto de atenção, curta."),
  dificuldade: z.enum(["facil", "intermediaria", "dificil"]),
  base: z.enum(["material_do_usuario", "conhecimento_geral"]),
  incerteza: z.string().describe("Vazio se não houver; caso contrário, o ponto que deve ser conferido em fonte oficial."),
});

const GenerateResponse = z.object({
  aviso_material: z
    .string()
    .describe("Vazio se o material foi suficiente; caso contrário, explique o que faltou para questões específicas."),
  questoes: z.array(QuestionSchema),
});
export type GenerateResponse = z.infer<typeof GenerateResponse>;

export const ExplainRequest = z.object({
  materia: z.string().max(200).optional(),
  assunto: z.string().max(200).optional(),
  enunciado: z.string().max(8000),
  alternativas: z.array(z.object({ letra: z.string(), texto: z.string() })).max(10),
  correta: z.string().max(10),
  escolhida: z.string().max(4000).optional(),
  explicacao: z.string().max(8000).optional(),
  duvida: z.string().max(2000).optional(),
});
export type ExplainRequest = z.infer<typeof ExplainRequest>;

/* ------------------------------------------------------------------ */
/* Chamadas                                                            */
/* ------------------------------------------------------------------ */

export class AiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

function mapError(err: unknown): never {
  if (err instanceof AiError) throw err;
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError)
    throw new AiError("O servidor não está autorizado a usar a IA. Verifique a variável ANTHROPIC_API_KEY.", 503);
  if (err instanceof Anthropic.RateLimitError)
    throw new AiError("Muitas solicitações no momento. Aguarde um pouco e tente de novo.", 429);
  if (err instanceof Anthropic.BadRequestError)
    throw new AiError("A solicitação não pôde ser processada. Tente reduzir o material enviado.", 400);
  if (err instanceof Anthropic.APIConnectionError)
    throw new AiError("Não foi possível conectar ao serviço de IA. Verifique a conexão do servidor.", 502);
  if (err instanceof Anthropic.APIError) throw new AiError("O serviço de IA está indisponível agora. Tente novamente.", 502);
  if (err instanceof Error && /api key|apiKey|authentication/i.test(err.message))
    throw new AiError("O servidor não tem uma chave de IA configurada (ANTHROPIC_API_KEY).", 503);
  throw err;
}

export async function generateQuestions(req: GenerateRequest): Promise<GenerateResponse> {
  try {
    const stream = getClient().beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: EFFORT, format: betaZodOutputFormat(GenerateResponse) },
      messages: [{ role: "user", content: buildGeneratePrompt(req) }],
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal")
      throw new AiError("A IA não pôde gerar questões para este conteúdo. Tente outro assunto ou material.", 422);
    if (message.stop_reason === "max_tokens")
      throw new AiError("A lista ficou longa demais. Tente uma quantidade menor de questões.", 422);
    const parsed = message.parsed_output;
    if (!parsed) throw new AiError("A resposta da IA veio em um formato inesperado. Tente novamente.", 502);
    return parsed;
  } catch (err) {
    mapError(err);
  }
}

export async function explainMore(req: ExplainRequest): Promise<string> {
  const prompt = buildExplainPrompt(req);

  try {
    const message = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: prompt }],
    });
    if (message.stop_reason === "refusal") throw new AiError("A IA não pôde responder a esta dúvida.", 422);
    const text = message.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("\n")
      .trim();
    if (!text) throw new AiError("A IA não retornou uma explicação. Tente novamente.", 502);
    return text;
  } catch (err) {
    mapError(err);
  }
}
