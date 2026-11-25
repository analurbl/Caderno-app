# Lumio

O Lumio (antes chamado Caderno) é um espaço de estudos para quem se prepara para concursos públicos: cadernos, matérias e assuntos, cronômetro de estudo, metas, calendário, estatísticas e **questões geradas por IA** no estilo de bancas como FGV, AOCP e Instituto Avalia.

Esta é a primeira versão (MVP) da especificação de produto. É um app web *mobile first*: abra no celular ou numa janela estreita.

## Como rodar

Requisitos: Node.js 20+.

```bash
npm install
cp .env.example .env        # e preencha ANTHROPIC_API_KEY
export $(cat .env | xargs)  # ou configure as variáveis do seu jeito
npm run dev                 # front em http://localhost:5173 e API em :8787
```

Produção (um único servidor serve o app e a API):

```bash
npm run build
ANTHROPIC_API_KEY=... npm start   # http://localhost:8787
```

Outros comandos: `npm test` (testes de unidade), `npm run typecheck`.

Sem `ANTHROPIC_API_KEY`, todo o app funciona, exceto a geração de questões e as explicações extras, que mostram uma mensagem clara de erro.

### Versão hospedada no Claude

`npm run build:preview` gera uma versão sem servidor, publicada como página no Claude. Nela, as questões e explicações são pedidas ao Claude pela conta de quem usa o app (com permissão pedida na primeira vez), usando os mesmos prompts do servidor (`src/lib/prompts.ts`). A resposta é conferida em `normalizeResult` antes de virar uma lista.

## Arquitetura

| Parte | Tecnologia | Onde |
|---|---|---|
| Interface | React 18 + Vite + TypeScript, React Router (hash) | `src/` |
| Estado e persistência | Zustand com `persist` em `localStorage` | `src/store.ts` |
| Regras de tempo, metas e estatísticas | Funções puras testadas | `src/lib/time.ts`, `src/lib/stats.ts` |
| API de IA | Express + SDK oficial da Anthropic (`claude-opus-5-5`) | `server/` |

A chave da IA fica **somente no servidor**. O navegador chama `POST /api/questions` e `POST /api/explain`.

### IA

- `server/ai.ts` monta o prompt com o estilo da banca (seção 6.1 da especificação) e as regras de qualidade (6.2): sem copiar questões reais, sem inventar leis ou artigos, uma única resposta correta, explicação didática, campo de **incerteza** para conferir em fonte oficial e aviso quando o material não for suficiente.
- A resposta usa *structured outputs* (esquema Zod) e é validada antes de chegar ao app.
- O material do usuário é marcado como conteúdo, não como instrução, e o app informa se a questão foi baseada no material ou em conhecimento geral.
- Antes do primeiro uso, o app pede consentimento e explica o que é enviado.
- Os fallbacks do servidor da Anthropic estão ativados (`fallbacks: "default"`): se o modelo principal recusar um pedido, outro modelo responde na mesma chamada.
- Esforço do modelo configurável por `CLAUDE_EFFORT` (`low`/`medium`/`high`; padrão `medium`).

## O que está implementado (MVP da seção 14)

1. **Cadastro e configuração inicial**: conta com validação, login, redefinição de senha e configuração em 4 passos, que pode ser pulada (objetivo, banca, tempo por dia, dias de estudo, primeiras matérias).
2. **Painel inicial**: meta do dia (planejado x realizado) em anel, botão de começar, tempo na semana, sequência sem tom punitivo, plano de hoje, último caderno, sugestão contextual, mensagem do dia. Trata os estados de primeiro acesso, meta ausente, meta concluída e dia de descanso.
3. **Cadernos, matérias e assuntos**: criar, editar, duplicar, arquivar, excluir e reordenar; cor e ícone; data da prova; prioridade; mover matéria entre cadernos; anotações com salvamento automático, links e status do assunto.
4. **Cronômetro**: sessão livre ou com duração, pausa que não conta no total, anotação, troca de assunto durante a sessão e uma única sessão ativa por vez. Se o app fechar com o cronômetro ligado, ao reabrir ele oferece pausar ou salvar no momento do fechamento, continuar ou descartar. Sessões podem ser corrigidas, excluídas ou lançadas manualmente pelo calendário.
5. **Metas diárias e semanais**: tempo por dia (com dias da semana), tempo por semana, tempo por matéria, questões e assuntos por semana; pausar e ajustar mantendo o histórico; gráfico de planejado x realizado.
6. **Histórico e estatísticas**: hoje, semana, mês e total; últimos 14 dias; tempo por matéria e caderno; dias ativos; questões e acertos por matéria; evolução do aproveitamento; melhores e piores assuntos; filtro por período. O **calendário** mensal diferencia estudo, descanso, dia sem registro e dia futuro, e mostra revisões e listas.
7. **Questões por IA**: a partir de matéria e assuntos, das anotações ou de um texto colado; banca (FGV, AOCP, Instituto Avalia, estilo geral ou outra), quantidade, dificuldade, formato (múltipla escolha, certo/errado, discursiva), modo treino ou simulado, comentários e prioridade para pontos fracos.
8. **Resolução e resultado**: identificação "Gerada por IA", navegação entre questões, marcar para revisar, correção com texto e ícone (sem depender só da cor), explicação, comentários por alternativa, dica de prova, "Ainda tenho dúvida" (nova explicação da IA) e reportar questão. No simulado, as respostas só aparecem no final. O resultado traz aproveitamento, tempo, desempenho por assunto com diagnóstico cauteloso, refazer erros, gerar nova lista e salvar no caderno de erros.
9. **Caderno de erros**: salvamento automático (opcional) ou manual; filtros por caderno, matéria, assunto, banca e status; pendente, revisada ou dominada; anotações pessoais; refazer as selecionadas ou as filtradas.
10. **Perfil e configurações**: preferências de estudo, notificações, tema claro, escuro ou automático, redução de movimento, consentimento de IA, exportar, importar e excluir dados, termos e sair.

Também incluído: **revisões** (agendar, marcar como feitas, sugestões que só entram com confirmação) e os seis **mascotes** geométricos (foco, motivação, calma, conquista, dúvida, revisão).

## Limitações conhecidas desta versão

- **Dados locais**: a conta e os dados ficam no `localStorage` do navegador. Não há servidor de contas nem sincronização entre dispositivos (RF16), e a "recuperação de senha" é uma redefinição local. Exportar e importar em JSON é o caminho atual para levar os dados a outro aparelho.
- **Notificações**: as preferências são salvas e a permissão do navegador é pedida, mas o envio em segundo plano ainda não existe (depende de um service worker ou de um app instalado).
- **Arquivos e PDFs**: anexos e leitura de PDF ficam para a versão 2, como prevê a especificação.
- **Reportes de questões** ficam registrados localmente na questão. Ainda não há um painel de qualidade no servidor.
- Tutora conversacional, revisão espaçada automática e planejamento sugerido por IA são da versão 2.

## Estrutura

```
server/            API (Express) e integração com a IA
src/App.tsx        rotas, tema e recuperação de sessão
src/store.ts       estado e ações (cadernos, sessões, metas, listas, erros, revisões)
src/lib/           tempo, estatísticas, chamadas à API, hooks
src/components/ui  mascotes, anéis, barras, folhas inferiores, ícones, navegação
src/pages/         telas
tests/             testes de unidade (Vitest)
```
