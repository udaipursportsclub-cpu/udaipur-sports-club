# USC Platform — Testing Guide
### For Bhavyansh (& anyone testing)
**URL:** https://usc-platform-beta.vercel.app
**Date:** 14 April 2026

---

## How to Test

Open the URL on your phone (best experience) or laptop. Go through each section below one by one. Note anything that feels broken, ugly, slow, or confusing.

---

## TEST 1: Sign Up & Login
- [ ] Open the site → tap "Join the Club"
- [ ] Sign up with Google (or email)
- [ ] After login, you should land on the **Dashboard**
- [ ] Your name should show at the top
- [ ] Check: Does the dashboard show your name correctly?

## TEST 2: Homepage (logged out)
- [ ] Open the site in incognito/private mode (not logged in)
- [ ] You should see the dark homepage — "Play. Compete. Flex."
- [ ] Check: Live stats (Athletes, Events, Games Played) — do numbers show?
- [ ] Check: Live Feed section — does it show recent activity?
- [ ] Check: Upcoming events cards — do they appear?
- [ ] Check: Sports pills at bottom — do they show?
- [ ] Tap "Join the Club" — does it take you to login?

## TEST 3: Create an Event
- [ ] Go to Dashboard → "Create Event" (or /events/new)
- [ ] Fill in: Title, Sport (pick from dropdown), Date, Time, Location, Capacity
- [ ] For a paid event: add Total Cost and UPI ID
- [ ] Tap Create
- [ ] Check: Does the event appear on the Events page?
- [ ] Check: Does the event detail page look correct?

## TEST 4: RSVP to an Event
- [ ] Open any event
- [ ] Tap "Join This Event" (RSVP button)
- [ ] Check: Does it confirm your RSVP?
- [ ] Check: Does your name appear in "Who's coming" list?
- [ ] Check: Does the spots count go down by 1?
- [ ] Try RSVPing again — it should say you already joined or let you cancel

## TEST 5: Waitlist (when event is full)
- [ ] Create an event with capacity = 1
- [ ] RSVP with one account (fills it up)
- [ ] Open same event with a different account
- [ ] Check: Does it show "Join Waitlist" instead of "Join"?
- [ ] Tap Join Waitlist
- [ ] Check: Does it show your waitlist position?

## TEST 6: Event Photos
- [ ] Open any event → tap "Photos" button
- [ ] If you're the host: you should see "Upload Photos" section
- [ ] Upload 2-3 photos
- [ ] Check: Do photos appear in the gallery?
- [ ] Tap "Find me in photos" → take a selfie
- [ ] Check: Does face detection run? (you'll see a scanning animation)
- [ ] If it finds you: does it highlight your photos with "That's you!"?

## TEST 7: Leaderboard
- [ ] Go to /leaderboard
- [ ] Check: Dark theme, gaming style
- [ ] Check: Does it show XP and level badges (Rookie, Rising, Warrior...)?
- [ ] Check: "Hot This Week" section — does it show?
- [ ] Check: Your rank card at top (if you've played games)
- [ ] Check: XP progress bar to next level

## TEST 8: My Photos Page
- [ ] Go to /photos (or tap Photos in bottom nav on mobile)
- [ ] Check: "Find me" button — tap it, take selfie
- [ ] If matches exist: photos should appear
- [ ] Check: "Events with photos" list at bottom

## TEST 9: Profile Page
- [ ] Go to /profile/[your-id] (tap your name anywhere)
- [ ] Check: Shows your stats (games played, hosted, sports)
- [ ] Check: Achievement badges
- [ ] Check: USC Wrapped link
- [ ] Check: Invite Friends link

## TEST 10: USC Wrapped
- [ ] Go to Dashboard → "Wrapped" card
- [ ] Check: Shows your stats card (games, top sport, etc.)
- [ ] Check: Week/Month toggle works
- [ ] Check: Share buttons (WhatsApp, Copy Link)

## TEST 11: Invite Friends
- [ ] Go to Dashboard → "Invite" card
- [ ] Check: Shows your personal invite link
- [ ] Copy the link → open in incognito
- [ ] Check: Does it show YOUR name and stats to the visitor?

## TEST 12: Admin Panel (only for admins)
- [ ] Go to /admin
- [ ] Check: Shows stats (Total Members, Events, RSVPs)
- [ ] Check: Generate Challenge Code button works
- [ ] Check: Can change user roles from the dropdown
- [ ] Check: AI Command Center link works → /admin/social
- [ ] Check: Setup Guide link works → /admin/setup

## TEST 13: AI Command Center (admin only)
- [ ] Go to /admin/social
- [ ] Check: Shows which platforms are connected (green dots)
- [ ] Check: "Post Now" — upload a photo, see AI generate a caption
- [ ] Check: "AI Outreach" — pick a business type, generate a message
- [ ] Check: Copy button works for generated messages

## TEST 14: Mobile Experience
- [ ] Open the site on your phone
- [ ] Check: Bottom navigation bar shows (Home, Events, Photos, Rankings, Me)
- [ ] Check: Tapping each nav item goes to the right page
- [ ] Check: Pages don't have content hidden behind the bottom nav
- [ ] Check: Everything readable on small screen (no text cutoff)

## TEST 15: Edge Cases
- [ ] Try creating an event with date in the past — what happens?
- [ ] Try RSVP-ing to a full event — does waitlist show?
- [ ] Open a page that doesn't exist (e.g., /blahblah) — does 404 page show?
- [ ] Refresh any page — does it load correctly?
- [ ] Check page speed — does anything feel slow?

---

## How to Report Issues

For each issue, note:
1. **What page** were you on? (URL or page name)
2. **What did you do?** (tapped X, scrolled to Y)
3. **What happened?** (error, blank screen, wrong text)
4. **What should have happened?**
5. **Screenshot** if possible

Send all issues to Avi — he'll pass them to the dev team.

---

## Login Credentials

| Person | How to login |
|--------|-------------|
| Bhavyansh | Sign up fresh with your Google account |
| Avi | Already logged in as admin (owner@usc.com) |

After Bhavyansh signs up, Avi will make him admin from the Admin Panel.

---

## Quick Links

| Page | URL |
|------|-----|
| Homepage | https://usc-platform-beta.vercel.app |
| Events | https://usc-platform-beta.vercel.app/events |
| Leaderboard | https://usc-platform-beta.vercel.app/leaderboard |
| Photos | https://usc-platform-beta.vercel.app/photos |
| Dashboard | https://usc-platform-beta.vercel.app/dashboard |
| Admin | https://usc-platform-beta.vercel.app/admin |

---

*Built by Avi & Bhavyansh · Powered by AI*
