import { createError, readBody } from 'h3'
import { getCompanyByEmail } from '../../utils/database'
import { normalizeEmail, setCompanySession, verifyPassword } from '../../utils/company-auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = normalizeEmail(String(body?.email || ''))
  const password = String(body?.password || '')
  const company = getCompanyByEmail(email)

  if (!company || !(await verifyPassword(password, company.passwordSalt, company.passwordHash))) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password.' })
  }

  setCompanySession(event, company.id)
  return { company: { code: company.code, name: company.name, ownerEmail: company.ownerEmail } }
})
