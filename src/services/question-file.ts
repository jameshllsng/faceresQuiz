import {
  DIFFICULTIES,
  type Difficulty,
  type Question,
  type QuestionFile,
} from '../types/models'

type JsonObject = Record<string, unknown>

export type QuestionFileValidation =
  { valid: true; data: QuestionFile } | { valid: false; errors: string[] }

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRequiredText(
  value: unknown,
  field: string,
  questionNumber: number,
  errors: string[],
): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`Pergunta ${questionNumber}: o campo "${field}" é obrigatório.`)
    return null
  }

  return value.trim()
}

function readDifficulty(
  value: unknown,
  questionNumber: number,
  errors: string[],
): Difficulty | null {
  if (typeof value === 'string' && DIFFICULTIES.includes(value as Difficulty)) {
    return value as Difficulty
  }

  errors.push(
    `Pergunta ${questionNumber}: a dificuldade deve ser Fácil, Média ou Difícil.`,
  )
  return null
}

function readQuestion(
  value: unknown,
  questionNumber: number,
  errors: string[],
): Question | null {
  if (!isObject(value)) {
    errors.push(
      `Item ${questionNumber}: cada pergunta deve ser um objeto válido.`,
    )
    return null
  }

  const id = readRequiredText(value.id, 'id', questionNumber, errors)
  const category = readRequiredText(
    value.category,
    'category',
    questionNumber,
    errors,
  )
  const question = readRequiredText(
    value.question,
    'question',
    questionNumber,
    errors,
  )
  const answer = readRequiredText(
    value.answer,
    'answer',
    questionNumber,
    errors,
  )
  const difficulty = readDifficulty(value.difficulty, questionNumber, errors)
  const active = value.active === undefined ? true : value.active

  if (typeof active !== 'boolean') {
    errors.push(
      `Pergunta ${questionNumber}: o campo "active" deve ser verdadeiro ou falso.`,
    )
  }

  if (
    !id ||
    !category ||
    !question ||
    !answer ||
    !difficulty ||
    typeof active !== 'boolean'
  ) {
    return null
  }

  return { id, category, question, answer, difficulty, active }
}

export function validateQuestionFile(value: unknown): QuestionFileValidation {
  const errors: string[] = []

  if (!isObject(value)) {
    return { valid: false, errors: ['O arquivo deve conter um objeto JSON.'] }
  }

  if (value.version !== 1) {
    errors.push('A versão do arquivo deve ser 1.')
  }

  if (!Array.isArray(value.questions) || value.questions.length === 0) {
    errors.push('O arquivo deve conter pelo menos uma pergunta.')
    return { valid: false, errors }
  }

  const questionIds = new Set<string>()
  const questions: Question[] = []

  value.questions.forEach((item, index) => {
    const question = readQuestion(item, index + 1, errors)

    if (!question) {
      return
    }

    if (questionIds.has(question.id)) {
      errors.push(
        `Pergunta ${index + 1}: o ID "${question.id}" está duplicado.`,
      )
      return
    }

    questionIds.add(question.id)
    questions.push(question)
  })

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  if (!questions.some((question) => question.active)) {
    return {
      valid: false,
      errors: ['O arquivo deve conter pelo menos uma pergunta ativa.'],
    }
  }

  return { valid: true, data: { version: 1, questions } }
}

export function parseQuestionFile(content: string): QuestionFileValidation {
  try {
    return validateQuestionFile(JSON.parse(content) as unknown)
  } catch {
    return { valid: false, errors: ['O arquivo não contém um JSON válido.'] }
  }
}

export async function readQuestionFile(
  file: File,
): Promise<QuestionFileValidation> {
  return parseQuestionFile(await file.text())
}
