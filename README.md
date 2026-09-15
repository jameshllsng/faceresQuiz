# FACERES Quiz

Aplicação web para condução de gincanas acadêmicas da FACERES, desenvolvida com foco em tablets, operação offline e uma experiência visual dinâmica para mediadores e equipes.

## Destaques

- PWA instalável, preparada para uso offline após a primeira abertura.
- Persistência local com IndexedDB para perguntas, rodadas, placares e histórico.
- Importação de banco de perguntas em JSON, sem necessidade de backend.
- Sorteio equilibrado que evita repetição na mesma rodada e prioriza perguntas menos utilizadas.
- Controle de placar para duas equipes com confirmações de ações sensíveis.
- Correção de pontuação com desfazer do último ponto e registro do evento de reversão.
- Histórico por rodada, incluindo perguntas utilizadas e placar final.
- Interface responsiva para tablets em retrato e paisagem.
- Suporte a tela cheia, animações reduzidas quando solicitado pelo dispositivo e identidade visual inspirada na FACERES.

## Experiência do quiz

O mediador seleciona o tema da pergunta conforme a dinâmica da gincana. A resposta permanece em uma área fixa e é revelada enquanto a lupa é pressionada, evitando que o dedo cubra o conteúdo no tablet.

As ações de pontuação exigem confirmação. O sistema destaca visualmente situações que merecem atenção, como avançar sem pontuar ou conceder mais de um ponto para uma equipe na mesma pergunta.

## Decisões técnicas

| Necessidade              | Solução                                                       |
| ------------------------ | ------------------------------------------------------------- |
| Uso sem conexão          | PWA com Service Worker e cache de arquivos estáticos          |
| Dados locais no tablet   | IndexedDB                                                     |
| Atualização de perguntas | Importação de arquivo JSON validado                           |
| Evitar repetições        | Histórico de uso por pergunta e seleção aleatória equilibrada |
| Correção de placar       | Eventos de pontuação e eventos de reversão                    |
| Interface leve           | TypeScript, Vite e CSS nativo, sem framework de interface     |

## Arquitetura

```text
src/
  db/           # abertura e estrutura do IndexedDB
  services/     # regras de perguntas, rodadas e validação de JSON
  types/        # contratos e modelos TypeScript
  main.ts       # fluxo e renderização da interface
  style.css     # identidade visual, animações e responsividade
public/         # arquivos públicos e ícone do PWA
```

## Stack

`TypeScript` · `Vite` · `IndexedDB` · `PWA` · `CSS nativo`

## Desenvolvimento

```bash
npm install
npm run dev
```

Para verificar o projeto:

```bash
npm run check
```
