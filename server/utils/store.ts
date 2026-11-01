import { randomBytes } from 'node:crypto'
import {
  mutateGlobalStore,
  type Difficulty,
  type Winner,
  type WinnerStore
} from './database'

export type LeaderboardMetric = 'fastest' | 'fewestMoves'
export type LeaderboardPeriod = 'monthly' | 'yearly'

export function readWinnerStore(): Promise<WinnerStore> {
  return Promise.resolve(readGlobalStore())
}

export function mutateWinnerStore<T>(mutate: (store: WinnerStore) => T): Promise<T> {
  return Promise.resolve(mutateGlobalStore(mutate))
}

export function allWinners(store: WinnerStore): Winner[] {
  return [...store.archivedWinners, ...store.activeWinners]
}

function compareWinners(a: Winner, b: Winner, metric: LeaderboardMetric) {
  if (metric === 'fewestMoves') {
    return a.moves - b.moves ||
      a.completionTime - b.completionTime ||
      a.wonAt.localeCompare(b.wonAt)
  }
  return a.completionTime - b.completionTime ||
    a.moves - b.moves ||
    a.wonAt.localeCompare(b.wonAt)
}

function isInPeriod(winner: Winner, period: LeaderboardPeriod, now: Date) {
  const wonAt = new Date(winner.wonAt)
  if (Number.isNaN(wonAt.getTime())) return false
  if (period === 'yearly') return wonAt.getFullYear() === now.getFullYear()
  return wonAt.getFullYear() === now.getFullYear() && wonAt.getMonth() === now.getMonth()
}

export function leaderboard(
  winners: Winner[],
  period: LeaderboardPeriod = 'monthly',
  metric: LeaderboardMetric = 'fastest',
  now = new Date()
) {
  const eligible = winners.filter(winner => isInPeriod(winner, period, now))
  const rank = (level: Difficulty) => {
    const bestByPlayer = new Map<string, Winner>()

    for (const winner of eligible) {
      if (winner.difficulty !== level) continue
      const key = winner.name.trim().toLowerCase()
      const previous = bestByPlayer.get(key)
      if (!previous || compareWinners(winner, previous, metric) < 0) {
        bestByPlayer.set(key, winner)
      }
    }

    return [...bestByPlayer.values()]
      .sort((a, b) => compareWinners(a, b, metric))
      .slice(0, 5)
  }

  return { easy: rank('easy'), medium: rank('medium'), hard: rank('hard') }
}

export function makeClaimCode() {
  return `CANDY-${randomBytes(4).toString('hex').toUpperCase()}`
}

export function adminPin() {
  return process.env.ADMIN_PIN || '1031'
}
