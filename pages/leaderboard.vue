<script setup lang="ts">
import { computed } from 'vue'

type Difficulty = 'easy' | 'medium' | 'hard'
type Winner = {
  id: string
  name: string
  difficulty: string
  completionTime: number
  moves: number
  wonAt: string
}
type Board = {
  easy: Winner[]
  medium: Winner[]
  hard: Winner[]
}

const { data, refresh } = await useFetch<Board>('/api/leaderboard', {
  default: () => ({ easy: [], medium: [], hard: [] })
})

/* Display order: Hard → Medium → Easy */
const levels: Difficulty[] = ['hard', 'medium', 'easy']
const medals = ['🥇', '🥈', '🥉', '4.', '5.']

const levelInfo: Record<Difficulty, { title: string; limit: number }> = {
  hard: { title: '🔴 HARD — TOP 3', limit: 3 },
  medium: { title: '🟠 MEDIUM — TOP 5', limit: 5 },
  easy: { title: '🟢 EASY — WINNERS LIST', limit: 0 }
}

function time(s: number) {
  return s < 60
    ? `${s}s`
    : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

function keepBest(list: Winner[], limit = 0) {
  const best = new Map<string, Winner>()

  for (const w of list) {
    const key = w.name.trim().toLowerCase()
    const current = best.get(key)

    if (
      !current ||
      w.completionTime < current.completionTime ||
      (w.completionTime === current.completionTime && w.moves < current.moves)
    ) {
      best.set(key, w)
    }
  }

  const sorted = [...best.values()]
    .sort((a, b) => a.completionTime - b.completionTime || a.moves - b.moves)

  return limit > 0 ? sorted.slice(0, limit) : sorted
}

const leaderboard = computed<Board>(() => ({
  hard: keepBest(data.value?.hard ?? [], levelInfo.hard.limit),
  medium: keepBest(data.value?.medium ?? [], levelInfo.medium.limit),
  easy: keepBest(data.value?.easy ?? [], levelInfo.easy.limit)
}))

function rank(i: number) {
  return medals[i] ?? `${i + 1}.`
}
</script>

<template>
  <main class="app-shell">
    <header class="header">
      <div class="brand">🏆 HALLOWEEN <span>LEADERBOARD</span></div>
      <NuxtLink class="leader-link" to="/">🚗 Play Game</NuxtLink>
    </header>

    <section class="panel leaderboard-panel">
      <p class="eyebrow">FASTEST CANDY HUNTERS</p>
      <h1>Hall of <span>Fame</span></h1>

      <div class="boards">
        <article v-for="level in levels" :key="level" class="board-card">
          <h2>{{ levelInfo[level].title }}</h2>

          <div v-if="!leaderboard[level].length" class="empty">
            No winners yet 👻
          </div>

          <div
            v-for="(w, i) in leaderboard[level]"
            :key="`${level}-${w.name.toLowerCase()}`"
            class="score-row"
          >
            <strong>{{ rank(i) }} {{ w.name }}</strong>
            <span> · {{ time(w.completionTime) }} · {{ w.moves }} moves</span>
          </div>
        </article>
      </div>

      <button class="primary" @click="refresh()">
        🔄 REFRESH LEADERBOARD
      </button>
    </section>

    <footer>🍬 Fastest time wins · Fewer moves break a tie</footer>
  </main>
</template>