import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { COMPANY_TERMS_VERSION } from '../../shared/company-legal'

export type Difficulty = 'easy' | 'medium' | 'hard'
export type Winner = {
  id: string
  name: string
  difficulty: Difficulty
  completionTime: number
  moves: number
  claimCode: string
  wonAt: string
  claimed: boolean
  claimedAt: string | null
}
export type WinnerStore = {
  activeMonth: string
  activeWinners: Winner[]
  archivedWinners: Winner[]
}

export type Company = {
  id: string
  code: string
  name: string
  ownerEmail: string
  passwordHash: string
  passwordSalt: string
  playerIcon: string
  createdAt: string
}

export type CompanySession = {
  id: string
  companyId: string
  expiresAt: string
}

const dataDirectory = path.resolve(process.cwd(), 'data')
mkdirSync(dataDirectory, { recursive: true })

export const database = new Database(path.join(dataDirectory, 'maze.sqlite'))
database.pragma('journal_mode = WAL')
database.pragma('foreign_keys = ON')
database.pragma('busy_timeout = 5000')
database.exec(`
  CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    owner_email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    player_icon TEXT NOT NULL DEFAULT '🚗',
    created_at TEXT NOT NULL,
    active_month TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS company_sessions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS company_consents (
    company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    terms_version TEXT NOT NULL,
    consented_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS winners (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL CHECK (scope IN ('global', 'company')),
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    completion_time INTEGER NOT NULL,
    moves INTEGER NOT NULL,
    claim_code TEXT NOT NULL UNIQUE,
    won_at TEXT NOT NULL,
    claimed INTEGER NOT NULL DEFAULT 0,
    claimed_at TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    CHECK ((scope = 'global' AND company_id IS NULL) OR (scope = 'company' AND company_id IS NOT NULL))
  );
  CREATE INDEX IF NOT EXISTS winners_global_period ON winners(scope, archived, won_at);
  CREATE INDEX IF NOT EXISTS winners_company_period ON winners(company_id, archived, won_at);
`)

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function isWinner(value: unknown): value is Winner {
  if (!value || typeof value !== 'object') return false
  const winner = value as Record<string, unknown>
  return typeof winner.id === 'string' &&
    typeof winner.name === 'string' &&
    ['easy', 'medium', 'hard'].includes(String(winner.difficulty)) &&
    Number.isInteger(winner.completionTime) &&
    Number.isInteger(winner.moves) &&
    typeof winner.claimCode === 'string' &&
    typeof winner.wonAt === 'string' &&
    typeof winner.claimed === 'boolean' &&
    (typeof winner.claimedAt === 'string' || winner.claimedAt === null)
}

function readLegacyWinners() {
  const file = path.join(dataDirectory, 'winners.json')
  if (!existsSync(file)) return []

  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
  if (Array.isArray(parsed)) {
    if (!parsed.every(isWinner)) throw new Error('Legacy winner file contains invalid records.')
    return parsed.map(winner => ({
      winner,
      archived: currentMonthKey(new Date(winner.wonAt)) !== currentMonthKey()
    }))
  }

  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>
    const active = record.activeWinners
    const archived = record.archivedWinners
    if (Array.isArray(active) && Array.isArray(archived) && [...active, ...archived].every(isWinner)) {
      return [
        ...active.map(winner => ({
          winner,
          archived: currentMonthKey(new Date(winner.wonAt)) !== currentMonthKey()
        })),
        ...archived.map(winner => ({ winner, archived: true }))
      ]
    }
  }

  throw new Error('Legacy winner file has an unsupported format.')
}

function migrateLegacyFiles() {
  if (database.prepare('SELECT 1 FROM metadata WHERE key = ?').get('legacy_json_migrated')) return

  const migrate = database.transaction(() => {
    const insertWinner = database.prepare(`
      INSERT OR IGNORE INTO winners
        (id, scope, company_id, name, difficulty, completion_time, moves, claim_code, won_at, claimed, claimed_at, archived)
      VALUES (?, 'global', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const { winner, archived } of readLegacyWinners()) {
      insertWinner.run(
        winner.id,
        winner.name,
        winner.difficulty,
        winner.completionTime,
        winner.moves,
        winner.claimCode,
        winner.wonAt,
        Number(winner.claimed),
        winner.claimedAt,
        Number(archived)
      )
    }

    const settingsFile = path.join(dataDirectory, 'game-settings.json')
    if (existsSync(settingsFile)) {
      const settings = JSON.parse(readFileSync(settingsFile, 'utf8'))
      if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
        throw new Error('Legacy game settings file has an unsupported format.')
      }
      database.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
        .run('global_game_settings', JSON.stringify(settings))
    }

    database.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)')
      .run('global_active_month', currentMonthKey())
    database.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)')
      .run('legacy_json_migrated', new Date().toISOString())
  })

  migrate()
}

migrateLegacyFiles()

const updateArchived = database.prepare(`
  UPDATE winners SET archived = 1
  WHERE archived = 0 AND scope = ? AND company_id IS ?
`)

export function ensureGlobalMonth() {
  const row = database.prepare('SELECT value FROM metadata WHERE key = ?')
    .get('global_active_month') as { value: string } | undefined
  const month = currentMonthKey()
  if (row?.value === month) return

  const rollover = database.transaction(() => {
    updateArchived.run('global', null)
    database.prepare(`
      INSERT INTO metadata (key, value) VALUES ('global_active_month', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(month)
  })
  rollover()
}

export function getCompanyByCode(code: string): Company | null {
  const row = database.prepare(`
    SELECT id, code, name, owner_email AS ownerEmail, password_hash AS passwordHash,
      password_salt AS passwordSalt, player_icon AS playerIcon, created_at AS createdAt
    FROM companies WHERE code = ?
  `).get(code) as Company | undefined
  return row ?? null
}

export function getCompanyByEmail(email: string): Company | null {
  const row = database.prepare(`
    SELECT id, code, name, owner_email AS ownerEmail, password_hash AS passwordHash,
      password_salt AS passwordSalt, player_icon AS playerIcon, created_at AS createdAt
    FROM companies WHERE owner_email = ?
  `).get(email) as Company | undefined
  return row ?? null
}

export function createCompany(input: {
  id?: string
  code: string
  name: string
  email: string
  passwordHash: string
  passwordSalt: string
}) {
  const company: Company = {
    id: input.id || randomUUID(),
    code: input.code,
    name: input.name,
    ownerEmail: input.email,
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    playerIcon: '🚗',
    createdAt: new Date().toISOString()
  }

  const consentedAt = company.createdAt
  const insertCompany = database.transaction(() => {
    database.prepare(`
      INSERT INTO companies (id, code, name, owner_email, password_hash, password_salt, player_icon, created_at, active_month)
      VALUES (@id, @code, @name, @ownerEmail, @passwordHash, @passwordSalt, @playerIcon, @createdAt, @activeMonth)
    `).run({ ...company, activeMonth: currentMonthKey() })
    database.prepare(`
      INSERT INTO company_consents (company_id, terms_version, consented_at)
      VALUES (?, ?, ?)
    `).run(company.id, COMPANY_TERMS_VERSION, consentedAt)
  })
  insertCompany()
  return company
}

export function ensureCompanyMonth(companyId: string) {
  const row = database.prepare('SELECT active_month AS activeMonth FROM companies WHERE id = ?')
    .get(companyId) as { activeMonth: string } | undefined
  if (!row) throw new Error('Company was not found.')
  const month = currentMonthKey()
  if (row.activeMonth === month) return

  const rollover = database.transaction(() => {
    updateArchived.run('company', companyId)
    database.prepare('UPDATE companies SET active_month = ? WHERE id = ?').run(month, companyId)
  })
  rollover()
}

function readStore(scope: 'global' | 'company', companyId: string | null): WinnerStore {
  const winners = database.prepare(`
    SELECT id, name, difficulty, completion_time AS completionTime, moves, claim_code AS claimCode,
      won_at AS wonAt, claimed, claimed_at AS claimedAt, archived
    FROM winners WHERE scope = ? AND company_id IS ?
  `).all(scope, companyId) as Array<Winner & { archived: number }>

  return {
    activeMonth: currentMonthKey(),
    activeWinners: winners.filter(winner => !winner.archived).map(({ archived, claimed, ...winner }) => ({
      ...winner,
      claimed: Boolean(claimed)
    })),
    archivedWinners: winners.filter(winner => winner.archived).map(({ archived, claimed, ...winner }) => ({
      ...winner,
      claimed: Boolean(claimed)
    }))
  }
}

export function readGlobalStore(): WinnerStore {
  ensureGlobalMonth()
  return readStore('global', null)
}

export function readCompanyStore(code: string): { company: Company; store: WinnerStore } | null {
  const company = getCompanyByCode(code)
  if (!company) return null
  ensureCompanyMonth(company.id)
  return { company, store: readStore('company', company.id) }
}

function writeStore(scope: 'global' | 'company', companyId: string | null, store: WinnerStore) {
  const remove = database.prepare('DELETE FROM winners WHERE scope = ? AND company_id IS ?')
  const insert = database.prepare(`
    INSERT INTO winners
      (id, scope, company_id, name, difficulty, completion_time, moves, claim_code, won_at, claimed, claimed_at, archived)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  remove.run(scope, companyId)
  for (const winner of store.activeWinners) {
    insert.run(
      winner.id, scope, companyId, winner.name, winner.difficulty, winner.completionTime,
      winner.moves, winner.claimCode, winner.wonAt, Number(winner.claimed), winner.claimedAt, 0
    )
  }
  for (const winner of store.archivedWinners) {
    insert.run(
      winner.id, scope, companyId, winner.name, winner.difficulty, winner.completionTime,
      winner.moves, winner.claimCode, winner.wonAt, Number(winner.claimed), winner.claimedAt, 1
    )
  }
}

export function mutateGlobalStore<T>(mutate: (store: WinnerStore) => T): T {
  ensureGlobalMonth()
  const operation = database.transaction(() => {
    const store = readStore('global', null)
    const result = mutate(store)
    writeStore('global', null, store)
    return result
  })
  return operation.immediate()
}

export function mutateCompanyStore<T>(code: string, mutate: (store: WinnerStore) => T): T | null {
  const company = getCompanyByCode(code)
  if (!company) return null
  ensureCompanyMonth(company.id)
  const operation = database.transaction(() => {
    const store = readStore('company', company.id)
    const result = mutate(store)
    writeStore('company', company.id, store)
    return result
  })
  return operation.immediate()
}

export function archiveWinnerList(scope: 'global' | 'company', companyId: string | null) {
  if (scope === 'global') ensureGlobalMonth()
  else if (companyId) ensureCompanyMonth(companyId)
  else throw new Error('Company ID is required to archive company winners.')

  database.prepare('UPDATE winners SET archived = 1 WHERE scope = ? AND company_id IS ? AND archived = 0')
    .run(scope, companyId)
}

export function updateCompanyPlayerIcon(companyId: string, playerIcon: string) {
  database.prepare('UPDATE companies SET player_icon = ? WHERE id = ?').run(playerIcon, companyId)
}

export function updateCompanyPassword(companyId: string, passwordHash: string, passwordSalt: string) {
  const update = database.transaction(() => {
    database.prepare('UPDATE companies SET password_hash = ?, password_salt = ? WHERE id = ?')
      .run(passwordHash, passwordSalt, companyId)
    database.prepare('DELETE FROM company_sessions WHERE company_id = ?').run(companyId)
  })
  update()
}

export function createCompanySession(session: CompanySession) {
  database.prepare(`
    INSERT INTO company_sessions (id, company_id, expires_at) VALUES (?, ?, ?)
  `).run(session.id, session.companyId, session.expiresAt)
}

export function getCompanyForSession(sessionId: string): Company | null {
  database.prepare('DELETE FROM company_sessions WHERE expires_at <= ?').run(new Date().toISOString())
  const row = database.prepare(`
    SELECT c.id, c.code, c.name, c.owner_email AS ownerEmail, c.password_hash AS passwordHash,
      c.password_salt AS passwordSalt, c.player_icon AS playerIcon, c.created_at AS createdAt
    FROM company_sessions s JOIN companies c ON c.id = s.company_id
    WHERE s.id = ? AND s.expires_at > ?
  `).get(sessionId, new Date().toISOString()) as Company | undefined
  return row ?? null
}

export function deleteCompanySession(sessionId: string) {
  database.prepare('DELETE FROM company_sessions WHERE id = ?').run(sessionId)
}

export function getSettings(key: string): unknown | null {
  const row = database.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  if (!row) return null
  return JSON.parse(row.value)
}

export function saveSettings(key: string, value: unknown) {
  database.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, JSON.stringify(value))
}

export function findClaimableWinner(code: string, companyId: string | null) {
  const winner = database.prepare(`
    SELECT id, name, difficulty, completion_time AS completionTime, moves,
      claim_code AS claimCode, won_at AS wonAt, claimed, claimed_at AS claimedAt
    FROM winners WHERE claim_code = ? AND scope = ? AND company_id IS ?
  `).get(code, companyId ? 'company' : 'global', companyId) as
    (Omit<Winner, 'claimed'> & { claimed: number }) | undefined
  return winner ? { ...winner, claimed: Boolean(winner.claimed) } : null
}

export function updateWinnerClaim(code: string, companyId: string | null, claimedAt: string) {
  database.prepare(`
    UPDATE winners SET claimed = 1, claimed_at = ?
    WHERE claim_code = ? AND scope = ? AND company_id IS ?
  `).run(claimedAt, code, companyId ? 'company' : 'global', companyId)
}

export function claimWinner(code: string, companyId: string | null) {
  const operation = database.transaction(() => {
    const winner = findClaimableWinner(code, companyId)
    if (!winner) return null
    if (winner.claimed) return { winner, alreadyClaimed: true }

    const claimedAt = new Date().toISOString()
    updateWinnerClaim(code, companyId, claimedAt)
    return {
      winner: { ...winner, claimed: true, claimedAt },
      alreadyClaimed: false
    }
  })
  return operation.immediate()
}

export function claimCodeExists(code: string) {
  return Boolean(database.prepare('SELECT 1 FROM winners WHERE claim_code = ?').get(code))
}
