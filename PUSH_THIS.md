# Upload guide — `snaptools-complete.zip`

You were right, this is easier. One zip, the whole project, nothing to
reconcile against what's already there.

**File:** `snaptools-complete.zip` (2.1 MB, 22 files)

I verified the zip extracts cleanly and that the tests still pass from the
extracted copy, so what you upload is what I tested.

---

## Steps

1. **Download `snaptools-complete.zip`** from this workspace
2. **Unzip it.** You get a folder called `snaptools`
3. Go to <https://github.com/samkelisoh/snaptools>
4. **Add file → Upload files**
5. **Open the `snaptools` folder**, select **everything inside** it
   (`Ctrl+A` on Windows, `Cmd+A` on Mac), and drag that into the browser

   > ⚠️ Drag the **contents**, not the `snaptools` folder itself. Dragging
   > the folder creates `snaptools/snaptools/www/…` inside your repo and
   > nothing will build.

6. Commit message:
   `Launch prep: Capacitor 8, real tools, privacy policy, store assets`
7. Select **Commit directly to the main branch** → **Commit changes**

Files with the same path are overwritten. New ones are added. Done in one go.

---

## ⚠️ Two gotchas

### 1. Hidden files (Mac and Linux)

The zip contains `.github/` and `.gitignore`. Both start with a dot, so
**Finder hides them by default** — if you `Cmd+A` without showing them,
your workflow never uploads and no build runs.

- **macOS:** press `Cmd + Shift + .` in Finder to reveal hidden files
- **Windows:** View → Show → Hidden items
- **Linux:** `Ctrl + H` in most file managers

`.github/workflows/build-apk.yml` is the important one. If it gives you
trouble, upload everything else and paste that one file through the
github.com web editor instead — you already did that successfully for the
`upload-artifact` fix.

### 2. Uploading cannot delete

This is the one real limit of the browser route. Three files are in your
repo but not in the zip, and uploading won't remove them:

| File | Why it should go |
|---|---|
| `www/index.html.bak` | Pre-cleanup file, still holds live ad-unit IDs and "You earn $" text |
| `www/BUILD_NOW.md` | Internal build notes |
| `android/local.properties` | SDK path from another machine |

**The good news:** I made this harmless. The build now has a
**Strip non-app files from webDir** step that deletes `*.md` and `*.bak`
from `www/` before packaging, so none of it can reach your APK even if you
leave them in the repo.

So deleting them is now housekeeping, not urgent. When you feel like it:
open each on github.com → 🗑️ → commit.

---

## After uploading

### 1. Check the build

**Actions** tab → newest run. 19 steps. Three guards will fail loudly rather
than ship something broken:

- **Run algorithm tests** → 29 assertions
- **Verify target API level** → expect `Detected targetSdkVersion: 36`
- **Set version code** → fails if the `versionCode 1` patch misses

### 2. Check Pages

Wait ~1 minute, then open:

```
https://samkelisoh.github.io/snaptools/privacy-policy.html
```

Still 404? **Settings → Pages** must be:
- Source: **Deploy from a branch**
- Branch: **`main`**, folder: **`/docs`** — *not* `/ (root)`, *not* "GitHub Actions"

Play's reviewer opens this URL. A 404 is a rejection.

### 3. Install the APK

Download the `SnapTools-debug-APK` artifact, sideload it, then:

```bash
adb logcat | grep -i snaptools
```

Want to see:

```
[SnapTools] AdMob config loaded — TEST ads (safe)
[SnapTools] AdMob initialized.
[SnapTools] Banner requested.
```

A banner reading **"Test Ad"** is correct. Also check your purple icon
replaced the Capacitor default, and that the layout isn't hidden behind the
status bar (API 36 forces edge-to-edge).

### 4. Fill in the policy placeholders

`docs/privacy-policy.html` still has:

- `[YOUR DEVELOPER NAME]`
- `[YOUR CONTACT EMAIL]`

Play requires a working contact. Edit it straight on github.com —
`node tools/check-listing.js` warns until both are gone.

### 5. Start recruiting 12 testers

Do this **now**, in parallel with everything else. It's the longest pole:
the 14-day clock only starts once 12 people are opted in, and it resets if
they drop out. Recruiting is what turns this into weeks — not the code.

---

## What's in the zip

```
.github/workflows/build-apk.yml   19-step CI: tests, icons, API check, signed AAB
.gitignore                        android/, node_modules, keystores, *.bak
capacitor.config.json
package.json                      Capacitor 8
package-lock.json

www/index.html                    cleaned UI, safe-area insets, fixed ad code
www/app.js                        all six tools, real implementations
www/admob-config.js               test/live ad toggle (test by default)
www/vendor/qrcode.js              real QR encoder
www/vendor/jspdf.umd.min.js       vendored, works offline

docs/privacy-policy.html          GitHub Pages
docs/index.html

store-assets/icon-512.png         512×512 full-bleed
store-assets/feature-graphic.png  1024×500

tools/test-algorithms.js          29 assertions
tools/check-listing.js            Play character limits + policy consistency
tools/make-launcher-icons.py      all mipmap densities + adaptive layers

STORE_LISTING.md                  listing copy, data safety, content rating
LAUNCH_PLAN.md                    full roadmap
APPLY_THESE_CHANGES.md
PUSH_THIS.md                      this file
```

`android/` is deliberately absent — CI regenerates it from scratch every
build, which is why `versionCode`, the manifest and the launcher icons are
all patched in by the workflow.
