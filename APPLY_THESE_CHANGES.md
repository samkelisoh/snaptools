# How to apply these changes

I can't push to your repo (no GitHub auth on my side), so here are the
options, easiest first.

## Option A — pull the patch (recommended)

The whole changeset is one commit:
`/home/user/0001-Fix-AdMob-integration-upgrade-Capacitor-5-8-add-sign.patch`

On your machine:

```bash
git clone https://github.com/samkelisoh/snaptools.git
cd snaptools
git checkout -b fix/admob-and-capacitor-8
git am < 0001-Fix-AdMob-integration-upgrade-Capacitor-5-8-add-sign.patch
git push -u origin fix/admob-and-capacitor-8
```

Then open a PR on GitHub.

> If pushing `.github/workflows/` fails with a permissions error, your token
> lacks the `workflow` scope. Either re-auth with that scope, or paste the
> workflow file through the github.com web editor, which is exempt.

## Option B — edit the files by hand

Six files changed. In rough order of importance:

| File | What changed |
|---|---|
| `package.json` | Capacitor 5 → 8, admob plugin → 8 |
| `package-lock.json` | regenerated |
| `www/index.html` | ad code rewritten, UI text cleaned, viewport + insets |
| `www/admob-config.js` | test/live ad ID toggle |
| `www/vendor/jspdf.umd.min.js` | new — vendored from CDN |
| `.github/workflows/build-apk.yml` | Node 22, versionCode, API check, signed AAB |

---

# What to do next, in order

## 1. Push and let CI build

The workflow still produces a debug APK and now **skips** the release AAB
until signing secrets exist — so it will go green with no extra setup.

Watch for the new `Verify target API level` step. It should print 36.

## 2. Install on your phone and check the logs

This is the real test of the ad fix. Connect the phone by USB and run:

```bash
adb logcat | grep -i snaptools
```

You want to see:

```
[SnapTools] AdMob config loaded — TEST ads (safe)
[SnapTools] AdMob initialized.
[SnapTools] Banner requested.
```

A test banner should appear at the bottom. **It will say "Test Ad" across it
— that is correct and expected.**

If you instead see `AdMob plugin not present on the bridge`, the native
plugin didn't sync — check that `npx cap sync android` ran cleanly in CI.

## 3. Check the edge-to-edge layout

This is the most likely thing to look wrong after the API 36 upgrade:

- Is the purple header hidden behind the status bar?
- Does the banner ad cover any buttons?
- Can you reach everything above the gesture bar?

The `safe-area-inset` CSS should handle it, but it needs real-device eyes.

## 4. Then — and only then — set up signing

```bash
keytool -genkey -v -keystore snaptools-release.keystore \
  -alias snaptools -keyalg RSA -keysize 2048 -validity 10000

base64 -w0 snaptools-release.keystore > keystore.b64
```

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | contents of `keystore.b64` |
| `KEYSTORE_PASSWORD` | store password |
| `KEY_ALIAS` | `snaptools` |
| `KEY_PASSWORD` | key password |

The next build produces `SnapTools-release-AAB`.

> **Back up `snaptools-release.keystore` somewhere safe and offline.**
> If you lose it you can never update this app again under the same
> package name. Not "it's hard" — it is not possible.
> Do not commit it to the repo.

---

# Before you spend the $25

Two things I'd fix first, because they're the likeliest rejection causes.

## The content problem

I removed the fake ad boxes and the earnings text, but that exposes the
underlying issue: several tools are thin. `removeBG()` is a canvas
white-pixel trick with a comment saying `real app uses ML Kit`.

Play's **"minimum functionality"** / repetitive-content rules are the most
common rejection for utility apps like this. Before submitting, make sure
each tool does something a user would genuinely choose this app for.

Honestly, **three tools that work well beat eight that half-work.**

## The ad placement problem

Interstitials are now rate-limited to one per 3 minutes, which keeps you
inside Google's ad-density rules. Don't lower that. An interstitial on
every button press is a suspension risk, and it's also the fastest way to
get uninstalled.

---

# Going live with real ads

Only when you're ready to ship to production:

1. Set `window.SNAPTOOLS_USE_TEST_ADS = false` in `www/admob-config.js`
2. Build, upload that AAB to Play
3. **Never sideload that build onto your own phone**

One tap on your own live ad can permanently ban your AdMob account.
Keep test ads on for every build that touches your own device.
