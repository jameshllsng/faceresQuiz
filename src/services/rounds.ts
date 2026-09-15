import {
  openDatabase,
  requestToPromise,
  STORE_NAMES,
  transactionToPromise,
} from '../db/database'
import type { Round, ScoreEvent, Team } from '../types/models'

function createId(): string {
  if ('randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export async function getActiveRound(): Promise<Round | null> {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAMES.rounds, 'readonly')
  const store = transaction.objectStore(STORE_NAMES.rounds)
  const rounds = await requestToPromise(store.getAll() as IDBRequest<Round[]>)

  return rounds.find((round) => round.finishedAt === null) ?? null
}

export async function getFinishedRounds(): Promise<Round[]> {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAMES.rounds, 'readonly')
  const store = transaction.objectStore(STORE_NAMES.rounds)
  const rounds = await requestToPromise(store.getAll() as IDBRequest<Round[]>)

  return rounds
    .filter((round) => round.finishedAt !== null)
    .sort((first, second) => second.startedAt.localeCompare(first.startedAt))
}

export async function getSuggestedRoundName(): Promise<string> {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAMES.rounds, 'readonly')
  const store = transaction.objectStore(STORE_NAMES.rounds)
  const rounds = await requestToPromise(store.getAll() as IDBRequest<Round[]>)
  const highestRoomNumber = rounds.reduce((highest, round) => {
    const match = /^sala\s+(\d+)$/i.exec(round.name.trim())
    const roomNumber = match ? Number(match[1]) : 0

    return Math.max(highest, roomNumber)
  }, 0)

  return `Sala ${highestRoomNumber + 1}`
}

export async function startRound(name: string): Promise<Round> {
  const normalizedName = name.trim()

  if (!normalizedName) {
    throw new Error('Informe o nome da sala ou rodada.')
  }

  const activeRound = await getActiveRound()

  if (activeRound) {
    throw new Error('Já existe uma rodada em andamento.')
  }

  const round: Round = {
    id: createId(),
    name: normalizedName,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    scoreTeamA: 0,
    scoreTeamB: 0,
  }

  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAMES.rounds, 'readwrite')
  const store = transaction.objectStore(STORE_NAMES.rounds)
  store.add(round)
  await transactionToPromise(transaction)

  return round
}

export async function finishRound(round: Round): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAMES.rounds, 'readwrite')
  const store = transaction.objectStore(STORE_NAMES.rounds)

  store.put({
    ...round,
    finishedAt: new Date().toISOString(),
  })

  await transactionToPromise(transaction)
}

export async function addPoint(roundId: string, team: Team): Promise<Round> {
  const database = await openDatabase()
  const readTransaction = database.transaction(STORE_NAMES.rounds, 'readonly')
  const round = await requestToPromise(
    readTransaction.objectStore(STORE_NAMES.rounds).get(roundId) as IDBRequest<
      Round | undefined
    >,
  )

  if (!round || round.finishedAt !== null) {
    throw new Error('A rodada não está disponível para receber pontos.')
  }

  const updatedRound: Round = {
    ...round,
    scoreTeamA: round.scoreTeamA + (team === 'A' ? 1 : 0),
    scoreTeamB: round.scoreTeamB + (team === 'B' ? 1 : 0),
  }
  const scoreEvent: ScoreEvent = {
    id: createId(),
    roundId,
    team,
    points: 1,
    createdAt: new Date().toISOString(),
  }

  const writeDatabase = await openDatabase()
  const writeTransaction = writeDatabase.transaction(
    [STORE_NAMES.rounds, STORE_NAMES.scoreEvents],
    'readwrite',
  )
  writeTransaction.objectStore(STORE_NAMES.rounds).put(updatedRound)
  writeTransaction.objectStore(STORE_NAMES.scoreEvents).add(scoreEvent)
  await transactionToPromise(writeTransaction)

  return updatedRound
}

export async function getLastUndoableScoreEvent(
  roundId: string,
): Promise<ScoreEvent | null> {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAMES.scoreEvents, 'readonly')
  const store = transaction.objectStore(STORE_NAMES.scoreEvents)
  const scoreEvents = await requestToPromise(
    store.getAll() as IDBRequest<ScoreEvent[]>,
  )
  const revertedScoreEventIds = new Set(
    scoreEvents
      .filter((scoreEvent) => scoreEvent.revertsScoreEventId)
      .map((scoreEvent) => scoreEvent.revertsScoreEventId),
  )

  return (
    scoreEvents
      .filter(
        (scoreEvent) =>
          scoreEvent.roundId === roundId &&
          scoreEvent.points > 0 &&
          !revertedScoreEventIds.has(scoreEvent.id),
      )
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
      .at(0) ?? null
  )
}

export async function undoLastPoint(roundId: string): Promise<Round> {
  const [activeRound, scoreEvent] = await Promise.all([
    getActiveRound(),
    getLastUndoableScoreEvent(roundId),
  ])

  if (!activeRound || activeRound.id !== roundId || !scoreEvent) {
    throw new Error('Não há ponto disponível para desfazer nesta rodada.')
  }

  const updatedRound: Round = {
    ...activeRound,
    scoreTeamA: activeRound.scoreTeamA - (scoreEvent.team === 'A' ? 1 : 0),
    scoreTeamB: activeRound.scoreTeamB - (scoreEvent.team === 'B' ? 1 : 0),
  }

  if (updatedRound.scoreTeamA < 0 || updatedRound.scoreTeamB < 0) {
    throw new Error('O placar não pode ficar negativo.')
  }

  const correctionEvent: ScoreEvent = {
    id: createId(),
    roundId,
    team: scoreEvent.team,
    points: -1,
    createdAt: new Date().toISOString(),
    revertsScoreEventId: scoreEvent.id,
  }
  const database = await openDatabase()
  const transaction = database.transaction(
    [STORE_NAMES.rounds, STORE_NAMES.scoreEvents],
    'readwrite',
  )
  transaction.objectStore(STORE_NAMES.rounds).put(updatedRound)
  transaction.objectStore(STORE_NAMES.scoreEvents).add(correctionEvent)
  await transactionToPromise(transaction)

  return updatedRound
}

export async function resetQuizData(): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(
    [STORE_NAMES.rounds, STORE_NAMES.roundQuestions, STORE_NAMES.scoreEvents],
    'readwrite',
  )

  transaction.objectStore(STORE_NAMES.rounds).clear()
  transaction.objectStore(STORE_NAMES.roundQuestions).clear()
  transaction.objectStore(STORE_NAMES.scoreEvents).clear()
  await transactionToPromise(transaction)
}
