import { createError, setHeader } from 'h3'
import { requireCompanySession } from '../../../utils/company-auth'
import { readCompanyStore } from '../../../utils/database'

export default defineEventHandler((event) => {
  const company = requireCompanySession(event)
  const result = readCompanyStore(company.code)
  if (!result) throw createError({ statusCode: 404, statusMessage: 'Company was not found.' })

  setHeader(event, 'cache-control', 'private, no-store')
  return {
    activeWinners: result.store.activeWinners.sort((a, b) => b.wonAt.localeCompare(a.wonAt)),
    archivedWinners: result.store.archivedWinners.sort((a, b) => b.wonAt.localeCompare(a.wonAt))
  }
})
