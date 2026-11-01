import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { createError, deleteCookie, getCookie, getRequestURL, setCookie, type H3Event } from 'h3'
import {
  createCompanySession,
  deleteCompanySession,
  getCompanyForSession,
  type Company
} from './database'

const sessionCookie = 'candy_maze_company_session'
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function derivePassword(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error)
      else resolve(key as Buffer)
    })
  })
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = await derivePassword(password, salt)
  return { salt, hash: hash.toString('hex') }
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const expected = Buffer.from(expectedHash, 'hex')
  const actual = await derivePassword(password, salt)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function setCompanySession(event: H3Event, companyId: string) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + sessionLifetimeMs).toISOString()
  createCompanySession({ id: hashSessionToken(token), companyId, expiresAt })

  setCookie(event, sessionCookie, token, {
    httpOnly: true,
    secure: getRequestURL(event).protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionLifetimeMs / 1000
  })
}

export function clearCompanySession(event: H3Event) {
  const token = getCookie(event, sessionCookie)
  if (token) deleteCompanySession(hashSessionToken(token))
  deleteCookie(event, sessionCookie, { path: '/' })
}

export function getCompanySession(event: H3Event): Company | null {
  const token = getCookie(event, sessionCookie)
  return token ? getCompanyForSession(hashSessionToken(token)) : null
}

export function requireCompanySession(event: H3Event): Company {
  const company = getCompanySession(event)
  if (!company) throw createError({ statusCode: 401, statusMessage: 'Please sign in as the company admin.' })
  return company
}

export function publicCompany(company: Company) {
  return { code: company.code, name: company.name, ownerEmail: company.ownerEmail, playerIcon: company.playerIcon }
}
