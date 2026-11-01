import { createError, getRouterParam } from 'h3'
import { readCompanyGameSettings } from '../../utils/game-settings'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code') || ''
  const result = await readCompanyGameSettings(code)
  if (!result) throw createError({ statusCode: 404, statusMessage: 'Company game was not found.' })

  return {
    company: { code: result.company.code, name: result.company.name },
    settings: result.settings
  }
})
