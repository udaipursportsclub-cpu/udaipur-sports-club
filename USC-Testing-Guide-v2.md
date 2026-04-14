# USC Platform — Testing Guide v2
### For Bhavyansh & Team
**URL:** https://usc-platform-beta.vercel.app
**Date:** 14 April 2026

---

## WHAT'S NEW (Phase 2)

Everything is dark cinematic theme now. Plus these major features:

- **Cricket Live Scoreboard** — ball-by-ball, CricHeroes-style
- **Tournaments** — knockout, league, round-robin with brackets
- **Smart XP System** — 7 levels, diminishing returns, diversity bonus
- **Attendance Marking** — host marks present/absent
- **Phone OTP Login** — login with phone number
- **WhatsApp Notifications** — event alerts to members
- **Photo Gallery + Face Recognition** — find yourself in event photos

---

## TEST 1: Login (3 methods)

### Google Login
- [ ] Go to login page → Google tab is default
- [ ] Tap "Continue with Google"
- [ ] Should redirect to Google → back to Dashboard

### Phone OTP Login
- [ ] Go to login page → tap "Phone OTP" tab
- [ ] Enter your 10-digit phone number
- [ ] Tap "Send OTP"
- [ ] Check WhatsApp for the 6-digit code
- [ ] Enter the code (should auto-advance between boxes)
- [ ] Tap "Verify & Sign In"
- [ ] Should land on Dashboard

### Email Login (for admin accounts)
- [ ] Go to login page → tap "Email" tab
- [ ] Enter email + password
- [ ] Tap "Sign In"

---

## TEST 2: Dashboard
- [ ] Dark theme (not beige)
- [ ] Shows your name + avatar
- [ ] Quick actions: Browse Events, Create Event
- [ ] 3 cards: My Photos, Wrapped, Invite
- [ ] Admin link visible (if admin)
- [ ] If phone not added: should see phone prompt

---

## TEST 3: Create Event + Scoreboard

### Create Event
- [ ] Go to /events/new
- [ ] Fill: Title, Sport = Cricket, Date, Time, Location, Capacity
- [ ] Add Duration (new field)
- [ ] Create the event

### Cricket Scoreboard (NEW)
- [ ] Open the cricket event you just created
- [ ] You should see "Live Scoreboard" button (only for cricket events)
- [ ] Tap it → goes to /events/[id]/scoreboard
- [ ] If you're the host: you'll see "Start Scoring" button
- [ ] Tap "Start Scoring" → goes to scoring panel

### Scoring Panel
- [ ] Set batting team name, bowling team name
- [ ] Enter 2 opening batsmen names + bowler name
- [ ] Start innings
- [ ] Tap run buttons: 0, 1, 2, 3, 4, 6
- [ ] Check: does the score update live?
- [ ] Check: does batsman's runs/SR update?
- [ ] Check: does bowler's overs/economy update?
- [ ] Tap "Wide" → should add 1 run, NOT count as legal ball
- [ ] Tap "Wicket" → pick type (bowled, caught, etc.)
- [ ] Enter new batsman name
- [ ] After 6 legal balls: should prompt for new bowler
- [ ] Check the viewer page (/scoreboard) — does it show live score?

---

## TEST 4: Tournaments (NEW)

### Create Tournament
- [ ] Go to /tournaments
- [ ] Tap "Create Tournament" (hosts/admins only)
- [ ] Fill: Title, Sport, Format (knockout/league), Team Size, Max Teams
- [ ] Optionally: entry fee, dates, rules
- [ ] Create

### Add Teams
- [ ] Open your tournament
- [ ] Add teams with player names
- [ ] Check: teams show in the grid

### Generate Fixtures
- [ ] Tap "Generate Fixtures"
- [ ] For Knockout: should show bracket tree
- [ ] For League: should show round-robin schedule

### Record Results
- [ ] Pick a match → enter scores → select winner
- [ ] For Knockout: winner should auto-advance to next round
- [ ] Check: bracket updates

---

## TEST 5: Attendance (NEW)

- [ ] Open any event you hosted
- [ ] After people RSVP, you should be able to mark attendance
- [ ] Mark someone as "Present" or "Absent"
- [ ] Check: absent count shows on their profile

---

## TEST 6: Leaderboard + XP System

- [ ] Go to /leaderboard
- [ ] Dark theme, gaming style
- [ ] Each player shows: XP, Level badge (Rookie/Rising/Warrior/etc.)
- [ ] Your rank card at top with progress bar
- [ ] "Hot This Week" section
- [ ] Sport breakdown with % bars
- [ ] Check: playing multiple sports should give higher global XP

---

## TEST 7: Event Photos + Face Recognition

- [ ] Open any event → tap "Photos"
- [ ] Upload 2-3 photos (host only)
- [ ] Photos should appear in gallery
- [ ] Tap "Find me in photos" → take selfie
- [ ] If face matches: photos highlighted with "That's you!"
- [ ] Go to /photos → "Find me" works across all events

---

## TEST 8: Mobile Bottom Nav

- [ ] Open on phone
- [ ] Bottom bar: Home, Events, Tourneys, Rankings, Me
- [ ] Dark theme (not white)
- [ ] Tap each → correct page loads

---

## TEST 9: Dark Theme Consistency

Check ALL these pages are dark (bg-[#030712]):
- [ ] Homepage (/)
- [ ] Events (/events)
- [ ] Event detail (/events/[id])
- [ ] Leaderboard (/leaderboard)
- [ ] Members (/members)
- [ ] Dashboard (/dashboard)
- [ ] Profile (/profile/[id])
- [ ] Settings (/settings)
- [ ] Login (/login)
- [ ] Create Event (/events/new)
- [ ] Tournaments (/tournaments)
- [ ] Photos (/photos)
- [ ] Loading screen
- [ ] 404 page (/blahblah)

---

## TEST 10: WhatsApp Notifications

- [ ] Create an event → members with phone numbers should get WhatsApp message
- [ ] Admin → /admin/whatsapp → check message log
- [ ] Bulk sender shows wa.me links if API not configured

---

## How to Report Issues

For each issue, note:
1. **Page URL**
2. **What you did**
3. **What went wrong**
4. **Screenshot**

Send to Avi.

---

## Quick Links

| Page | URL |
|------|-----|
| Homepage | https://usc-platform-beta.vercel.app |
| Events | https://usc-platform-beta.vercel.app/events |
| Tournaments | https://usc-platform-beta.vercel.app/tournaments |
| Leaderboard | https://usc-platform-beta.vercel.app/leaderboard |
| Scoreboard | https://usc-platform-beta.vercel.app/events/[id]/scoreboard |
| Photos | https://usc-platform-beta.vercel.app/photos |
| Dashboard | https://usc-platform-beta.vercel.app/dashboard |
| Admin | https://usc-platform-beta.vercel.app/admin |
| Admin WhatsApp | https://usc-platform-beta.vercel.app/admin/whatsapp |
| Login | https://usc-platform-beta.vercel.app/login |

---

*Built by Avi & Bhavyansh · Powered by AI*
