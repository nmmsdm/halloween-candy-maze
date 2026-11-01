import { createError, readBody } from 'h3'
import { requireCompanySession, hashPassword, setCompanySession, verifyPassword } from '../../../utils/company-auth'
import { updateCompanyPassword } from '../../../utils/database'

export default defineEventHandler(async (event) => {
  const company = requireCompanySession(event)
  const body = await readBody(event)
  const currentPassword = String(body?.currentPassword || '')
  const newPassword = String(body?.newPassword || '')

  if (!(await verifyPassword(currentPassword, company.passwordSalt, company.passwordHash))) {
    throw createError({ statusCode: 401, statusMessage: 'Current password is incorrect.' })
  }
  if (newPassword.length < 12 || newPassword.length > 200) {
    throw createError({ statusCode: 400, statusMessage: 'New password must be between 12 and 200 characters.' })
  }

  const credentials = await hashPassword(newPassword)
  updateCompanyPassword(company.id, credentials.hash, credentials.salt)
  setCompanySession(event, company.id)
  return { ok: true }
})
