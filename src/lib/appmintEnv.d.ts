// Appwright platform globals — pipeline-owned, like appmintData.ts. The model never writes this
// file and never sees it.
//
// The app shell injects these objects into the page at runtime (the native WebView bridge, and
// the Supabase / Stripe / Razorpay config blobs). TypeScript had no way to know that, so every
// generated app that touched `window.WebToApk` or `window.razorpayConfig` failed `tsc` unless the
// model happened to hand-write its own `declare global` block first. Measured live 2026-07-31: a
// saree store burned its whole repair budget on "window.razorpayConfig and window.supabaseConfig
// are not declared on the global Window type, so tsc rejects every access" and never reached the
// real bugs. Declaring the contract once, correctly, is the platform's job — not something each
// generated app should reinvent (and get subtly wrong).
//
// Every bridge method is OPTIONAL on purpose. Availability depends on what the creator enabled at
// build time, and on the shell version the app ships against, so the briefs teach feature
// detection (`ads?.showRewardedAd?.()`). Optional members make that the natural thing to write
// and keep an app building against an older shell honest.

export {};

interface AppMintBridge {
  // ── Play in-app purchases ────────────────────────────────────────────────────
  getProducts?(requestId: string, productIdsJson: string): void;
  purchase?(productId: string): void;
  isOwned?(productId: string): boolean;
  getOwnedProducts?(): string;
  isPremium?(): boolean;
  startRemoveAdsPurchase?(): void;

  // ── Ads, Automatic mode (the shell places the banner itself) ─────────────────
  // For page-placed banners, medium rectangles and promise-based load/show, the build's Ad
  // control must be "Developer-controlled" — see `window.AppMintAds` below.
  isRewardedAdReady?(): boolean;
  showRewardedAd?(): void;
  isInterstitialAdReady?(): boolean;
  showInterstitialAd?(): void;
  /** Tells the shell a deliberate in-app action happened, for URL-less navigation ads. */
  notifyUserAction?(): void;

  // ── Navigation progress ──────────────────────────────────────────────────────
  // The shell injects its own observer that calls these, so an app that swaps screens in the DOM
  // gets a loading indicator without doing anything. Call them directly only for a transition the
  // observer cannot see — one with no DOM change until data arrives. Always pair them.
  /** A view transition started. Nothing is drawn unless it outlasts the shell's threshold. */
  navStarted?(): void;
  /** The transition's new view has painted. */
  navSettled?(): void;

  // ── Notifications / reminders ────────────────────────────────────────────────
  requestNotificationPermission?(): string;
  showNotification?(title: string, body: string, icon: string, tag: string): boolean;
  scheduleNotification?(
    id: string, title: string, body: string, triggerAtMillis: string, repeat: string
  ): boolean;
  cancelNotification?(id: string): boolean;
  cancelAllNotifications?(): boolean;
  getScheduledNotifications?(): string;
  /**
   * Rich scheduled notification. Options are everything notify() takes, plus:
   *   at | triggerAt (epoch ms) or inSeconds, repeat, sound, openApp.
   * `sound` may be a path into your own bundle ('/audio/chime.mp3'), 'silent', or a res/raw
   * name. Returns false if the sound file does not exist — check it.
   */
  scheduleNotificationEx?(id: string, optionsJson: string): boolean;
  /** Copies a bundled sound into place; false = no such file. */
  prepareNotificationSound?(spec: string): boolean;
  clearNotificationSounds?(): number;
  /**
   * 'exact' | 'inexact' | 'unavailable' — whether reminders land on the minute or may be
   * batched by Doze. 'unavailable' means the device has no alarm service to ask.
   */
  getAlarmPrecision?(): string;
  /** Opens the Android 12+ exact-alarm setting. */
  requestExactAlarms?(): boolean;
  /** 'granted' | 'denied' — may a reminder put the APP on screen (openApp: true)? */
  canOpenAppAtTime?(): string;
  /**
   * Alarm clock (`scheduleNotificationEx(id, {alarm: true, ...})`): 'ready' | 'not_enabled' |
   * 'needs_exact_alarm' | 'needs_notification_permission'.
   */
  getAlarmSupport?(): string;
  isAlarmRinging?(): boolean;
  /** Stops the ringing alarm ('' = whichever rings). */
  stopAlarm?(id: string): boolean;
  /** Stops the ringing alarm and rings it again in `minutes` (0 = its snoozeMinutes). */
  snoozeAlarm?(id: string, minutes: number): boolean;

  // ── System volume ('media' | 'alarm' | 'ring' | 'notification' | 'call') ──
  /** JSON `{stream, current, max, percent, muted}` or `{error}`. */
  getVolume?(stream: string): string;
  /** JSON `{ok:true, stream, current, max, percent}` or `{ok:false, error}`. */
  setVolume?(stream: string, percent: number, showUi: boolean): string;
  /** Turns `appmint:volume` events on or off. */
  watchVolume?(on: boolean): boolean;
  /** 'granted' | 'opened' | 'not_declared'. */
  requestDndAccess?(): string;
  /** Opens the Android 14+ full-screen-alert setting. */
  requestOpenAppPermission?(): boolean;

  // ── Screen-capture protection ────────────────────────────────────────────────
  // Belongs to the page that asks; released automatically when the app navigates away.
  // Blocks screenshots, screen recording, casting and the recents thumbnail. It cannot stop
  // a camera pointed at the screen — nothing on Android can.
  setSecureScreen?(enabled: boolean): boolean;
  isSecureScreen?(): boolean;

  // ── Google sign-in (native Credential Manager) ───────────────────────────────
  signInWithGoogle?(serverClientId: string, callbackId: string): void;
  signOutGoogle?(callbackId: string): void;

  // ── Device / system ──────────────────────────────────────────────────────────
  getAppName?(): string;
  getAppVersion?(): string;
  vibrate?(durationMs: number): void;
  vibratePattern?(patternJson: string): void;
  cancelVibrate?(): void;
  copyToClipboard?(text: string): boolean;
  readClipboard?(): string;
  shareNative?(title: string, text: string, url: string): void;
  shareFiles?(filesJson: string, title: string, text: string): boolean;
  makePhoneCall?(phoneNumber: string): void;
  print?(): void;
  closeWindow?(): void;
  /**
   * Opens the app's Google Play listing (the Play Store app, or play.google.com) so the user
   * can rate it there — it is NOT the in-app review sheet. Always present on the bridge; when
   * the creator turned "Rate App Button" off it does nothing and returns 'off' ('opened'
   * otherwise), so do not show a rate button that relies on it in that case.
   */
  rateApp?(): 'opened' | 'off';
  /** Raw form of AppMint.requestReview (Play's in-app review sheet); use the promise wrapper. */
  requestReview?(optionsJson: string, callbackId: string): void;
  /**
   * The deep link that launched or resumed the app, or "" if it was opened normally.
   *
   * An offline app is served from appassets.androidplatform.net and cannot navigate to the
   * incoming address without leaving that origin, so the shell hands the link over and YOUR
   * code routes on it. The value is kept, not consumed, so it is safe to read on mount:
   *
   * ```ts
   * const u = window.WebToApk?.getLaunchUrl?.();
   * if (u) router.navigate(new URL(u).pathname);
   * ```
   *
   * A link arriving while the app runs replaces it and fires `appmint:deep-link`.
   */
  getLaunchUrl?(): string;

  // ── Text to speech ───────────────────────────────────────────────────────────
  ttsSpeak?(text: string, lang: string, rate: number, pitch: number, utteranceId: string): void;
  ttsCancel?(): void;
  ttsIsSpeaking?(): boolean;
  ttsGetVoices?(): string;
  ttsWarmUp?(): void;

  // ── Media session / casting ──────────────────────────────────────────────────
  castMedia?(mediaUrl: string): void;
  setMediaMetadata?(title: string, artist: string, artworkUrl: string): void;
  setPlaybackState?(isPlaying: boolean, positionMs: number, durationMs: number): void;
  clearMediaNotification?(): void;

  // ── Scoped folder access ─────────────────────────────────────────────────────
  /**
   * Answered on `window.WebToApkOnFolderAccessResult(ok, folderUri, requestId, error)`; `error`
   * ("" on success) is cancelled · busy · no_picker · disabled · not_persisted · foreign_origin.
   */
  requestFolderAccess?(requestId: string): void;
  hasFolderAccess?(): string;
  isFolderAccessEnabled?(): string;
  getFolderAccessUri?(): string;
  clearFolderAccess?(): void;
  listFolderEntries?(relativePath: string): string;
  readTextFile?(relativePath: string): string;
  writeTextFile?(relativePath: string, content: string): string;
  deleteEntry?(relativePath: string, recursive: string): string;
  renameEntry?(relativePath: string, newName: string): string;
  mkdir?(relativePath: string): string;
  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.
  pickFile?(requestId: string, mimeFilter: string): void;
  readFileBase64?(pathOrUri: string, offset: number, length: number): string;
  writeFileBase64?(pathOrUri: string, base64: string, offset: number, mode: string): string;
  /** JSON `{ok, name, size, mime, lastModified, uri, isDirectory, canWrite}` for a file OR a sub-folder of the grant. */
  statFile?(pathOrUri: string): string;
  releaseFileAccess?(uriString: string): string;
  generateKey?(alias: string, optionsJson: string): string;
  hasKey?(alias: string): string;
  listKeys?(): string;
  encryptWithKey?(alias: string, base64Plaintext: string): string;
  decryptWithKey?(alias: string, base64Payload: string): string;
  deleteKey?(alias: string): string;
  isKeyHardwareBacked?(alias: string): string;
  isKeystoreEnabled?(): string;
  notify?(optionsJson: string): boolean;
  getNotificationPermission?(): string;
  /** 'granted' | 'prompt' | 'blocked' | 'unavailable'. Prefer `getNotificationState()` from `@/lib/appmintNative`. */
  getNotificationState?(): string;
  /** Raw form of AppMint.enableNotifications (dialog, or the app's notification settings); use the promise wrapper. */
  enableNotifications?(callbackId: string): void;
  /** Opens this app's notification settings; true when they could be opened. */
  openNotificationSettings?(): boolean;
  setFullscreen?(enabled: boolean): void;
  toggleFullscreen?(): void;
  isFullscreen?(): boolean;
  isBiometricAvailable?(): string;
  authenticateBiometric?(callbackId: string, title: string, subtitle: string): void;
  authenticateBiometricEx?(callbackId: string, optionsJson: string): void;
  playClick?(): void;
  getDeviceInfo?(): string;
  getInstallId?(): string;
  bleStartScan?(): void;
  bleStopScan?(): void;
  bleConnect?(address: string): void;
  bleDisconnect?(): void;
  bleSetWheelCircumference?(mm: number): void;
  wbIsAvailable?(): boolean;
  wbRequestDevice?(requestId: string, optionsJson: string): void;
  wbConnect?(requestId: string, deviceId: string): void;
  wbDisconnect?(deviceId: string): void;
  wbGetCharacteristics?(requestId: string, deviceId: string, service: string): void;
  wbRead?(requestId: string, deviceId: string, service: string, characteristic: string): void;
  wbWrite?(requestId: string, deviceId: string, service: string, characteristic: string, valueBase64: string, withResponse: boolean): void;
  wbNotify?(requestId: string, deviceId: string, service: string, characteristic: string, enable: boolean): void;
  workEnqueueOnline?(id: string, url: string, method: string, headersJson: string, payload: string): void;
  workSchedulePeriodic?(id: string, url: string, method: string, headersJson: string, payload: string, intervalMinutes: number): void;
  workCancel?(id: string): void;
  workList?(requestId: string): void;
  // Background execution (build options on the Access step; a switched-off family answers
  // {ok:false, reason:'not_enabled'}). Use the typed wrappers: keepAlive, backgroundLocation,
  // geofences, backgroundTasks, batteryOptimization in '@/lib/appmintNative'.
  startBackgroundService?(optionsJson: string): string;
  updateBackgroundService?(optionsJson: string): string;
  stopBackgroundService?(): boolean;
  isBackgroundServiceRunning?(): boolean;
  isIgnoringBatteryOptimizations?(): boolean;
  requestIgnoreBatteryOptimizations?(): string;
  startLocationUpdates?(optionsJson: string): string;
  stopLocationUpdates?(): boolean;
  getBufferedLocations?(): string;
  clearBufferedLocations?(): boolean;
  requestBackgroundLocation?(): void;
  getLocationPermissionState?(): string;
  addGeofence?(json: string): string;
  removeGeofence?(id: string): boolean;
  getGeofences?(): string;
  getGeofenceEvents?(): string;
  clearGeofenceEvents?(): boolean;
  backgroundRegister?(name: string, optionsJson: string): string;
  backgroundUnregister?(name: string): boolean;
  backgroundList?(): string;
  backgroundRunNow?(name: string): string;
  backgroundDone?(runId: string, resultJson: string): boolean;
  isBackgroundRun?(): boolean;

  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.
  getPhoneIdentity?(): string;
  listContacts?(requestId: string, limit: number, offset: number): void;
  searchContacts?(requestId: string, query: string, limit: number): void;
  getContact?(requestId: string, contactId: string): void;
  pickContact?(requestId: string): void;
  addContact?(requestId: string, contactJson: string): void;
  listCallLog?(requestId: string, limit: number, offset: number, sinceMillis: string): void;
  composeSms?(phoneNumber: string, message: string): boolean;
  sendSms?(requestId: string, phoneNumber: string, message: string, wantDelivery: boolean): void;
  listSms?(requestId: string, box: string, limit: number, offset: number): void;

  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.

  /**
   * Appwright Push inbox — creator-sent notifications, newest first (max 50). Returns a
   * JSON string: Array<{id, title, body, imageUrl, link, receivedAt, read}>. While the app
   * is open, each arrival/retraction also fires `window.addEventListener('appmint:push',
   * e => ...)` with detail {type:'received', message} or {type:'revoked', id} — but the
   * inbox is the pullable truth, so late-mounting code loses nothing by missing events.
   */
  getPushInbox?(): string;
  /** Marks one inbox message read; pass "" to mark all read. */
  markPushRead?(id: string): boolean;
  /**
   * Dismisses ONE inbox message (swipe-away). REVERSIBLE: the message is hidden, not
   * destroyed, so show a brief "Undo" and call restorePushMessage(id) if tapped.
   * Local only — the tray notification and the creator's history are untouched.
   */
  dismissPushMessage?(id: string): boolean;
  /** Undo a dismiss — puts the message back in the inbox. */
  restorePushMessage?(id: string): boolean;
  /** Empties the push inbox (tray notifications and server history are untouched). */
  clearPushInbox?(): boolean;

  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.
  setStatusBarColor?(color: string, style: string): boolean;

  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.
  splashHold?(): void;
  splashReady?(): void;
  setAppShortcuts?(itemsJson: string): void;

  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.
  enterPip?(): boolean;
  getSharedText?(): string;
  clearSharedText?(): void;

  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.
  setMusicVolume?(percent: number): void;
  getMusicVolume?(): number;

  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.
  adsConfig?(): string;
  adsIsReady?(type: string): boolean;
  adsLoad?(type: string, callbackId: string): void;
  adsShow?(type: string, callbackId: string, userGesture: boolean): void;
  adsSlotAttach?(slotId: string, type: string, widthCss: number, callbackId: string): void;
  adsSlotRect?(slotId: string, x: number, y: number, w: number, h: number, visible: boolean): void;
  adsSlotDetach?(slotId: string): void;
  adsAppOpenEnable?(enabled: boolean): void;

  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.
  scanCode?(optionsJson: string, callbackId: string): void;
  passkeyIsAvailable?(): boolean;
  passkeyOrigin?(): string;
  passkeyAssetLinks?(): string;

  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.
  widgetSet?(cardJson: string): string;
  widgetClear?(): void;
  widgetPlacedCount?(): number;
  widgetRequestPin?(): boolean;

  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.
  setPushPresentation?(mode: string): boolean;

  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.
  /**
   * AppMint Push audience: your own stable account id after sign-in, "" on sign-out. Letters,
   * digits and _ @ . : + - (up to 128); false otherwise. Never an email or phone number.
   */
  setPushUser?(id: string): boolean;
  /** The id last set with setPushUser ("" when none). */
  getPushUser?(): string;
  /** One tag on this install (key: letters, digits, _ up to 32; value up to 128; "" removes; max 50). */
  setPushTag?(key: string, value: string): boolean;
  /** Several tags at once from a JSON object string; all saved or none. */
  setPushTags?(json: string): boolean;
  /** This install's tags as a JSON object string, e.g. '{"plan":"pro"}'. */
  getPushTags?(): string;

  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.
  pdfFromPage?(optionsJson: string, callbackId: string): void;
  pdfFromHtml?(html: string, optionsJson: string, callbackId: string): void;
  setAppIcon?(name: string): boolean;
  getAppIcon?(): string;
  getAvailableIcons?(): string;
  prepareTextRecognition?(script: string): string;
  facebookLogin?(permissionsCsv: string, callbackId: string): void;
  facebookLogout?(): void;
  getFacebookAccessToken?(): string;
  facebookLogEvent?(name: string, valueToSum: string, paramsJson: string): string;
  analyticsLogEvent?(name: string, paramsJson: string): string;
  analyticsLogScreenView?(screenName: string, screenClass: string): string;
  analyticsSetUserId?(userId: string): string;
  analyticsSetUserProperty?(name: string, value: string): string;
  analyticsSetEnabled?(enabled: boolean): void;
  revenuecat?(action: string, argsJson: string, callbackId: string): void;
  widgetUpdate?(partialJson: string): string;
  healthIsAvailable?(callbackId: string): void;
  healthRequestPermissions?(requestJson: string, callbackId: string): void;
  healthRead?(type: string, optionsJson: string, callbackId: string): void;
  healthWrite?(type: string, recordsJson: string, callbackId: string): void;
  healthOpen?(callbackId: string): void;
  isTv?(): boolean;
  getDeviceIntegrity?(): string;
  requestIntegrityToken?(nonce: string, cloudProjectNumber: string): string;
  logError?(message: string, stack: string): boolean;
  setCrashUserId?(id: string): boolean;
  getLastCrash?(): string;
  beaconStartScan?(optionsJson: string, callbackId: string): void;
  beaconStopScan?(callbackId: string): void;
  beaconIsScanning?(): boolean;

  // ── Generated from the native shell by scripts/bridge-contract.mjs ──
  // Every member is OPTIONAL: availability depends on what the creator enabled at build
  // time and on the shell version the app ships against, so feature-detect before calling.
  trackEvent?(name: string, propsJson: string): boolean;
  getInAppCampaigns?(): string;
  setInAppPresentation?(mode: string): boolean;

}

/**
 * A file shared into, or opened with, the app (`AppMint.getOpenedFile(s)`). `text` is filled for
 * small text files and `base64` for small binary ones; everything else is read via `getFile()`
 * or streamed from `url`.
 */
type AppMintOpenedFile = {
  token: string; name: string; mimeType: string; size: number;
  kind: 'image' | 'video' | 'audio' | 'document' | 'data';
  url: string; file: File | null; getFile(): Promise<File>;
  text?: string; base64?: string;
};

type AppMintAdType = 'banner' | 'mrec' | 'interstitial' | 'rewarded' | 'rewarded_interstitial' | 'app_open';
type AppMintAdCode =
  | 'no_fill' | 'network' | 'invalid_unit' | 'internal' | 'consent' | 'ad_free' | 'disabled'
  | 'not_loaded' | 'cooldown' | 'showing' | 'show_failed' | 'automatic_mode' | 'use_slot'
  | 'not_full_screen' | 'too_many_slots' | 'duplicate_slot' | 'no_element' | 'detached' | 'unknown_type'
  | 'declined';
/**
 * `appmint:ad` event phases (detail `{type, phase, slot?, code?, adCode?, message?, earned?,
 * reward?}`). `opt_in` = the shell is showing its "Watch an ad?" intro for a rewarded format
 * the page asked for without a user gesture; `declined` = the user said no to it.
 */
type AppMintAdPhase =
  | 'loading' | 'loaded' | 'failed' | 'opened' | 'impression' | 'clicked' | 'closed'
  | 'rewarded' | 'show_failed' | 'opt_in' | 'declined';

/** A product as `AppMintIAP` knows it once Google Play has answered. */
type AppMintIapProduct = { price?: string; currency?: string; type?: string; period?: string; owned?: boolean };
type AppMintIapState = {
  available: boolean; adFree: boolean;
  /** True when ANY product is owned — use `ownedIds` / `products` per product. */
  owned: boolean; ownedIds: string[]; products: Record<string, AppMintIapProduct>;
};
type AppMintIapPlan = {
  id: string; button?: string | Element | null; label?: string | null; owned?: string | null;
  group?: string | null; labelEl?: string | Element | null;
};
interface AppMintIapApi {
  available: boolean;
  started: boolean;
  state(): AppMintIapState;
  onChange(fn: (state: AppMintIapState) => void): () => void;
  isOwned(productId: string): boolean;
  owned(): string[];
  buy(productId: string): void;
  refresh(): AppMintIapApi;
  sell(productId: string, button?: string | Element | null, opts?: {
    label?: string; owned?: string; group?: string; show?: string; hide?: string;
    labelEl?: string | Element;
  }): AppMintIapApi;
  start(config?: {
    plans?: AppMintIapPlan[]; container?: string | Element | null;
    show?: unknown; hide?: unknown; hideOtherPlans?: boolean;
  }): AppMintIapApi;
}

declare global {
  type AppMintOcrScript = 'latin' | 'devanagari' | 'chinese' | 'japanese' | 'korean' | 'auto';
  interface AppMintPdfOptions {
    fileName?: string; pageSize?: 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5'; landscape?: boolean;
    margins?: number | { top?: number; right?: number; bottom?: number; left?: number };
    save?: 'downloads' | 'share' | 'base64';
  }
  interface AppMintPdfResult {
    ok: boolean; fileName?: string; pages?: number; bytes?: number; saved?: string; uri?: string;
    base64?: string; code?: string; message?: string;
  }
  /** Home-screen widget card. `layout`, `items`, `progress`, `buttons`, `refresh*` are 1.11.8+. */
  interface AppMintWidgetCard {
    title?: string; value?: string; lines?: string[]; route?: string;
    bg?: string; ink?: string; accent?: string;
    layout?: 'card' | 'list' | 'progress'; subtitle?: string; bgImage?: string;
    items?: Array<{ text: string; secondary?: string; image?: string; route?: string }>;
    progress?: { value: number; max?: number; label?: string };
    buttons?: Array<{ label: string; route?: string }>;
    refreshUrl?: string; refreshMinutes?: number;
  }

  interface Window {
    /** Native bridge. Present ONLY in the installed Android app — undefined on web/preview. */
    WebToApk?: AppMintBridge;

    /**
     * NFC availability probe. The shell registers this as its OWN JS global, NOT on the bridge —
     * `WebToApk.startScan` has always been undefined, so the old declaration on AppMintBridge
     * typechecked and then did nothing at runtime.
     *
     * Present only when the creator enabled NFC, hence optional on two levels. It reports whether
     * the adapter is on; it does not read a tag. Real NFC work goes through the standard
     * `NDEFReader` polyfill the shell installs, which is what a page should use.
     */
    AndroidNFC?: {
      /** True when an NFC adapter exists and is enabled. Toasts a prompt when it is off. */
      startScan?(): boolean;
    };

    /**
     * Shell helpers injected alongside the bridge (installed app only). setBackHandler gives
     * the page first refusal on the phone's Back button — needed ONLY by apps that change
     * screens without history.pushState (a React Router app never needs it: Back already
     * walks its history). Return true = consumed; false = normal back/exit behaviour.
     */
    AppMint?: {
      setBackHandler?(handler: (() => boolean) | null): void;
      /** Explicit save with a filename — standard `<a download>` also works unchanged. */
      downloadFile?(data: Blob | string, fileName?: string, mimeType?: string): boolean;
      saveBlob?(blob: Blob, fileName?: string): boolean;
      setDownloadName?(url: string, fileName: string): void;
      /**
       * A file shared into, or opened with, the app — null when launched normally.
       * `kind` says what it is. Images, videos, audio and files over 64 MB arrive as `url`
       * only (stream it: <video src>, <img src>, fetch()); `file` is set for data files and
       * documents, and `getFile()` fetches it for the rest. `url` stops working after
       * `releaseOpenedFile`.
       */
      getOpenedFile?(): Promise<AppMintOpenedFile | null>;
      /** Every file shared into / opened with the app this session, oldest first. */
      getOpenedFiles?(): Promise<AppMintOpenedFile[]>;
      releaseOpenedFile?(f: AppMintOpenedFile): void;
      /**
       * The app's home-screen widget card (installed app only — feature-detect). Every method
       * returns a promise. `set` saves the card and redraws every placed widget; `route` is the
       * in-app path a widget tap opens. `requestPin` opens the launcher's "Add widget" sheet
       * (Android 8+) and resolves false where the launcher refuses.
       */
      widget?: {
        set(card: AppMintWidgetCard): Promise<{ ok: boolean; placed?: number; error?: string }>;
        /** Merges `partial` into the saved card and redraws (1.11.8+ — feature-detect). */
        update?(partial: Partial<AppMintWidgetCard>): Promise<{ ok: boolean; placed?: number; error?: string }>;
        clear(): Promise<void>;
        placedCount(): Promise<number>;
        requestPin(): Promise<boolean>;
      };
      // ── 1.11.8 opt-in helpers. Each exists ONLY when the build enabled/configured it:
      // feature-detect (`window.AppMint?.pdf`) and keep working when it is absent. Failures
      // resolve `{ ok: false, code?, error?, message? }` rather than rejecting.
      /** PDF without the print dialog. `save`: 'downloads' | 'share' | 'base64'. */
      pdf?: {
        fromPage(options?: AppMintPdfOptions): Promise<AppMintPdfResult>;
        fromHtml(html: string, options?: AppMintPdfOptions): Promise<AppMintPdfResult>;
      };
      /** On-device text recognition in a chosen script. */
      textRecognition?: {
        recognize(image: Blob | HTMLImageElement | HTMLCanvasElement | ImageBitmap | string,
          options?: { script?: AppMintOcrScript; scripts?: AppMintOcrScript[] }):
          Promise<{ ok?: boolean; script: string; text: string; blocks: unknown[]; code?: string; message?: string }>;
        prepare(script: AppMintOcrScript, onProgress?: (p: { status: string; progress?: number }) => void):
          Promise<{ ok?: boolean; script: string; status: string; code?: string; message?: string }>;
      };
      /** Health Connect (build option "Health data"). Types: steps, distance, calories, heartRate, sleep, weight, exercise. */
      health?: {
        isAvailable(): Promise<{ available: boolean; status: string; read: string[]; write: string[] }>;
        requestPermissions(req: { read?: string[]; write?: string[] }): Promise<{ granted: string[]; denied: string[] }>;
        read(type: string, range: { start: number | string; end: number | string; aggregate?: boolean; limit?: number }): Promise<any>;
        write(type: string, records: Array<Record<string, unknown>>): Promise<{ ok?: boolean; ids?: string[]; code?: string; message?: string }>;
        openHealthConnect(): Promise<boolean>;
      };
      /** iBeacon / Eddystone scanning; results arrive as `appmint:beacon` window events. */
      beacons?: {
        startScan(options?: { uuids?: string[]; ibeacon?: boolean; eddystone?: boolean }): Promise<{ ok: boolean; code?: string; message?: string }>;
        stopScan(): Promise<boolean>;
        isScanning(): Promise<boolean>;
      };
      /** Device checks (heuristics) and Play Integrity tokens (build option "Device integrity checks"). */
      integrity?: {
        check(): Promise<Record<string, unknown>>;
        token(nonce: string, cloudProjectNumber?: string): Promise<{ ok: boolean; token?: string; error?: string; code?: number }>;
      };
      /** Firebase Analytics + Meta App Events, whichever the creator configured. */
      analytics?: {
        log(name: string, params?: Record<string, string | number | boolean>): Promise<{ ok: boolean; providers?: Record<string, unknown>; error?: string }>;
        setUserId(id: string | null): Promise<unknown>;
        setUserProperty(name: string, value: string | null): Promise<unknown>;
        screenView(name: string, screenClass?: string): Promise<unknown>;
        setEnabled(on: boolean): Promise<unknown>;
        providers(): Promise<Record<string, boolean>>;
      };
      /** Facebook Login (browser-tab flow) + Meta App Events. */
      facebook?: {
        login(permissions?: string[] | string): Promise<{ ok: boolean; accessToken?: string; userId?: string; expires?: number;
          grantedPermissions?: string[]; declinedPermissions?: string[]; cancelled?: boolean; error?: string }>;
        logout(): Promise<unknown>;
        getAccessToken(): Promise<{ accessToken: string; userId: string; expires: number } | null>;
        logEvent(name: string, valueToSum?: number | null, params?: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>;
      };
      /** RevenueCat subscriptions over the shell's Play Billing. */
      revenuecat?: {
        configure(options?: { appUserId?: string }): Promise<any>;
        getOfferings(): Promise<any>;
        purchase(packageOrProductId: string, options?: { offeringId?: string; offerId?: string; consumable?: boolean }): Promise<any>;
        restore(): Promise<any>;
        getCustomerInfo(): Promise<any>;
        logIn(appUserId: string): Promise<any>;
        logOut(): Promise<any>;
        getAppUserId(): Promise<string>;
      };
      /**
       * The page's own code run with the app closed (build option "Run page code while closed";
       * installed app only — feature-detect). Prefer `backgroundTasks` from `@/lib/appmintNative`.
       * In a background run `isBackgroundRun()` is true, `currentRun()` names the task, and
       * `onRun` / the `appmint:background` event fire once the page has loaded; finish with
       * `done(runId, {ok})` (a run is cut off after about 9 minutes).
       */
      background?: {
        isBackgroundRun(): boolean;
        currentRun(): { name: string; runId: string } | null;
        register(name: string, options?: { intervalMinutes?: number; requiresNetwork?: boolean; requiresCharging?: boolean }):
          Promise<{ ok: boolean; name?: string; intervalMinutes?: number; reason?: string }>;
        unregister(name: string): Promise<boolean>;
        list(): Promise<Array<{ name: string; intervalMinutes: number; requiresNetwork: boolean; requiresCharging: boolean;
          registeredAt: number; lastRunAt: number | null; lastResult: string | null }>>;
        runNow(name: string): Promise<{ ok: boolean; name?: string; reason?: string }>;
        done(runId: string, result?: { ok: boolean; retry?: boolean }): Promise<boolean>;
        onRun(cb: (run: { name: string; runId: string }) => void): void;
      };
      /**
       * Google's QR/barcode scanner screen — no camera permission. Resolves `ok:false` with
       * code 'cancelled' | 'unavailable' | 'busy' | 'failed'. Prefer `scanCode()` from
       * `@/lib/appmintNative`, which also scans on the web.
       */
      scanCode?(options?: { formats?: string[]; autoZoom?: boolean; manualInput?: boolean }): Promise<{
        ok: boolean; value?: string; displayValue?: string; format?: string; type?: string;
        url?: { url: string; title: string };
        wifi?: { ssid: string; password: string; encryption: 'wpa' | 'wep' | 'open' };
        phone?: string; email?: { address: string; subject: string; body: string };
        sms?: { phoneNumber: string; message: string }; geo?: { lat: number; lng: number };
        contact?: { name: string; organization: string; phones: string[]; emails: string[] };
        code?: 'cancelled' | 'unavailable' | 'busy' | 'failed'; message?: string;
      }>;
      /**
       * Google Play's in-app review sheet, reporting what happened ('shown' | 'not_from_play' |
       * 'quota' | 'error'). `{openStore:true}` opens the Play listing when the sheet did not
       * show. Prefer `askForReview()` from `@/lib/appmintNative`.
       */
      requestReview?(options?: { openStore?: boolean }): Promise<{
        result: 'shown' | 'not_from_play' | 'quota' | 'error'; openedStore: boolean; message?: string;
      }>;
      /**
       * "Turn on notifications": 'granted' | 'prompt' (the dialog can still show) | 'blocked'
       * (only Settings can fix it) | 'unavailable'. Prefer `getNotificationState()` /
       * `enableNotifications()` / `openNotificationSettings()` from `@/lib/appmintNative`.
       */
      getNotificationState?(): Promise<'granted' | 'prompt' | 'blocked' | 'unavailable'>;
      enableNotifications?(): Promise<{
        state: 'granted' | 'prompt' | 'blocked' | 'unavailable'; changed: boolean; openedSettings: boolean;
      }>;
      openNotificationSettings?(): Promise<boolean>;
      /**
       * Passkeys through Android's Credential Manager. `navigator.credentials.create/get`
       * ({publicKey}) also work in the app. create/get take the WebAuthn options JSON your
       * server library produces and resolve with the RegistrationResponseJSON /
       * AuthenticationResponseJSON to send back; they reject with a DOMException-style error.
       */
      passkey?: {
        isAvailable(): boolean;
        /** 'android:apk-key-hash:…' — the origin your server must accept from the app. */
        origin(): string;
        /** The assetlinks.json array for your domain's /.well-known/assetlinks.json. */
        assetLinks(): unknown[];
        create(optionsJSON: Record<string, unknown>): Promise<Record<string, unknown>>;
        get(optionsJSON: Record<string, unknown>): Promise<Record<string, unknown>>;
      };
    };

    /**
     * Page-controlled ads. Present in the installed app in BOTH Ad control modes (feature-detect;
     * absent in a browser), but it only serves when the build's Ad control is
     * "Developer-controlled": in Automatic mode every call answers `code: 'automatic_mode'` — use
     * `WebToApk.showInterstitialAd()` / `showRewardedAd()` there, or check `config().control`.
     * Every call resolves with a real outcome; `appmint:ad` streams the phases in
     * `AppMintAdPhase` (loading/loaded/failed/opened/impression/clicked/closed/rewarded/
     * show_failed/opt_in/declined) with AdMob's code. Call `show('rewarded')` from a tap: without
     * a user gesture the shell asks "Watch an ad?" first and a "No thanks" resolves
     * `{shown:false, reason:'declined'}`.
     */
    AppMintAds?: {
      config(): { control: 'automatic' | 'developer'; formats: Record<AppMintAdType, boolean> };
      isReady(type: AppMintAdType): boolean;
      load(type: AppMintAdType): Promise<{ ok: boolean; cached?: boolean; code?: AppMintAdCode; message?: string }>;
      show(type: AppMintAdType): Promise<{
        ok?: boolean; shown: boolean; earned?: boolean;
        reward?: { type: string; amount: number }; reason?: AppMintAdCode; code?: AppMintAdCode;
        message?: string;
      }>;
      appOpen: { setEnabled(on: boolean): void };
      banner: {
        /** A banner overlaid on the element (it reserves the space); resolves with the ad's CSS size. */
        attach(target: string | Element, opts?: { size?: 'banner' | 'medium_rectangle' | 'mrec'; keepHeight?: boolean }):
          Promise<{ ok: boolean; slot?: string; width?: number; height?: number; code?: AppMintAdCode; message?: string }>;
        detach(slotOrElement: string | Element): void;
      };
    };

    /**
     * Native Google sign-in as promises (installed app only; feature-detect). `signInWithGoogle`
     * uses `window.firebaseConfig._googleWebClientId` unless you pass the Web client ID, and
     * resolves with the native result (`idToken` is what Firebase / Supabase `signInWithIdToken`
     * take); it rejects with an Error whose message is the reason ('cancelled',
     * 'google_play_services_unavailable', 'failed', …).
     */
    WebToApkAuth?: {
      signInWithGoogle(serverClientId?: string): Promise<{
        ok: true; idToken: string; email: string; displayName: string; profilePictureUri: string;
      }>;
      signOutGoogle(): Promise<{ ok: true; [k: string]: unknown }>;
    };

    /**
     * Hardware-backed AES-256-GCM keys (installed app only; feature-detect, then check
     * `isAvailable()` — false unless the creator enabled the Keystore permission). Every
     * method is SYNCHRONOUS — do not `await` it. Key material never leaves secure hardware, so
     * `deleteKey()` makes everything encrypted with that key unrecoverable. Data is base64;
     * `encrypt` takes at most one I/O chunk per call.
     */
    AppMintKeystore?: {
      isAvailable(): boolean;
      generateKey(alias: string, options?: { requireAuth?: boolean; authValiditySeconds?: number; strongBox?: boolean }):
        { ok: boolean; alias?: string; hardwareBacked?: boolean; error?: string };
      hasKey(alias: string): boolean;
      listKeys(): string[];
      isHardwareBacked(alias: string): boolean;
      encrypt(alias: string, base64: string): { ok: boolean; base64?: string; error?: string };
      decrypt(alias: string, base64: string): { ok: boolean; base64?: string; error?: string };
      deleteKey(alias: string): boolean;
    };

    /**
     * Play in-app purchases without purchase code (installed app, only when the build has the
     * In-App Selling catalog on; feature-detect). Mark a button `data-iap-buy="<productId>"`
     * or call `sell(id, button)`; `onChange` reports ownership per product and returns an
     * unsubscribe function.
     */
    AppMintIAP?: AppMintIapApi;

    /** Injected when the creator wired Supabase for this app. */
    supabaseConfig?: {
      url: string;
      anonKey: string;
      /** Per-app Postgres schema; pass it to every edge-function call. */
      schema?: string;
      appId?: string;
      /** True when the backend is the creator's own Supabase instance. */
      selfHosted?: boolean;
      /** OAuth return URL; present only when Google sign-in is wired. Gate the Google button on it. */
      authRedirect?: string;
    };

    /** Injected when the Stripe connector is deployed. Secret key never reaches the client. */
    stripeConfig?: {
      mode: string;
      publishableKey: string;
      /** create-checkout edge function; sibling verify-session lives alongside it. */
      checkoutUrl: string;
    };

    /** Injected when the Razorpay connector is deployed. Amounts are integer paise. */
    razorpayConfig?: {
      keyId: string;
      mode: string;
      createOrderUrl: string;
      verifyUrl: string;
    };

    /** checkout.razorpay.com/v1/checkout.js, loaded on demand by the page. */
    Razorpay?: new (options: Record<string, unknown>) => {
      open(): void;
      on?(event: string, handler: (payload: unknown) => void): void;
    };

    /** Injected when the PayPal connector is deployed. Client secret never reaches the client. */
    paypalConfig?: {
      clientId: string;
      mode: string;
      createOrderUrl: string;
      captureUrl: string;
    };

    /** www.paypal.com/sdk/js, loaded on demand by the page. */
    paypal?: {
      Buttons?: (options: Record<string, unknown>) => { render(selector: string | HTMLElement): Promise<void> };
    };

    /** Injected when the Paystack connector is deployed. Secret key never reaches the client. */
    paystackConfig?: {
      publicKey: string;
      mode: string;
      initUrl: string;
      verifyUrl: string;
    };

    /** js.paystack.co/v2/inline.js, loaded on demand by the page. */
    PaystackPop?: new () => {
      resumeTransaction(accessCode: string, callbacks?: Record<string, unknown>): void;
    };

    /** Injected when the Flutterwave connector is deployed. Secret key never reaches the client. */
    flutterwaveConfig?: {
      publicKey: string;
      mode: string;
      initUrl: string;
      verifyUrl: string;
    };

    /** Injected when the Mercado Pago connector is deployed. Access token never reaches the client. */
    mercadopagoConfig?: {
      publicKey: string;
      mode: string;
      createPreferenceUrl: string;
      verifyUrl: string;
    };

    /** Injected when the PayFast connector is deployed. Merchant credentials never reach the client. */
    payfastConfig?: {
      mode: string;
      createPaymentUrl: string;
      statusUrl: string;
    };

    /** Injected when the Resend email connector is deployed. API key never reaches the client. */
    emailConfig?: { sendUrl: string };

    /** Injected when the Telegram owner-alerts connector is deployed. */
    telegramConfig?: { notifyUrl: string };

    /** Injected when the WhatsApp connector is deployed. */
    whatsappConfig?: { sendUrl: string };

    /** Injected when the Maps connector is deployed. */
    mapsConfig?: { apiKey: string };

    /** Injected when the webhook/automation connector is deployed. */
    webhookConfig?: { sendUrl: string; targets: string[] };

    /** Injected when the Google Sheets connector is deployed. */
    sheetsConfig?: {
      appendUrl: string;
      readUrl: string;
      updateUrl: string;
      deleteUrl: string;
    };

    /** Injected when the Google Calendar connector is deployed. */
    calendarConfig?: {
      createEventUrl: string;
      listEventsUrl: string;
      updateEventUrl: string;
      deleteEventUrl: string;
    };
  }
}
