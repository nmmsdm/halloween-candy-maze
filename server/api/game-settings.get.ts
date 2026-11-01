import { createError, getQuery } from 'h3'
import { readCompanyGameSettings, readGameSettings } from '../utils/game-settings'

export default defineEventHandler(async (event) => {
  const companyCode = String(getQuery(event).companyCode || '')
  if (companyCode) {
    const company = await readCompanyGameSettings(companyCode)
    if (!company) throw createError({ statusCode: 404, statusMessage: 'Company game was not found.' })
    return company.settings
  }
  return readGameSettings()
})
