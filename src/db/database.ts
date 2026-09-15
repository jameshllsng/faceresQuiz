const DATABASE_NAME = 'faceres-quiz'
const DATABASE_VERSION = 1

export const STORE_NAMES = {
  questions: 'questions',
  rounds: 'rounds',
  roundQuestions: 'roundQuestions',
  scoreEvents: 'scoreEvents',
} as const

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      reject(
        request.error ?? new Error('Unable to complete the database request.'),
      )
    }
  })
}

export function transactionToPromise(
  transaction: IDBTransaction,
): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => {
      reject(
        transaction.error ??
          new Error('Unable to complete the database transaction.'),
      )
    }
    transaction.onabort = () => {
      reject(
        transaction.error ?? new Error('The database transaction was aborted.'),
      )
    }
  })
}

function createQuestionStore(database: IDBDatabase): void {
  if (database.objectStoreNames.contains(STORE_NAMES.questions)) {
    return
  }

  const store = database.createObjectStore(STORE_NAMES.questions, {
    keyPath: 'id',
  })
  store.createIndex('by-category', 'category')
  store.createIndex('by-active', 'active')
}

function createRoundStore(database: IDBDatabase): void {
  if (database.objectStoreNames.contains(STORE_NAMES.rounds)) {
    return
  }

  const store = database.createObjectStore(STORE_NAMES.rounds, {
    keyPath: 'id',
  })
  store.createIndex('by-finished-at', 'finishedAt')
}

function createRoundQuestionStore(database: IDBDatabase): void {
  if (database.objectStoreNames.contains(STORE_NAMES.roundQuestions)) {
    return
  }

  const store = database.createObjectStore(STORE_NAMES.roundQuestions, {
    keyPath: 'id',
  })
  store.createIndex('by-round-id', 'roundId')
  store.createIndex('by-round-question', ['roundId', 'questionId'], {
    unique: true,
  })
}

function createScoreEventStore(database: IDBDatabase): void {
  if (database.objectStoreNames.contains(STORE_NAMES.scoreEvents)) {
    return
  }

  const store = database.createObjectStore(STORE_NAMES.scoreEvents, {
    keyPath: 'id',
  })
  store.createIndex('by-round-id', 'roundId')
}

function createStores(database: IDBDatabase): void {
  createQuestionStore(database)
  createRoundStore(database)
  createRoundQuestionStore(database)
  createScoreEventStore(database)
}

export function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) {
    return Promise.reject(
      new Error('IndexedDB is not available in this browser.'),
    )
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onerror = () => {
      reject(request.error ?? new Error('Unable to open the local database.'))
    }

    request.onupgradeneeded = () => {
      createStores(request.result)
    }

    request.onsuccess = () => {
      const database = request.result

      database.onversionchange = () => {
        database.close()
      }

      resolve(database)
    }
  })
}
