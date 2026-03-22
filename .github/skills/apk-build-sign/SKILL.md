---
name: apk-build-sign
description: "Build, sign, and install Android APK for both Capacitor and TWA (Bubblewrap) projects. Use when: build APK, sign APK, install APK, deploy to device, release APK, debug APK, zipalign, apksigner, gradlew assembleRelease, assembleDebug, Android build pipeline"
---

# APK Build & Sign

Build, sign, and deploy Android APKs for both the Capacitor project (`android/`) and the TWA project (`android-twa/`).

## When to Use

- Building a debug or release APK
- Signing an APK for distribution
- Installing an APK on a device or emulator
- Running the full build → sign → install pipeline

## Prerequisites: Environment Variables

Always set these before running any Android tool:

```powershell
# Capacitor project (JDK 21)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot"
$env:ANDROID_SDK_ROOT = "C:\Users\vladi\.bubblewrap\android_sdk"
$env:ANDROID_HOME = "C:\Users\vladi\.bubblewrap\android_sdk"

# TWA project (JDK 17)
$env:JAVA_HOME = "C:\Users\vladi\.bubblewrap\jdk\jdk-17.0.11+9"
$env:ANDROID_SDK_ROOT = "C:\Users\vladi\.bubblewrap\android_sdk"
$env:ANDROID_HOME = "C:\Users\vladi\.bubblewrap\android_sdk"
```

> **Critical**: Capacitor 8 requires JDK 21. TWA/Bubblewrap uses JDK 17. Set the correct `JAVA_HOME` for each project.

## Procedure

### Choose Your Project

| Project | Directory | JDK | Package Name |
|---------|-----------|-----|--------------|
| Capacitor | `android/` | 21 | `com.vladimirgronat.todolist` |
| TWA (Bubblewrap) | `android-twa/` | 17 | `app.vercel.todolist_demo_ecru.twa` |

### Step 1 — Sync (Capacitor only)

```powershell
cd C:\Users\vladi\projects\todolist-demo
npx cap sync android
```

Skip this for TWA — TWA wraps a URL, no sync needed.

### Step 2 — Build

#### Debug APK (no signing needed)

```powershell
cd <project-directory>
.\gradlew.bat assembleDebug
```

Output locations:
- Capacitor: `android/app/build/outputs/apk/debug/app-debug.apk`
- TWA: `android-twa/app/build/outputs/apk/release/app-release-unsigned.apk` (TWA uses `assembleRelease`)

#### Release APK

```powershell
cd <project-directory>
.\gradlew.bat assembleRelease
```

Output:
- Capacitor: `android/app/build/outputs/apk/release/app-release-unsigned.apk`
- TWA: `android-twa/app/build/outputs/apk/release/app-release-unsigned.apk`

### Step 3 — Zipalign

```powershell
& "$env:ANDROID_SDK_ROOT\build-tools\35.0.0\zipalign.exe" -v -p 4 `
  app/build/outputs/apk/release/app-release-unsigned.apk `
  app-release-aligned.apk
```

### Step 4 — Sign

**Ask the user for the keystore password. NEVER hardcode it.**

```powershell
# Capacitor
& "$env:ANDROID_SDK_ROOT\build-tools\35.0.0\apksigner.bat" sign `
  --ks android.keystore `
  --ks-key-alias my-key-alias `
  --out app-release-signed.apk `
  app-release-aligned.apk

# TWA
& "$env:ANDROID_SDK_ROOT\build-tools\35.0.0\apksigner.bat" sign `
  --ks android.keystore `
  --ks-key-alias todolist-pwa-android `
  --out app-release-signed.apk `
  app-release-aligned.apk
```

### Step 5 — Verify Signature

```powershell
& "$env:ANDROID_SDK_ROOT\build-tools\35.0.0\apksigner.bat" verify -v app-release-signed.apk
```

### Step 6 — Install on Device

```powershell
# Check connected devices first
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" devices

# Install
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" install -r app-release-signed.apk
```

### Step 7 — Launch

```powershell
# Capacitor
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" shell am start -n com.vladimirgronat.todolist/.MainActivity

# TWA
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" shell am start -n "app.vercel.todolist_demo_ecru.twa/.LauncherActivity"
```

## Quick Pipeline (Copy-Paste)

### Capacitor Debug → Device

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot"
$env:ANDROID_SDK_ROOT = "C:\Users\vladi\.bubblewrap\android_sdk"
$env:ANDROID_HOME = "C:\Users\vladi\.bubblewrap\android_sdk"
cd C:\Users\vladi\projects\todolist-demo
npx cap sync android
cd android
.\gradlew.bat assembleDebug
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" install -r app\build\outputs\apk\debug\app-debug.apk
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" shell am start -n com.vladimirgronat.todolist/.MainActivity
```

### TWA Release → Sign → Device

```powershell
$env:JAVA_HOME = "C:\Users\vladi\.bubblewrap\jdk\jdk-17.0.11+9"
$env:ANDROID_SDK_ROOT = "C:\Users\vladi\.bubblewrap\android_sdk"
$env:ANDROID_HOME = "C:\Users\vladi\.bubblewrap\android_sdk"
cd C:\Users\vladi\projects\todolist-demo\android-twa
.\gradlew.bat assembleRelease
& "$env:ANDROID_SDK_ROOT\build-tools\35.0.0\zipalign.exe" -v -p 4 app\build\outputs\apk\release\app-release-unsigned.apk app-release-aligned.apk
& "$env:ANDROID_SDK_ROOT\build-tools\35.0.0\apksigner.bat" sign --ks android.keystore --ks-key-alias todolist-pwa-android --out app-release-signed.apk app-release-aligned.apk
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" install -r app-release-signed.apk
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `invalid source release: 21` | Wrong JDK for Capacitor | Set `JAVA_HOME` to JDK 21 |
| `Could not determine java version` | JAVA_HOME not set | Set `$env:JAVA_HOME` |
| `error: device not found` | No device connected | Connect USB device or start emulator |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Signed with different key | Uninstall existing app first: `adb uninstall <package>` |
| `zipalign: not found` | Build tools path wrong | Verify `build-tools\35.0.0` exists |

## Constraints

- NEVER hardcode keystore passwords
- NEVER commit APK or keystore files to git
- ALWAYS verify signature after signing
- ALWAYS check `adb devices` before install
- Use JDK 21 for Capacitor, JDK 17 for TWA
