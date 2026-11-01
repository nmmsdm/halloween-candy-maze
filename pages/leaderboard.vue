<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

type Difficulty = 'easy' | 'medium' | 'hard'
type Metric = 'fastest' | 'fewestMoves'
type Period = 'monthly' | 'yearly'
type Winner = {
  id: string
  name: string
  difficulty: Difficulty
  completionTime: number
  moves: number
  wonAt: string
}
type Board = Record<Difficulty, Winner[]>

const period = ref<Period>('monthly')
const metric = ref<Metric>('fastest')
const route = useRoute()
const companyCode = ref(typeof route.query.company === 'string' ? route.query.company : '')
const companyName = ref('')
const { data, error, refresh } = await useFetch<Board>('/api/leaderboard', {
  query: computed(() => ({
    period: period.value,
    metric: metric.value,
    ...(companyCode.value ? { companyCode: companyCode.value } : {})
  })),
  default: () => ({ easy: [], medium: [], hard: [] })
})

const levels: Difficulty[] = ['hard', 'medium', 'easy']
const levelInfo: Record<Difficulty, string> = {
  hard: '🔴 HARD',
  medium: '🟠 MEDIUM',
  easy: '🟢 EASY'
}

const periodLabel = computed(() => {
  if (period.value === 'yearly') return String(new Date().getFullYear())
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date())
})
const leaderboardName = computed(() => companyName.value || (companyCode.value ? 'Company' : 'Global'))

onMounted(async () => {
  if (!companyCode.value) return
  try {
    const company = await $fetch<{ company: { name: string } }>(
      `/api/companies/${encodeURIComponent(companyCode.value)}`
    )
    companyName.value = company.company.name
  } catch (loadError) {
    console.error('Could not load company details:', loadError)
  }
})

function formatTime(seconds: number) {
  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

function rank(index: number) {
  return ['🥇', '🥈', '🥉'][index] ?? `${index + 1}.`
}
</script>

<template>
  <main class="app-shell">
    <header class="header">
      <div class="brand">🏆 HALLOWEEN <span>LEADERBOARD</span></div>
      <NuxtLink
        class="leader-link"
        :to="{ path: '/', query: companyCode ? { company: companyCode } : {} }"
      >
        🚗 Play {{ companyCode ? 'Company' : 'Global' }} Game
      </NuxtLink>
    </header>

    <section class="panel leaderboard-panel">
      <p class="eyebrow">{{ leaderboardName.toUpperCase() }} · FASTEST TIMES & FEWEST MOVES</p>
      <h1>Hall of <span>Fame</span></h1>

      <div class="leaderboard-controls" aria-label="Leaderboard period">
        <button
          class="text-button"
          :aria-pressed="period === 'monthly'"
          @click="period = 'monthly'"
        >
          Monthly
        </button>
        <button
          class="text-button"
          :aria-pressed="period === 'yearly'"
          @click="period = 'yearly'"
        >
          Yearly
        </button>
      </div>
      <p class="leaderboard-period">{{ periodLabel }} · Results are grouped by difficulty</p>

      <div class="leaderboard-controls" aria-label="Leaderboard ranking">
        <button
          class="text-button"
          :aria-pressed="metric === 'fastest'"
          @click="metric = 'fastest'"
        >
          ⏱ Fastest time
        </button>
        <button
          class="text-button"
          :aria-pressed="metric === 'fewestMoves'"
          @click="metric = 'fewestMoves'"
        >
          🧭 Fewest moves
        </button>
      </div>

      <p v-if="error" class="error" role="alert">
        The leaderboard could not be loaded. Please try refreshing.
      </p>

      <div class="boards">
        <article v-for="level in levels" :key="level" class="board-card">
          <h2>{{ levelInfo[level] }} — TOP 5</h2>

          <div v-if="!data?.[level]?.length" class="empty">
            No winners for this period yet 👻
          </div>

          <div
            v-for="(winner, index) in data?.[level] ?? []"
            :key="winner.id"
            class="score-row"
          >
            <strong>{{ rank(index) }} {{ winner.name }}</strong>
            <span> · {{ formatTime(winner.completionTime) }} · {{ winner.moves }} moves</span>
          </div>
        </article>
      </div>

      <button class="primary" @click="refresh()">
        🔄 REFRESH LEADERBOARD
      </button>
    </section>

    <footer>
      🍬
      {{ metric === 'fastest' ? 'Fastest time ranks first.' : 'Fewest moves ranks first.' }}
      Ties use the other result, then earliest finish.
    </footer>
  </main>
</template>
