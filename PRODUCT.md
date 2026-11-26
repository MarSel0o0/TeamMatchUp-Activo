# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Players of League of Legends, Rainbow Six Siege and Counter-Strike 2 who do not have a regular
group. They arrive after a bad streak playing with strangers assigned by automatic matchmaking:
no communication, with large skill gaps within the team. Many do know people to play with, but
never manage to line up their schedules.

The secondary audience is the academic evaluation of Milestone 1: the five views in the
assignment must be evident and demonstrable to the reviewer.

## Product Purpose

Combine three conditions that no existing tool solves together: two people play the same title,
they have a similar competitive level and they are available in the same time blocks. Success is
not the user receiving a list of profiles: it is ending up with a scheduled and played session.

## Positioning

Coordination today happens on Discord servers, forums and messaging groups, where messages get
lost, nobody verifies each player's real level and there is no mechanism that cross-references
schedule availability. TeamMatchUp obtains the rank from each game's own source —it is not
declared by the user— and crosses it with an explicit weekly time grid. A competitor cannot copy
that without building both halves.

## Operating Context

The user declares their available blocks once and adjusts them rarely. They return to the
application when they want to play: they check who fits them and try to lock in a concrete time.
Real use happens at night and on weekends, in front of the same monitor they play on, often with
the game open next to it.

Rank changes over time, so the platform re-fetches it periodically from public APIs or by
scraping statistics sites, and keeps the history of changes in addition to the current value.

## Capabilities and Constraints

Confirmed and built:

- Sign up and log in with own credentials; the rest of the application requires a signed-in
  session and each user modifies only their own information.
- Account linking per game (Riot ID, Ubisoft ID, SteamID64). Registering all three is not
  required: each user declares only the ones they play.
- Weekly availability grid in one-hour blocks.
- Profile with current rank, history of changes and recent matches; switching between games
  happens without reloading the page.
- Matches per game with dynamic filters.
- Weekly schedule: publish sessions in concrete blocks and join other people's.
- Verification of the CS2 account by logging in to Steam, when the instance has the Steam key:
  real name, avatar, country and CS2 hours, attributed to Steam. The Premier rank is read from
  Leetify with the SteamID64 (optional key) and attributed with the "Data Provided by Leetify"
  logo and the "View on Leetify" link to its profile. Only the current rating is stored: Leetify
  provides no history and none is constructed (no fake history). Following Leetify's guidelines,
  with a Leetify rank the position on the game's scale and the rank distance to another player are
  not shown (the exact rating is). Verified CS2 accounts without a Premier rank, or with the rank
  unavailable, are left out of CS2 matches. CS2 matches remain simulated and labeled as such, like
  everything in unverified accounts.
- Verification of the League of Legends account by temporarily changing the summoner icon in the
  LoL client, when the instance has the Riot Games development key (`RIOT_API_KEY`): ranked
  Solo/Duo rank, history built from its own readings, up to 20 latest Solo/Duo matches (no
  remakes) and real profile (summoner level and icon), attributed to Riot Games. Unranked
  accounts, or ones with a pending rank, are left out of LoL matches until they have a rank.

Technical constraints:

- React 18 + TypeScript + Vite, with an Express backend. Data access goes through a single
  contract (`services/apiContract.ts`) with two interchangeable implementations: the real HTTP
  client and a simulated one that runs in the browser.
- Interface in Spanish.
- Different rank scales per game, normalized to 0-100 so they can be compared.

Explicitly undecided (the assignment marks them as preliminary): the exact criterion of rank
similarity across games and the definitive data source for each title.

## Brand Commitments

- Name: TeamMatchUp.
- The three games and their identities are product material, not decoration.
- The user asked for an interactive and eye-catching interface that holds attention. Recorded as a
  constraint, without expanding on it here.

## Evidence on Hand

There is no real data yet: no registered users, no real matches, and no live integration with
Ubisoft. CS2 verification with Steam and League of Legends verification with Riot Games are
built, but they only produce real data (name, avatar, country and CS2 hours from Steam; CS2
Premier rating from Leetify; LoL Solo/Duo rank, matches, level and summoner icon from Riot Games)
when an instance has its key configured (`STEAM_API_KEY` / `RIOT_API_KEY`; Leetify's is optional)
and someone verifies their account; there has been no walkthrough with a real Steam, Leetify or
Riot account yet. Everything else is demo data generated with a fixed seed and labeled as such in
the interface.

None of the following may be invented: number of users, matched games, testimonials, success
rates or endorsement by the games' studios.

## Product Principles

1. The cross-reference is the product. Rank without schedule, or schedule without rank, is a
   useless half; every view must show both dimensions together.
2. Rank is fetched, not declared. Verification is what separates this from a Discord message.
3. The list of compatible players is not the end. The flow ends in a scheduled session.
4. The user arrives tired and with the game open next to it. The interface competes with going
   back to playing solo, not with another application.
5. Nothing made up: demo data is shown for what it is.

## Accessibility & Inclusion

Prolonged night-time use in front of the gaming monitor. No regulatory requirement set by the
user; the contrast floor and keyboard operability of the project's quality standard apply.
