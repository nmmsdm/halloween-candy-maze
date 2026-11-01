import { getCompanyByCode, getSettings, saveSettings, type Company } from './database'

export type GameDifficulty = 'easy' | 'medium' | 'hard'
export type GameSettings = {
  mazeCells: Record<GameDifficulty, number>
  durationSeconds: Record<GameDifficulty, number>
  ghostStartAfterSeconds: number
  ghostMoveIntervalMs: number
  playerIcon: string
  ghostIcon: string
  candyIcon: string
}

export const defaultGameSettings: GameSettings = {
  mazeCells: { easy: 6, medium: 9, hard: 11 },
  durationSeconds: { easy: 60, medium: 90, hard: 120 },
  ghostStartAfterSeconds: 5,
  ghostMoveIntervalMs: 500,
  playerIcon: '🚗',
  ghostIcon: '👻',
  candyIcon: '🍬'
}

export const gameIconOptions = {
  player: [
    '🚗', '🏎️', '🚕', '🚙', '🛻',
    '🧙', '🧙‍♀️', '🧛', '🧛‍♀️', '🧟', '🧟‍♀️', '🧝', '🧚',
    '🤖', '👽', '💀', '🐈‍⬛', '🐸', '🦊', '🐼', '🐰',
    '🐻', '🐵', '🐶', '🐱', '🦄', '🐉', '🕷️'
  ],
  ghost: ['👻', '🧟', '🦇', '🐈‍⬛'],
  candy: ['🍬', '🍭', '🍫', '🎃', '💎']
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max
}

export function validateGameSettings(value: unknown): GameSettings | null {
  if (!isRecord(value) || !isRecord(value.mazeCells) || !isRecord(value.durationSeconds)) {
    return null
  }

  const difficulties: GameDifficulty[] = ['easy', 'medium', 'hard']
  for (const difficulty of difficulties) {
    if (!isIntegerInRange(value.mazeCells[difficulty], 4, 15)) return null
    if (!isIntegerInRange(value.durationSeconds[difficulty], 30, 300)) return null
  }

  if (!isIntegerInRange(value.ghostStartAfterSeconds, 1, 60)) return null
  if (!isIntegerInRange(value.ghostMoveIntervalMs, 200, 2000)) return null
  if (typeof value.playerIcon !== 'string' || !gameIconOptions.player.includes(value.playerIcon)) return null
  if (typeof value.ghostIcon !== 'string' || !gameIconOptions.ghost.includes(value.ghostIcon)) return null
  if (typeof value.candyIcon !== 'string' || !gameIconOptions.candy.includes(value.candyIcon)) return null

  return {
    mazeCells: {
      easy: value.mazeCells.easy as number,
      medium: value.mazeCells.medium as number,
      hard: value.mazeCells.hard as number
    },
    durationSeconds: {
      easy: value.durationSeconds.easy as number,
      medium: value.durationSeconds.medium as number,
      hard: value.durationSeconds.hard as number
    },
    ghostStartAfterSeconds: value.ghostStartAfterSeconds as number,
    ghostMoveIntervalMs: value.ghostMoveIntervalMs as number,
    playerIcon: value.playerIcon,
    ghostIcon: value.ghostIcon,
    candyIcon: value.candyIcon
  }
}

export async function readGameSettings(): Promise<GameSettings> {
  const stored = getSettings('global_game_settings')
  if (stored === null) {
    saveSettings('global_game_settings', defaultGameSettings)
    return { ...defaultGameSettings }
  }
  const settings = validateGameSettings(stored)
  if (!settings) throw new Error('Stored global game settings contain invalid values.')
  return settings
}

export async function readCompanyGameSettings(
  code: string
): Promise<{ company: Company; settings: GameSettings } | null> {
  const company = getCompanyByCode(code)
  if (!company) return null
  const settings = await readGameSettings()
  return {
    company,
    settings: { ...settings, playerIcon: company.playerIcon }
  }
}

export async function writeGameSettings(settings: GameSettings): Promise<void> {
  saveSettings('global_game_settings', settings)
}
