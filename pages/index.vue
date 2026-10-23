<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

type Phase = 'welcome' | 'playing' | 'won' | 'lost'
type Difficulty = 'easy' | 'medium' | 'hard'
type Direction = 'up' | 'down' | 'left' | 'right'
type Point = { r: number; c: number }
type Winner = { id: string; name: string; difficulty: string; completionTime: number; moves: number; wonAt: string }
type Board = { easy: Winner[]; medium: Winner[]; hard: Winner[] }

const presets: Record<Difficulty, { cells: number; seconds: number; label: string }> = {
  easy: { cells: 7, seconds: 60, label: 'Easy · 1 min' },
  medium: { cells: 11, seconds: 90, label: 'Medium · 1½ min' },
  hard: { cells: 15, seconds: 150, label: 'Hard · 2½ min' }
}

const phase = ref<Phase>('welcome')
const playerName = ref('')
const difficulty = ref<Difficulty>('easy')
const mode = ref<'phone' | 'station'>('phone')
const maze = ref<string[][]>([])
const player = ref<Point>({ r: 1, c: 1 })
const goal = ref<Point>({ r: 1, c: 1 })
const ghost = ref<Point>({ r: 1, c: 1 })
const carDirection = ref<Direction>('right')
const ghostActive = ref(false)
const lostReason = ref<'time' | 'ghost'>('time')
const secondsLeft = ref(60)
const moves = ref(0)
const claimCode = ref('')
const wonAt = ref('')
const leaderboardRank = ref<number | null>(null)
const winBoards = ref<Board>({ easy: [], medium: [], hard: [] })
const saveError = ref('')
const error = ref('')
const soundEnabled = ref(true)

const medals = ['🥇', '🥈', '🥉', '4.', '5.']
const leftLevels: Array<'easy' | 'medium'> = ['easy', 'medium']

let interval: ReturnType<typeof setInterval> | undefined
let ghostInterval: ReturnType<typeof setInterval> | undefined
let chaseMusic: HTMLAudioElement | undefined
let audio: AudioContext | undefined
let lastTick = 0

const elapsed = computed(() => presets[difficulty.value].seconds - secondsLeft.value)
const clock = computed(() => `${Math.floor(secondsLeft.value / 60)}:${String(secondsLeft.value % 60).padStart(2, '0')}`)
const cellCount = computed(() => maze.value.length)
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${cellCount.value},minmax(0,1fr))`,
  gridTemplateRows: `repeat(${cellCount.value},minmax(0,1fr))`
}))

const carTransform = computed(() => ({
  right: 'scaleX(-1)',
  left: 'scaleX(1)',
  up: 'rotate(90deg)',
  down: 'rotate(-90deg)'
}[carDirection.value]))

const flatCells = computed(() => maze.value.flatMap((row, r) =>
  row.map((cell, c) => ({
    key: `${r}-${c}`,
    wall: cell === '#',
    player: player.value.r === r && player.value.c === c,
    ghost: ghostActive.value && ghost.value.r === r && ghost.value.c === c,
    goal: goal.value.r === r && goal.value.c === c
  }))
))

function formatTime(s: number) {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

async function loadWinBoards() {
  try { winBoards.value = await $fetch<Board>('/api/leaderboard') } catch {}
}

/* ---------- AUDIO ---------- */

function setupChaseMusic() {
  if (typeof window === 'undefined' || chaseMusic) return
  chaseMusic = new Audio('/sounds/ghost-chase.mp3')
  chaseMusic.loop = true
  chaseMusic.volume = 0.35
  chaseMusic.preload = 'auto'
}

async function startSpookyMusic() {
  if (!soundEnabled.value) return
  setupChaseMusic()
  if (!chaseMusic) return
  try {
    chaseMusic.currentTime = 0
    await chaseMusic.play()
  } catch (err) {
    console.warn('Could not play ghost chase music:', err)
  }
}

function stopSpookyMusic() {
  if (!chaseMusic) return
  chaseMusic.pause()
  chaseMusic.currentTime = 0
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  if (!soundEnabled.value) return stopSpookyMusic()
  if (ghostActive.value && phase.value === 'playing') void startSpookyMusic()
}

function beep(freq: number) {
  if (!soundEnabled.value || typeof window === 'undefined') return
  try {
    audio ??= new AudioContext()
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.06, audio.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.13)
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + 0.13)
  } catch {}
}

/* ---------- MAZE ---------- */

function generateMaze(n: number) {
  const size = n * 2 + 1
  const grid = Array.from({ length: size }, () => Array(size).fill('#')) as string[][]
  const visited = Array.from({ length: n }, () => Array(n).fill(false))
  const stack: Point[] = [{ r: 0, c: 0 }]

  visited[0][0] = true
  grid[1][1] = ' '

  while (stack.length) {
    const cur = stack[stack.length - 1]
    const options = [
      { r: cur.r - 1, c: cur.c },
      { r: cur.r + 1, c: cur.c },
      { r: cur.r, c: cur.c - 1 },
      { r: cur.r, c: cur.c + 1 }
    ].filter(p => p.r >= 0 && p.c >= 0 && p.r < n && p.c < n && !visited[p.r][p.c])

    if (!options.length) {
      stack.pop()
      continue
    }

    const next = options[Math.floor(Math.random() * options.length)]
    grid[cur.r + next.r + 1][cur.c + next.c + 1] = ' '
    grid[next.r * 2 + 1][next.c * 2 + 1] = ' '
    visited[next.r][next.c] = true
    stack.push(next)
  }

  // Add extra openings so there are alternate escape routes.
  const candidates: Point[] = []

  for (let r = 1; r < size - 1; r++) {
    for (let c = 1; c < size - 1; c++) {
      if (grid[r][c] !== '#') continue
      const horizontal = grid[r][c - 1] === ' ' && grid[r][c + 1] === ' '
      const vertical = grid[r - 1][c] === ' ' && grid[r + 1][c] === ' '
      if (horizontal || vertical) candidates.push({ r, c })
    }
  }

  // Shuffle candidate walls.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  // Easy = 2 extra openings, Medium = 3, Hard = 4.
  const extraRoutes = n <= 7 ? 2 : n <= 11 ? 3 : 4
  candidates.slice(0, extraRoutes).forEach(({ r, c }) => { grid[r][c] = ' ' })

  return grid
}

/* ---------- GHOST ---------- */

function getRandomGhostSpawn(): Point {
  const possible: Point[] = []

  for (let r = 1; r < maze.value.length - 1; r++) {
    for (let c = 1; c < maze.value[r].length - 1; c++) {
      if (maze.value[r][c] !== ' ') continue

      const playerDistance = Math.abs(r - player.value.r) + Math.abs(c - player.value.c)
      const goalDistance = Math.abs(r - goal.value.r) + Math.abs(c - goal.value.c)

      if (playerDistance >= 8 && goalDistance >= 3) possible.push({ r, c })
    }
  }

  return possible.length
    ? possible[Math.floor(Math.random() * possible.length)]
    : { r: 1, c: 1 }
}

function nextGhostStep(): Point | null {
  const start = ghost.value
  const target = player.value
  const queue: Point[] = [start]
  const seen = new Set([`${start.r},${start.c}`])
  const parent = new Map<string, Point>()
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  let found = false

  for (let i = 0; i < queue.length && !found; i++) {
    const cur = queue[i]

    for (const [dr, dc] of dirs) {
      const next = { r: cur.r + dr, c: cur.c + dc }
      const key = `${next.r},${next.c}`

      if (maze.value[next.r]?.[next.c] !== ' ' || seen.has(key)) continue

      seen.add(key)
      parent.set(key, cur)
      queue.push(next)

      if (next.r === target.r && next.c === target.c) {
        found = true
        break
      }
    }
  }

  if (!found) return null

  let cur = { ...target }

  while (true) {
    const prev = parent.get(`${cur.r},${cur.c}`)
    if (!prev) return null
    if (prev.r === start.r && prev.c === start.c) return cur
    cur = prev
  }
}

function ghostCaughtPlayer() {
  return ghostActive.value &&
    ghost.value.r === player.value.r &&
    ghost.value.c === player.value.c
}

function moveGhost() {
  if (phase.value !== 'playing' || !ghostActive.value) return
  const next = nextGhostStep()
  if (next) ghost.value = next

  if (ghostCaughtPlayer()) {
    lostReason.value = 'ghost'
    void finish(false)
  }
}

function startChase() {
  if (ghostActive.value || phase.value !== 'playing') return

  ghost.value = getRandomGhostSpawn()
  ghostActive.value = true
  void startSpookyMusic()

  // Lower number = faster ghost.
  const speed = difficulty.value === 'easy' ? 350 : difficulty.value === 'medium' ? 250 : 100
  ghostInterval = setInterval(moveGhost, speed)

  if (ghostCaughtPlayer()) {
    lostReason.value = 'ghost'
    void finish(false)
  }
}

function stopChase() {
  if (ghostInterval) clearInterval(ghostInterval)
  ghostInterval = undefined
  ghostActive.value = false
  stopSpookyMusic()
}

/* ---------- GAME ---------- */

function stopTimer() {
  if (interval) clearInterval(interval)
  interval = undefined
  stopChase()
}

async function finish(win: boolean) {
  if (phase.value !== 'playing') return

  stopTimer()

  if (!win) {
    phase.value = 'lost'
    beep(220)
    return
  }

  phase.value = 'won'
  beep(880)
  claimCode.value = 'SAVING...'
  saveError.value = ''
  leaderboardRank.value = null

  try {
    const result = await $fetch<{
      winner: { claimCode: string; wonAt: string }
      rank: number | null
    }>('/api/winners', {
      method: 'POST',
      body: {
        name: playerName.value,
        difficulty: difficulty.value,
        completionTime: elapsed.value,
        moves: moves.value
      }
    })

    claimCode.value = result.winner.claimCode
    wonAt.value = new Date(result.winner.wonAt).toLocaleString()
    leaderboardRank.value = result.rank
    await loadWinBoards()
  } catch {
    claimCode.value = 'NOT SAVED'
    wonAt.value = new Date().toLocaleString()
    saveError.value = 'Winner could not be saved. Please show this screen to the game administrator.'
  }
}

function tick() {
  if (phase.value !== 'playing') return

  const now = Date.now()
  const delta = Math.floor((now - lastTick) / 1000)
  if (delta < 1) return

  lastTick += delta * 1000
  secondsLeft.value = Math.max(0, secondsLeft.value - delta)

  // Ghost appears after exactly 30 seconds of gameplay.
  if (elapsed.value >= 30 && secondsLeft.value > 0) startChase()

  if (secondsLeft.value === 0) {
    lostReason.value = 'time'
    void finish(false)
  }
}

function startGame() {
  error.value = ''

  if (!playerName.value.trim()) {
    error.value = 'Please enter your name to start.'
    return
  }

  playerName.value = playerName.value.trim().slice(0, 32)
  stopTimer()
  setupChaseMusic()

  maze.value = generateMaze(presets[difficulty.value].cells)
  player.value = { r: 1, c: 1 }
  carDirection.value = 'right'

  const last = maze.value.length - 2
  goal.value = { r: last, c: last }

  secondsLeft.value = presets[difficulty.value].seconds
  moves.value = 0
  claimCode.value = ''
  wonAt.value = ''
  leaderboardRank.value = null
  saveError.value = ''
  lostReason.value = 'time'
  ghost.value = { r: 1, c: 1 }
  ghostActive.value = false

  phase.value = 'playing'
  lastTick = Date.now()
  interval = setInterval(tick, 200)
}

function move(dr: number, dc: number) {
  if (phase.value !== 'playing') return

  tick()
  if (phase.value !== 'playing') return

  const r = player.value.r + dr
  const c = player.value.c + dc

  if (maze.value[r]?.[c] !== ' ') return

  if (dr === -1) carDirection.value = 'up'
  else if (dr === 1) carDirection.value = 'down'
  else if (dc === -1) carDirection.value = 'left'
  else if (dc === 1) carDirection.value = 'right'

  player.value = { r, c }
  moves.value++
  beep(350)

  if (ghostCaughtPlayer()) {
    lostReason.value = 'ghost'
    void finish(false)
    return
  }

  if (r === goal.value.r && c === goal.value.c) void finish(true)
}

function onKey(e: KeyboardEvent) {
  if (phase.value !== 'playing') return

  const directions: Record<string, [number, number]> = {
    ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    w: [-1, 0], W: [-1, 0], s: [1, 0], S: [1, 0],
    a: [0, -1], A: [0, -1], d: [0, 1], D: [0, 1]
  }

  const direction = directions[e.key]
  if (!direction) return

  e.preventDefault()
  move(...direction)
}

function backToWelcome() {
  stopTimer()
  phase.value = 'welcome'
  error.value = ''
}

function nextPlayer() {
  playerName.value = ''
  backToWelcome()
}

function onVisibility() {
  if (document.visibilityState === 'visible') tick()
}

onMounted(() => {
  setupChaseMusic()
  window.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  stopTimer()
  stopSpookyMusic()
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', onVisibility)
  void audio?.close()
})
</script>

<template>
  <main class="app-shell">
    <div class="ambient moon">🌕</div>
    <div class="ambient bat">🦇</div>
    <div class="ambient ghost">👻</div>

    <header class="header">
      <div class="brand">🚗 HALLOWEEN <span>CANDY MAZE</span></div>
      <div class="tag">🍬 FIND YOUR SWEET ESCAPE</div>
    </header>

    <section class="panel" :class="{ 'win-panel': phase === 'won' }" aria-live="polite">

      <!-- WELCOME -->
      <template v-if="phase === 'welcome'">
        <div class="hero-emoji">🚗🍬👻</div>
        <p class="eyebrow">THE SPOOKIEST CHALLENGE</p>
        <h1>Trick or <span>Treat?</span></h1>
        <p class="intro">Escape the haunted maze before time runs out and win your Halloween candy!</p>

        <form class="setup" @submit.prevent="startGame">
          <label for="player-name">YOUR NAME</label>
          <input id="player-name" v-model="playerName" maxlength="32" placeholder="Enter your name" autocomplete="nickname" />

          <label for="difficulty">MAZE DIFFICULTY</label>
          <select id="difficulty" v-model="difficulty">
            <option v-for="(preset, key) in presets" :key="key" :value="key">{{ preset.label }}</option>
          </select>

          <label for="play-mode">PLAYING ON</label>
          <select id="play-mode" v-model="mode">
            <option value="phone">My phone</option>
            <option value="station">Shared game station</option>
          </select>

          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <button class="primary" type="submit">🎮 START THE MAZE</button>
        </form>

        <NuxtLink to="/leaderboard" class="leaderboard-button">🏆 VIEW WINNERS & TOP 5</NuxtLink>
        <p class="small-note">📱 Use on-screen arrows · ⌨️ Use keyboard arrows or WASD</p>
      </template>

      <!-- PLAYING -->
      <template v-else-if="phase === 'playing'">
        <div class="game-top">
          <div><span class="tiny-label">PLAYER</span><strong>{{ playerName }}</strong></div>
          <div class="time" :class="{ urgent: ghostActive }">⏱ {{ clock }}</div>
          <div><span class="tiny-label">MOVES</span><strong>{{ moves }}</strong></div>
        </div>

        <div v-if="ghostActive" class="ghost-warning">👻 THE GHOST IS COMING! RUN!</div>
        <h1 class="game-title">Find the <span>candy!</span> 🍬</h1>

        <div class="maze-wrap">
          <div class="maze" :style="gridStyle" role="img" aria-label="Maze with car, ghost and candy">
            <div
              v-for="cell in flatCells"
              :key="cell.key"
              class="cell"
              :class="{ wall: cell.wall, floor: !cell.wall, goal: cell.goal }"
            >
              <span v-if="cell.player" class="piece" :style="{ transform: carTransform }">🚗</span>
              <span v-else-if="cell.ghost" class="piece maze-ghost">👻</span>
              <span v-else-if="cell.goal" class="piece candy">🍬</span>
            </div>
          </div>
        </div>

        <div class="control-area">
          <p class="small-note">Move the car 🚗 to the candy 🍬</p>
          <div class="dpad">
            <button aria-label="Move up" class="up" @click="move(-1, 0)">▲</button>
            <button aria-label="Move left" class="left" @click="move(0, -1)">◀</button>
            <button aria-label="Move down" class="down" @click="move(1, 0)">▼</button>
            <button aria-label="Move right" class="right" @click="move(0, 1)">▶</button>
          </div>
        </div>

        <div class="game-actions">
          <button class="text-button" @click="toggleSound">{{ soundEnabled ? '🔊 Sound on' : '🔇 Sound off' }}</button>
          <button class="text-button" @click="backToWelcome">✕ Quit</button>
        </div>
      </template>

      <!-- WON -->
      <template v-else-if="phase === 'won'">
        <div class="win-grid">
          <div class="win-left">
            <div class="hero-emoji celebrate">🎉🍬🚗</div>
            <p class="eyebrow">MISSION COMPLETE</p>
            <h1>You <span>Won!</span></h1>
            <p class="intro">Amazing work, <strong>{{ playerName }}</strong>! You escaped the haunted maze.</p>

            <div class="result-stats">
              <div><span>TIME</span><strong>{{ formatTime(elapsed) }}</strong></div>
              <div><span>MOVES</span><strong>{{ moves }}</strong></div>
              <div><span>LEVEL</span><strong>{{ difficulty }}</strong></div>
            </div>

            <p v-if="leaderboardRank" class="rank-banner">
              🏆 You are #{{ leaderboardRank }} on the {{ difficulty }} Top 5!
            </p>

            <div class="claim">
              <p>🍭 SHOW THIS SCREEN TO CLAIM YOUR CANDY</p>
              <div class="claim-code">{{ claimCode }}</div>
              <small>{{ wonAt }}</small>
            </div>

            <p v-if="saveError" class="error">{{ saveError }}</p>

            <div class="left-boards">
              <article v-for="level in leftLevels" :key="level" class="mini-board">
                <h2>{{ level === 'easy' ? '🟢 EASY TOP 5' : '🟠 MEDIUM TOP 5' }}</h2>
                <div v-if="!winBoards[level].length" class="empty">No winners yet 👻</div>

                <div
                  v-for="(w, i) in winBoards[level]"
                  :key="w.id"
                  class="mini-score"
                  :class="{ 'current-player': w.name === playerName && w.completionTime === elapsed && w.moves === moves }"
                >
                  <strong>{{ medals[i] }} {{ w.name }}</strong>
                  <span>{{ formatTime(w.completionTime) }} · {{ w.moves }} moves</span>
                </div>
              </article>
            </div>
          </div>

          <aside class="hard-board">
            <p class="eyebrow">ULTIMATE CHALLENGE</p>
            <h2>🔴 HARD TOP 5</h2>

            <div v-if="!winBoards.hard.length" class="empty">No hard-mode winners yet 👻</div>

            <div
              v-for="(w, i) in winBoards.hard"
              :key="w.id"
              class="hard-score"
              :class="{ 'current-player': w.name === playerName && w.completionTime === elapsed && w.moves === moves }"
            >
              <div class="hard-place">{{ medals[i] }}</div>
              <div class="hard-name">{{ w.name }}</div>
              <div class="hard-time">{{ formatTime(w.completionTime) }}<small>{{ w.moves }} moves</small></div>
            </div>

            <NuxtLink class="leader-link board-link" to="/leaderboard">🏆 Full Leaderboard</NuxtLink>
          </aside>
        </div>

        <p class="small-note">Claim code is for display only. Candy station staff must check claims manually.</p>
        <button class="primary win-action" @click="mode === 'station' ? nextPlayer() : backToWelcome()">
          {{ mode === 'station' ? '👤 NEXT PLAYER' : '🎮 PLAY AGAIN' }}
        </button>
      </template>

      <!-- LOST -->
      <template v-else>
        <div class="hero-emoji">👻⌛</div>
        <p class="eyebrow">{{ lostReason === 'ghost' ? 'CAUGHT!' : "TIME'S UP" }}</p>
        <h1>The ghost <span>won!</span></h1>

        <p class="intro">
          {{
            lostReason === 'ghost'
              ? `Oh no, ${playerName}! The ghost caught your car!`
              : `Don't worry, ${playerName}. Time ran out — try again and find that candy!`
          }}
        </p>

        <button class="primary" @click="startGame">🔁 TRY AGAIN</button>
        <button class="text-button centered" @click="backToWelcome">Back to menu</button>
      </template>
    </section>

    <footer>🚗 Happy Halloween! · Made for spooky fun · No accounts required</footer>
  </main>
</template>