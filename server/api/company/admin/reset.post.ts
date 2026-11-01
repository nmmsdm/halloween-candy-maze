import { createError, readBody } from 'h3'
import { requireCompanySession } from '../../../utils/company-auth'
import { archiveWinnerList } from '../../../utils/database'

export default defineEventHandler(async (event) => {
  const company = requireCompanySession(event)
  const body = await readBody(event)
  if (String(body?.confirm || '') !== 'RESET') {
    throw createError({ statusCode: 400, statusMessage: 'Confirmation must be RESET.' })
  }

  archiveWinnerList('company', company.id)
  return { ok: true }
})
