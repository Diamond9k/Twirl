# Twirl

Expo (SDK 54) app with Supabase and Stripe. Native iOS uses **Xcode** with a generated `ios/` project (not committed; create it after clone).

## Requirements

- Node.js 20+ and npm
- Xcode (current stable) with Command Line Tools
- [CocoaPods](https://cocoapods.org/) (`brew install cocoapods` or `sudo gem install cocoapods`)

## Clone and install

```bash
git clone https://github.com/Diamond9k/Twirl.git
cd Twirl
npm install
cp .env.example .env.local
```

Edit `.env.local` with your Supabase URL, either a Supabase **publishable** key or legacy anon key, Stripe **publishable** key, and `EXPO_PUBLIC_API_URL` pointing at your deployed Edge Functions base (for example `https://<project-ref>.supabase.co/functions/v1`). Do not put Stripe or Supabase secret keys in the mobile app.

## Open in Xcode (first time on this machine)

`ios/` is gitignored by design. Generate it, install pods, then open the workspace:

```bash
npm run ios:prep
npm run ios:open
```

In Xcode: select the **Twirl** scheme, a physical device or simulator, then **Signing & Capabilities** → Team → enable for bundle ID **`com.twirl.rentals`**.

Apple Pay is configured for merchant ID **`merchant.com.twirl`** in `app.json`; create the same merchant ID in [Apple Developer](https://developer.apple.com/account/resources/identifiers/list) if you use Apple Pay.

To regenerate native projects after native dependency changes:

```bash
npm run ios:prebuild   # add --clean if you need a full reset
npm run ios:pods
```

## Scripts

| Script        | Purpose                                      |
| ------------- | -------------------------------------------- |
| `npm start`   | Expo dev server                              |
| `npm run typecheck` | `tsc --noEmit`                         |
| `npm run ios:prep`  | `expo prebuild` (iOS) + `pod install`  |
| `npm run ios:open`  | Opens `ios/Twirl.xcworkspace` in Xcode |

## Repo layout

- `app/` — Expo Router screens
- `assets/` — Icons and splash
- Native folders `ios/` and `android/` are generated locally and ignored by git
