import { randomUUID } from 'node:crypto'
import { createError, readBody } from 'h3'
import {
  allWinners,
  leaderboard,
  makeClaimCode,
  mutateWinnerStore,
} from '../utils/store'
import {
  claimCodeExists,
  mutateCompanyStore,
  type Difficulty,
  type Winner,
  type WinnerStore
} from '../utils/database'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = String(body?.name || '').trim().slice(0, 32)
  const difficulty = String(body?.difficulty || '') as Difficulty
  const completionTime = Number(body?.completionTime)
  const moves = Number(body?.moves)
  const companyCode = String(body?.companyCode || '')

  if (!name) throw createError({ statusCode: 400, statusMessage: 'Player name is required.' })
  if (!['easy', 'medium', 'hard'].includes(difficulty)) throw createError({ statusCode: 400, statusMessage: 'Invalid difficulty.' })
  if (!Number.isInteger(completionTime) || completionTime < 0 || completionTime > 3600) throw createError({ statusCode: 400, statusMessage: 'Invalid completion time.' })
  if (!Number.isInteger(moves) || moves < 1 || moves > 100000) throw createError({ statusCode: 400, statusMessage: 'Invalid move count.' })

  const createWinner = (store: WinnerStore) => {
    const rows = allWinners(store)
    let claimCode = makeClaimCode()
    while (rows.some(w => w.claimCode === claimCode) || claimCodeExists(claimCode)) {
      claimCode = makeClaimCode()
    }
    const winner: Winner = {
      id: randomUUID(), name, difficulty, completionTime, moves, claimCode,
      wonAt: new Date().toISOString(), claimed: false, claimedAt: null
    }
    store.activeWinners.push(winner)
    const board = leaderboard([...rows, winner], 'monthly', 'fastest')[difficulty]
    const rank = board.findIndex(w => w.id === winner.id) + 1
    return { winner, rank: rank || null }
  }

  if (companyCode) {
    const result = mutateCompanyStore(companyCode, createWinner)
    if (!result) throw createError({ statusCode: 404, statusMessage: 'Company game was not found.' })
    return result
  }
  return mutateWinnerStore(createWinner)
})
