# Halloween Candy Maze

Nuxt 3 maze game for phones and a shared PC. It supports a shared global game plus isolated, self-service company games with their own links, leaderboards, and subadmin accounts.

## Features
- Easy, Medium and Hard random mazes
- Directional car, touch controls, arrow keys and WASD
- Server-generated candy claim codes
- Local SQLite storage for winner records, company accounts, sessions, and game settings
- Monthly and yearly leaderboards for fastest times and fewest moves, grouped by difficulty (`/leaderboard`)
- Five unique players per difficulty and ranking; fastest times use fewer moves as a tie-breaker, and fewest-move rankings use completion time
- Candy claim admin (`/admin`)
- Admin controls for maze sizes and time limits by difficulty, ghost timing/speed, and game icons
- Self-service company registration with a unique, shareable game URL and QR code
- Required agreement to the Terms of Use and acknowledgment of the Privacy Notice at company registration
- Company-only monthly/yearly leaderboards, player icon settings, winner claims, and archive-only resets
- Duplicate claim prevention
- Automatic monthly rollover and event reset that archive winners without deleting leaderboard history

## Windows setup
1. Install Node.js 22 LTS or newer.
2. Extract this project, for example to `C:\Halloween\halloween-candy-maze`.
3. Open PowerShell in the project folder.
4. Run `npm install`.
5. Copy `.env.example` to `.env` and change `ADMIN_PIN` if desired.
6. Run `npm run dev` for testing.
7. Open `http://localhost:3000`.

Run `npm run typecheck` to validate TypeScript and Vue component types.

## Phone testing on the same Wi-Fi/LAN
Run `ipconfig` and find the host PC IPv4 address, e.g. `192.168.1.100`.
Players open `http://192.168.1.100:3000`.

If Windows Firewall blocks it, run PowerShell as Administrator:
`New-NetFirewallRule -DisplayName "Halloween Candy Maze TCP 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private`

## Event URLs
- Game: `http://HOST-IP:3000/`
- Leaderboard: `http://HOST-IP:3000/leaderboard`
- Admin: `http://HOST-IP:3000/admin`
- Company registration: `http://HOST-IP:3000/company/register`
- Company admin: `http://HOST-IP:3000/company/admin`

Default admin PIN: `1031` (change it in `.env`). Do not share the admin URL/PIN with players.

## Admin game settings
In `/admin`, expand **Game settings** to adjust the maze cells and timer separately for each difficulty, choose when the ghost starts and how often it moves, and change the global player, ghost, and goal icons. New games load the latest settings. Maze size is 4–15 cells per side, time limits are 30–300 seconds, and ghost movement intervals are 200–2000 ms. Lower ghost intervals mean a faster ghost.

## Company games
An organizer registers at `/company/register` with a company name, email, and password (12 characters minimum). The company receives a unique shareable game URL and QR code in `/company/admin`. Players can use that link directly or choose **Company game** on the main game page and enter the company code. A company link identifies the game but does not grant admin access.

Company registration requires agreement to the Terms of Use and acknowledgment of the Privacy Notice at `/company/legal`. The app stores the accepted terms version and timestamp with the company account.

Company winners and leaderboards are isolated from the global game and from other companies. A company subadmin can change the company player icon, view/claim company winners, and archive current company winners; monthly and yearly company leaderboard history remains available. Company resets never affect global results. The global admin and its settings continue to control only the global game.

Company admin access uses a password-protected, HttpOnly session cookie. Passwords are stored as salted scrypt hashes. Email is used as the login name; this local app does not send email verification or password-recovery messages. Use a unique password and keep the company admin login private.

The legal page is a general-purpose starting point, not jurisdiction-specific legal advice. Before public or commercial use, the event/site operator should review it for the applicable laws and add a real privacy contact and any required local disclosures.

## Production
Run:
`npm run build`
then:
`npm run start`

The app listens on the Nuxt/Nitro host/port environment. The included `start-production.bat` sets host `0.0.0.0` and port `3000`.

## Monthly rollover and history
Global and each company's active winner list roll over automatically when the host's local calendar month changes and that scope receives its next request. Previous results remain in SQLite and available to monthly and yearly leaderboards. No scheduled task is required.

The global admin's **Archive current winners** action clears only the global active list. Company subadmins can archive only their own active winners. Archived winners remain visible in history and can still be marked as claimed. Monthly and yearly leaderboards are calculated from both active and archived records.

On first start after this upgrade, existing `data/winners.json` and `data/game-settings.json` records/settings are imported into `data/maze.sqlite`. The JSON files are kept as migration backups; after migration, SQLite is the live source of truth. Back up `data/maze.sqlite` while the app is stopped.

## Back up results
Copy `data/maze.sqlite` while the app is stopped. It contains global and company winner history, settings, and company accounts. Keep this file private because it contains password hashes and account data.

## Ranking
Choose monthly or yearly and then fastest time or fewest moves. Rankings are separated by difficulty and show each player's best result for the selected period. Fastest-time rankings break ties with fewer moves; fewest-move rankings break ties with faster times. Remaining ties are resolved by the earliest finish. Period boundaries use the host PC's local time zone.
