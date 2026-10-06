# SnapTools - How to Build APK in GitHub

## If Actions tab shows "Get started with GitHub Actions" and no build:

### Fix 1: Make sure workflow file is in correct place
Your repo must have this structure:
```
snaptools/
├── .github/
│   └── workflows/
│       └── build-apk.yml  <-- MUST be here
├── www/
├── android/
├── package.json
└── capacitor.config.json
```

If you uploaded zip, GitHub may have created extra folder. Make sure `.github` is at ROOT of repo, not inside subfolder.

### Fix 2: Enable Actions
1. Go to repo Settings > Actions > General
2. Under "Actions permissions" select "Allow all actions"
3. Save

### Fix 3: Trigger build manually
1. Go to Actions tab
2. You should see "Build SnapTools APK with Real Ads" on left
3. Click it > Click "Run workflow" button (right side) > Run workflow
4. Wait 2-3 mins, refresh, you will see build running

### Fix 4: Push to main branch
- Make sure your branch is named `main` or `master` (workflow triggers on those)
- If your branch is named differently, rename to main or edit build-apk.yml to add your branch name

### Fix 5: Check workflow file exists
- Go to your repo > Click ".github" folder > "workflows" > You should see "build-apk.yml"
- If not, upload it manually: Add file > Upload files > Upload build-apk.yml

## After Build Succeeds
1. Click the build run
2. Scroll down to "Artifacts"
3. Download "SnapTools-REAL-ADS-APK"
4. Unzip, you get app-debug.apk - This has your REAL AdMob IDs and will show real ads that pay you!
