import { randomBytes } from 'node:crypto'
import { createError, readBody } from 'h3'
import { createCompany, getCompanyByEmail } from '../../utils/database'
import {
  hashPassword,
  isValidEmail,
  normalizeEmail,
  publicCompany,
  setCompanySession
} from '../../utils/company-auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = String(body?.name || '').trim().replace(/\s+/g, ' ')
  const email = normalizeEmail(String(body?.email || ''))
  const password = String(body?.password || '')

  if (body?.agreeToTerms !== true) {
    throw createError({ statusCode: 400, statusMessage: 'You must agree to the Terms and acknowledge the Privacy Notice.' })
  }
  if (name.length < 2 || name.length > 80) {
    throw createError({ statusCode: 400, statusMessage: 'Company name must be between 2 and 80 characters.' })
  }
  if (!isValidEmail(email)) throw createError({ statusCode: 400, statusMessage: 'Enter a valid email address.' })
  if (password.length < 12 || password.length > 200) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be between 12 and 200 characters.' })
  }
  if (getCompanyByEmail(email)) {
    throw createError({ statusCode: 409, statusMessage: 'An admin account already exists for that email.' })
  }

  const credentials = await hashPassword(password)
  let company
  try {
    company = createCompany({
      code: randomBytes(9).toString('base64url'),
      name,
      email,
      passwordHash: credentials.hash,
      passwordSalt: credentials.salt
    })
  } catch (error) {
    if (getCompanyByEmail(email)) {
      throw createError({ statusCode: 409, statusMessage: 'An admin account already exists for that email.' })
    }
    throw error
  }

  setCompanySession(event, company.id)
  return { company: publicCompany(company) }
})
