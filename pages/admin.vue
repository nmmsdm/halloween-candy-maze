<script setup lang="ts">
type Difficulty = 'easy' | 'medium' | 'hard'
type GameSettings = {
  mazeCells: Record<Difficulty, number>
  durationSeconds: Record<Difficulty, number>
  ghostStartAfterSeconds: number
  ghostMoveIntervalMs: number
  playerIcon: string
  ghostIcon: string
  candyIcon: string
}
type Winner = {
  id: string
  name: string
  difficulty: string
  completionTime: number
  moves: number
  claimCode: string
  wonAt: string
  claimed: boolean
  claimedAt: string | null
}

type WinnerLists = {
  activeWinners: Winner[]
  archivedWinners: Winner[]
}

const pin = ref('')
const loggedIn = ref(false)
const activeWinners = ref<Winner[]>([])
const archivedWinners = ref<Winner[]>([])
const showArchive = ref(false)
const search = ref('')
const message = ref('')
const busy = ref(false)
const savingSettings = ref(false)
const settingsMessage = ref('')
const settings = ref<GameSettings>({
  mazeCells: { easy: 6, medium: 9, hard: 11 },
  durationSeconds: { easy: 60, medium: 90, hard: 120 },
  ghostStartAfterSeconds: 5,
  ghostMoveIntervalMs: 500,
  playerIcon: '🚗',
  ghostIcon: '👻',
  candyIcon: '🍬'
})
const difficulties: Difficulty[] = ['easy', 'medium', 'hard']
const iconOptions = {
  player: [
    '🚗', '🏎️', '🚕', '🚙', '🛻',
    '🧙', '🧙‍♀️', '🧛', '🧛‍♀️', '🧟', '🧟‍♀️', '🧝', '🧚',
    '🤖', '👽', '💀', '🐈‍⬛', '🐸', '🦊', '🐼', '🐰',
    '🐻', '🐵', '🐶', '🐱', '🦄', '🐉', '🕷️'
  ],
  ghost: ['👻', '🧟', '🦇', '🐈‍⬛'],
  candy: ['🍬', '🍭', '🍫', '🎃', '💎']
}

const visibleWinners = computed(() => {
  const winners = showArchive.value ? archivedWinners.value : activeWinners.value
  const query = search.value.trim().toLowerCase()

  if (!query) return winners
  return winners.filter(winner =>
    winner.name.toLowerCase().includes(query) ||
    winner.claimCode.toLowerCase().includes(query)
  )
})

function formatTime(seconds: number) {
  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

function displayError(error: unknown, fallback: string) {
  const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
  return message || fallback
}

async function load(clearMessage = true) {
  if (clearMessage) message.value = ''

  try {
    const data = await $fetch<WinnerLists>('/api/admin/winners', {
      query: { pin: pin.value }
    })
    const gameSettings = await $fetch<GameSettings>('/api/game-settings')
    activeWinners.value = data.activeWinners
    archivedWinners.value = data.archivedWinners
    settings.value = gameSettings
    loggedIn.value = true
    return true
  } catch (error) {
    loggedIn.value = false
    message.value = displayError(error, 'Could not load winner records.')
    return false
  }
}

async function saveSettings() {
  if (savingSettings.value) return

  savingSettings.value = true
  settingsMessage.value = ''
  try {
    settings.value = await $fetch<GameSettings>('/api/admin/settings', {
      method: 'PUT',
      body: { pin: pin.value, settings: settings.value }
    })
    settingsMessage.value = 'Game settings saved. They will apply to the next game started.'
  } catch (error) {
    settingsMessage.value = displayError(error, 'Unable to save game settings.')
  } finally {
    savingSettings.value = false
  }
}

async function claim(winner: Winner) {
  if (winner.claimed || busy.value) return

  busy.value = true
  message.value = ''
  try {
    const result = await $fetch<{ alreadyClaimed: boolean }>('/api/admin/claim', {
      method: 'POST',
      body: { pin: pin.value, claimCode: winner.claimCode }
    })
    const status = result.alreadyClaimed
      ? 'Candy was already claimed.'
      : 'Candy marked as claimed.'
    if (await load(false)) message.value = status
  } catch (error) {
    message.value = displayError(error, 'Unable to claim candy.')
  } finally {
    busy.value = false
  }
}

async function resetActiveWinners() {
  const confirmed = confirm(
    'Archive all current event winners? They will remain in the monthly and yearly leaderboards and history.'
  )
  if (!confirmed || prompt('Type RESET to confirm:') !== 'RESET') return

  busy.value = true
  message.value = ''
  try {
    await $fetch('/api/admin/reset', {
      method: 'POST',
      body: { pin: pin.value, confirm: 'RESET' }
    })
    showArchive.value = false
    if (await load(false)) {
      message.value = 'Current winners archived. Leaderboard history was preserved.'
    }
  } catch (error) {
    message.value = displayError(error, 'Unable to archive current winners.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="app-shell">
    <header class="header">
      <div class="brand">🍬 CANDY <span>ADMIN</span></div>
      <NuxtLink class="leader-link" to="/">🚗 Game</NuxtLink>
    </header>

    <section class="panel admin-panel">
      <template v-if="!loggedIn">
        <p class="eyebrow">CANDY STATION</p>
        <h1>Admin <span>Login</span></h1>
        <form class="setup" @submit.prevent="load()">
          <label for="admin-pin">ADMIN PIN</label>
          <input
            id="admin-pin"
            v-model="pin"
            type="password"
            inputmode="numeric"
            autocomplete="current-password"
            placeholder="Enter admin PIN"
          >
          <p v-if="message" class="error">{{ message }}</p>
          <button class="primary">🔐 OPEN ADMIN</button>
        </form>
      </template>

      <template v-else>
        <p class="eyebrow">CANDY STATION</p>
        <h1>Winner <span>Claims</span></h1>
        <p class="small-note">
          Monthly rollover and event resets preserve records for both leaderboards.
        </p>

        <input
          v-model="search"
          class="admin-search"
          aria-label="Search winner name or claim code"
          placeholder="Search name or CANDY code"
        >
        <p v-if="message" class="admin-message" role="status">{{ message }}</p>

        <details class="settings-panel">
          <summary>⚙️ Game settings</summary>
          <form class="game-settings-form" @submit.prevent="saveSettings">
            <fieldset>
              <legend>Maze size and time limit</legend>
              <div v-for="level in difficulties" :key="level" class="settings-level">
                <h3>{{ level }}</h3>
                <label :for="`maze-${level}`">Maze cells per side (4–15)</label>
                <input
                  :id="`maze-${level}`"
                  v-model.number="settings.mazeCells[level]"
                  type="number"
                  min="4"
                  max="15"
                  required
                >
                <label :for="`duration-${level}`">Time limit in seconds (30–300)</label>
                <input
                  :id="`duration-${level}`"
                  v-model.number="settings.durationSeconds[level]"
                  type="number"
                  min="30"
                  max="300"
                  required
                >
              </div>
            </fieldset>

            <fieldset>
              <legend>Ghost behavior</legend>
              <label for="ghost-start">Ghost appears after (seconds)</label>
              <input
                id="ghost-start"
                v-model.number="settings.ghostStartAfterSeconds"
                type="number"
                min="1"
                max="60"
                required
              >
              <label for="ghost-speed">Ghost moves every (milliseconds)</label>
              <input
                id="ghost-speed"
                v-model.number="settings.ghostMoveIntervalMs"
                type="number"
                min="200"
                max="2000"
                step="50"
                required
              >
              <small>Lower intervals make the ghost faster.</small>
            </fieldset>

            <fieldset>
              <legend>Game icons</legend>
              <label for="player-icon">Player</label>
              <select id="player-icon" v-model="settings.playerIcon">
                <option v-for="icon in iconOptions.player" :key="icon" :value="icon">{{ icon }}</option>
              </select>
              <label for="ghost-icon">Ghost</label>
              <select id="ghost-icon" v-model="settings.ghostIcon">
                <option v-for="icon in iconOptions.ghost" :key="icon" :value="icon">{{ icon }}</option>
              </select>
              <label for="candy-icon">Goal</label>
              <select id="candy-icon" v-model="settings.candyIcon">
                <option v-for="icon in iconOptions.candy" :key="icon" :value="icon">{{ icon }}</option>
              </select>
            </fieldset>

            <p v-if="settingsMessage" class="admin-message" role="status">
              {{ settingsMessage }}
            </p>
            <button class="primary" type="submit" :disabled="savingSettings">
              {{ savingSettings ? 'SAVING…' : '💾 SAVE GAME SETTINGS' }}
            </button>
          </form>
        </details>

        <div class="admin-actions">
          <button class="text-button" :disabled="busy" @click="load()">🔄 Refresh</button>
          <NuxtLink class="leader-link" to="/leaderboard">🏆 Leaderboards</NuxtLink>
          <button class="text-button danger" :disabled="busy" @click="resetActiveWinners">
            🗃 Archive current winners
          </button>
        </div>

        <div class="admin-actions">
          <button
            class="text-button"
            :aria-pressed="!showArchive"
            @click="showArchive = false"
          >
            Current event ({{ activeWinners.length }})
          </button>
          <button
            class="text-button"
            :aria-pressed="showArchive"
            @click="showArchive = true"
          >
            History ({{ archivedWinners.length }})
          </button>
        </div>

        <div class="winner-list">
          <article
            v-for="winner in visibleWinners"
            :key="winner.id"
            class="winner-card"
            :class="{ claimed: winner.claimed }"
          >
            <div>
              <strong>{{ winner.name }}</strong>
              <small>
                {{ winner.difficulty.toUpperCase() }} ·
                {{ formatTime(winner.completionTime) }} ·
                {{ winner.moves }} moves
              </small>
              <small>{{ formatDate(winner.wonAt) }}</small>
              <code>{{ winner.claimCode }}</code>
            </div>
            <button :disabled="winner.claimed || busy" @click="claim(winner)">
              {{ winner.claimed ? '✅ CLAIMED' : '🍬 CLAIM CANDY' }}
            </button>
          </article>
          <p v-if="!visibleWinners.length" class="small-note">No matching winners.</p>
        </div>
      </template>
    </section>
  </main>
</template>
