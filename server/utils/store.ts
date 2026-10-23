import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

export type Difficulty = 'easy' | 'medium' | 'hard'
export type Winner = {
  id: string
  name: string
  difficulty: Difficulty
  completionTime: number
  moves: number
  claimCode: string
  wonAt: string
  claimed: boolean
  claimedAt: string | null
}

const dataDir = path.resolve(process.cwd(), 'data')
const dataFile = path.join(dataDir, 'winners.json')
let writeQueue: Promise<unknown> = Promise.resolve()

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true })
  try { await fs.access(dataFile) }
  catch { await fs.writeFile(dataFile, '[]', 'utf8') }
}

export async function readWinners(): Promise<Winner[]> {
  await ensureStore()
  try {
    const raw = await fs.readFile(dataFile, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeWinnersNow(rows: Winner[]) {
  await ensureStore()
  const temp = `${dataFile}.tmp`
  await fs.writeFile(temp, JSON.stringify(rows, null, 2), 'utf8')
  await fs.rename(temp, dataFile)
}

export function mutateWinners<T>(fn: (rows: Winner[]) => Promise<T> | T): Promise<T> {
  const operation = writeQueue.then(async () => {
    const rows = await readWinners()
    const result = await fn(rows)
    await writeWinnersNow(rows)
    return result
  })
  writeQueue = operation.then(() => undefined, () => undefined)
  return operation
}

export function makeClaimCode() {
  return `CANDY-${randomBytes(4).toString('hex').toUpperCase()}`
}

export function leaderboard(rows: Winner[]) {
  const rank = (level: Difficulty) => rows
    .filter(w => w.difficulty === level)
    .sort((a, b) => a.completionTime - b.completionTime || a.moves - b.moves || a.wonAt.localeCompare(b.wonAt))
    .slice(0, 5)
  return { easy: rank('easy'), medium: rank('medium'), hard: rank('hard') }
}

export function adminPin() {
  return process.env.ADMIN_PIN || '1031'
}
