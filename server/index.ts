import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { AiError, ExplainRequest, GenerateRequest, explainMore, generateQuestions } from "./ai.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) });
});

function handle<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }, fn: (data: T) => Promise<unknown>) {
  return async (req: express.Request, res: express.Response) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos na solicitação." });
      return;
    }
    try {
      res.json(await fn(parsed.data));
    } catch (err) {
      if (err instanceof AiError) {
        res.status(err.status).json({ error: err.message });
      } else {
        console.error(err);
        res.status(500).json({ error: "Erro inesperado no servidor." });
      }
    }
  };
}

app.post("/api/questions", handle(GenerateRequest, (data) => generateQuestions(data)));
app.post("/api/explain", handle(ExplainRequest, async (data) => ({ text: await explainMore(data) })));

const dist = path.resolve(here, "../dist");
if (process.env.NODE_ENV === "production" && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`Caderno API ouvindo em http://localhost:${port}`);
});
