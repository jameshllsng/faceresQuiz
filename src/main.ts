import './style.css'
import { openDatabase } from './db/database'
import { readQuestionFile } from './services/question-file'
import {
  getActiveQuestionCount,
  getCategoriesForRound,
  getRoundQuestions,
  replaceQuestions,
  selectQuestionForRound,
} from './services/questions'
import {
  addPoint,
  finishRound,
  getActiveRound,
  getFinishedRounds,
  getLastUndoableScoreEvent,
  getSuggestedRoundName,
  resetQuizData,
  startRound,
  undoLastPoint,
} from './services/rounds'
import type {
  Difficulty,
  Round,
  RoundQuestion,
  ScoreEvent,
  Team,
} from './types/models'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Application root was not found.')
}

const appRoot = app

appRoot.innerHTML = `
  <main class="startup-screen" aria-live="polite">
    <p class="startup-screen__label">FACERES</p>
    <h1>Quiz</h1>
    <p id="startup-status">Preparando o quiz...</p>
  </main>
`

const status = document.querySelector<HTMLParagraphElement>('#startup-status')

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }

  return value.replace(
    /[&<>"']/g,
    (character) => entities[character] ?? character,
  )
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date))
}

function renderScoreBar(
  round: Round,
  lastScoredTeam: Team | null = null,
): string {
  return `
    <footer class="score-bar" aria-label="Placar atual">
      <div class="score-bar__scores">
        <span>Time A <strong class="${lastScoredTeam === 'A' ? 'score-bar__score--updated' : ''}">${round.scoreTeamA}</strong></span>
        <span class="score-bar__divider" aria-hidden="true">×</span>
        <span><strong class="${lastScoredTeam === 'B' ? 'score-bar__score--updated' : ''}">${round.scoreTeamB}</strong> Time B</span>
      </div>
      ${round.scoreTeamA + round.scoreTeamB > 0 ? '<button id="undo-last-point" class="score-bar__undo" type="button">Desfazer último ponto</button>' : ''}
    </footer>
  `
}

function renderFullscreenButton(): string {
  if (!document.fullscreenEnabled) {
    return ''
  }

  return `
    <button id="enter-fullscreen" class="secondary-button fullscreen-button" type="button" aria-label="Abrir em tela cheia" title="Abrir em tela cheia">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM4 14h2v4h4v2H4v-6Zm14 0h2v6h-6v-2h4v-4Z" /></svg>
    </button>
  `
}

function attachFullscreenListener(): void {
  const fullscreenButton =
    document.querySelector<HTMLButtonElement>('#enter-fullscreen')

  fullscreenButton?.addEventListener('click', () => {
    void document.documentElement.requestFullscreen()
  })
}

function attachUndoLastPointListener(
  round: Round,
  onUndo: (updatedRound: Round) => void | Promise<void>,
): void {
  const undoButton =
    document.querySelector<HTMLButtonElement>('#undo-last-point')

  undoButton?.addEventListener('click', () => {
    void (async () => {
      const scoreEvent = await getLastUndoableScoreEvent(round.id)

      if (scoreEvent) {
        renderUndoConfirmation(round, scoreEvent, onUndo)
      }
    })()
  })
}

function getDifficultyClass(difficulty: Difficulty): string {
  const difficultyClasses: Record<Difficulty, string> = {
    Fácil: 'difficulty-badge--easy',
    Média: 'difficulty-badge--medium',
    Difícil: 'difficulty-badge--hard',
  }

  return difficultyClasses[difficulty]
}

async function renderHistory(): Promise<void> {
  const rounds = await getFinishedRounds()

  appRoot.innerHTML = `
    <main class="round-start">
      <div class="screen-top-actions">${renderFullscreenButton()}</div>
      <section class="round-card" aria-labelledby="history-title">
        <p class="round-card__label">FACERES QUIZ</p>
        <h1 id="history-title">Histórico</h1>
        ${
          rounds.length === 0
            ? '<p class="empty-state">Ainda não há rodadas encerradas.</p>'
            : `
              <div class="history-list">
                ${rounds
                  .map(
                    (round) => `
                      <button class="history-item" type="button" data-round-id="${round.id}">
                        <span>${escapeHtml(round.name)}</span>
                        <small>${formatDate(round.startedAt)} · ${round.scoreTeamA} × ${round.scoreTeamB}</small>
                      </button>
                    `,
                  )
                  .join('')}
              </div>
            `
        }
        <button id="close-history" class="secondary-button history-button" type="button">Voltar</button>
      </section>
    </main>
  `

  document
    .querySelector<HTMLButtonElement>('#close-history')
    ?.addEventListener('click', () => {
      void renderRoundStart()
    })

  document
    .querySelectorAll<HTMLButtonElement>('.history-item')
    .forEach((item) => {
      item.addEventListener('click', () => {
        const roundId = item.dataset.roundId

        if (roundId) {
          void renderRoundHistory(roundId)
        }
      })
    })

  attachFullscreenListener()
}

async function renderRoundHistory(roundId: string): Promise<void> {
  const [rounds, roundQuestions] = await Promise.all([
    getFinishedRounds(),
    getRoundQuestions(roundId),
  ])
  const round = rounds.find((candidate) => candidate.id === roundId)

  if (!round) {
    await renderHistory()
    return
  }

  appRoot.innerHTML = `
    <main class="round-start">
      <section class="round-card" aria-labelledby="round-history-title">
        <p class="round-card__label">HISTÓRICO DE RODADA</p>
        <h1 id="round-history-title">${escapeHtml(round.name)}</h1>
        <p class="round-card__description">${formatDate(round.startedAt)} · Placar final: ${round.scoreTeamA} × ${round.scoreTeamB}</p>
        <div class="history-question-list">
          ${
            roundQuestions.length === 0
              ? '<p class="empty-state">Nenhuma pergunta foi utilizada nesta rodada.</p>'
              : roundQuestions
                  .map(
                    (question, index) => `
                      <article class="history-question">
                        <p>${index + 1}. ${escapeHtml(question.category)} · ${question.difficulty}</p>
                        <strong>${escapeHtml(question.question)}</strong>
                        <span>Resposta: ${escapeHtml(question.answer)}</span>
                      </article>
                    `,
                  )
                  .join('')
          }
        </div>
        <button id="back-to-history" class="secondary-button history-button" type="button">Voltar ao histórico</button>
      </section>
    </main>
  `

  document
    .querySelector<HTMLButtonElement>('#back-to-history')
    ?.addEventListener('click', () => {
      void renderHistory()
    })
}

async function renderRoundStart(): Promise<void> {
  const [defaultRoundName, activeQuestionCount, finishedRounds] =
    await Promise.all([
      getSuggestedRoundName(),
      getActiveQuestionCount(),
      getFinishedRounds(),
    ])
  const hasQuestions = activeQuestionCount > 0

  appRoot.innerHTML = `
    <main class="round-start">
      <div class="screen-top-actions">${renderFullscreenButton()}</div>
      <section class="round-card" aria-labelledby="round-title">
        <p class="round-card__label">FACERES QUIZ</p>
        <h1 id="round-title">Iniciar rodada</h1>
        <p class="round-card__description">A roleta escolhe o tema. Você conduz o desafio.</p>
        <form id="round-form" class="round-form">
          <div class="round-name-selection">
            <span class="round-name-selection__label">Rodada selecionada</span>
            <div class="round-name-selection__content">
              <strong>${defaultRoundName}</strong>
              <button id="edit-round-name" class="secondary-button" type="button">Alterar nome</button>
            </div>
          </div>
          <div id="round-name-editor" hidden>
            <label for="round-name">Novo nome da sala ou rodada</label>
            <input id="round-name" name="round-name" type="text" autocomplete="off" maxlength="80" value="${defaultRoundName}" />
          </div>
          <section class="question-status" aria-labelledby="question-status-title">
            <button id="import-questions" class="secondary-button" type="button">Atualizar perguntas</button>
            <span id="question-status-title" class="question-status__summary"><strong>${activeQuestionCount}</strong> perguntas disponíveis</span>
            <input id="questions-file" type="file" accept="application/json,.json" hidden />
          </section>
          <p id="question-file-error" class="form-error" role="alert"></p>
          <p id="round-error" class="form-error" role="alert"></p>
          <button class="primary-button" type="submit" ${hasQuestions ? '' : 'disabled'}>Começar desafio</button>
          ${hasQuestions ? '' : '<p class="round-form__help">Importe perguntas para começar o desafio.</p>'}
          ${finishedRounds.length > 0 ? '<button id="view-history" class="secondary-button history-button" type="button">Ver histórico</button>' : ''}
          ${finishedRounds.length > 0 ? '<button id="reset-quiz" class="secondary-button reset-button" type="button">Resetar quiz</button>' : ''}
        </form>
      </section>
    </main>
  `

  const form = document.querySelector<HTMLFormElement>('#round-form')
  const input = document.querySelector<HTMLInputElement>('#round-name')
  const error = document.querySelector<HTMLParagraphElement>('#round-error')
  const importError = document.querySelector<HTMLParagraphElement>(
    '#question-file-error',
  )
  const submitButton = document.querySelector<HTMLButtonElement>(
    '#round-form button[type="submit"]',
  )
  const editButton =
    document.querySelector<HTMLButtonElement>('#edit-round-name')
  const editor = document.querySelector<HTMLDivElement>('#round-name-editor')
  const importButton =
    document.querySelector<HTMLButtonElement>('#import-questions')
  const fileInput = document.querySelector<HTMLInputElement>('#questions-file')
  const historyButton =
    document.querySelector<HTMLButtonElement>('#view-history')
  const resetButton = document.querySelector<HTMLButtonElement>('#reset-quiz')
  let isEditingName = false

  editButton?.addEventListener('click', () => {
    isEditingName = !isEditingName

    if (editor) {
      editor.hidden = !isEditingName
    }

    if (editButton) {
      editButton.textContent = isEditingName
        ? `Usar ${defaultRoundName}`
        : 'Alterar nome'
    }

    if (isEditingName) {
      input?.focus()
    }
  })

  importButton?.addEventListener('click', () => {
    fileInput?.click()
  })

  fileInput?.addEventListener('change', () => {
    const [file] = Array.from(fileInput.files ?? [])

    if (!file) {
      return
    }

    void (async () => {
      if (importButton) {
        importButton.disabled = true
      }

      try {
        const result = await readQuestionFile(file)

        if (!result.valid) {
          throw new Error(result.errors.join(' '))
        }

        await replaceQuestions(result.data)
        await renderRoundStart()
      } catch (exception: unknown) {
        if (importError) {
          importError.textContent =
            exception instanceof Error
              ? exception.message
              : 'Não foi possível atualizar as perguntas.'
        }
      } finally {
        if (importButton) {
          importButton.disabled = false
        }
        fileInput.value = ''
      }
    })()
  })

  historyButton?.addEventListener('click', () => {
    void renderHistory()
  })

  resetButton?.addEventListener('click', () => {
    renderResetConfirmation()
  })

  attachFullscreenListener()

  form?.addEventListener('submit', (event) => {
    event.preventDefault()

    void (async () => {
      if (submitButton) {
        submitButton.disabled = true
      }

      try {
        const round = await startRound(
          isEditingName ? (input?.value ?? '') : defaultRoundName,
        )
        await renderThemeSelection(round)
      } catch (exception: unknown) {
        if (error) {
          error.textContent =
            exception instanceof Error
              ? exception.message
              : 'Não foi possível iniciar a rodada.'
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false
        }
      }
    })()
  })
}

async function renderThemeSelection(round: Round): Promise<void> {
  const categories = await getCategoriesForRound(round.id)

  appRoot.innerHTML = `
    <main class="round-start round-with-score theme-screen">
      <div class="screen-top-actions">
        ${renderFullscreenButton()}
        <button id="reset-quiz" class="secondary-button question-reset-button" type="button">Resetar quiz</button>
      </div>
      <section class="round-card" aria-labelledby="theme-title">
        <h1 id="theme-title">Escolha o tema</h1>
        <p id="theme-error" class="form-error" role="alert"></p>
        ${
          categories.length === 0
            ? '<p class="empty-state">Não há perguntas disponíveis nesta rodada. Encerre a rodada, importe as perguntas e inicie uma nova.</p>'
            : `
              <div class="theme-grid">
                ${categories
                  .map(
                    ({ category, availableCount }) => `
                      <button class="theme-card" type="button" data-category="${escapeHtml(category)}" ${availableCount === 0 ? 'disabled' : ''}>
                        <span>${escapeHtml(category)}</span>
                        <small>${availableCount === 0 ? 'Tema esgotado' : `${availableCount} ${availableCount === 1 ? 'pergunta disponível' : 'perguntas disponíveis'}`}</small>
                      </button>
                    `,
                  )
                  .join('')}
              </div>
            `
        }
        <button id="new-round" class="secondary-button new-round-button" type="button">Nova rodada</button>
      </section>
      ${renderScoreBar(round)}
    </main>
  `

  const themeError =
    document.querySelector<HTMLParagraphElement>('#theme-error')
  const newRoundButton = document.querySelector<HTMLButtonElement>('#new-round')
  const resetButton = document.querySelector<HTMLButtonElement>('#reset-quiz')
  const themeButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.theme-card'),
  )

  themeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.category

      if (!category) {
        return
      }

      void (async () => {
        themeButtons.forEach((themeButton) => {
          themeButton.disabled = true
        })

        try {
          const roundQuestion = await selectQuestionForRound(round.id, category)
          renderQuestion(round, roundQuestion)
        } catch (exception: unknown) {
          if (themeError) {
            themeError.textContent =
              exception instanceof Error
                ? exception.message
                : 'Não foi possível sortear a pergunta.'
          }
          await renderThemeSelection(round)
        }
      })()
    })
  })

  newRoundButton?.addEventListener('click', () => {
    renderFinishConfirmation(round)
  })

  resetButton?.addEventListener('click', () => {
    renderResetConfirmation()
  })

  attachFullscreenListener()
  attachUndoLastPointListener(round, (updatedRound) =>
    renderThemeSelection(updatedRound),
  )
}

function renderResetConfirmation(): void {
  const overlay = document.createElement('div')
  overlay.className = 'confirmation-overlay'
  overlay.innerHTML = `
    <section class="confirmation-card" role="dialog" aria-modal="true" aria-labelledby="reset-confirmation-title">
      <p class="round-card__label">RESETAR QUIZ</p>
      <h2 id="reset-confirmation-title">Resetar todas as rodadas?</h2>
      <p>Rodadas, placares, perguntas utilizadas e histórico serão apagados. As perguntas importadas serão mantidas. Esta ação não pode ser desfeita.</p>
      <p id="reset-confirmation-error" class="form-error" role="alert"></p>
      <div class="confirmation-card__actions">
        <button id="cancel-reset" class="secondary-button" type="button">Cancelar</button>
        <button id="confirm-reset" class="primary-button" type="button">Resetar quiz</button>
      </div>
    </section>
  `
  document.body.append(overlay)

  const cancelButton = overlay.querySelector<HTMLButtonElement>('#cancel-reset')
  const confirmButton =
    overlay.querySelector<HTMLButtonElement>('#confirm-reset')
  const confirmationError = overlay.querySelector<HTMLParagraphElement>(
    '#reset-confirmation-error',
  )

  cancelButton?.addEventListener('click', () => {
    overlay.remove()
  })

  confirmButton?.addEventListener('click', () => {
    void (async () => {
      if (confirmButton) {
        confirmButton.disabled = true
      }

      try {
        await resetQuizData()
        overlay.remove()
        await renderRoundStart()
      } catch {
        if (confirmationError) {
          confirmationError.textContent = 'Não foi possível resetar o quiz.'
        }
        if (confirmButton) {
          confirmButton.disabled = false
        }
      }
    })()
  })
}

function renderFinishConfirmation(round: Round): void {
  const overlay = document.createElement('div')
  overlay.className = 'confirmation-overlay'
  overlay.innerHTML = `
    <section class="confirmation-card" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
      <p class="round-card__label">NOVA RODADA</p>
      <h2 id="confirmation-title">Encerrar ${escapeHtml(round.name)}?</h2>
      <p>A rodada atual será preservada no histórico e o placar da próxima rodada começará em 0 × 0.</p>
      <p id="confirmation-error" class="form-error" role="alert"></p>
      <div class="confirmation-card__actions">
        <button id="cancel-new-round" class="secondary-button" type="button">Cancelar</button>
        <button id="confirm-new-round" class="primary-button" type="button">Confirmar</button>
      </div>
    </section>
  `
  document.body.append(overlay)

  const cancelButton =
    document.querySelector<HTMLButtonElement>('#cancel-new-round')
  const confirmButton =
    document.querySelector<HTMLButtonElement>('#confirm-new-round')
  const confirmationError = document.querySelector<HTMLParagraphElement>(
    '#confirmation-error',
  )

  cancelButton?.addEventListener('click', () => {
    overlay.remove()
  })

  confirmButton?.addEventListener('click', () => {
    void (async () => {
      if (confirmButton) {
        confirmButton.disabled = true
      }

      try {
        await finishRound(round)
        overlay.remove()
        await renderRoundStart()
      } catch {
        if (confirmationError) {
          confirmationError.textContent = 'Não foi possível encerrar a rodada.'
        }
        if (confirmButton) {
          confirmButton.disabled = false
        }
      }
    })()
  })
}

function renderQuestion(
  round: Round,
  roundQuestion: RoundQuestion,
  hasAwardedPoint = false,
  awardedTeams: Team[] = [],
  lastScoredTeam: Team | null = null,
): void {
  appRoot.innerHTML = `
    <main class="round-start round-with-score question-screen">
      <div class="screen-top-actions">
        ${renderFullscreenButton()}
        <button id="reset-quiz" class="secondary-button question-reset-button" type="button">Resetar quiz</button>
      </div>
      <section class="round-card question-card" aria-labelledby="question-title">
        <p class="round-card__label">${escapeHtml(roundQuestion.category)}</p>
        <span class="difficulty-badge ${getDifficultyClass(roundQuestion.difficulty)}">${roundQuestion.difficulty}</span>
        <h1 id="question-title">${escapeHtml(roundQuestion.question)}</h1>
        <div class="answer-area">
          <div class="answer-area__content">
            <span class="answer-area__label">Resposta</span>
            <p id="answer-text" class="answer-text" aria-live="polite">Resposta oculta</p>
          </div>
          <button id="reveal-answer" class="reveal-button" type="button" aria-label="Segure para ver a resposta" title="Segure para ver a resposta">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15.5 14h-.79l-.28-.27A6.47 6.47 0 1 0 13.73 15l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" /></svg>
          </button>
        </div>
        <div class="point-actions">
          <button class="point-button" type="button" data-team="A">+1 Time A</button>
          <button class="point-button" type="button" data-team="B">+1 Time B</button>
        </div>
        <button id="next-question" class="secondary-button next-question-button" type="button">Próxima pergunta</button>
        <p id="point-warning" class="point-warning attention-alert" role="alert" hidden></p>
      </section>
      ${renderScoreBar(round, lastScoredTeam)}
    </main>
  `

  const answer = document.querySelector<HTMLParagraphElement>('#answer-text')
  const revealButton =
    document.querySelector<HTMLButtonElement>('#reveal-answer')
  const nextQuestionButton =
    document.querySelector<HTMLButtonElement>('#next-question')
  const resetButton = document.querySelector<HTMLButtonElement>('#reset-quiz')
  const pointButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.point-button'),
  )
  const pointWarning =
    document.querySelector<HTMLParagraphElement>('#point-warning')
  let hasConfirmedAdvanceWithoutPoint = false

  function showAnswer(): void {
    if (answer) {
      answer.textContent = roundQuestion.answer
      answer.classList.add('answer-text--visible')
    }
  }

  function hideAnswer(): void {
    if (answer) {
      answer.textContent = 'Resposta oculta'
      answer.classList.remove('answer-text--visible')
    }
  }

  revealButton?.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    revealButton.setPointerCapture(event.pointerId)
    showAnswer()
  })
  revealButton?.addEventListener('pointerup', hideAnswer)
  revealButton?.addEventListener('pointercancel', hideAnswer)
  revealButton?.addEventListener('lostpointercapture', hideAnswer)
  revealButton?.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      showAnswer()
    }
  })
  revealButton?.addEventListener('keyup', hideAnswer)

  pointButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const team = button.dataset.team

      if (team === 'A' || team === 'B') {
        renderScoreConfirmation(round, roundQuestion, team, awardedTeams)
      }
    })
  })

  nextQuestionButton?.addEventListener('click', () => {
    if (!hasAwardedPoint && !hasConfirmedAdvanceWithoutPoint) {
      hasConfirmedAdvanceWithoutPoint = true

      if (pointWarning) {
        pointWarning.hidden = false
        pointWarning.textContent =
          'Atenção: nenhuma equipe recebeu ponto. Toque novamente para avançar mesmo assim.'
      }

      return
    }

    void renderThemeSelection(round)
  })

  resetButton?.addEventListener('click', () => {
    renderResetConfirmation()
  })

  attachFullscreenListener()
  attachUndoLastPointListener(round, (updatedRound) =>
    renderQuestion(updatedRound, roundQuestion),
  )
}

function renderUndoConfirmation(
  round: Round,
  scoreEvent: ScoreEvent,
  onUndo: (updatedRound: Round) => void | Promise<void>,
): void {
  const teamName = scoreEvent.team === 'A' ? 'Time A' : 'Time B'
  const overlay = document.createElement('div')
  overlay.className = 'confirmation-overlay'
  overlay.innerHTML = `
    <section class="confirmation-card" role="dialog" aria-modal="true" aria-labelledby="undo-confirmation-title">
      <p class="round-card__label">CORRIGIR PLACAR</p>
      <h2 id="undo-confirmation-title">Remover 1 ponto do ${teamName}?</h2>
      <p>O último ponto adicionado a este time será desfeito.</p>
      <p id="undo-confirmation-error" class="form-error" role="alert"></p>
      <div class="confirmation-card__actions">
        <button id="cancel-undo" class="secondary-button" type="button">Cancelar</button>
        <button id="confirm-undo" class="primary-button" type="button">Desfazer ponto</button>
      </div>
    </section>
  `
  document.body.append(overlay)

  const cancelButton = overlay.querySelector<HTMLButtonElement>('#cancel-undo')
  const confirmButton =
    overlay.querySelector<HTMLButtonElement>('#confirm-undo')
  const confirmationError = overlay.querySelector<HTMLParagraphElement>(
    '#undo-confirmation-error',
  )

  cancelButton?.addEventListener('click', () => {
    overlay.remove()
  })

  confirmButton?.addEventListener('click', () => {
    void (async () => {
      if (confirmButton) {
        confirmButton.disabled = true
      }

      try {
        const updatedRound = await undoLastPoint(round.id)
        overlay.remove()
        await onUndo(updatedRound)
      } catch (exception: unknown) {
        if (confirmationError) {
          confirmationError.textContent =
            exception instanceof Error
              ? exception.message
              : 'Não foi possível desfazer o ponto.'
        }
        if (confirmButton) {
          confirmButton.disabled = false
        }
      }
    })()
  })
}

function renderScoreConfirmation(
  round: Round,
  roundQuestion: RoundQuestion,
  team: 'A' | 'B',
  awardedTeams: Team[],
): void {
  const teamName = team === 'A' ? 'Time A' : 'Time B'
  const otherTeam = team === 'A' ? 'B' : 'A'
  const otherTeamName = otherTeam === 'A' ? 'Time A' : 'Time B'
  const isAdditionalPoint = awardedTeams.includes(team)
  const hasOtherTeamPoint = awardedTeams.includes(otherTeam)
  const scoreConflictNotice = isAdditionalPoint
    ? `${teamName} já recebeu ponto nesta pergunta.`
    : hasOtherTeamPoint
      ? `${otherTeamName} já recebeu ponto nesta pergunta.`
      : null
  const confirmationTitle =
    isAdditionalPoint && hasOtherTeamPoint
      ? 'As duas equipes já receberam ponto nesta pergunta. Adicionar mais 1 ponto?'
      : isAdditionalPoint
        ? `${teamName} já recebeu ponto nesta pergunta. Adicionar mais 1 ponto?`
        : hasOtherTeamPoint
          ? `${otherTeamName} já recebeu ponto nesta pergunta. Adicionar 1 ponto também ao ${teamName}?`
          : `Adicionar 1 ponto ao ${teamName}?`
  const overlay = document.createElement('div')
  overlay.className = 'confirmation-overlay'
  overlay.innerHTML = `
    <section class="confirmation-card" role="dialog" aria-modal="true" aria-labelledby="score-confirmation-title">
      <p class="round-card__label">CONFIRMAR PONTUAÇÃO</p>
      ${scoreConflictNotice ? `<p class="attention-alert score-confirmation-alert" role="alert">Atenção: ${scoreConflictNotice}</p>` : ''}
      <h2 id="score-confirmation-title">${confirmationTitle}</h2>
      <div class="confirmation-card__actions">
        <button id="cancel-score" class="secondary-button" type="button">Cancelar</button>
        <button id="confirm-score" class="primary-button" type="button">Confirmar</button>
      </div>
      <p id="score-confirmation-error" class="form-error" role="alert"></p>
    </section>
  `
  document.body.append(overlay)

  const cancelButton =
    document.querySelector<HTMLButtonElement>('#cancel-score')
  const confirmButton =
    document.querySelector<HTMLButtonElement>('#confirm-score')
  const confirmationError = document.querySelector<HTMLParagraphElement>(
    '#score-confirmation-error',
  )

  cancelButton?.addEventListener('click', () => {
    overlay.remove()
  })

  confirmButton?.addEventListener('click', () => {
    void (async () => {
      if (confirmButton) {
        confirmButton.disabled = true
      }

      try {
        const updatedRound = await addPoint(round.id, team)
        overlay.remove()
        renderQuestion(
          updatedRound,
          roundQuestion,
          true,
          [...awardedTeams, team],
          team,
        )
      } catch (exception: unknown) {
        if (confirmationError) {
          confirmationError.textContent =
            exception instanceof Error
              ? exception.message
              : 'Não foi possível adicionar o ponto.'
        }
        if (confirmButton) {
          confirmButton.disabled = false
        }
      }
    })()
  })
}

async function initializeApplication(): Promise<void> {
  await openDatabase()
  const activeRound = await getActiveRound()

  if (activeRound) {
    await renderThemeSelection(activeRound)
    return
  }

  await renderRoundStart()
}

void initializeApplication().catch((error: unknown) => {
  console.error('Unable to initialize FACERES Quiz.', error)

  if (status) {
    status.textContent =
      'Não foi possível preparar os dados locais. Reabra o aplicativo.'
  }
})
