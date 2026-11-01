import { createError, readBody } from 'h3'
import { adminPin } from '../../utils/store'
import { archiveWinnerList } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (String(body?.pin || '') !== adminPin()) throw createError({ statusCode: 401, statusMessage: 'Invalid admin PIN.' })
  if (String(body?.confirm || '') !== 'RESET') {
    throw createError({ statusCode: 400, statusMessage: 'Confirmation must be RESET.' })
  }
  archiveWinnerList('global', null)
  return { ok: true }
})
