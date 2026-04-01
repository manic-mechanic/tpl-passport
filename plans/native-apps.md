# Plan: Native iOS & Android Apps

## Framework Decision

### The options, honestly assessed

| Option | Effort | Code reuse | Verdict |
|---|---|---|---|
| **Capacitor + Nuxt** | Low (days) | ~100% | **Do this** |
| Quasar + Capacitor | Medium (weeks) | ~60% | Only for greenfield |
| NativeScript-Vue | High (weeks) | ~30%, no web output | Skip |
| Flutter | Full rewrite (Dart) | 0% UI | Skip |
| KMP + Compose | Full rewrite (Kotlin) | 0% | Skip |
| React Native / Expo | Full rewrite (React) | ~20% | Skip |

**Recommendation: Capacitor, added directly to the existing Nuxt app.**

You already heard about "one codebase for web + native" — that's Capacitor. It wraps your static SPA output in a native shell. iOS gets WKWebView (the same engine as Safari), Android gets Chromium-based WebView. Your Vue components, Pinia store, composables, routing, CSS custom properties — everything stays exactly as-is. Capacitor provides native APIs (camera, NFC, haptics, geolocation, push notifications) via a plugin system. The plugins call native Swift/Kotlin code under the hood, which is where your existing language experience becomes directly useful if you ever need a custom plugin.

NativeScript-Vue is the "Vue-related one you found that isn't super popular" — it deserves that reputation here. It discards your HTML/CSS entirely (renders native widgets, not a WebView), has a tiny community, and produces no web output. Not worth it.

---

## How Capacitor Works With This App

Your Nuxt config already runs `ssr: false`, which produces a static SPA output at `.output/public/`. That directory is exactly what Capacitor's `webDir` points to.

```
nuxt generate  →  .output/public/  →  cap sync  →  ios/ + android/  →  Xcode / Android Studio
```

Nothing in your current stack is incompatible: Vue Router works (hash mode or history mode, both fine), Pinia + localStorage works, `#data` static JSON imports work, all scoped styles work.

**One real work item:** `server/api/branch-events.get.js` is a Nitro server route — there's no server inside a bundled native app. Two options:
- Have the mobile app call your Vercel-hosted API directly (`https://librarypassport.ca/api/branch-events`). It already has internet access, no CORS issues with your own domain, and you get the caching layer for free.
- Call the CKAN API directly from the client as a fallback. Acceptable for a low-traffic public API.

Option 1 is cleaner and requires zero code change.

---

## Native Plugins You'll Need

All are official Capacitor plugins maintained by Ionic, except NFC which is third-party.

| Feature | Plugin | Notes |
|---|---|---|
| Camera / QR scan | `@capacitor/camera` + `@capacitor/barcode-scanner` | QR check-in already planned |
| Haptics | `@capacitor/haptics` | Stamp collection, check-in confirmation |
| Geolocation | `@capacitor/geolocation` | Nearby branches (already in web app) |
| Push notifications | `@capacitor/push-notifications` | Required for App Store (see below) |
| Preferences | `@capacitor/preferences` | Native key-value storage, more reliable than localStorage in some iOS edge cases |
| Splash screen / status bar | `@capacitor/splash-screen`, `@capacitor/status-bar` | Basic polish |
| NFC | `@capawesome-team/capacitor-nfc` | Third-party, commercial licence. Standard NDEF tag reading, no special Apple approval needed |

---

## App Store Strategy

### The WebView rejection risk (Apple Guideline 4.2)

Apple's "Minimum Functionality" guideline rejects apps that are indistinguishable from opening your URL in Safari. Reviewers check: does this app do anything Safari cannot?

Your app already clears most of this bar:
- **Camera-based QR check-in** — native feel, not possible via Safari without user navigating to a website
- **Haptic feedback on stamp collection** — explicitly native-only
- **Offline-first behaviour** — localStorage-based passport works without a connection
- **Native tab bar navigation** — looks and feels like an app, not a browser

One addition before submission: **push notifications**. Even a simple weekly "you haven't visited a new branch in 7 days" reminder is the single strongest signal to reviewers that this is a real app. Safari's push notification support on iOS is limited compared to native APNs. Add this before your first App Store submission.

### Entitlements and permissions

None of these require special Apple approval or a commercial agreement:

| Capability | What's needed |
|---|---|
| Camera | `NSCameraUsageDescription` in Info.plist |
| Location | `NSLocationWhenInUseUsageDescription` in Info.plist |
| Push notifications | APNs setup in the Apple Developer portal |
| NFC tag reading | `com.apple.developer.nfc.readersession.formats` entitlement — available to all developers, no approval process |

NFC caveat: the Capawesome plugin supports reading/writing standard NFC tags (NDEF) — exactly what you need for branch check-in. Apple's *secure element* NFC (tap-to-pay style) requires a separate commercial agreement. You don't need that.

### Submission timeline and costs

| | Apple | Google Play |
|---|---|---|
| Cost | $99/year | $25 one-time |
| First account approval | 24–48 hours | Same day |
| App review | 1–7 days (first submission) | Hours to 24 hours |
| WebView scrutiny | High | Low — rarely an issue |

**Strategy:** Submit to Google Play first. Faster review, more permissive, good for shaking out issues (screenshots, metadata, permissions) before dealing with Apple's slower process.

---

## Porting Sequence

### Phase 1 — Get it running in a simulator (low effort)

1. `npm install @capacitor/core @capacitor/cli`
2. `npx cap init "TPL Passport" ca.torontopubliclibrary.passport` (or whatever bundle ID you choose)
3. Set `webDir: '.output/public'` in `capacitor.config.ts`
4. `nuxt generate && npx cap sync`
5. `npx cap add ios && npx cap add android`
6. Open in Xcode / Android Studio — it should run immediately

### Phase 2 — Native feel (before any submission)

7. Add `@capacitor/haptics` — wire to stamp collection and check-in confirmation
8. Add `@capacitor/splash-screen` + app icon set (iOS requires multiple sizes; use a tool like `capacitor-assets` to generate from one source image)
9. Add `@capacitor/status-bar` — match status bar style to your navy header
10. Test on a real device — simulator is not enough for haptics, camera, or NFC

### Phase 3 — Native features (before App Store submission)

11. Add `@capacitor/push-notifications` + APNs setup — at minimum a weekly re-engagement notification
12. Add `@capacitor/barcode-scanner` for QR check-in (this is a major feature upgrade from the web app)
13. Add `@capawesome-team/capacitor-nfc` if NFC check-in is ready

### Phase 4 — Store submissions

14. Google Play: generate a signed AAB, create a Play Console listing, submit
15. Apple: create an App Store Connect listing, archive in Xcode, submit for review
16. TestFlight beta before the public Apple release — good for getting 10–20 real testers before the full review

---

## Watchouts

**`localStorage` reliability on iOS:** Safari/WKWebView can evict localStorage under storage pressure. `@capacitor/preferences` (wraps UserDefaults on iOS, SharedPreferences on Android) is more durable. The passport store's persistence function is one line to swap. Not urgent — localStorage works fine in practice — but worth doing before a public release.

**Safe area insets:** iOS has a notch/dynamic island and Android has various navigation bar heights. CSS `env(safe-area-inset-*)` handles this but you need to audit your fixed navigation bar, the bottom tab bar, and any full-screen overlays. Add `viewport-fit=cover` to your viewport meta tag and use `padding-bottom: env(safe-area-inset-bottom)` on the bottom nav.

**Back button on Android:** Android has a hardware/gesture back button. Vue Router handles this naturally, but test your nested navigation flows (branch page → explore → back) on Android specifically. The loop you fixed in navigation is more likely to resurface with Android's back gesture.

**App bundle ID:** Choose it carefully — `ca.torontopubliclibrary.passport` or similar. You cannot change a bundle ID after submitting to Apple without creating a new app listing and losing all reviews. Make sure you own or have rights to the domain/brand before using it.

**TPL branding:** This app uses the Toronto Public Library name and logo. Before submitting to app stores, consider whether you need permission from TPL, or whether the app should be positioned as a fan/community app with appropriate disclaimers. Apple reviewers sometimes flag apps that appear to impersonate official organisations.

**Web app stays live:** The Vercel PWA continues to exist alongside the native apps. Users who install from the App Store get the native version; users who add to home screen from the browser get the PWA. Both are functionally identical — the native app just adds push notifications, faster camera, and haptics.
