# Admin Content Management System

This adds a local admin dashboard for editing the website's content —
hero text, about section, gallery photos, testimonials, FAQ, course
fees, and contact details — without touching HTML. All content lives
in JSON files that the public website reads automatically.

No paid services, no external database, no build step. Everything
runs on your own machine with Python (already required — nothing new
to install if `python --version` works for you).

## How it works

The public website (`index.html`) is still a plain static site — it
just fetches its content from `data/*.json` at load time instead of
having it hardcoded. That means:

- **Visitors** never need the admin server running. Any static host
  (the one you already use) serves `index.html`, `style.css`, and the
  `data/*.json` files exactly as they are today.
- **You (the admin)** run a small local Python server only when you
  want to edit content. It provides a login-protected dashboard and
  writes your changes straight into the `data/*.json` files on disk.

```
                 ┌─────────────────────┐
   visitors ───► │ index.html (static) │ ───► fetch() ───► data/*.json
                 └─────────────────────┘

                 ┌─────────────────────┐
   you (local) ► │ admin/dashboard.html│ ───► server/server.py ───► writes data/*.json
                 └─────────────────────┘        (localhost only)
```

After editing content locally, re-upload the changed `data/*.json`
files (and any new images) to your live host the same way you already
deploy the site (FTP, hosting panel, git push, etc.).

## Folder structure

```
SaudagarDrivingSchoolWebsite/
├── index.html                 Public website (fetches data/*.json, unchanged look)
├── style.css                  Public website styles
├── favicon.svg
│
├── data/                       ← All editable content lives here
│   ├── hero.json               Headline, subtitle, buttons, stats bar
│   ├── about.json              "Why learn with us" heading + feature cards
│   ├── gallery.json            Gallery photo list (captions + file paths)
│   ├── testimonials.json       Student testimonials (section auto-hides if empty)
│   ├── faq.json                FAQ questions and answers
│   ├── fees.json                Course cards + rate chart table
│   └── contact.json             Address, phone numbers, hours
│
├── images/
│   └── gallery/                 Gallery photos (admin uploads land here)
│
├── admin/                       ← Admin dashboard (static frontend)
│   ├── login.html
│   ├── login.js
│   ├── dashboard.html
│   ├── dashboard.js
│   └── admin.css
│
└── server/                      ← Local backend (Python standard library only)
    ├── server.py                 Serves the site + admin API, handles auth
    ├── setup_admin.py            Run once to create your admin username/password
    └── auth.json                 Created by setup_admin.py — NOT committed to git
```

## Setup instructions

You need Python 3.8+ (check with `python --version`). No `pip install`
is required — the server only uses the standard library.

**1. Create your admin account** (first time only):

```
python server/setup_admin.py
```

You'll be prompted for a username and password. This writes
`server/auth.json` with a salted, hashed password — never the plain
password. Re-run this script any time to reset your credentials.

**2. Start the local server:**

```
python server/server.py
```

You'll see:

```
Admin login:      http://127.0.0.1:8000/admin/login.html
Public site:      http://127.0.0.1:8000/index.html
```

Open the admin login link, sign in, and use the dashboard. Press
`Ctrl+C` in the terminal to stop the server when you're done editing.

To use a different port: `python server/server.py 8080`.

## Using the dashboard

The sidebar has one tab per content type. Each tab loads its current
content, lets you edit it, and has its own **Save changes** button —
saving one section doesn't affect the others.

- **Hero Section** — eyebrow text, headline (put each line on its own
  line in the box), subtitle, both buttons, and the 4-number stats bar.
- **About Section** — the "Why learn with us" heading and its 4 feature
  cards (pick from 4 existing icons, edit title/description).
- **Gallery Images** — upload a new photo (saved to `images/gallery/`
  immediately) or edit captions / remove existing ones, then save.
- **Testimonials** — add real student testimonials here. The section
  is automatically hidden on the public site until you add at least
  one — nothing fake ever ships by default.
- **FAQ** — question/answer pairs, shown as an expandable list.
- **Course Fees** — one shared list of courses. Each course can appear
  as a pricing card, in the rate chart table, or both — check "Show as
  a pricing card" to include it among the 4 cards.
- **Contact Details** — address, phone numbers, and hours. The first
  phone number is used for every "Call Now" button across the site.

## Security notes

- The server binds to `127.0.0.1` only — it's not reachable from other
  devices on your network or the internet. Don't change this to expose
  it publicly; it has no HTTPS or rate-limiting, since it's meant for
  local editing only.
- Passwords are hashed with salted PBKDF2 (100,000 iterations) — the
  plain password is never stored.
- Sessions are kept in memory and reset whenever the server restarts.
- `server/auth.json` is in `.gitignore` — never commit it.

## Troubleshooting

- **"No admin account found yet"** when starting the server — run
  `python server/setup_admin.py` first.
- **Fields on the public site show up blank** — you're opening
  `index.html` directly from disk (`file://...`). Browsers block
  `fetch()` of local files that way. Use `python server/server.py` and
  open the `http://127.0.0.1:8000/...` link instead (or your real web
  host, which doesn't have this restriction).
- **Dashboard redirects straight back to the login page** — your
  session expired (8 hour limit) or the server restarted. Just log in
  again.
