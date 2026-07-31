# Saudagar Motor Driving School — Website

The website for Saudagar Motor Driving School (Dapodi, Pune) — a
single-page, no-build static site with a local admin dashboard for
managing its content.

## Stack

Plain HTML, CSS, and vanilla JavaScript — no framework, no build step,
no npm dependencies. Content lives in JSON files and is fetched at
runtime, so the page itself never needs editing for day-to-day updates.

The admin dashboard (for editing content) runs on a small local Python
server that uses only the standard library — no `pip install` needed.

## Structure

```
index.html        The public site (fetches data/*.json, renders every section)
style.css          All public site styles
favicon.svg
data/*.json        Editable content: hero, about, gallery, testimonials,
                   faq, fees, contact
images/gallery/    Gallery photos
admin/             Admin login + dashboard (see README_ADMIN.md)
server/            Local Python backend for the admin dashboard
```

## Running it locally

Just the public site (no editing):

```
python -m http.server 8000
```

then open `http://127.0.0.1:8000/index.html`. Opening `index.html`
directly from disk (`file://...`) will not work — browsers block
`fetch()` of local files that way.

To edit content through the admin dashboard, see
**[README_ADMIN.md](README_ADMIN.md)** for full setup instructions.

## Deploying

This is a static site: upload `index.html`, `style.css`, `favicon.svg`,
`data/`, and `images/` to any static host exactly as they are. The
`server/` and `admin/` folders are only needed on your own machine when
editing content — they don't need to be deployed for the public site
to work, though there's no harm in uploading them too (the admin
server itself just won't run without you starting it locally).

## Features

- Responsive navigation, image gallery with lightbox, testimonials
  (auto-hidden until you add one), FAQ accordion, course fees / rate
  chart, contact section with a WhatsApp button, a mailto: enquiry
  form, and an embedded map.
- `LocalBusiness`/`DrivingSchool` structured data (JSON-LD) generated
  from the same content, for local SEO.
- Scroll reveal animations, mobile-first responsive layout.
- Full admin CMS — see [README_ADMIN.md](README_ADMIN.md).
