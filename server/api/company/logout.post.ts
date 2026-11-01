import { clearCompanySession } from '../../utils/company-auth'

export default defineEventHandler((event) => {
  clearCompanySession(event)
  return { ok: true }
})
