import {
  openDatabase,
  requestToPromise,
  STORE_NAMES,
  transactionToPromise,
} from '../db/database'
import { getActiveRound } from './rounds'
import type { Question, QuestionFile, RoundQuestion } from '../types/models'

export interface CategoryAvailability {
  category: string
  availableCount: number
}

function getRandomIndex(length: number): number {
  if (length <= 1) {
    return 0
  }

  if ('getRandomValues' in crypto) {
    const randomValue = new Uint32Array(1)
    const limit = Math.floor(0x1_0000_0000 / length) * length

    do {
      crypto.getRandomValues(randomValue)
    } while (randomValue[0] >= limit)

    return randomValue[0] % length
  }

  return Math.floor(Math.random() * length)
}

export async function getActiveQuestionCount(): Promise<number> {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAMES.questions, 'readonly')
  const store = transaction.objectStore(STORE_NAMES.questions)
  const questions = await requestToPromise(
    store.getAll() as IDBRequest<Question[]>,
  )

  return questions.filter((question) => question.active).length
}

export async function replaceQuestions(data: QuestionFile): Promise<void> {
  const activeRound = await getActiveRound()

  if (activeRound) {
    throw new Error('Encerre a rodada atual antes de atualizar as perguntas.')
  }

  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAMES.questions, 'readwrite')
  const questionStore = transaction.objectStore(STORE_NAMES.questions)
  questionStore.clear()

  data.questions.forEach((question) => {
    questionStore.put(question)
  })

  await transactionToPromise(transaction)
}

export async function getCategoriesForRound(
  roundId: string,
): Promise<CategoryAvailability[]> {
  const database = await openDatabase()
  const transaction = database.transaction(
    [STORE_NAMES.questions, STORE_NAMES.roundQuestions],
    'readonly',
  )
  const questionStore = transaction.objectStore(STORE_NAMES.questions)
  const roundQuestionStore = transaction.objectStore(STORE_NAMES.roundQuestions)
  const [questions, roundQuestions] = await Promise.all([
    requestToPromise(questionStore.getAll() as IDBRequest<Question[]>),
    requestToPromise(
      roundQuestionStore.getAll() as IDBRequest<RoundQuestion[]>,
    ),
  ])
  const usedQuestionIds = new Set(
    roundQuestions
      .filter((roundQuestion) => roundQuestion.roundId === roundId)
      .map((roundQuestion) => roundQuestion.questionId),
  )
  const categories = new Map<string, number>()

  questions.forEach((question) => {
    if (!question.active) {
      return
    }

    const availableCount = categories.get(question.category) ?? 0
    categories.set(
      question.category,
      availableCount + (usedQuestionIds.has(question.id) ? 0 : 1),
    )
  })

  return Array.from(categories, ([category, availableCount]) => ({
    category,
    availableCount,
  })).sort((first, second) =>
    first.category.localeCompare(second.category, 'pt-BR'),
  )
}

export async function getRoundQuestions(
  roundId: string,
): Promise<RoundQuestion[]> {
  const database = await openDatabase()
  const transaction = database.transaction(
    STORE_NAMES.roundQuestions,
    'readonly',
  )
  const store = transaction.objectStore(STORE_NAMES.roundQuestions)
  const roundQuestions = await requestToPromise(
    store.getAll() as IDBRequest<RoundQuestion[]>,
  )

  return roundQuestions
    .filter((roundQuestion) => roundQuestion.roundId === roundId)
    .sort((first, second) => first.usedAt.localeCompare(second.usedAt))
}

export async function selectQuestionForRound(
  roundId: string,
  category: string,
): Promise<RoundQuestion> {
  const database = await openDatabase()
  const transaction = database.transaction(
    [STORE_NAMES.questions, STORE_NAMES.roundQuestions],
    'readonly',
  )
  const questionStore = transaction.objectStore(STORE_NAMES.questions)
  const roundQuestionStore = transaction.objectStore(STORE_NAMES.roundQuestions)
  const [questions, roundQuestions] = await Promise.all([
    requestToPromise(questionStore.getAll() as IDBRequest<Question[]>),
    requestToPromise(
      roundQuestionStore.getAll() as IDBRequest<RoundQuestion[]>,
    ),
  ])
  const usedQuestionIds = new Set(
    roundQuestions
      .filter((roundQuestion) => roundQuestion.roundId === roundId)
      .map((roundQuestion) => roundQuestion.questionId),
  )
  const availableQuestions = questions.filter(
    (question) =>
      question.active &&
      question.category === category &&
      !usedQuestionIds.has(question.id),
  )

  if (availableQuestions.length === 0) {
    throw new Error('Não há mais perguntas disponíveis neste tema.')
  }

  const usageByQuestionId = new Map<string, number>()

  roundQuestions.forEach((roundQuestion) => {
    usageByQuestionId.set(
      roundQuestion.questionId,
      (usageByQuestionId.get(roundQuestion.questionId) ?? 0) + 1,
    )
  })

  const lowestUsage = Math.min(
    ...availableQuestions.map(
      (question) => usageByQuestionId.get(question.id) ?? 0,
    ),
  )
  const balancedQuestions = availableQuestions.filter(
    (question) => (usageByQuestionId.get(question.id) ?? 0) === lowestUsage,
  )
  const selectedQuestion =
    balancedQuestions[getRandomIndex(balancedQuestions.length)]
  const roundQuestion: RoundQuestion = {
    id: `${roundId}:${selectedQuestion.id}`,
    roundId,
    questionId: selectedQuestion.id,
    question: selectedQuestion.question,
    answer: selectedQuestion.answer,
    category: selectedQuestion.category,
    difficulty: selectedQuestion.difficulty,
    usedAt: new Date().toISOString(),
  }

  const writeDatabase = await openDatabase()
  const writeTransaction = writeDatabase.transaction(
    STORE_NAMES.roundQuestions,
    'readwrite',
  )
  writeTransaction.objectStore(STORE_NAMES.roundQuestions).add(roundQuestion)
  await transactionToPromise(writeTransaction)

  return roundQuestion
}
