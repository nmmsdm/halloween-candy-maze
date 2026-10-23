import { createError, readBody } from 'h3'
import { adminPin, mutateWinners } from '../../utils/store'
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (String(body?.pin || '') !== adminPin()) throw createError({ statusCode: 401, statusMessage: 'Invalid admin PIN.' })
  const code = String(body?.claimCode || '').trim().toUpperCase()
  return mutateWinners((rows) => {
    const winner = rows.find(w => w.claimCode === code)
    if (!winner) throw createError({ statusCode: 404, statusMessage: 'Claim code not found.' })
    if (winner.claimed) return { ok: false, alreadyClaimed: true, winner }
    winner.claimed = true
    winner.claimedAt = new Date().toISOString()
    return { ok: true, alreadyClaimed: false, winner }
  })
})
