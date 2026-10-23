<script setup lang="ts">
type Winner = { id:string; name:string; difficulty:string; completionTime:number; moves:number; wonAt:string }
type Board = { easy:Winner[]; medium:Winner[]; hard:Winner[] }
const { data, refresh } = await useFetch<Board>('/api/leaderboard', { default: () => ({ easy: [], medium: [], hard: [] }) })
const levels = ['easy','medium','hard'] as const
const medals = ['🥇','🥈','🥉','4.','5.']
function time(s:number){ return s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s` }
</script>
<template><main class="app-shell"><header class="header"><div class="brand">🏆 HALLOWEEN <span>TOP 5</span></div><NuxtLink class="leader-link" to="/">🚗 Play Game</NuxtLink></header><section class="panel leaderboard-panel"><p class="eyebrow">FASTEST CANDY HUNTERS</p><h1>Hall of <span>Fame</span></h1><div class="boards"><article v-for="level in levels" :key="level" class="board-card"><h2>{{ level.toUpperCase() }}</h2><div v-if="!data[level].length" class="empty">No winners yet 👻</div><div v-for="(w,i) in data[level]" :key="w.id" class="score-row"><strong>{{ medals[i] }} {{ w.name }}</strong><span>{{ time(w.completionTime) }} · {{ w.moves }} moves</span></div></article></div><button class="primary" @click="refresh()">🔄 REFRESH LEADERBOARD</button></section><footer>🍬 Fastest time wins · Fewer moves break a tie</footer></main></template>
