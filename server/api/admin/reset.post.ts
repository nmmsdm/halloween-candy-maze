import { createError, readBody } from 'h3'
import { adminPin, mutateWinners } from '../../utils/store'
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (String(body?.pin || '') !== adminPin()) throw createError({ statusCode: 401, statusMessage: 'Invalid admin PIN.' })
  if (String(body?.confirm || '') !== 'RESET') throw createError({ statusCode: 400, statusMessage: 'Confirmation must be RESET.' })
  await mutateWinners((rows) => { rows.splice(0, rows.length) })
  return { ok: true }
})
