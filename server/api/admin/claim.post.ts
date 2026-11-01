import { createError, readBody } from 'h3'
import { adminPin } from '../../utils/store'
import { claimWinner } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (String(body?.pin || '') !== adminPin()) throw createError({ statusCode: 401, statusMessage: 'Invalid admin PIN.' })
  const code = String(body?.claimCode || '').trim().toUpperCase()
  const result = claimWinner(code, null)
  if (!result) throw createError({ statusCode: 404, statusMessage: 'Claim code not found.' })
  return { ok: !result.alreadyClaimed, ...result }
})
