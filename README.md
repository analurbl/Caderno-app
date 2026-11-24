# Bioética em casos

Site de uma página: o aluno lê o QR code de um caso, marca se cada princípio da bioética (autonomia, beneficência, não maleficência, justiça) foi **respeitado**, **ferido** ou **não é o foco**, e recebe a correção comentada na hora. Nenhuma resposta é salva.

## Arquivos

- `index.html`: o site inteiro. Os casos e o gabarito ficam na lista `CASOS`, no começo do script; é só editar ou acrescentar casos ali.
- `qrcode.js`: gerador de QR code (qrcode-generator 1.4.4, licença MIT), incluído para o site não depender de CDN.

## Como publicar

Qualquer hospedagem de arquivos estáticos serve (GitHub Pages, Netlify Drop, Vercel). Publique a pasta `bioetica/` e abra `…/#/qrcodes` no endereço publicado para imprimir os QR codes. Cada caso tem o endereço `…/#/caso/N`.

Se a página de QR codes for aberta de outro endereço, cole o endereço do site publicado no campo e clique em **Atualizar**.
