# Relatório — JamQuest / FACERES Quiz v1.0.2

O JamQuest é uma aplicação web/PWA para conduzir gincanas entre dois times. Ela funciona offline após a primeira abertura e mantém perguntas, rodadas, placares e histórico no próprio navegador/tablet, usando IndexedDB — não há servidor ou login.

## Como funciona uma rodada

1. O mediador importa o arquivo de perguntas em JSON, se ele ainda não estiver carregado no tablet.
2. Inicia uma nova turma/rodada; o sistema sugere nomes como “Turma 1”, “Turma 2” etc.
3. A roleta física do evento define o tema.
4. No app, o mediador seleciona o cartão correspondente ao tema sorteado.
5. O sistema sorteia uma pergunta disponível daquele tema, sem repetir uma pergunta na mesma rodada.
6. A resposta fica oculta e é revelada somente enquanto o botão de lupa é pressionado.
7. O mediador atribui ponto ao Time A ou B, com confirmação antes de registrar.
8. É possível desfazer o último ponto e encerrar a rodada. Ao encerrar, ficam salvos placar final e perguntas usadas.

O tema **Desafio** não possui pergunta cadastrada. Ao selecioná-lo, o aplicativo abre a tela “Desafio ao vivo”, para que o mediador proponha a atividade do momento e registre os pontos.

## Temas exibidos

| Ordem | Tema                 | Perguntas | Conteúdo predominante                                                                                         |
| ----: | -------------------- | --------: | ------------------------------------------------------------------------------------------------------------- |
|     1 | História             |        20 | Brasil colonial e imperial, Antiguidade, Europa medieval, Revolução Francesa, Guerra Fria e história mundial |
|     2 | Geografia            |        20 | Países e capitais, continentes, clima, biomas, oceanos, relevo, mapas e geografia física                     |
|     3 | Arte e Cultura       |       160 | Cinema, música, artes visuais e entretenimento                                                                |
|     4 | Matemática           |        40 | Operações, porcentagem, sequências, geometria e raciocínio lógico                                             |
|     5 | Ciências             |        40 | Biologia, química, física, células, ecologia, corpo humano e astronomia                                       |
|     6 | Desafio              |         — | Atividade ao vivo definida pelo mediador                                                                      |
|     7 | FACERES              |        40 | Saúde, anatomia, fisiologia, atividade física, prevenção e corpo humano                                       |
|     8 | Língua Portuguesa    |        20 | Gramática, classes de palavras, figuras de linguagem e literatura brasileira                                  |
|     9 | Conhecimentos Gerais |        60 | Atualidades gerais, cultura, ciência cotidiana, tecnologia e informática                                      |

Total: **400 perguntas ativas** + o cartão especial **Desafio**.

## Detalhamento dos blocos

- **Arte e Cultura** reúne 40 perguntas de cinema, 40 de música, 40 de artes e 40 de entretenimento.
- **Conhecimentos Gerais** reúne 20 perguntas gerais e 40 de tecnologia/informática.
- **FACERES** aborda temas ligados à saúde: músculos, ossos, articulações, sistema cardiovascular, respiração, nutrição e exercício.
- As perguntas possuem três níveis: Fácil (143), Média (155) e Difícil (102).

## Regras técnicas importantes

- Perguntas inativas não entram no sorteio.
- Perguntas já usadas ficam indisponíveis apenas naquela rodada; em uma nova turma podem voltar a ser utilizadas.
- Entre perguntas disponíveis, o sistema prioriza as menos utilizadas no histórico, para equilibrar a repetição ao longo dos eventos.
- O histórico conserva uma cópia da pergunta e resposta exibidas na rodada, mesmo se o banco de perguntas for atualizado depois.
- O reset remove rodadas, pontos e histórico, mas mantém as perguntas importadas.
- O arquivo de importação é validado: precisa ser JSON válido, versão `1`, IDs únicos, pergunta, resposta, tema, dificuldade e ao menos uma pergunta ativa.
- Só aparecem na tela os temas da lista acima, na ordem mostrada. Uma pergunta importada com outro nome de tema fica no banco, mas não é exibida.
- As perguntas só podem ser substituídas quando não há rodada em andamento.
