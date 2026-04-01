# Cross-Platform Deep Dive: Flutter

> This is a learning-oriented deep dive, not a recommendation to replace the Capacitor plan. See `native-apps.md` for the actual porting strategy.

---

## What Flutter Actually Is

Flutter is not a framework that calls native UI APIs. It ships its own rendering engine — **Impeller** (replaced Skia in 2023/2024) — that draws directly to a Metal surface on iOS and Vulkan/OpenGL on Android. Every pixel you see is drawn by Dart + Impeller, not by UIKit or Android View.

A Flutter `Text` widget is not a `UILabel`. It's pixels that look like a label.

This is the single most important thing to understand, because it explains everything else: the performance characteristics, the perfect cross-platform consistency, the accessibility limitations, and why Flutter web works the way it does.

**Contrast with React Native:** React Native calls through to real native widgets (`UILabel`, `TextView`). Flutter owns the renderer entirely.

---

## The Language: Dart

### What Dart Feels Like

Dart is the closest thing to "TypeScript that compiles to native code." Strongly typed, class-based, garbage-collected, C-style syntax. A JS/TS developer is comfortable within hours.

```dart
class Branch {
  final String name;
  final String code;
  final int? wardNo;  // ? = explicitly nullable — compiler enforces it

  const Branch({required this.name, required this.code, this.wardNo});
}
```

Key differences from JS/TS:

| Concept | JS/TS | Dart |
|---|---|---|
| Null safety | Optional (TS strict mode) | **Mandatory, compiler-enforced** |
| `const` | Block-scoped binding | Compile-time constant — much stronger |
| `undefined` | Exists | **Does not exist** — only `null` |
| Extension methods | No | Yes — add methods to existing types |
| Mixins | Intersection types workaround | First-class language feature |
| Collections | Mixed arrays fine | Typed: `List<String>`, `Map<String, int>` |

**Sound null safety** is meaningfully stronger than TS strict mode:
```dart
void greet(String? name) {
  print(name.toUpperCase());   // Compile error — must handle null first
  print(name?.toUpperCase());  // Fine — null-safe call
  print(name ?? 'Anonymous');  // Fine — same ?? as JS
  if (name != null) {
    print(name.toUpperCase()); // Fine — flow analysis promotes type
  }
}
```

**`const` is a compile-time constant** — not just a binding. A `const Widget` is deduplicated in memory. You'll see `const` everywhere in Flutter code; it's not cargo-culting, it's a real performance optimisation.

```dart
// These are literally the same object in memory
const a = Text('hello');
const b = Text('hello');
print(identical(a, b)); // true
```

### Async: Almost Identical to JS

| JS/TS | Dart |
|---|---|
| `Promise<T>` | `Future<T>` |
| `async/await` | `async/await` — identical syntax |
| `Observable` / `AsyncIterator` | `Stream<T>` |
| `Promise.all()` | `Future.wait()` |

```dart
Future<List<Branch>> fetchBranches() async {
  final response = await http.get(Uri.parse('https://api.example.com/branches'));
  if (response.statusCode == 200) {
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((json) => Branch.fromJson(json)).toList();
  }
  throw Exception('Failed to load branches');
}
```

**Streams** are the async sequence primitive — like an Observable or `AsyncIterator`. Supabase Realtime, file reading, and sensors all use Streams:

```dart
Stream<int> ticker() async* {
  for (int i = 0; i < 5; i++) {
    await Future.delayed(Duration(seconds: 1));
    yield i;  // emits a value into the stream
  }
}
```

### Tooling

```bash
dart pub get          # npm install
dart pub add riverpod # npm install riverpod
dart format .         # prettier --write .
dart analyze          # eslint / tsc --noEmit
flutter run           # dev server equivalent
flutter build ios     # production build
```

---

## The Widget System

### Everything Is a Widget

In Flutter, layout, gestures, animation, and styling are all widgets — not CSS properties or directives. There's no HTML. You compose behaviour through nesting.

```dart
// This is how you "style" in Flutter — no CSS
Container(
  margin: EdgeInsets.all(16),
  padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(8),
    boxShadow: [BoxShadow(blurRadius: 4, color: Colors.black26)],
  ),
  child: Text('Branch Name'),
)
```

### StatelessWidget vs StatefulWidget

**StatelessWidget** — equivalent to a Vue component with no local state:

```dart
class BranchCard extends StatelessWidget {
  final String name;
  final bool visited;

  const BranchCard({super.key, required this.name, required this.visited});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(name),
        trailing: visited ? Icon(Icons.check, color: Colors.green) : null,
      ),
    );
  }
}
```

**StatefulWidget** — component with local mutable state:

```dart
class _CounterState extends State<CounterWidget> {
  int _count = 0;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Text('Count: $_count'),
      ElevatedButton(
        onPressed: () => setState(() { _count++; }),
        child: Text('Increment'),
      ),
    ]);
  }
}
```

**Modern pattern — flutter_hooks** (closest to Vue Composition API):

```dart
class CounterWidget extends HookWidget {
  @override
  Widget build(BuildContext context) {
    final count = useState(0);   // like Vue's ref(0)
    return Column(children: [
      Text('Count: ${count.value}'),
      ElevatedButton(
        onPressed: () => count.value++,
        child: Text('Increment'),
      ),
    ]);
  }
}
```

### Layout: Flutter vs CSS

| CSS | Flutter |
|---|---|
| `display: flex; flex-direction: column` | `Column(children: [...])` |
| `display: flex; flex-direction: row` | `Row(children: [...])` |
| `flex: 1` | `Expanded(child: Widget())` |
| `align-items: center` | `crossAxisAlignment: CrossAxisAlignment.center` |
| `justify-content: space-between` | `mainAxisAlignment: MainAxisAlignment.spaceBetween` |
| `position: absolute` | `Stack` + `Positioned` |
| `padding: 16px` | `Padding(padding: EdgeInsets.all(16), child: ...)` |
| `overflow: auto` | `SingleChildScrollView` or `ListView` |

The layout model uses **constraints**: parent widgets pass `BoxConstraints` (min/max width/height) down to children; children return their size within those constraints. Deterministic and fast, but "RenderFlex overflowed" and "Unbounded constraints" errors are the #1 beginner hurdle.

### Vue → Flutter Mental Model Map

```
Vue ref()           →  useState() (hooks) or Riverpod StateProvider
Vue computed()      →  Riverpod Provider (derived) or inline in build()
Vue watch()         →  ref.listen() in Riverpod or StreamBuilder
Vue provide/inject  →  Theme.of(context) or Riverpod global providers
<template>          →  Widget build(BuildContext context) { return ...; }
v-if                →  if (condition) WidgetA() else WidgetB()
v-for               →  items.map((i) => ItemWidget(i)).toList()
:prop="value"       →  MyWidget(propName: value)
@emit('click', x)   →  onTap: (x) => parentCallback(x)
<slot>              →  child: Widget  or  builder: (ctx) => Widget
```

---

## State Management

### The 2025/2026 Consensus: Riverpod

The landscape: `setState` (local) → Provider → **Riverpod** (recommended) → BLoC (enterprise).

Riverpod is Pinia if Pinia had compile-time safety:

```dart
// Define a provider — like a Pinia store, but composable
@riverpod
Future<List<Branch>> branches(BranchesRef ref) async {
  final response = await http.get(Uri.parse('/api/branches'));
  return parseBranches(response.body);
}

// Consume it in a widget — ref.watch re-renders on change, like Vue's reactive
class BranchList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final branchesAsync = ref.watch(branchesProvider);

    return branchesAsync.when(
      loading: () => CircularProgressIndicator(),
      error:   (err, _) => Text('Error: $err'),
      data:    (branches) => ListView.builder(
        itemCount: branches.length,
        itemBuilder: (ctx, i) => BranchCard(branch: branches[i]),
      ),
    );
  }
}
```

**BLoC** is worth knowing for reading enterprise Flutter code — enforces strict `Event → BLoC → State` unidirectional flow, similar in philosophy to Vuex (not Pinia).

---

## Design System / Theming

Flutter's `ThemeData` is the equivalent of CSS custom properties — a tree of design tokens passed implicitly down the widget tree:

```dart
MaterialApp(
  theme: ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xFF005FC0),  // --tpl-blue
      brightness: Brightness.light,
    ),
    textTheme: TextTheme(
      displayLarge: TextStyle(fontFamily: 'Fraunces', fontSize: 32, fontWeight: FontWeight.w700),
      bodyMedium:   TextStyle(fontFamily: 'Roboto', fontSize: 16),
    ),
    useMaterial3: true,
  ),
  darkTheme: ThemeData(/* dark variant */),
  themeMode: ThemeMode.system,
)

// Accessing tokens — like var(--tpl-blue) in CSS
final primary = Theme.of(context).colorScheme.primary;
```

Porting a CSS custom property system: color tokens → `ColorScheme`, font tokens → `TextTheme`, spacing → Dart constants (`const double kSpacingMd = 16.0`).

---

## Navigation: GoRouter

GoRouter is the Flutter team's officially supported router (first-party since 2022):

```dart
final router = GoRouter(
  routes: [
    GoRoute(path: '/', builder: (context, state) => HomePage()),
    GoRoute(
      path: '/branch/:id',
      builder: (context, state) {
        return BranchDetailPage(id: state.pathParameters['id']!);
      },
    ),
  ],
);

// Navigate — like router.push()
context.go('/branch/AN');
context.push('/branch/AN');  // push vs replace
```

Deep linking, URL routing for web, query parameters, nested routes, and redirect guards all work and map closely to Vue Router concepts.

---

## Cross-Platform Reality

| Platform | Status |
|---|---|
| iOS | Production-ready. Impeller default. |
| Android | Production-ready. Gradle build complexity is a tax. |
| macOS | Stable, growing ecosystem. |
| Web | Usable with caveats — see below. |
| Windows / Linux | Stable but smaller ecosystem. |

### Web: The Honest Picture

Flutter Web uses **CanvasKit** (Impeller/Skia compiled to WebAssembly). It draws to a `<canvas>`, not DOM.

- **SEO: none.** Crawlers see an empty canvas. Not suitable for public content sites.
- **Accessibility: limited.** Requires explicit `Semantics()` annotations on every custom widget.
- **PWA: works.** Can be installed as a PWA.
- **Performance: good once loaded.** Initial load is ~2-3MB Wasm bundle — slow on first visit.
- **App-like use cases: excellent.** Dashboards, tools, anything that's logically an app rather than a website. Flutter Web would work fine for the TPL Passport app specifically.

### Platform-Specific Code: Method Channels

When you need native APIs Flutter doesn't abstract (custom NFC, HealthKit, etc.):

```dart
// Dart side
static const _channel = MethodChannel('com.example.app/nfc');

Future<String?> readTag() async {
  return await _channel.invokeMethod<String>('readTag');
}
```

```swift
// Swift side — your existing Swift knowledge is useful here
let channel = FlutterMethodChannel(name: "com.example.app/nfc",
                                    binaryMessenger: controller.binaryMessenger)
channel.setMethodCallHandler { call, result in
  if call.method == "readTag" {
    // real Swift NFC code
    result("tag-data")
  }
}
```

---

## Ecosystem

### Key Packages for This Stack

| Package | Purpose | Equivalent |
|---|---|---|
| `supabase_flutter` | Full Supabase SDK — auth, DB, storage, realtime | `@supabase/supabase-js` |
| `go_router` | Navigation | `vue-router` |
| `riverpod` | State management | `pinia` |
| `dio` | HTTP client with interceptors | `axios` |
| `shared_preferences` | Key-value local storage | `localStorage` |
| `isar` / `hive` | Local NoSQL database | IndexedDB / Dexie |
| `flutter_secure_storage` | Encrypted storage for tokens | — |
| `freezed` | Immutable data classes + sealed unions | `zod` / `immer` |

`supabase_flutter` is officially maintained by Supabase, has full feature parity with the JS SDK, and uses Streams for Realtime — a natural fit with Dart.

### Hot Reload

Flutter's hot reload is genuinely best-in-class — consistently cited as the best developer experience aspect. It injects new code into the running Dart VM and preserves widget state. Sub-second. Change a color, see it instantly. Works ~95% of the time without a full restart.

---

## Learning Curve

**Realistic timeline for a JS developer:**
- Day 1–2: Dart syntax is comfortable — not the hurdle
- Week 1: Widget composition model clicks
- Week 2–3: Layout constraints become intuitive (stop fighting overflow errors)
- Month 1: Productive — full feature screens, async data, navigation
- Month 2–3: State architecture natural, ready to ship to both stores
- Month 3–6: Platform specifics, method channels, build configuration

**Biggest hurdles in order:**
1. Widget-as-everything layout model — stop thinking in HTML/CSS (week 1)
2. Constraints model — "RenderFlex overflowed" errors (week 2–3)
3. Build tooling beneath Flutter (Xcode, Gradle) — not Flutter's fault but genuinely painful

**Best resources:**
- `flutter.dev/docs` — genuinely well-written
- `dart.dev/language` — do the language tour in a day before Flutter
- Riverpod official docs (`riverpod.dev`) — start here for state management
- FilledStacks (YouTube) — architecture-focused, pragmatic

---

## Real Weaknesses

1. **Accessibility is second-class.** Custom widgets need explicit `Semantics()` annotations. Screen readers don't get this for free the way native widgets do.
2. **Build tooling is painful.** Xcode version requirements, Gradle conflicts, CocoaPods issues — Flutter itself is fine but the native build chains beneath it break regularly.
3. **Web SEO is a non-starter.** CanvasKit draws pixels, not DOM. No workaround.
4. **Impeller still maturing on Android.** Specific GPU drivers see visual artifacts on older devices.
5. **Niche package quality drops sharply.** Core ecosystem is excellent; rich text editors, custom charts, PDFs — often abandoned or buggy.

## When Flutter Shines

- Single codebase → iOS + Android, pixel-perfect consistency
- Custom UI that isn't "native widgets with your colours" — animations, custom controls
- Internal tools where SEO doesn't matter
- Apps needing complex animation — Flutter's animation system is excellent
- Offline-first architecture — `isar` + Supabase sync is well-supported

## Notable Production Apps

- **Google Pay** — highest-profile Flutter app from Google itself
- **Nubank** — ~100M users, Brazilian fintech, frequently cited for scale + reliability
- **eBay Motors** — full iOS/Android app
- **BMW companion app**
- **Alibaba Xianyu** — Flutter's earliest large-scale production proof
