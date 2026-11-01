import { createError, getQuery } from 'h3'
import { adminPin, readWinnerStore } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const pin = String(getQuery(event).pin || '')
  if (pin !== adminPin()) throw createError({ statusCode: 401, statusMessage: 'Invalid admin PIN.' })
  const store = await readWinnerStore()
  return {
    activeWinners: store.activeWinners.sort((a, b) => b.wonAt.localeCompare(a.wonAt)),
    archivedWinners: store.archivedWinners.sort((a, b) => b.wonAt.localeCompare(a.wonAt))
  }
})
