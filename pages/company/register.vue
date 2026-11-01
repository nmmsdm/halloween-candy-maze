<script setup lang="ts">
const companyName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const agreeToTerms = ref(false)
const busy = ref(false)
const message = ref('')

function errorMessage(error: unknown) {
  return (error as { data?: { statusMessage?: string } })?.data?.statusMessage ||
    'Could not create the company account.'
}

async function registerCompany() {
  message.value = ''
  if (password.value !== confirmPassword.value) {
    message.value = 'Passwords do not match.'
    return
  }

  busy.value = true
  try {
    await $fetch('/api/company/register', {
      method: 'POST',
      body: {
        name: companyName.value,
        email: email.value,
        password: password.value,
        agreeToTerms: agreeToTerms.value
      }
    })
    await navigateTo('/company/admin?welcome=1')
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="app-shell">
    <header class="header">
      <NuxtLink class="brand" to="/">🍬 HALLOWEEN <span>CANDY MAZE</span></NuxtLink>
      <NuxtLink class="leader-link" to="/company/admin">Company admin login</NuxtLink>
    </header>

    <section class="panel company-panel">
      <p class="eyebrow">CREATE A PRIVATE LEADERBOARD</p>
      <h1>Register your <span>company</span></h1>
      <p class="intro">
        Get a company-only game link and QR code. Company scores and resets are kept separate from the global game.
      </p>

      <form class="setup" @submit.prevent="registerCompany">
        <label for="company-name">COMPANY NAME</label>
        <input
          id="company-name"
          v-model="companyName"
          maxlength="80"
          required
          autocomplete="organization"
          placeholder="Your company"
        >
        <label for="owner-email">ADMIN EMAIL</label>
        <input
          id="owner-email"
          v-model="email"
          type="email"
          maxlength="254"
          required
          autocomplete="email"
          placeholder="you@company.com"
        >
        <label for="owner-password">PASSWORD (12 CHARACTERS MINIMUM)</label>
        <input
          id="owner-password"
          v-model="password"
          type="password"
          minlength="12"
          maxlength="200"
          required
          autocomplete="new-password"
          placeholder="Create a strong password"
        >
        <label for="confirm-password">CONFIRM PASSWORD</label>
        <input
          id="confirm-password"
          v-model="confirmPassword"
          type="password"
          minlength="12"
          maxlength="200"
          required
          autocomplete="new-password"
          placeholder="Enter your password again"
        >
        <div class="consent-field">
          <input id="agree-to-terms" v-model="agreeToTerms" type="checkbox" required>
          <label for="agree-to-terms">
            I agree to the <NuxtLink to="/company/legal#terms" target="_blank">Terms of Use</NuxtLink>
            and acknowledge that I have read the <NuxtLink to="/company/legal#privacy" target="_blank">Privacy Notice</NuxtLink>.
          </label>
        </div>
        <p v-if="message" class="error" role="alert">{{ message }}</p>
        <button class="primary" type="submit" :disabled="busy">
          {{ busy ? 'CREATING ACCOUNT…' : '🏢 CREATE COMPANY GAME' }}
        </button>
      </form>

      <p class="small-note">
        Company links are shareable; company settings and winner management require your admin password.
      </p>
    </section>
  </main>
</template>
