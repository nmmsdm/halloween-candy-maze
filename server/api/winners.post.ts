import { randomUUID } from 'node:crypto'
import { createError, readBody } from 'h3'
import { leaderboard, makeClaimCode, mutateWinners, type Difficulty, type Winner } from '../utils/store'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = String(body?.name || '').trim().slice(0, 32)
  const difficulty = String(body?.difficulty || '') as Difficulty
  const completionTime = Number(body?.completionTime)
  const moves = Number(body?.moves)

  if (!name) throw createError({ statusCode: 400, statusMessage: 'Player name is required.' })
  if (!['easy', 'medium', 'hard'].includes(difficulty)) throw createError({ statusCode: 400, statusMessage: 'Invalid difficulty.' })
  if (!Number.isInteger(completionTime) || completionTime < 0 || completionTime > 3600) throw createError({ statusCode: 400, statusMessage: 'Invalid completion time.' })
  if (!Number.isInteger(moves) || moves < 1 || moves > 100000) throw createError({ statusCode: 400, statusMessage: 'Invalid move count.' })

  return mutateWinners((rows) => {
    let claimCode = makeClaimCode()
    while (rows.some(w => w.claimCode === claimCode)) claimCode = makeClaimCode()
    const winner: Winner = {
      id: randomUUID(), name, difficulty, completionTime, moves, claimCode,
      wonAt: new Date().toISOString(), claimed: false, claimedAt: null
    }
    rows.push(winner)
    const board = leaderboard(rows)[difficulty]
    const rank = board.findIndex(w => w.id === winner.id) + 1
    return { winner, rank: rank || null }
  })
})
