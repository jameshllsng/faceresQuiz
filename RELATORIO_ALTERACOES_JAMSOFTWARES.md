# Relatório de Alterações — FACERES Quiz / JamSoftwares

## Objetivo da etapa

Preparar o FACERES Quiz para ser tratado como a primeira distribuição de uma plataforma de quiz da JamSoftwares, mantendo a FACERES como identidade principal e preservando o funcionamento atual da aplicação.

## Alterações implementadas

### Configuração central da distribuição

Foi criada a configuração da distribuição FACERES em `src/distributions/faceres/config.ts`.

Ela centraliza:

- identificador da distribuição: `faceres`;
- nome do produto: `FACERES Quiz`;
- instituição: `FACERES`;
- identificação da plataforma: `JamSoftwares`;
- versão: `1.0.0`;
- nome do banco local;
- cores da distribuição;
- descrição e ícone do PWA.

O contrato genérico dessas configurações está em `src/core/distribution.ts`, preparando o projeto para futuras distribuições sem acoplar o núcleo do quiz à FACERES.

### Separação gradual entre núcleo e distribuição

Os serviços existentes de perguntas, rodadas, pontuação e armazenamento foram preservados como regras genéricas da aplicação.

Como ajuste de desacoplamento, o IndexedDB não possui mais o nome `faceres-quiz` definido internamente. O banco é configurado pela distribuição ativa durante a inicialização da aplicação.

Estrutura introduzida:

```text
src/
  core/
    distribution.ts
  distributions/
    faceres/
      config.ts
  db/
  services/
  types/
  main.ts
```

### Identificação JamSoftwares

Foi adicionada a identificação discreta:

```text
Powered by JamSoftwares
```

Ela aparece de forma secundária na interface e não substitui a identidade visual da FACERES.

### Tela Sobre

Foi incluído o botão **Sobre** na tela inicial da rodada.

A tela apresenta:

- FACERES Quiz;
- distribuição FACERES;
- versão 1.0.0;
- JamSoftwares Quiz Platform;
- desenvolvimento por Luís Miguel Sandrin Cardoso.

### PWA e metadata

O manifesto do PWA passou a consumir a configuração central da distribuição para nome, descrição, cor principal e ícone.

Também foi atualizado o versionamento do pacote para `1.0.0`.

### Documentação

O README foi atualizado para apresentar a arquitetura Plataforma → Distribuição → FACERES, além dos principais recursos e decisões técnicas do projeto.

## Funcionalidades preservadas

- funcionamento offline após a primeira abertura;
- PWA, Service Worker e Web App Manifest;
- Vite e TypeScript;
- IndexedDB;
- importação manual de perguntas por JSON;
- sorteio equilibrado;
- temas, perguntas, respostas e rodadas;
- placar, confirmações e desfazer último ponto;
- histórico de rodadas;
- compatibilidade planejada para tablets Android.

## Itens deliberadamente não implementados

Esta etapa não inclui:

- sistema de licenças;
- expiração de uso;
- chaves de ativação;
- autenticação;
- backend;
- banco de dados remoto;
- validação online;
- DRM.

## Validação técnica

Foi executado:

```bash
npm run check
```

Resultado:

- TypeScript sem erros;
- lint sem erros;
- build de produção concluído;
- Service Worker e manifest do PWA gerados com sucesso.

## Próximos passos sugeridos

1. Validar manualmente o fluxo completo no Galaxy Tab A SM-T510.
2. Confirmar visualmente a identificação JamSoftwares em retrato e paisagem.
3. Publicar a nova versão e reinstalar o PWA no tablet para atualizar metadata e manifesto.
4. Manter um futuro módulo de licenciamento isolado, sem acoplá-lo às regras atuais do quiz.
