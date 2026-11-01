<script setup lang="ts">
import { onMounted } from 'vue'

type Company = {
  code: string
  name: string
  ownerEmail: string
  playerIcon: string
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

const iconOptions = [
  '🚗', '🏎️', '🚕', '🚙', '🛻',
  '🧙', '🧙‍♀️', '🧛', '🧛‍♀️', '🧟', '🧟‍♀️', '🧝', '🧚',
  '🤖', '👽', '💀', '🐈‍⬛', '🐸', '🦊', '🐼', '🐰',
  '🐻', '🐵', '🐶', '🐱', '🦄', '🐉', '🕷️'
]

const company = ref<Company | null>(null)
const email = ref('')
const password = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const playerIcon = ref('🚗')
const activeWinners = ref<Winner[]>([])
const archivedWinners = ref<Winner[]>([])
const showArchive = ref(false)
const search = ref('')
const qrData = ref('')
const gameUrl = ref('')
const message = ref('')
const busy = ref(false)
const welcome = ref(false)

const visibleWinners = computed(() => {
  const winners = showArchive.value ? archivedWinners.value : activeWinners.value
  const query = search.value.trim().toLowerCase()
  if (!query) return winners
  return winners.filter(winner =>
    winner.name.toLowerCase().includes(query) ||
    winner.claimCode.toLowerCase().includes(query)
  )
})

function errorMessage(error: unknown, fallback: string) {
  return (error as { data?: { statusMessage?: string } })?.data?.statusMessage || fallback
}

function formatTime(seconds: number) {
  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

function selectGameLink(event: FocusEvent) {
  if (event.currentTarget instanceof HTMLInputElement) event.currentTarget.select()
}

async function updateQr() {
  if (!company.value || !import.meta.client) return
  try {
    gameUrl.value = `${window.location.origin}/?company=${encodeURIComponent(company.value.code)}`
    const { toDataURL } = await import('qrcode')
    qrData.value = await toDataURL(gameUrl.value, {
      width: 240,
      margin: 2,
      color: { dark: '#170d28', light: '#ffffff' }
    })
  } catch (error) {
    console.error('Could not generate company QR code:', error)
    message.value = 'The company game link is ready, but its QR code could not be generated.'
  }
}

async function loadWinners() {
  const data = await $fetch<WinnerLists>('/api/company/admin/winners')
  activeWinners.value = data.activeWinners
  archivedWinners.value = data.archivedWinners
}

async function loadSession() {
  try {
    const data = await $fetch<{ company: Company | null }>('/api/company/session')
    company.value = data.company
    if (!company.value) return
    playerIcon.value = company.value.playerIcon
    await loadWinners()
    await updateQr()
    if (welcome.value) message.value = 'Your company game is ready. Share the link or scan the QR code.'
  } catch (error) {
    company.value = null
    message.value = errorMessage(error, 'Could not load company admin data.')
  }
}

async function login() {
  busy.value = true
  message.value = ''
  try {
    await $fetch('/api/company/login', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })
    await loadSession()
    password.value = ''
  } catch (error) {
    message.value = errorMessage(error, 'Could not sign in.')
  } finally {
    busy.value = false
  }
}

async function saveIcon() {
  busy.value = true
  message.value = ''
  try {
    await $fetch('/api/company/admin/settings', {
      method: 'PUT',
      body: { playerIcon: playerIcon.value }
    })
    message.value = 'Company player icon saved. It will appear in new games.'
    await updateQr()
  } catch (error) {
    message.value = errorMessage(error, 'Could not save the company icon.')
  } finally {
    busy.value = false
  }
}

async function changePassword() {
  if (newPassword.value !== confirmNewPassword.value) {
    message.value = 'New passwords do not match.'
    return
  }

  busy.value = true
  message.value = ''
  try {
    await $fetch('/api/company/admin/password', {
      method: 'PUT',
      body: { currentPassword: currentPassword.value, newPassword: newPassword.value }
    })
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
    message.value = 'Password changed. Other company admin sessions have been signed out.'
  } catch (error) {
    message.value = errorMessage(error, 'Could not change the password.')
  } finally {
    busy.value = false
  }
}

async function claim(winner: Winner) {
  if (winner.claimed || busy.value) return
  busy.value = true
  message.value = ''
  try {
    const result = await $fetch<{ alreadyClaimed: boolean }>('/api/company/admin/claim', {
      method: 'POST',
      body: { claimCode: winner.claimCode }
    })
    await loadWinners()
    message.value = result.alreadyClaimed ? 'Candy was already claimed.' : 'Candy marked as claimed.'
  } catch (error) {
    message.value = errorMessage(error, 'Could not claim this winner.')
  } finally {
    busy.value = false
  }
}

async function archiveWinners() {
  if (!confirm('Archive current company winners? Historical company leaderboards will be preserved.')) return
  if (prompt('Type RESET to confirm:') !== 'RESET') return

  busy.value = true
  message.value = ''
  try {
    await $fetch('/api/company/admin/reset', {
      method: 'POST',
      body: { confirm: 'RESET' }
    })
    showArchive.value = false
    await loadWinners()
    message.value = 'Company winners archived. Global results and company leaderboard history are unchanged.'
  } catch (error) {
    message.value = errorMessage(error, 'Could not archive company winners.')
  } finally {
    busy.value = false
  }
}

async function logout() {
  await $fetch('/api/company/logout', { method: 'POST' })
  company.value = null
  activeWinners.value = []
  archivedWinners.value = []
  qrData.value = ''
  gameUrl.value = ''
}

onMounted(() => {
  welcome.value = new URLSearchParams(window.location.search).get('welcome') === '1'
  void loadSession()
})
</script>

<template>
  <main class="app-shell">
    <header class="header">
      <NuxtLink class="brand" to="/">🍬 CANDY <span>COMPANY ADMIN</span></NuxtLink>
      <NuxtLink class="leader-link" to="/">Global game</NuxtLink>
    </header>

    <section class="panel company-panel">
      <template v-if="!company">
        <p class="eyebrow">COMPANY SUBADMIN</p>
        <h1>Company <span>login</span></h1>
        <form class="setup" @submit.prevent="login">
          <label for="company-email">ADMIN EMAIL</label>
          <input
            id="company-email"
            v-model="email"
            type="email"
            required
            autocomplete="username"
            placeholder="you@company.com"
          >
          <label for="company-password">PASSWORD</label>
          <input
            id="company-password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            placeholder="Your password"
          >
          <p v-if="message" class="error" role="alert">{{ message }}</p>
          <button class="primary" type="submit" :disabled="busy">
            {{ busy ? 'SIGNING IN…' : '🔐 SIGN IN' }}
          </button>
        </form>
        <p class="small-note">
          Need a separate company leaderboard?
          <NuxtLink to="/company/register">Register your company</NuxtLink>
        </p>
      </template>

      <template v-else>
        <p class="eyebrow">COMPANY SUBADMIN</p>
        <h1>{{ company.name }} <span>Game</span></h1>
        <p v-if="message" class="admin-message" role="status">{{ message }}</p>

        <div class="company-dashboard-grid">
          <section class="company-share-card">
            <h2>Share your company game</h2>
            <img v-if="qrData" class="company-qr" :src="qrData" alt="QR code for the company game">
            <label for="company-link">COMPANY GAME LINK</label>
            <input id="company-link" :value="gameUrl" readonly @focus="selectGameLink">
            <NuxtLink
              class="leader-link"
              :to="{ path: '/leaderboard', query: { company: company.code } }"
            >
              🏆 Company leaderboard
            </NuxtLink>
          </section>

          <section class="company-share-card">
            <h2>Game appearance</h2>
            <form class="company-icon-form" @submit.prevent="saveIcon">
              <label for="company-player-icon">PLAYER ICON</label>
              <select id="company-player-icon" v-model="playerIcon">
                <option v-for="icon in iconOptions" :key="icon" :value="icon">{{ icon }}</option>
              </select>
              <button class="primary" type="submit" :disabled="busy">💾 SAVE ICON</button>
            </form>
            <p class="small-note">This icon only affects your company game, not global games.</p>
          </section>

          <section class="company-share-card">
            <h2>Change admin password</h2>
            <form class="company-icon-form" @submit.prevent="changePassword">
              <label for="current-password">CURRENT PASSWORD</label>
              <input
                id="current-password"
                v-model="currentPassword"
                type="password"
                autocomplete="current-password"
                required
              >
              <label for="new-password">NEW PASSWORD (12 CHARACTERS MINIMUM)</label>
              <input
                id="new-password"
                v-model="newPassword"
                type="password"
                minlength="12"
                maxlength="200"
                autocomplete="new-password"
                required
              >
              <label for="confirm-new-password">CONFIRM NEW PASSWORD</label>
              <input
                id="confirm-new-password"
                v-model="confirmNewPassword"
                type="password"
                minlength="12"
                maxlength="200"
                autocomplete="new-password"
                required
              >
              <button class="primary" type="submit" :disabled="busy">🔐 CHANGE PASSWORD</button>
            </form>
          </section>
        </div>

        <div class="admin-actions">
          <button class="text-button" :disabled="busy" @click="loadWinners">🔄 Refresh</button>
          <button class="text-button danger" :disabled="busy" @click="archiveWinners">
            🗃 Archive company winners
          </button>
          <button class="text-button" @click="logout">Sign out</button>
        </div>

        <input
          v-model="search"
          class="admin-search"
          aria-label="Search winner name or claim code"
          placeholder="Search name or CANDY code"
        >
        <div class="admin-actions">
          <button class="text-button" :aria-pressed="!showArchive" @click="showArchive = false">
            Current ({{ activeWinners.length }})
          </button>
          <button class="text-button" :aria-pressed="showArchive" @click="showArchive = true">
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
                {{ winner.difficulty.toUpperCase() }} · {{ formatTime(winner.completionTime) }} ·
                {{ winner.moves }} moves
              </small>
              <small>{{ formatDate(winner.wonAt) }}</small>
              <code>{{ winner.claimCode }}</code>
            </div>
            <button :disabled="winner.claimed || busy" @click="claim(winner)">
              {{ winner.claimed ? '✅ CLAIMED' : '🍬 CLAIM CANDY' }}
            </button>
          </article>
          <p v-if="!visibleWinners.length" class="small-note">No matching company winners.</p>
        </div>
      </template>
    </section>
  </main>
</template>
