import { createError, readBody } from 'h3'
import { adminPin } from '../../utils/store'
import { validateGameSettings, writeGameSettings } from '../../utils/game-settings'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (String(body?.pin || '') !== adminPin()) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid admin PIN.' })
  }

  const settings = validateGameSettings(body?.settings)
  if (!settings) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid settings. Check the allowed maze sizes, timers, speeds, and icons.'
    })
  }

  await writeGameSettings(settings)
  return settings
})
