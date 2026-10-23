export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  app: { head: { title: 'Halloween Candy Maze 🎃', meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }, { name: 'theme-color', content: '#170d28' }, { name: 'description', content: 'Find the candy before time runs out!' }] } }
})
