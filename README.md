# Halloween Candy Maze - Complete Local Event Version

Nuxt 3 game for phones and a shared PC. All players connect to one host PC. Winners are stored centrally in `data/winners.json` on the host.

## Features
- Easy, Medium and Hard random mazes
- Directional car, touch controls, arrow keys and WASD
- Server-generated candy claim codes
- Central local winner storage
- Top 5 fastest per difficulty (`/leaderboard`)
- Fewer moves breaks equal-time ties
- Candy claim admin (`/admin`)
- Duplicate claim prevention
- Full winner history and event reset

## Windows setup
1. Install Node.js 22 LTS or newer.
2. Extract this project, for example to `C:\Halloween\halloween-candy-maze`.
3. Open PowerShell in the project folder.
4. Run `npm install`.
5. Copy `.env.example` to `.env` and change `ADMIN_PIN` if desired.
6. Run `npm run dev` for testing.
7. Open `http://localhost:3000`.

## Phone testing on the same Wi-Fi/LAN
Run `ipconfig` and find the host PC IPv4 address, e.g. `192.168.1.100`.
Players open `http://192.168.1.100:3000`.

If Windows Firewall blocks it, run PowerShell as Administrator:
`New-NetFirewallRule -DisplayName "Halloween Candy Maze TCP 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private`

## Event URLs
- Game: `http://HOST-IP:3000/`
- Leaderboard: `http://HOST-IP:3000/leaderboard`
- Admin: `http://HOST-IP:3000/admin`

Default admin PIN: `1031` (change it in `.env`). Do not share the admin URL/PIN with players.

## Production
Run:
`npm run build`
then:
`npm run start`

The app listens on the Nuxt/Nitro host/port environment. The included `start-production.bat` sets host `0.0.0.0` and port `3000`.

## Back up results
Copy `data/winners.json` after the event. Do not delete it while the server is running.

## Ranking
Lowest completion time ranks first. If times are equal, fewer moves ranks first. All winners remain stored even if they are not in the Top 5.
