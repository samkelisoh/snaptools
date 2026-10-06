# Google Play Store Listing — SnapTools

Copy-paste ready. Character limits checked with `tools/check-listing.js`.

---

## App name
*(limit 30 characters)*

```
SnapTools: Offline Toolkit
```

Alternatives if that one is taken:

```
SnapTools — Offline Tools
SnapTools: Scan, QR, Cutout
```

---

## Short description
*(limit 80 characters — this is what shows in search results, so it matters most)*

```
BG remover, PDF scanner, QR codes, converter. Works fully offline.
```

---

## Full description
*(limit 4000 characters)*

```
SnapTools is a small, fast toolkit for the things you actually need on a phone — and every single tool works without an internet connection.

No account. No sign-up. Nothing you open is uploaded anywhere.


✂️ BACKGROUND REMOVER
Cut a subject out of a photo and save it as a transparent PNG, ready to drop into a poster, a product listing or a document. Adjust the tolerance to match your background, and get softly feathered edges instead of a jagged cut-out.

Works best on a plain, evenly lit background.


📄 DOCUMENT SCANNER
Photograph a page, or several, and combine them into one clean A4 PDF. The clean-up filter stretches contrast so a dim phone photo comes out as crisp black text on white paper instead of a grey, shadowy mess.

• Add as many pages as you need
• Remove any page before saving
• Pages are scaled to fit A4 without stretching or distortion
• Name your file before you save it


🔳 QR TOOLS
Create a real, scannable QR code from any link, phone number or block of text. Choose the error-correction level — higher levels keep the code readable even if it gets scuffed, printed small or partly covered.

You can also read a QR code from any photo in your gallery.


✨ PHOTO ENHANCE
Rescue dull, dark or soft photos:
• Auto levels — fixes flat lighting and colour casts in one tap
• Brightness, contrast and colour sliders
• Sharpen — brings back detail in slightly soft shots
• Saves at full resolution, not a shrunken preview


🔄 UNIT CONVERTER
Seven categories, converting in both directions: length, mass, volume, area, speed, temperature and data. Swap the units with one tap.

There is also an offline currency mode for SZL, ZAR and USD. Because SnapTools works without a connection, it cannot fetch live exchange rates — you set the rate yourself, so you always know exactly what figure is being used.


💰 CASHBOOK
A plain, honest record of money in and money out. Add a description and an amount, pick SZL, ZAR or USD, and see your running balance. Export the whole thing to CSV whenever you want a backup or need it in a spreadsheet.

No bank connection, no permissions, no cloud.


🔒 YOUR FILES STAY ON YOUR PHONE
This is the part most apps are vague about, so here it is plainly:

Every tool runs on your device. Your photos, scans, PDFs, QR content and CashBook entries are never sent to us or to anyone else. SnapTools has no servers. The only component that uses the internet is the advert that keeps the app free.

Because nothing is uploaded, nothing is backed up either. Use the CSV export in CashBook if you want to keep a copy of your records.


📴 GENUINELY OFFLINE
Not "offline mode". Not "works offline for some features". Every tool in this list works on a plane, in a dead zone, or with mobile data switched off.


SnapTools is free and supported by adverts.
```

---

## Graphics checklist

| Asset | Requirement | Status |
|---|---|---|
| App icon | 512 × 512 PNG, 32-bit, no transparency | `store-assets/icon-512.png` |
| Feature graphic | 1024 × 500 PNG or JPG, no transparency | `store-assets/feature-graphic.png` |
| Phone screenshots | 2–8 required. 16:9 or 9:16, min 320px, max 3840px | **You must capture these** |
| Tablet screenshots | Optional | — |

### Taking screenshots

Play requires at least two. Take them on your phone with the app running —
Play rejects obvious mock-ups and fake device frames with marketing copy
pasted over them.

Suggested set, in this order (first screenshot matters most):

1. **Background remover** showing a finished transparent cut-out
2. **Document scanner** with two or three pages queued
3. **QR tools** with a generated code on screen
4. **Photo enhance** with sliders visible
5. **CashBook** with a few realistic entries

Press Power + Volume Down to capture. Use real content, not lorem ipsum.

> Make sure no screenshot shows a live advert banner — Play discourages
> screenshots dominated by ads. Take them in a build with test ads on, or crop
> the banner out.

---

## Data safety form answers

These are grounded in Google's published AdMob disclosure (the Google Mobile
Ads SDK collects and *shares* this data automatically). Your app code itself
makes no network calls at all.

**Does your app collect or share any of the required user data types?** → **Yes**

| Data type | Collected | Shared | Purposes | Required? | Ephemeral? |
|---|---|---|---|---|---|
| **Location → Approximate location** | Yes | Yes | Advertising or marketing; Analytics; Fraud prevention, security and compliance | Users can choose (ad ID can be deleted) | No |
| **App activity → App interactions** | Yes | Yes | Advertising or marketing; Analytics; Fraud prevention, security and compliance | Users can choose | No |
| **App info and performance → Diagnostics** | Yes | Yes | Advertising or marketing; Analytics; Fraud prevention, security and compliance | Users can choose | No |
| **Device or other IDs** | Yes | Yes | Advertising or marketing; Analytics; Fraud prevention, security and compliance | Users can choose | No |

**Do NOT declare** Photos, Files and docs, or Financial info. Those never leave
the device, so under Google's definition they are not "collected".

Security section:
- **Is all data encrypted in transit?** → **Yes** (AdMob uses TLS)
- **Can users request data deletion?** → **Yes** — provide your contact email;
  the policy explains the advertising-ID reset route.

**Advertising ID declaration** (separate question under App content):
→ **Yes, my app uses advertising ID**, for *Advertising or marketing*,
*Analytics*, and *Fraud prevention, security and compliance*.

> ⚠️ The single most common rejection is a mismatch between this form, your
> privacy policy, and what the binary actually does. The policy in
> `docs/privacy-policy.html` lists exactly these four categories on purpose —
> keep them in sync if you ever change either one.

---

## Content rating questionnaire

Answer **No** to essentially everything. For a utility app with ads:

| Question area | Answer |
|---|---|
| Violence, blood, sexual content, nudity | No |
| Profanity, crude humour | No |
| Controlled substances (drugs, alcohol, tobacco) | No |
| Gambling, simulated gambling | No |
| User-generated content or user-to-user communication | No |
| Shares user location with other users | No |
| Allows purchase of digital goods | No |
| **Does your app contain ads?** | **Yes** |

Expected outcome: **Everyone / PEGI 3**.

---

## Other App content declarations

| Item | Answer |
|---|---|
| Privacy policy URL | `https://samkelisoh.github.io/snaptools/privacy-policy.html` |
| Ads | **Yes, my app contains ads** |
| App access | All functionality available without special access — no login required |
| Target audience | 13+ (do **not** select under-13; it triggers Families policy and restricts AdMob) |
| News app | No |
| COVID-19 contact tracing | No |
| Data safety | See table above |
| Government app | No |
| Financial features | **No** — CashBook is a personal notepad for amounts. It does not connect to banks, move money, lend, or give financial advice. |

> The CashBook question is worth getting right. If you ever describe it as
> budgeting *advice* or connect it to a bank, it falls under Play's financial
> services policy, which requires extra documentation.

---

## Store settings

- **App category:** Tools
- **Tags:** choose up to 5 — *Productivity tools*, *File management*, *Utilities*
- **Contact email:** required and shown publicly on your store page
- **Website:** `https://samkelisoh.github.io/snaptools/` (optional but adds credibility)
- **Countries:** start with Eswatini + South Africa, expand later. A smaller
  launch means fewer reviews from people the app wasn't tuned for.

---

## Before you hit submit

- [ ] Replace `[YOUR DEVELOPER NAME]` and `[YOUR CONTACT EMAIL]` in `docs/privacy-policy.html`
- [ ] Enable GitHub Pages so the policy URL actually resolves (see below)
- [ ] Confirm the privacy policy URL loads in a browser — Play checks it
- [ ] Capture at least 2 real screenshots
- [ ] Upload a 512×512 icon and 1024×500 feature graphic
- [ ] Set `SNAPTOOLS_USE_TEST_ADS = false` **only** in the production build
- [ ] Back up your release keystore somewhere offline

### Enabling GitHub Pages

1. Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: **`/docs`**
4. Save, wait ~1 minute

Your policy then lives at:
`https://samkelisoh.github.io/snaptools/privacy-policy.html`

This is free, and Play accepts GitHub Pages URLs.
