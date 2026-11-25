# Bioética em casos

Jogo de uma página para a sala de aula. O aluno lê o QR code, digita o nome e analisa 12 casos. Em cada caso, marca se autonomia, beneficência, não maleficência e justiça foram **respeitadas**, **feridas** ou **não são o foco**. A correção comentada aparece na hora e o ranking da turma é atualizado a cada caso.

## Páginas

| Endereço | Para quê |
|---|---|
| `…/#/jogo` | Jogo completo (vale para o ranking). Com `?turma=Nome`, a turma já vem preenchida. |
| `…/#/ranking` | Ranking ao vivo para projetar. Atualiza a cada 10 segundos. |
| `…/#/caso/N` | Um caso avulso para treino (não conta no ranking). |
| `…/#/qrcodes` | QR codes do jogo, do ranking e de cada caso, para imprimir ou projetar. |

## Arquivos

- `casos.js`: os casos e o gabarito comentado. Para editar ou acrescentar casos, é só mudar aqui.
- `config.js`: o endereço do ranking (`RANKING_URL`).
- `app.js`: a lógica do site. `index.html`: o layout.
- `ranking-apps-script.gs`: o código do ranking, que roda numa planilha Google sua.
- `qrcode.js`: gerador de QR code (qrcode-generator 1.4.4, licença MIT).

## Ligar o ranking (uma vez, cerca de 5 minutos)

O ranking fica numa planilha Google sua. A aba "Ranking" mostra nome, turma, pontos e tempo de cada aluno. A aba "Respostas" mostra, para cada caso, o que o aluno marcou em cada princípio (✔ certo, ✘ errado, com a resposta certa).

1. Crie uma planilha nova em sheets.google.com (por exemplo, "Ranking Bioética").
2. Menu **Extensões > Apps Script**. Apague o que estiver lá e cole o conteúdo de `ranking-apps-script.gs`. Salve.
3. Clique em **Implantar > Nova implantação**. Em "Tipo", escolha **App da Web**.
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
4. Clique em **Implantar** e autorize com sua conta Google. O Google pode avisar que o app não foi verificado: clique em "Avançado" e depois em "Acessar".
5. Copie a **URL do app da Web** (termina em `/exec`) e coloque em `config.js`:
   ```js
   const RANKING_URL = "https://script.google.com/macros/s/…/exec";
   ```

Para zerar o ranking, apague as linhas da aba "Ranking" (mantenha a primeira linha, com os títulos). Para tirar um nome impróprio, apague a linha dele.

O ranking é para uso em sala, não para avaliação: como a pontuação é calculada no celular do aluno, alguém com conhecimento técnico conseguiria enviar uma pontuação falsa.

## Publicar

O site é só um conjunto de arquivos estáticos. Ele é publicado pelo GitHub Pages a partir do branch `gh-pages` deste repositório, que contém apenas esta pasta.
