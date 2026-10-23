import { createError, getQuery } from 'h3'
import { adminPin, readWinners } from '../../utils/store'
export default defineEventHandler(async (event) => {
  const pin = String(getQuery(event).pin || '')
  if (pin !== adminPin()) throw createError({ statusCode: 401, statusMessage: 'Invalid admin PIN.' })
  return (await readWinners()).sort((a, b) => b.wonAt.localeCompare(a.wonAt))
})
