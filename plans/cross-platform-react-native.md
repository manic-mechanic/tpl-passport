# Cross-Platform Deep Dive: React Native & Expo

> Learning-oriented deep dive. See `native-apps.md` for the actual porting strategy.

---

## What React Native Actually Is

React Native renders **real native platform views** — not a WebView, not a custom renderer. A `<View>` in RN is a `UIView` on iOS and an `android.view.View` on Android. Text is rendered by Core Text / Android's text stack. Scrolling uses native momentum. This is meaningfully different from both Capacitor (WebView) and Flutter (custom renderer drawing its own pixels).

The JS thread describes what the UI should look like. React Native makes it so.

---

## Architecture: Old vs New

### The Old Architecture (pre-2023)

The JS thread and native UI thread were completely separate, communicating only by serializing data to JSON across an async "bridge." Every native call — rendering, touch response, sensor reading — was a message serialized, shipped, deserialized, acted on. At 60fps this meant 60+ bridge crossings per second, each with serialization overhead.

The practical results: animations that jank when JS is busy, "white flash" on fast list scrolls, synchronous native calls being architecturally impossible.

### The New Architecture (JSI + Fabric + TurboModules)

**Made the hard default in RN 0.76 (October 2024) and Expo SDK 52 (November 2024).**

Three pillars:

**JSI (JavaScript Interface):** The bridge is replaced by a C++ layer that Hermes (the JS engine) calls directly. Instead of JSON serialization, JS holds actual C++ object references. Synchronous native calls are now possible.

**Fabric:** The new renderer. React's commit phase can now synchronously touch native views. This enables concurrent React features — the ability to interrupt and reprioritize rendering — which requires synchronous coordination between threads.

**TurboModules:** Native modules are lazy-loaded and type-safe via codegen (you write TypeScript specs, codegen generates C++ bindings). No more "everything stringly typed through the bridge."

**Practical impact:** `react-native-reanimated` v3 runs animations entirely on the UI thread with zero JS involvement. `react-native-gesture-handler` does the same for gestures. Startup is faster. Layout animations are dramatically smoother. The main class of "jank when JS is busy" problems is addressed.

### vs. Flutter and Capacitor

| | Capacitor | React Native | Flutter |
|---|---|---|---|
| Renders | WebView | Native platform widgets | Custom renderer (Impeller/Skia) |
| Code language | JS/Vue/HTML/CSS | JS/JSX | Dart |
| Native feel | Good, improving | Native | Near-native |
| JS thread bottleneck | No JS runtime | Yes (mitigated by New Arch) | No JS runtime |
| Platform widget updates | Via WebView updates | Automatic | Manual opt-in |

---

## React for Vue Developers

### The Core Mental Model Shift

Vue's reactivity tracks dependencies automatically — you write reactive state and the template system observes it. React re-renders by re-executing the component function. When state changes, React calls your function again, diffs the output against the previous output, and applies the minimum update.

**This is the biggest rewiring.** In Vue, you don't think about re-rendering. In React:
- Every state update causes the component function to re-execute from the top
- `useEffect` dependencies are manually declared — React can't infer them
- Callbacks and handlers created inside the component are recreated on every render

### State Equivalents

```js
// Vue 3
const count = ref(0)
const doubled = computed(() => count.value * 2)

watch(count, (val) => console.log('changed to', val))
```

```jsx
// React equivalent
const [count, setCount] = useState(0)
const doubled = count * 2          // plain variable — recomputed on every render

useEffect(() => {
  console.log('changed to', count)
}, [count])                         // dependency array — manually declared
```

`computed()` in Vue is lazy and memoized. In React, `doubled` above just runs inline on every render. For expensive derivations, use `useMemo`:

```jsx
const expensiveResult = useMemo(() => slowComputation(count), [count])
```

For simple derivations, just do them inline — that's idiomatic React.

### Fetch-and-Display: Vue vs React

```vue
<!-- Vue -->
<script setup>
const branch = ref(null)
const loading = ref(true)
onMounted(async () => {
  branch.value = await $fetch(`/api/branch/${props.id}`)
  loading.value = false
})
</script>
<template>
  <div v-if="loading">Loading...</div>
  <div v-else>{{ branch.name }}</div>
</template>
```

```jsx
// React Native
function BranchDetail({ id }) {
  const [branch, setBranch] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/branch/${id}`)
      .then(r => r.json())
      .then(data => { setBranch(data); setLoading(false) })
  }, [id])  // re-runs if id changes

  if (loading) return <ActivityIndicator />
  return <Text>{branch.name}</Text>
}
```

In practice, most production React (including RN) code uses **TanStack Query** (`@tanstack/react-query`) for data fetching — it handles caching, loading states, background refetch, and revalidation automatically. This is the Vue's `useFetch` equivalent.

### JSX vs Vue Templates

| Vue template | JSX / RN |
|---|---|
| `v-if="show"` | `{show && <Component />}` |
| `v-for="item in list"` | `{list.map(item => <Item key={item.id} />)}` |
| `@click="handler"` | `onPress={handler}` |
| `:class="{ active: isActive }"` | `style={[styles.base, isActive && styles.active]}` |
| `<slot>` | `{children}` prop |
| `v-model="val"` | `value={val} onChangeText={setVal}` (explicit — no two-way binding) |

No `v-model` in React. Two-way binding is always explicit. The `onChangeText → setState` pattern is idiomatic.

---

## Expo

### Expo vs Bare React Native

**Bare RN** gives you `ios/` and `android/` directories you own and compile yourself. Full control, more setup.

**Expo** is a managed layer: pre-built native modules (`expo-camera`, `expo-location`, `expo-notifications`), declarative native config in `app.json` (no hand-editing `Info.plist` or `AndroidManifest.xml`), and cloud builds via EAS.

**Which to use in 2026:** Expo. The old "managed vs bare workflow" distinction has largely collapsed. Expo's **prebuild** generates the `ios/` and `android/` directories from your `app.json` config when you need them. You get the managed DX but can still write custom native code. The main old reason to go bare (needing native modules outside Expo's ecosystem) is mostly gone.

### Expo Router

File-based routing built on React Navigation. Mental model maps closely to Nuxt Router:

```
app/
  _layout.tsx          # root layout — like layouts/default.vue
  index.tsx            # /
  explore.tsx          # /explore
  branch/
    [id].tsx           # /branch/:id — like pages/branch/[id].vue
  (tabs)/              # route group — doesn't appear in URL
    _layout.tsx        # tab navigator config
    home.tsx
    passport.tsx
  check-in.tsx         # modal
```

```tsx
// Navigation
import { Link, useRouter } from 'expo-router'

<Link href="/branch/AN">View Branch</Link>

const router = useRouter()
router.push('/branch/AN')
router.replace('/home')
```

The biggest difference from Vue Router: navigation in RN is a **stack**. Going to `/branch/AN` pushes a new native screen on top of the current one with a slide animation. `router.back()` pops it. Users can swipe-back on iOS. This is the native platform UX model, and it feels right.

### EAS (Expo Application Services)

**EAS Build:** Cloud compilation. Push code, get back a `.ipa` or `.aab`. The headline feature: **you don't need a Mac to ship an iOS app**. Free tier has limited monthly build minutes; paid tiers are reasonable.

**EAS Submit:** Submits your compiled binary to App Store / Play Store. Automates the Xcode Organizer workflow.

**EAS Update:** Over-the-air JS bundle updates — push a bug fix or content change without App Store review. Apple and Google allow this for JS-only changes; adding a new native permission still requires a full submission. Many production teams deploy hotfixes this way.

---

## Styling

No CSS in React Native. Styles are JavaScript objects via `StyleSheet.create`:

```jsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2ede3',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Fraunces',
    color: '#001c71',
  },
})

<View style={styles.container}>
  <Text style={styles.title}>{name}</Text>
</View>
```

**Available:** Flexbox (column-direction by default), `position: absolute/relative`, `borderRadius`, `shadow*` (iOS) / `elevation` (Android), transforms, opacity.

**Not available:** CSS cascade, pseudo-selectors, `grid`, `calc()`, CSS custom properties natively, CSS `transition`/`animation` (use `react-native-reanimated` instead), `position: fixed`.

### Design Tokens

The standard approach — a JS theme object:

```js
// theme.js
export const colors = {
  tplBlue: '#005fc0',
  tplNavy: '#001c71',
  bgWarm: '#f2ede3',
}
export const spacing = { sm: 8, md: 16, lg: 24 }
```

Used as: `color: colors.tplBlue`. For dark mode: maintain two theme objects and switch via React Context. `@shopify/restyle` formalizes this with typed theme tokens and variant APIs if you want structure.

### NativeWind

NativeWind v4 (2024) brings Tailwind utility classes to React Native. Tailwind's compiler generates styles; it's not runtime class parsing.

```jsx
<View className="flex-1 bg-amber-50 p-4 rounded-2xl">
  <Text className="text-2xl font-bold text-navy-900">{name}</Text>
</View>
```

v4 is production-usable for most cases. Dark mode `dark:` variants work. Custom theme tokens in `tailwind.config.js` carry through. Some complex utility combos behave slightly differently between native and web. If you're building a custom design system with tokens, a plain JS theme object is more transparent.

---

## State Management

### Zustand — the Pinia equivalent for RN

```js
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

const usePassportStore = create(
  persist(
    (set, get) => ({
      checkIns: [],

      checkIn: (branchCode) => set(state => ({
        checkIns: [
          { branchCode, timestamp: new Date().toISOString() },
          ...state.checkIns,
        ]
      })),

      hasVisited: (branchCode) =>
        get().checkIns.some(c => c.branchCode === branchCode),

      visitCount: () => new Set(get().checkIns.map(c => c.branchCode)).size,
    }),
    {
      name: 'passport-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

This is a near-direct port of your current Pinia store — `AsyncStorage` replaces `localStorage`. For secure data (auth tokens), use `expo-secure-store` instead.

### What's Popular in 2025/2026

| Library | Use case |
|---|---|
| **Zustand** | Client/UI state — the modern Pinia equivalent |
| **TanStack Query** | Server state — Supabase/API data, caching, background refetch |
| Jotai | Atomic state, fine-grained reactivity |
| Redux Toolkit | Large teams with existing Redux — not a new-project choice |

Pairing Zustand (passport state) + TanStack Query (Supabase data) is the standard modern pattern.

### Supabase in React Native

The `@supabase/supabase-js` SDK works directly in RN — just swap the session storage:

```js
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,  // required for RN — no URL bar
  },
})
```

Use `expo-secure-store` for auth tokens specifically (Keychain on iOS, Keystore on Android — more secure than AsyncStorage for credentials).

---

## Navigation Deep Dive

### Expo Router v3/v4 vs Vue Router

| Vue Router | Expo Router |
|---|---|
| `routes: [{ path: '/', component: Home }]` | `app/index.tsx` file |
| `pages/branch/[id].vue` | `app/branch/[id].tsx` |
| `layouts/default.vue` | `app/_layout.tsx` |
| `(group)/` directory | `(group)/` directory |
| `router.push('/path')` | `router.push('/path')` |
| `useRoute().params.id` | `useLocalSearchParams().id` |
| Route guards | `redirect` in layout |

**Modals** — native sheet presentation:
```tsx
// app/_layout.tsx
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen
    name="check-in"
    options={{ presentation: 'modal', headerShown: false }}
  />
</Stack>
```

**Bottom sheets** — not built-in, use `@gorhom/bottom-sheet` (backed by Reanimated + Gesture Handler, New Architecture compatible).

---

## Universal App (iOS + Android + Web)

Expo Router's web target uses React Native Web — `View` → `div`, `Text` → `span`. It works. Production-viable apps exist.

**The honest gaps:**
- Third-party RN libraries may not have web support — check each one (`react-native-maps` doesn't, `expo-camera` has limited web support)
- `Platform.select()` branches appear throughout real universal app code
- StyleSheet works on web but CSS cascade, pseudo-selectors, and media queries are gone
- For a genuinely excellent web experience, you'll want separate web-optimized components in places

**If web is a first-class target:** Expo's universal app is "good enough for web" rather than "best-in-class web." Coming from a Nuxt background where the web product is excellent, you'll feel the gap. The Vue/Nuxt PWA is a better web product; RN+Expo is better for native mobile.

---

## Developer Experience

### Expo Go vs Development Build

**Expo Go** — install from the App Store, scan a QR, your JS runs inside it. Zero native compilation. Only works while you're using Expo's built-in modules. The moment you add a native dependency outside Expo Go's bundle, it breaks.

**Development Build** — your own custom version of Expo Go built for your project. Created with `eas build --profile development` or `npx expo run:ios`. Slower initial setup, becomes your daily driver once you have custom native dependencies.

Rule: start with Expo Go, switch to a dev build when you hit the first "module not supported in Expo Go" error.

### Fast Refresh

Preserves component state and updates in-place for component changes. Sub-second for most changes. More reliable than it used to be (pre-2022 Hot Reload had real issues). Full module reloads happen for non-component file changes; full restarts for root layout or navigation structure changes.

### Debugging

React DevTools (standalone) for component tree inspection. Chrome DevTools Protocol (CDT) for JS debugging and breakpoints via Hermes. Network inspection requires a proxy (Charles / Proxyman) or `react-native-network-logger` — there's no built-in network tab equivalent to browser DevTools. Layout inspection via React DevTools or Flipper's layout inspector.

---

## Real Weaknesses

1. **JS thread bottleneck persists.** New Architecture helps significantly, but complex JS rendering can still jank. Heavy computation belongs in a worklet (via Reanimated) or a worker.
2. **Upgrade friction.** Each RN version has native changes — `AppDelegate.mm`, Podfile, `build.gradle`. The upgrade-helper tool shows diffs; it works but is a tax. Expo's managed prebuild mitigates this.
3. **Platform divergence is real.** `Alert` looks different on iOS vs Android. `TextInput` has different quirks. `shadow*` is iOS only; `elevation` is Android only. `Platform.select()` is a regular part of the codebase.
4. **Debugging is worse than the browser.** No browser DevTools equivalent. Network inspection needs third-party tools.
5. **Build times.** Native compilation is slow. Clean iOS build: 10+ minutes. EAS Build moves this to the cloud but adds round-trip latency.
6. **Library ecosystem gaps.** Most things exist, but occasionally a web library has no RN equivalent or the RN version is less maintained.

### "React Native Is Dead" — The Honest Answer

The narrative peaked in 2018 when Airbnb published their post-mortem on leaving RN. Their complaints — bridge performance, JS/native mismatch, native engineer overhead — were valid at the time.

What's happened since: Meta still builds Facebook, Instagram, and Marketplace in RN. Microsoft ships Teams, Xbox, and Office mobile in RN. Shopify migrated their flagship app to RN and published detailed technical posts. Expo grew from a side project to a well-funded company with a large engineering team. The New Architecture directly addresses Airbnb's main complaints.

"Dead" is wrong. It went through a rough patch from ~2018 to ~2022, emerged with the New Architecture, and is actively used at scale. Flutter is the main alternative; they coexist.

---

## Vue → React Native Mental Model Map

```
ref()               →  useState()
computed(() => ...)  →  useMemo(() => ..., [deps]) or plain variable
watch(source, cb)    →  useEffect(() => { ... }, [dep])
onMounted()         →  useEffect(() => { ... }, [])
onUnmounted()       →  useEffect(() => { return () => cleanup() }, [])
Pinia store         →  Zustand store
useFetch / $fetch   →  TanStack Query useQuery() or useEffect + fetch
localStorage        →  AsyncStorage (Zustand persist middleware)
Secure storage      →  expo-secure-store
Vue Router          →  Expo Router
router.push()       →  router.push() (same API)
route.params.id     →  useLocalSearchParams().id
layouts/default.vue →  app/_layout.tsx
pages/[id].vue      →  app/[id].tsx
<style scoped>       →  StyleSheet.create({}) — always scoped
CSS custom props    →  JS theme object: const theme = { tplBlue: '#005fc0' }
<Transition>        →  react-native-reanimated FadeIn, SlideInRight, etc.
v-if                →  {condition && <Component />}
v-for               →  {list.map(item => <Item key={item.id} />)}
Long lists          →  <FlatList data={items} renderItem={renderItem} />
NUXT_PUBLIC_*       →  EXPO_PUBLIC_* in .env
```

---

## Notable Production Apps

- **Meta:** Facebook, Instagram, Marketplace (iOS + Android)
- **Microsoft:** Teams mobile, Xbox app, Office mobile
- **Shopify:** Merchant app
- **Coinbase:** Wallet app
- **Discord:** Partially migrated to RN (published engineering post)
- **Wix, Bloomberg, Myntra** — published case studies
