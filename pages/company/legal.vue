<script setup lang="ts">
import { COMPANY_TERMS_VERSION } from '~/shared/company-legal'

useHead({
  title: 'Terms and Privacy Notice | Halloween Candy Maze'
})
</script>

<template>
  <main class="app-shell">
    <header class="header">
      <NuxtLink class="brand" to="/">🍬 HALLOWEEN <span>CANDY MAZE</span></NuxtLink>
      <NuxtLink class="leader-link" to="/company/register">Company registration</NuxtLink>
    </header>

    <article class="panel company-panel">
      <p class="eyebrow">COMPANY GAME</p>
      <h1>Terms &amp; <span>Privacy</span></h1>
      <p class="intro">Version {{ COMPANY_TERMS_VERSION }} · Updated November 1, 2026</p>

      <div class="legal-content">
        <p class="legal-notice">
          This is a general-purpose notice for this app, not legal advice. The organization or person
          operating this copy of the game is responsible for its deployment and for answering privacy
          questions. They should review and adapt this notice to their location and event before public use.
        </p>

        <h2 id="terms">Terms of Use</h2>
        <h3>Using a company game</h3>
        <p>
          By creating a company game, you confirm that you are authorized to represent the organization
          named in the registration. Keep your admin password private and use a unique password. You are
          responsible for activity performed through your company admin account and for sharing its game
          link appropriately.
        </p>
        <p>
          Company game links give access to that company's game and leaderboard; they are not admin
          credentials. Anyone with a link may view its company leaderboard and submit a game result.
          Do not use a person's full name or include sensitive or confidential information in player names.
        </p>

        <h3>Fair and respectful play</h3>
        <p>
          Use the game lawfully and fairly. Do not attempt to disrupt the service, impersonate another
          player, or submit abusive, unlawful, or private information. The event organizer may manage
          game settings and archive results for their game.
        </p>

        <h3>Availability</h3>
        <p>
          The game is provided for entertainment and may be changed, interrupted, or discontinued by
          the operator. Scores and claim codes are recorded by the app, but the operator cannot guarantee
          uninterrupted service or the availability of a particular prize.
        </p>

        <h2 id="privacy">Privacy Notice</h2>
        <h3>Information the app stores</h3>
        <ul>
          <li>
            Company admins: company name, admin email, a salted password hash (not the password itself),
            player-icon choice, and the version and time of the Terms agreement.
          </li>
          <li>
            Game results: player-entered display name, difficulty, moves, completion time, result time,
            claim code, and claim status.
          </li>
          <li>
            Company admin session: a random session cookie and its server-side expiry record. The cookie
            is HttpOnly, SameSite=Lax, and can last up to 30 days; it is marked Secure when served over HTTPS.
          </li>
        </ul>
        <p>
          The app uses this information to operate accounts, games, leaderboards, and prize claims. The
          app does not require player accounts. The server operator's hosting, network, or diagnostic logs
          may also process technical connection data according to that operator's configuration.
        </p>

        <h3>Who can see results</h3>
        <p>
          A global result may appear on the global leaderboard. Company results are separate from global
          results and other companies, but anyone with that company's shareable game link can view its
          leaderboard. Company admins can see their company's winner history and claim details. Use a
          nickname if you do not want your name displayed.
        </p>

        <h3>Storage and retention</h3>
        <p>
          The app stores its records in a SQLite database on the server that runs it. Archived results
          are retained for monthly and yearly leaderboards and are not automatically deleted. Archiving
          or resetting a winner list does not erase its history. The server operator controls backups
          and should protect them because they contain account and game data.
        </p>

        <h3>Cookies and service providers</h3>
        <p>
          The company admin cookie is necessary to keep an admin signed in. This app does not include
          advertising or analytics features. The operator's hosting or network providers may process
          technical data to deliver the service.
        </p>

        <h3>Your choices and privacy contact</h3>
        <p>
          Do not submit sensitive information as a player name. To ask about, correct, or request deletion
          of account or game data, contact the event organizer or server operator who provided this game.
          There is no self-service account deletion; archived history and backups may need to be handled
          separately by the operator. Any rights available to you depend on the laws that apply where
          the service is operated and used.
        </p>

        <p class="small-note">
          Questions about a company game can also be directed to that company's admin. For this self-hosted
          app, the operator should provide a direct privacy contact to players before collecting their data.
        </p>
      </div>
    </article>
  </main>
</template>
