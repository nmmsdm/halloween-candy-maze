import { leaderboard, readWinners } from '../utils/store'
export default defineEventHandler(async () => leaderboard(await readWinners()))
