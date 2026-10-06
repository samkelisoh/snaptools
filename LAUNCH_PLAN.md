# SnapTools — Path to Play Store & Revenue

Audit date: 2026-10-06 · Based on repo state at `samkelisoh/snaptools@main`

---

## TL;DR

| Question | Answer |
|---|---|
| Install the APK on my phone right now? | **Yes** — do it. That's exactly what a debug APK is for. |
| Will I see ads on it? | **No.** Two bugs stop the ad code from ever running. |
| Can I upload this artifact to Play? | **No.** Three hard blockers (debug signing, APK not AAB, targetSdk 33). |
| How far from publishable? | Roughly a Capacitor 5 → 8 upgrade + signing setup. |
| How far from money? | Realistically months, and the first payout is $100 minimum. |

---

## 1. Put it on your phone — yes, right now

The debug APK is genuinely useful. Download the artifact, unzip it,
transfer `app-debug.apk` to your phone, enable "Install unknown apps"
for your file manager, and tap it.

What you're checking: does the UI load, do the tools work, does it
crash on a real device. That's it.

**Do not expect ads.** See below.

---

## 2. Your ads are broken (two separate bugs)

In `www/index.html`:

```js
import { AdMob, ... } from 'https://cdn.jsdelivr.net/npm/@capacitor-community/admob@5.5.1/dist/esm/index.js';
```

### Bug A — that version does not exist

Published 5.x versions are: `5.0.0, 5.1.0, 5.1.1, 5.2.0, 5.3.0, 5.3.1`.
There is no `5.5.1`. The CDN returns:

```
Couldn't find the requested release version 5.5.1.
```

### Bug B — even the correct version can't load this way

`@capacitor-community/admob@5.3.1/dist/esm/index.js` begins:

```js
import { registerPlugin } from '@capacitor/core';
```

`@capacitor/core` is a **bare module specifier**. A browser or WebView
cannot resolve it without a bundler or an import map. So the import
fails regardless of version.

### Why you saw no error

The failing `import` is at the **top level** of a `<script type="module">`.
When it fails, the entire module is discarded. `initAdMob()` never runs,
and `window.showInterstitialReal` / `window.showRewardedReal` are never
defined. Your `try/catch` blocks are *inside* functions that never execute,
so they catch nothing. Silent failure.

### The fix — no bundler needed

Capacitor already injects native plugins onto `window.Capacitor.Plugins`.
Drop the import entirely:

```js
<script>
async function initAdMob() {
  if (!window.Capacitor?.isNativePlatform?.()) return;
  const { AdMob } = window.Capacitor.Plugins;
  try {
    await AdMob.initialize({ initializeForTesting: false });
    await AdMob.showBanner({
      adId: window.SNAPTOOLS_ADMOB.BANNER_ID,
      adSize: 'BANNER',
      position: 'BOTTOM_CENTER',
      margin: 0
    });
  } catch (e) {
    console.error('AdMob failed:', e);   // log it, don't swallow it
  }
}
document.addEventListener('DOMContentLoaded', initAdMob);
</script>
```

The size/position enums are plain string enums, so the literals above are
correct. Note this is a **classic script**, not `type="module"`.

> `jspdf` is also loaded from a CDN. That needs a live internet
> connection on the user's phone and will fail offline. Vendor it
> into `www/` before release.

---

## 3. Three blockers between you and the Play Store

### Blocker 1 — it's a debug build

`./gradlew assembleDebug` signs with the auto-generated Android debug
keystore. Play rejects debug-signed uploads outright. You need
`bundleRelease` signed with **your own** keystore.

**The keystore is unrecoverable.** Lose it and you can never update the
app under the same package name again. Back it up in two places.

### Blocker 2 — Play wants an AAB, not an APK

New apps have required Android App Bundle (`.aab`) since August 2021.
`assembleDebug` → `bundleRelease`.

### Blocker 3 — target API level (the big one)

Since **31 August 2026**, new apps and updates must target
**Android 16 / API 36**. Extensions ran out 1 November 2026.

Your stack produces API 33. Verified directly from each package's
`build.gradle`:

| `@capacitor/android` | compileSdk | targetSdk |
|---|---|---|
| **5.7.8 ← you are here** | 33 | **33** |
| 6.2.1 | 34 | 34 |
| 7.4.3 | 35 | 35 |
| **8.x ← you need this** | 36 | **36** |

**You cannot publish on Capacitor 5. Not "should not" — cannot.**
Current latest is `@capacitor/android@8.5.2`.

---

## 4. The upgrade

Capacitor 5 → 8 is three majors. Do it in one go; the intermediate
versions can't be published anyway.

```bash
npm install @capacitor/core@8 @capacitor/android@8 @capacitor/cli@8 --save
npm install @capacitor-community/admob@8 --save
npx cap sync android
```

Known friction points:

- **minSdk rises 22 → 24.** Drops Android 5.x users. Negligible in 2026.
- **Edge-to-edge is mandatory on API 36.** Content draws behind the
  status and navigation bars. Your banner ad pinned to `BOTTOM_CENTER`
  is the most likely casualty — budget time to handle insets.
- **Java 17 is fine**, your workflow already uses it.
- **`runs-on: ubuntu-22.04`** should become `ubuntu-latest`.

---

## 5. Signing in CI

Generate a keystore locally:

```bash
keytool -genkey -v -keystore snaptools-release.keystore \
  -alias snaptools -keyalg RSA -keysize 2048 -validity 10000
```

Base64 it for GitHub:

```bash
base64 -w0 snaptools-release.keystore > keystore.b64
```

Add four repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | contents of `keystore.b64` |
| `KEYSTORE_PASSWORD` | your store password |
| `KEY_ALIAS` | `snaptools` |
| `KEY_PASSWORD` | your key password |

Then build with `./gradlew bundleRelease` and upload
`android/app/build/outputs/bundle/release/app-release.aab`.

Never commit the keystore or passwords to the repo.

---

## 6. Play Console reality check

**Cost:** $25 one-time. Developer registration is available in Eswatini,
and you only need the free-app tier — AdMob pays through Google Payments,
not Play merchant, so merchant registration is not required for ad revenue.

**Identity verification:** government photo ID + proof of address.
2–5 business days.

**The 12/14 rule:** personal accounts created after 13 Nov 2023 must run a
closed test with **at least 12 testers opted in continuously for 14 days**
before you can even *apply* for production access. Notes:

- Internal testing does **not** count. It must be the closed track.
- If testers drop out, the clock can reset.
- Since 2026 Google also checks testers **genuinely used** the app.
- Applying is not approval — review takes a further 3–7 days.
- It applies **per app** until the account has production access.

**Realistic timeline:** ~5 days verification + 14 days testing + ~7 days
review ≈ **4 weeks minimum**, assuming nothing is rejected.

---

## 7. Policy landmines

**Never click your own ads.** Not once, not "just to test." Google detects
it and bans the AdMob account, usually permanently, with no appeal worth
the name. Use [official test ad units](https://developers.google.com/admob/android/test-ads)
during development — that's what `initializeForTesting` and `testingDevices` are for.

**"Minimum functionality" rejections are the #1 killer** of apps like this.
Play rejects apps that are thin web wrappers, or that exist mainly as an
ad delivery vehicle. An "AI Toolkit" of small utilities is squarely in the
risk zone. Make each tool genuinely useful and make sure the app has real
standalone value.

**Ad density matters.** An interstitial on every button tap is a policy
violation. Rate-limit them.

**You will need:** a privacy policy URL (mandatory — AdMob collects an
advertising ID), a data safety declaration, and a content rating
questionnaire.

---

## 8. The money, honestly

AdMob's payout threshold is **$100** (wire/ACH). Below that it rolls over
month to month. Payment lands around the 21st, a month after the earning month.

eCPM in Eswatini is roughly **$0.33 per 1,000 impressions**. Traffic from
US/UK/CA users is worth 20–50× more. So:

> At ~$0.33 eCPM, reaching the $100 threshold needs on the order of
> **300,000 ad impressions** from local users.

The comments in your code — `"You earn $"`, `"You earned $0.03-$0.08"` —
are optimistic by a wide margin for this audience. The lever that actually
matters is not ad placement; it's **how many people install and keep using
the app, and where they live.**

Set expectations accordingly, and treat v1 as a learning exercise rather
than an income stream.

---

## Suggested order of work

1. ✅ Install the debug APK, confirm the app itself works
2. Fix the AdMob JS (Section 2) — verify with **test** ad unit IDs
3. Upgrade Capacitor 5 → 8, fix edge-to-edge, rebuild, retest
4. Vendor the CDN dependencies locally
5. Generate keystore, add CI secrets, switch to signed `bundleRelease`
6. Register Play Console ($25), start identity verification
7. Write privacy policy, prepare store listing + screenshots
8. Upload to closed testing, recruit 12 testers
9. Wait 14 days → apply for production
10. Swap test ad IDs → real ad IDs **only in the production release**
