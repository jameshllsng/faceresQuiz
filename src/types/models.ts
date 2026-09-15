export const DIFFICULTIES = ['Fácil', 'Média', 'Difícil'] as const

export type Difficulty = (typeof DIFFICULTIES)[number]

export type Team = 'A' | 'B'

export interface Question {
  id: string
  category: string
  question: string
  answer: string
  difficulty: Difficulty
  active: boolean
}

export interface QuestionFile {
  version: 1
  questions: Question[]
}

export interface Round {
  id: string
  name: string
  startedAt: string
  finishedAt: string | null
  scoreTeamA: number
  scoreTeamB: number
}

export interface RoundQuestion {
  id: string
  roundId: string
  questionId: string
  question: string
  answer: string
  category: string
  difficulty: Difficulty
  usedAt: string
}

export interface ScoreEvent {
  id: string
  roundId: string
  team: Team
  points: number
  createdAt: string
  revertsScoreEventId?: string
}
