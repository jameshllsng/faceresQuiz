# FACERES Quiz

Aplicação de quiz para gincanas da FACERES, pensada para uso em tablets. O sistema funciona como PWA, pode ser instalado pelo navegador e mantém perguntas, rodadas e placares localmente no dispositivo.

## Recursos

- Quiz por temas, com perguntas de dificuldade Fácil, Média e Difícil.
- Importação de perguntas por arquivo JSON.
- Sorteio equilibrado: evita repetir perguntas na mesma rodada e prioriza perguntas menos usadas nas rodadas anteriores.
- Placar para Time A e Time B, com confirmação de pontuação.
- Alertas para avanço sem pontuação e para pontuações repetidas na mesma pergunta.
- Ação para desfazer o último ponto, com confirmação e registro da correção.
- Histórico de rodadas e perguntas utilizadas.
- Reset do quiz sem apagar as perguntas importadas.
- Layout responsivo para tablet em retrato e paisagem.
- PWA instalável, com funcionamento offline após a primeira abertura.

## Tecnologias

- TypeScript
- Vite
- IndexedDB
- vite-plugin-pwa
- CSS nativo

## Executar localmente

Pré-requisito: Node.js 24 ou superior.

```bash
npm install
npm run dev
```

Abra o endereço informado pelo Vite no navegador.

## Comandos

```bash
npm run dev       # inicia o ambiente de desenvolvimento
npm run build     # gera a versão de produção na pasta dist
npm run preview   # visualiza a versão de produção localmente
npm run check     # executa typecheck, lint e build
npm run format    # formata os arquivos com Prettier
```

## Como usar

1. Abra o aplicativo e toque em **Atualizar perguntas**.
2. Selecione um arquivo `questions.json` válido.
3. Inicie a rodada sugerida, como `Sala 1`, ou altere seu nome.
4. Na tela de temas, selecione o tema definido pela dinâmica da gincana.
5. Na pergunta, segure a lupa para revelar a resposta.
6. Registre o ponto do Time A ou Time B e confirme.
7. Use **Próxima pergunta** para voltar aos temas.

Se ninguém receber ponto, o primeiro toque em **Próxima pergunta** mostra um alerta. O segundo toque confirma o avanço sem pontuação.

## Formato do arquivo de perguntas

O arquivo deve ser JSON e seguir esta estrutura:

```json
{
  "version": 1,
  "questions": [
    {
      "id": "artes-001",
      "category": "Artes",
      "question": "Quem pintou a obra Mona Lisa?",
      "answer": "Leonardo da Vinci",
      "difficulty": "Fácil",
      "active": true
    }
  ]
}
```

Regras importantes:

- `id` deve ser único no arquivo.
- `category`, `question` e `answer` são obrigatórios.
- `difficulty` aceita somente `Fácil`, `Média` ou `Difícil`.
- `active` é opcional e, quando informado, deve ser `true` ou `false`.
- É necessário existir ao menos uma pergunta ativa.

As perguntas só podem ser atualizadas quando não houver uma rodada em andamento.

## Persistência local

Os dados ficam no IndexedDB do navegador do tablet:

- perguntas importadas;
- rodadas em andamento e encerradas;
- perguntas utilizadas em cada rodada;
- placares e eventos de pontuação.

O botão **Resetar quiz** remove rodadas, histórico, perguntas já utilizadas e placares, mas mantém as perguntas importadas. Após o reset, a próxima rodada volta a ser `Sala 1`.

## Instalação no tablet

1. Gere a versão de produção:

   ```bash
   npm run build
   ```

2. Publique o conteúdo da pasta `dist` em uma hospedagem com HTTPS.
3. No tablet, abra o endereço pelo Google Chrome.
4. Abra o menu do Chrome e toque em **Instalar app**.

Depois da primeira abertura, o aplicativo funciona offline. Para aplicar alterações de código, publique novamente a pasta `dist`. Para atualizar apenas as perguntas, use **Atualizar perguntas** dentro do aplicativo.

## Estrutura principal

```text
src/
  db/           # configuração do IndexedDB
  services/     # regras de perguntas, rodadas e arquivos JSON
  types/        # modelos TypeScript
  main.ts       # interface e fluxo do quiz
  style.css     # estilos responsivos
public/         # ícone do PWA
questions.json  # exemplo de banco de perguntas
```
