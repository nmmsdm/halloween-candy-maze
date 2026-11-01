import { createError, getQuery } from 'h3'
import {
  allWinners,
  leaderboard,
  readWinnerStore,
  type LeaderboardMetric,
  type LeaderboardPeriod
} from '../utils/store'
import { readCompanyStore } from '../utils/database'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const period = String(query.period || 'monthly')
  const metric = String(query.metric || 'fastest')
  const companyCode = String(query.companyCode || '')

  if (period !== 'monthly' && period !== 'yearly') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid leaderboard period.' })
  }
  if (metric !== 'fastest' && metric !== 'fewestMoves') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid leaderboard metric.' })
  }

  const store = companyCode
    ? readCompanyStore(companyCode)?.store
    : await readWinnerStore()
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Company game was not found.' })
  return leaderboard(
    allWinners(store),
    period as LeaderboardPeriod,
    metric as LeaderboardMetric
  )
})
