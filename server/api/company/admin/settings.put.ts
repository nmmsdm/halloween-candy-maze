import { createError, readBody } from 'h3'
import { updateCompanyPlayerIcon } from '../../../utils/database'
import { requireCompanySession } from '../../../utils/company-auth'
import { gameIconOptions } from '../../../utils/game-settings'

export default defineEventHandler(async (event) => {
  const company = requireCompanySession(event)
  const body = await readBody(event)
  const playerIcon = body?.playerIcon
  if (typeof playerIcon !== 'string' || !gameIconOptions.player.includes(playerIcon)) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a supported player icon.' })
  }

  updateCompanyPlayerIcon(company.id, playerIcon)
  return { playerIcon }
})
