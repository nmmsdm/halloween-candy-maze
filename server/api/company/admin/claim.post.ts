import { createError, readBody } from 'h3'
import { claimWinner } from '../../../utils/database'
import { requireCompanySession } from '../../../utils/company-auth'

export default defineEventHandler(async (event) => {
  const company = requireCompanySession(event)
  const body = await readBody(event)
  const code = String(body?.claimCode || '').trim().toUpperCase()
  const result = claimWinner(code, company.id)
  if (!result) throw createError({ statusCode: 404, statusMessage: 'Claim code not found.' })
  return { ok: !result.alreadyClaimed, ...result }
})
