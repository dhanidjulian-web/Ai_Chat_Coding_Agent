# Ai Chat Coding Assistant

Built with [AppMint AI Studio](https://freewebtoapk.com/studio/).

## Run it

```bash
npm install
npm run dev      # live development server
npm run build    # production build in dist/
```

## Make it an Android app

Open https://freewebtoapk.com/studio/, choose **Open a project**, pick this folder or its ZIP, and press **Build APK**.
You get a signed APK and a Play Store AAB.

## What is in src/lib/

`appmintData.ts`, `appmintNative.ts` and `appmintBoundary.tsx` are the AppMint runtime (data, native phone
features with web fallbacks to the standard browser APIs, and an error boundary). The studio refreshes them on
every build; edit your own files instead.
