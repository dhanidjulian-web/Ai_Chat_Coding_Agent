// AppMint native capability runtime — pipeline-owned, like appmintData.ts. The model never
// writes this file; it imports from it.
//
// CLASSIC APPMINT BUILDS ANDROID APPS ONLY. This file is shared lineage with Appwright (the
// AI-first sibling, which also exports iOS projects), so it still carries iOS rungs — Capacitor
// plugins named Appwright*, `platform() === 'ios'` branches. In a classic build they are inert:
// no classic app runs on iOS, so `platform()` is only ever 'android' or 'web' here. Read every
// "iOS" remark below as "not applicable to this app".
//
// WHY THIS EXISTS
// Every AppMint AI build is ONE static bundle that installs as an Android app AND publishes as a
// website. The native bridge (`window.WebToApk`) exists only in the installed app, so code that
// calls it directly is dead on the web half of the very same build. Before this file the model's
// only options were to ignore the native surface entirely (apps that feel like a website) or to
// hand-roll `window.WebToApk?.x?.()` guards in every component (apps that silently do nothing on
// the web).
//
// WHAT IT IS NOT
// This is not a degraded-mode shim. Every function here has a REAL implementation on BOTH
// surfaces: the native bridge in the app, and the equivalent web standard on the web
// (Vibration, Web Share, Async Clipboard, SpeechSynthesis, Fullscreen, Notifications,
// File System Access, WebAuthn, Contact Picker, visualViewport, Screen Orientation, theme-color).
// Where a capability genuinely has no web
// counterpart — a silent SMS send, reading the SMS inbox, reading the call log — it reports
// `'none'` from `can()` so the UI can decline to render that control at all, instead of showing
// a dead button. Ask `can()` first; never ship a control that cannot work on the surface it is
// rendered on.
//
// REQUEST IDS ARE DELIBERATELY NON-NUMERIC. The shell canonicalises a reply's requestId: an
// all-digits id comes back as a JS *number*, anything else as the string it was sent as. Prefixed
// ids ("am-contacts-3-k2p9") can never be all-digits, so the reply always matches by identity and
// a pending promise can never hang on a 7 !== "7" comparison.

/** The native bridge, or undefined on the web (and in preview/SSR). */
function bridge() {
  return typeof window !== 'undefined' ? window.WebToApk : undefined;
}

/**
 * The shell's JS-side helper object, installed at document start in the Android app only.
 *
 * Separate from [bridge] because it is not `@JavascriptInterface` plumbing — it is JavaScript the
 * shell injects, and `setBackHandler` in particular is the only route by which Android's back
 * gesture reaches page code at all.
 */
function shell() {
  return typeof window !== 'undefined' ? window.AppMint : undefined;
}

/**
 * The shell bridge when its single-file picker is usable in THIS build. `pickFile` is on every
 * bridge, but it answers `disabled` unless the creator enabled Native Folder Access — so the
 * method's presence alone would route every pick into a guaranteed refusal.
 */
function shellFilePicker() {
  const b = bridge();
  return b?.pickFile && b.isFolderAccessEnabled?.() === 'true' ? b : undefined;
}

/**
 * A Capacitor plugin, when the shell hosts one.
 *
 * The shell registers Capacitor's plugin layer over its own WebView and serves the page itself,
 * so `window.Capacitor` is present in the installed app and absent on the web. Verified on device:
 * `Capacitor.getPlatform() === 'android'`, served from the shell's own origin.
 *
 * The set is FIXED AT TEMPLATE BUILD TIME — the on-device build swaps assets into a precompiled
 * shell and cannot compile a plugin. The classic template (both its full and lean flavours —
 * they differ only in the SMS/contacts bridges) bakes haptics · share · clipboard · device · app ·
 * filesystem · preferences · status-bar · dialog · toast · action-sheet · keyboard ·
 * screen-orientation · network · app-launcher · browser · camera · geolocation · screen-reader ·
 * text-zoom and the vendored community plugins (keep-awake, screen-brightness, in-app-review,
 * app-update, badge, speech-recognition, file-viewer, file-transfer, calendar) plus the template's
 * own Appwright* plugins (haptics, doc scanner, system palette, live progress, widget).
 * TextToSpeech, LocalNotifications, Contacts, BluetoothLe, BiometricAuthNative
 * and the AppwrightFolders / SecureKeys / MediaSession / Nfc / Store plugins exist only in
 * Appwright's iOS export — Android serves those features through `window.WebToApk`.
 *
 * So a `capPlugin` miss is normal and expected, not a failure. Every wrapper below is written to
 * take its next real rung when one happens, and `can()` answers from the same lookup, so app code
 * never has to know which build got which plugin.
 *
 * Preference order in every wrapper below is Capacitor → shell bridge → web standard. That is not
 * a fallback chain in the banned sense: each rung is a REAL implementation, and which one exists
 * is a property of where the code is running, not of something having failed. Where nothing real
 * exists, `can()` returns `'none'` and the control must not be rendered.
 *
 * Capacitor is preferred over the shell bridge because it is the surface Appwright's iOS export
 * also has, which keeps this shared file one implementation (classic itself is Android-only).
 */
function capPlugin<T = Record<string, (...args: never[]) => Promise<unknown>>>(
  name: string
): T | undefined {
  if (!hasWin()) return undefined;
  const cap = (window as unknown as {
    Capacitor?: { Plugins?: Record<string, unknown> };
  }).Capacitor;
  return cap?.Plugins?.[name] as T | undefined;
}

/** True when running inside the installed Android app. */
export const isNativeApp = (): boolean => !!bridge();

/**
 * Where a capability will actually run.
 *   'native' — the app's native implementation
 *   'web'    — a real web standard in this browser
 *   'none'   — not available here; do NOT render the control
 */
export type Availability = 'native' | 'web' | 'none';

export type Capability =
  | 'haptic' | 'share' | 'clipboardWrite' | 'clipboardRead' | 'speak' | 'fullscreen'
  | 'notify' | 'deviceInfo'
  | 'filePick' | 'fileSave' | 'unlock'
  | 'contactPick' | 'contactList' | 'contactAdd'
  | 'smsCompose' | 'smsSend' | 'smsList' | 'callLog'
  // Native-feel set. Every one of these has a real web implementation too, so they are never
  // 'none' in a browser — but they are 'native' in the installed app, where the OS draws the
  // real control instead of the page imitating it.
  | 'toast' | 'dialog' | 'actionSheet' | 'keyboardInsets' | 'orientationLock'
  | 'network' | 'statusBar'
  // Gestures. `swipe` is pure DOM and therefore everywhere; `backGesture` is the one capability
  // in this file that is 'native' on Android, 'web' in a browser, and 'none' on iOS.
  | 'swipe' | 'backGesture'
  // The families that used to be Android-only raw bridge calls. Each now has an iOS plugin in
  // the scaffold and a wrapper below, so they are 'native' in BOTH installed apps; the web rung
  // exists where a real web standard does (Web Crypto, navigator.mediaSession, Remote Playback,
  // Web Bluetooth) and is 'none' where none does (a persistent granted folder).
  | 'folderAccess' | 'secureKeys' | 'mediaControls' | 'cast' | 'bluetooth'
  // Launcher / Home Screen shortcuts: dynamic on Android 7.1+, quick actions on iOS, none on web.
  | 'shortcuts'
  // The remaining official Capacitor plugins, baked on both stores since 2026-09-05.
  | 'appLaunch' | 'browser' | 'camera' | 'photos' | 'location' | 'screenReader' | 'textZoom'
  | 'privacyScreen' | 'fileViewer' | 'fileTransfer' | 'calendarRead' | 'calendarWrite'
  | 'backgroundSync' | 'motion'
  // Popular-app feature layer (2026-09-05).
  | 'keepAwake' | 'brightness' | 'review' | 'appUpdate' | 'badge' | 'speech' | 'hapticPatterns'
  | 'docScanner' | 'systemPalette' | 'liveProgress' | 'widget' | 'nfc' | 'pip' | 'shareTarget'
  | 'notificationActions'
  // Opening the app's own notification settings ("Turn on notifications" for a blocked user).
  | 'notificationSettings'
  // Barcode / QR. Web-only by design: see the scanBarcode section for why the Capacitor plugin
  // is the wrong trade here. 'web' is the real rung, not a downgrade.
  | 'barcodeScan'
  // One-call full-screen scanner (scanCode): Google's scanner screen in the app, a camera
  // overlay over the page on the web.
  | 'codeScanner'
  // Passkeys (WebAuthn): Credential Manager in the app, the browser's own WebAuthn on the web.
  | 'passkeys'
  // W3C layer (2026-09-23). SMS one-time codes (WebOTP) and copying an IMAGE to the clipboard.
  | 'otp' | 'clipboardImage'
  // Bridge expansion round 2 (2026-09-23).
  // torch — the flashlight (Torch plugin, Android). gallery — save a photo/video into the
  // phone's gallery (AppwrightGallery, Android; a download on the web). ocr — on-device text
  // recognition (TextDetector: the Android shell over ML Kit, Chrome's own behind a flag).
  // idle — IdleDetector (the Android shell; Chrome). fileHandles — showOpenFilePicker /
  // showSaveFilePicker / showDirectoryPicker with writable handles (the Android shell over SAF;
  // Chromium desktop). relatedApps — navigator.getInstalledRelatedApps (the Android shell;
  // Chrome on Android).
  | 'torch' | 'gallery' | 'ocr' | 'idle' | 'fileHandles' | 'relatedApps'
  // In-app messages (2026-10-03): the creator's campaigns, shown by the app on its own triggers
  // (trackEvent, onInAppMessage, setInAppPresentation). Android app only; nothing on the web.
  | 'inAppMessages';

const hasWin = () => typeof window !== 'undefined';
const nav = (): Navigator | undefined => (hasWin() ? window.navigator : undefined);

export type Platform = 'android' | 'ios' | 'web';

/**
 * Which surface this code is running on.
 *
 * Reads Capacitor's own platform when present, so this keeps answering correctly once the shell
 * moves onto Capacitor and on the exported iOS build. Falls back to the presence of our Android
 * bridge, then to plain web.
 */
export function platform(): Platform {
  if (!hasWin()) return 'web';
  const cap = (window as unknown as { Capacitor?: { getPlatform?(): string } }).Capacitor;
  const p = cap?.getPlatform?.();
  if (p === 'ios' || p === 'android') return p;
  return bridge() ? 'android' : 'web';
}

/**
 * Capabilities iOS cannot provide, at any price, because no API exists.
 *
 * Apple offers no way to send an SMS without the user pressing send in the system composer, no
 * read access to the message store, and none to the call history. This is a platform fact, not a
 * missing plugin and not something a future version fixes — so `can()` reports `none` and the UI
 * must not render those controls on iOS. `smsCompose` is deliberately absent from this list: the
 * system composer (MFMessageComposeViewController) is fully supported.
 */
const IOS_IMPOSSIBLE: ReadonlySet<Capability> = new Set<Capability>([
  'smsSend', 'smsList', 'callLog',
]);

/**
 * Which Capacitor plugin, if any, serves each capability.
 *
 * Builds bake DIFFERENT plugin sets (see capPlugin), and this map is what makes that invisible to
 * app code. The names only Appwright's iOS export bakes (TextToSpeech, LocalNotifications,
 * Contacts, BluetoothLe, the Appwright* folder/keystore/media/NFC plugins) are never present in a
 * classic app: the lookup misses and the wrapper takes the shell-bridge or web rung, so `can()`
 * keeps answering the truth.
 *
 * Preferences is deliberately NOT here and has no wrapper. localStorage is already real and
 * persistent on all three surfaces, and a second store would split one app's state across two
 * places for no gain — a wrapper nobody should call is worse than an absent one.
 */
const CAP_PLUGIN_FOR: Partial<Record<Capability, string>> = {
  haptic: 'Haptics',
  share: 'Share',
  clipboardWrite: 'Clipboard',
  clipboardRead: 'Clipboard',
  speak: 'TextToSpeech',
  notify: 'LocalNotifications',
  deviceInfo: 'Device',
  contactPick: 'Contacts',
  contactList: 'Contacts',
  contactAdd: 'Contacts',
  toast: 'Toast',
  dialog: 'Dialog',
  actionSheet: 'ActionSheet',
  keyboardInsets: 'Keyboard',
  orientationLock: 'ScreenOrientation',
  network: 'Network',
  statusBar: 'StatusBar',
  // Appwright's iOS-export plugins — never in a classic app; Android uses the shell bridge.
  folderAccess: 'AppwrightFolders',
  secureKeys: 'AppwrightSecureKeys',
  mediaControls: 'AppwrightMediaSession',
  cast: 'AppwrightMediaSession',
  bluetooth: 'BluetoothLe',
  shortcuts: 'AppwrightShortcuts',
  appLaunch: 'AppLauncher',
  browser: 'Browser',
  camera: 'Camera',
  photos: 'Camera',
  location: 'Geolocation',
  screenReader: 'ScreenReader',
  textZoom: 'TextZoom',
  privacyScreen: 'PrivacyScreen',
  fileViewer: 'FileViewer',
  fileTransfer: 'FileTransfer',
  calendarRead: 'Calendar',
  calendarWrite: 'Calendar',
  // iOS only; Android is served by the shell's WorkManager bridge (`work*`).
  backgroundSync: 'BackgroundRunner',
  keepAwake: 'KeepAwake',
  brightness: 'ScreenBrightness',
  review: 'InAppReview',
  appUpdate: 'AppUpdate',
  badge: 'Badge',
  speech: 'SpeechRecognition',
  hapticPatterns: 'AppwrightHaptics',
  docScanner: 'AppwrightDocScanner',
  // Android-only plugins (no iOS API / no extension target in the scaffold).
  systemPalette: 'AppwrightSystemPalette',
  liveProgress: 'AppwrightLiveProgress',
  widget: 'AppwrightWidget',
  // iOS only; Android has the shell's NFC bridge and NDEFReader polyfill.
  nfc: 'AppwrightNfc',
  // Android only (round 2): the flashlight and save-to-gallery plugins.
  torch: 'Torch',
  gallery: 'AppwrightGallery',
};

/**
 * Ask before rendering a control. Cheap and synchronous. In a classic app the answer is 'native'
 * (the installed Android app), 'web' (a real web standard in the browser) or 'none'; the iOS
 * branches inside never apply here.
 */
export function can(cap: Capability): Availability {
  if (platform() === 'ios' && IOS_IMPOSSIBLE.has(cap)) return 'none';

  // A Capacitor plugin is a native implementation, so it must be reported as 'native'. Missing
  // this made can() answer 'web' for capabilities Capacitor was actually serving, which is not
  // just cosmetic: UI copy and analytics branch on it.
  const pluginName = CAP_PLUGIN_FOR[cap];
  if (pluginName && capPlugin(pluginName)) return 'native';

  const b = bridge();
  const n = nav();
  switch (cap) {
    case 'haptic':
      if (b?.vibrate) return 'native';
      return n && 'vibrate' in n ? 'web' : 'none';
    case 'share':
      if (b?.shareNative) return 'native';
      return n && 'share' in n ? 'web' : 'none';
    case 'clipboardWrite':
      if (b?.copyToClipboard) return 'native';
      return n?.clipboard?.writeText ? 'web' : 'none';
    case 'clipboardRead':
      if (b?.readClipboard) return 'native';
      // readText is Chromium-only and permission-gated; absent in Firefox/Safari.
      return n?.clipboard?.readText ? 'web' : 'none';
    case 'speak':
      if (b?.ttsSpeak) return 'native';
      return hasWin() && 'speechSynthesis' in window ? 'web' : 'none';
    case 'fullscreen':
      if (b?.setFullscreen) return 'native';
      return typeof document !== 'undefined' && !!document.documentElement.requestFullscreen
        ? 'web' : 'none';
    case 'notify':
      if (b?.notify) return 'native';
      return hasWin() && 'Notification' in window ? 'web' : 'none';
    case 'deviceInfo':
      return b?.getDeviceInfo ? 'native' : hasWin() ? 'web' : 'none';
    case 'filePick':
      // The shell's document picker answers `disabled` unless the build enabled Native Folder
      // Access — the method exists on every bridge, so its presence alone is not the signal.
      // Without it the page's own `<input type=file>` is the real picker (the shell serves it).
      if (shellFilePicker()) return 'native';
      return typeof document !== 'undefined' ? 'web' : 'none';
    case 'fileSave':
      // The shell turns `<a download>` into Android's Save-as sheet, so the web path is real
      // in the app too; the native branch only adds picker-based writes.
      return typeof document !== 'undefined' ? (shellFilePicker() ? 'native' : 'web') : 'none';
    case 'unlock':
      if (b?.isBiometricAvailable) return 'native';
      // Face ID / Touch ID, via the plugin the iOS scaffold links.
      if (capPlugin('BiometricAuthNative')) return 'native';
      // iOS WITHOUT that plugin: `window.PublicKeyCredential` EXISTS in WKWebView, so the plain
      // check below answered 'web' and the UI drew an unlock control that could never work — the
      // WebAuthn ceremony needs a valid RP ID from an https origin with associated domains, and
      // Capacitor serves `capacitor://localhost`. Kept as the honest answer for any iOS build
      // that ships without the plugin.
      if (platform() === 'ios') return 'none';
      return !!(hasWin() && window.PublicKeyCredential) ? 'web' : 'none';
    case 'contactPick':
      if (b?.pickContact) return 'native';
      // Contact Picker API — Chrome on Android only.
      return n && 'contacts' in n ? 'web' : 'none';
    case 'contactList':
      return b?.listContacts ? 'native' : 'none';
    case 'contactAdd':
      return b?.addContact ? 'native' : 'none';
    case 'smsCompose':
      // `sms:` links open the real messaging app on Android AND on mobile web.
      return b?.composeSms ? 'native' : hasWin() ? 'web' : 'none';
    case 'smsSend':
      return b?.sendSms ? 'native' : 'none';
    case 'smsList':
      return b?.listSms ? 'native' : 'none';
    case 'callLog':
      return b?.listCallLog ? 'native' : 'none';

    // Native-feel set. The Capacitor branch above already answered 'native' where the plugin is
    // baked in; what is left is the web rung, and each of these has a real one. None of them is
    // ever 'none' in a browser, so a control built on them renders on every surface — the only
    // thing that changes is whether the OS or the page draws it.
    case 'toast':
    case 'actionSheet':
      return hasWin() && typeof document !== 'undefined' ? 'web' : 'none';
    case 'dialog':
      return hasWin() ? 'web' : 'none';
    case 'keyboardInsets':
      return hasWin() && 'visualViewport' in window ? 'web' : 'none';
    case 'orientationLock':
      // `lock` is absent from the DOM lib's ScreenOrientation, so it is read structurally rather
      // than through the typed member — the API is real, the type just does not describe it.
      return hasWin() && typeof (window.screen?.orientation as unknown as
        { lock?: unknown } | undefined)?.lock === 'function' ? 'web' : 'none';
    case 'network':
      return n && 'onLine' in n ? 'web' : 'none';
    case 'statusBar':
      // `<meta name="theme-color">` is the real web equivalent: Android Chrome paints the system
      // bars with it, and iOS Safari tints the notch area in a standalone PWA.
      return typeof document !== 'undefined' ? 'web' : 'none';

    case 'folderAccess':
      // A whole folder the user grants once: the shell's SAF bridge, when the build enabled it
      // (Native Folder Access in the Access step). No web rung, deliberately:
      // the File System Access API's persistent directory handles are Chromium-desktop only, and
      // a 'web' that is true on one desktop browser would draw the control on every phone browser
      // where it cannot work.
      return b?.isFolderAccessEnabled?.() === 'true' ? 'native' : 'none';
    case 'secureKeys':
      if (b?.isKeystoreEnabled?.() === 'true') return 'native';
      // Web Crypto with a NON-EXTRACTABLE key kept in IndexedDB: a real browser-managed store,
      // reported as 'web' because that is what it is — secureKeys.isHardwareBacked() answers
      // false there, and the UI must not say "hardware" on that surface.
      return hasWin() && !!window.crypto?.subtle && !!window.indexedDB ? 'web' : 'none';
    case 'mediaControls':
      // Android: the shell installs `navigator.mediaSession` over its bridge only when the build
      // enabled the media notification, and marks it. The bridge methods exist either way and
      // silently no-op when it is off — so the marker, not the method, is the honest signal.
      if (b?.setMediaMetadata) return mediaPolyfilled() ? 'native' : 'none';
      return n && 'mediaSession' in n ? 'web' : 'none';
    case 'cast':
      if (b?.castMedia) return 'native';   // the system "Cast to…" chooser
      // Web: the Remote Playback API (Chrome, Safari) — `video.remote.prompt()`.
      return hasWin() && typeof HTMLMediaElement !== 'undefined' &&
        'remote' in HTMLMediaElement.prototype ? 'web' : 'none';
    case 'bluetooth':
      // `navigator.bluetooth` is the shell's own on Android (installed when the build enabled
      // Bluetooth), this file's over the BluetoothLe plugin on iOS (answered above), and
      // Chrome's on the web.
      return n && 'bluetooth' in n ? (b ? 'native' : 'web') : 'none';
    case 'shortcuts':
      // No web rung: a browser has no launcher icon to long-press.
      return b?.setAppShortcuts ? 'native' : 'none';

    // The remaining official plugins (the Capacitor branch above answered 'native' where the
    // plugin is baked, i.e. in both installed apps). What is left is each one's honest web rung.
    case 'appLaunch':
      // A custom-scheme link opens the matching app from mobile web too; it cannot be probed.
      return hasWin() ? 'web' : 'none';
    case 'browser':
      return hasWin() ? 'web' : 'none';               // a new tab
    case 'barcodeScan':
      // Both halves are needed: the detector to decode and a camera to point at something.
      return barcodeCtor() && n?.mediaDevices?.getUserMedia ? 'web' : 'none';
    case 'codeScanner':
      if (shell()?.scanCode) return 'native';
      return barcodeCtor() && n?.mediaDevices?.getUserMedia && typeof document !== 'undefined' ? 'web' : 'none';
    case 'passkeys': {
      const pk = shell()?.passkey;
      if (pk) return pk.isAvailable() ? 'native' : 'none';
      // An iOS WebView serves capacitor://localhost, which no relying party can be — see 'unlock'.
      if (platform() === 'ios') return 'none';
      return hasWin() && typeof window.PublicKeyCredential === 'function' && window.isSecureContext &&
        !!n?.credentials ? 'web' : 'none';
    }
    case 'camera':
    case 'photos':
      return typeof document !== 'undefined' ? 'web' : 'none';   // <input type=file accept=image/*>
    case 'location':
      return n && 'geolocation' in n ? 'web' : 'none';
    case 'screenReader':
      return 'none';                                   // no web API can ask whether one is on
    case 'textZoom':
      return typeof document !== 'undefined' ? 'web' : 'none';   // root font-size scaling
    case 'privacyScreen':
      if (b?.setSecureScreen) return 'native';
      return 'none';
    case 'fileViewer':
      return hasWin() ? 'web' : 'none';               // opens the URL in a new tab
    case 'fileTransfer':
      return hasWin() && typeof fetch === 'function' ? 'web' : 'none';
    case 'calendarWrite':
      return typeof document !== 'undefined' ? 'web' : 'none';   // downloads an .ics the user opens
    case 'calendarRead':
      return 'none';
    case 'backgroundSync':
      if (b?.workEnqueueOnline) return 'native';
      return 'none';
    case 'motion':
      return hasWin() && 'DeviceMotionEvent' in window ? 'web' : 'none';

    // Popular-app feature layer. Plugins answered 'native' above; the rest is each one's rung.
    case 'keepAwake':
      // The Screen Wake Lock API — Chrome, Safari 16.4+.
      return n && 'wakeLock' in n ? 'web' : 'none';
    case 'badge':
      // The Badging API — installed PWAs on Chrome/Edge desktop and Safari 17 on macOS/iOS.
      return n && 'setAppBadge' in n ? 'web' : 'none';
    case 'brightness':
    case 'review':
    case 'appUpdate':
    case 'docScanner':
    case 'systemPalette':
    case 'liveProgress':
    case 'widget':
      return 'none';
    case 'speech':
      // Chrome's Web Speech API; absent in Firefox and in both WebViews (which use the plugin).
      return hasWin() && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) ? 'web' : 'none';
    case 'hapticPatterns':
      // A timed vibrate() pattern is the real web rung; the shell bridge takes the same array.
      if (b?.vibratePattern) return 'native';
      return n && 'vibrate' in n ? 'web' : 'none';
    case 'nfc':
      // Android: the shell's NDEFReader polyfill (or Chrome's own Web NFC on the web).
      return hasWin() && 'NDEFReader' in window ? (b ? 'native' : 'web') : 'none';
    case 'pip':
      if (b?.enterPip) return 'native';
      return typeof document !== 'undefined' && 'pictureInPictureEnabled' in document ? 'web' : 'none';
    case 'shareTarget':
      return b?.getSharedText ? 'native' : 'none';
    case 'notificationActions':
      return b?.notify ? 'native' : 'none';
    case 'notificationSettings':
      // Only the Android app can open its own notification settings screen.
      return b?.openNotificationSettings ? 'native' : 'none';

    // Round 2. The plugins (torch, gallery) answered 'native' above where baked.
    case 'torch':
      return 'none';                                   // no web API lights the flash without a camera stream
    case 'gallery':
      // A download the user keeps — in a browser only; an app without the plugin has none.
      return platform() === 'web' && typeof document !== 'undefined' ? 'web' : 'none';
    case 'ocr': {
      const td = hasWin() ? (window as unknown as { TextDetector?: { __amOcr?: boolean } }).TextDetector : undefined;
      if (!td) return 'none';
      return td.__amOcr ? 'native' : 'web';
    }
    case 'idle':
      if (!hasWin() || typeof (window as unknown as { IdleDetector?: unknown }).IdleDetector !== 'function') return 'none';
      return b ? 'native' : 'web';
    case 'fileHandles': {
      const save = hasWin() ? (window as unknown as { showSaveFilePicker?: ((...a: unknown[]) => unknown) & { __amFs?: boolean } }).showSaveFilePicker : undefined;
      if (typeof save !== 'function') return 'none';
      return save.__amFs ? 'native' : 'web';
    }
    case 'relatedApps':
      if (!n || typeof (n as unknown as { getInstalledRelatedApps?: unknown }).getInstalledRelatedApps !== 'function') return 'none';
      return b ? 'native' : 'web';

    case 'inAppMessages':
      // The shell decides and draws them; a browser has no campaigns at all.
      return b?.trackEvent && b?.getInAppCampaigns ? 'native' : 'none';
    case 'otp':
      // WebOTP. The Android shell implements it over Google's SMS User Consent sheet (marked
      // __appmint); Chrome on Android has its own. iOS has no API at all — a one-time-code field
      // there is filled by the keyboard's suggestion (autocomplete="one-time-code"), so 'none'.
      if (!hasWin() || typeof (window as unknown as { OTPCredential?: unknown }).OTPCredential !== 'function') return 'none';
      return b ? 'native' : 'web';
    case 'clipboardImage': {
      // iOS: the Clipboard plugin writes a real image to UIPasteboard. Android: the shell's
      // navigator.clipboard.write (the Clipboard plugin there copies an image as TEXT, so it is
      // deliberately not used). Web: the Async Clipboard API with a ClipboardItem.
      if (platform() === 'ios' && capPlugin('Clipboard')) return 'native';
      const c = n?.clipboard as unknown as { write?: unknown; __amClipboard?: boolean } | undefined;
      if (!c?.write || typeof (window as unknown as { ClipboardItem?: unknown }).ClipboardItem !== 'function') return 'none';
      return c.__amClipboard ? 'native' : 'web';
    }

    case 'swipe':
      // Pointer Events, so it is the same real implementation on every surface.
      return hasWin() && typeof window.PointerEvent === 'function' ? 'web' : 'none';

    case 'backGesture':
      // Android delivers the edge swipe / back press to the page through the shell's handler.
      if (shell()?.setBackHandler) return 'native';
      // iOS does NOT. WKWebView's interactive back gesture is off unless the host view controller
      // sets `allowsBackForwardNavigationGestures`, which the exported scaffold does not, so
      // nothing there ever produces a back event for the page to consume. Reported honestly as
      // 'none' rather than armed and silent: under this file's own rule that means an iOS build
      // must render its own back control — which is what an iOS app does anyway.
      if (platform() === 'ios') return 'none';
      return hasWin() && !!window.history ? 'web' : 'none';

    default:
      return 'none';
  }
}

/** True when the capability will do something real here. */
export const has = (cap: Capability): boolean => can(cap) !== 'none';

// ── async plumbing ───────────────────────────────────────────────────────────────────────────

let seq = 0;
/** Never all-digits, so the shell echoes it back as the same string. */
function rid(prefix: string): string {
  seq += 1;
  return `am-${prefix}-${seq}-${Math.random().toString(36).slice(2, 8)}`;
}

interface Replied { requestId?: unknown }

/**
 * Wait for the `appmint:<topic>` reply carrying our requestId. Always detaches its listener,
 * including on timeout, so a cancelled picker cannot leak a listener per attempt.
 */
function awaitEvent<T>(
  topic: string, requestId: string, pick: (detail: Record<string, unknown>) => T, timeoutMs = 120_000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (!hasWin()) { reject(new Error(`appmint: no window for ${topic}`)); return; }
    const name = `appmint:${topic}`;
    let timer = 0;
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<Replied>).detail;
      if (!detail || String(detail.requestId) !== requestId) return;   // another caller's reply
      cleanup();
      try { resolve(pick(detail as unknown as Record<string, unknown>)); }
      catch (err) { reject(err); }
    };
    const cleanup = () => {
      window.removeEventListener(name, onEvent as EventListener);
      if (timer) window.clearTimeout(timer);
    };
    window.addEventListener(name, onEvent as EventListener);
    timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`appmint: ${topic} timed out`));
    }, timeoutMs);
  });
}

// ── feel: haptics, share, clipboard, speech, fullscreen, nav ─────────────────────────────────

export type HapticKind = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

/**
 * Duration/pattern per kind, in ms — short and dry, the way a native control feels.
 *
 * Patterns are in the W3C order — buzz, pause, buzz, … — which is what BOTH consumers take:
 * `navigator.vibrate` by spec, and the shell's `vibratePattern`, which converts to Android's
 * wait-first waveform itself (it prepends the 0). A leading 0 here was a zero-length buzz on the
 * web and, after the shell's own 0, a silent first pulse in the app.
 */
const HAPTIC_MS: Record<HapticKind, number | number[]> = {
  light: 10, medium: 20, heavy: 35, selection: 8,
  success: [18, 60, 18], warning: [26, 90, 26], error: [40, 70, 40, 70, 40],
};

/**
 * The single highest-value native tell. Call it on every meaningful tap — primary buttons,
 * toggles, tab switches, sheet open/close, pull-to-refresh commit, destructive confirm.
 * Silent and harmless where unsupported, so it never needs a guard at the call site.
 */
export function haptic(kind: HapticKind = 'light'): void {
  const ms = HAPTIC_MS[kind];

  // Capacitor first: this is the surface that also exists on iOS, so an app written against it
  // needs no second native implementation there.
  const cap = capPlugin<{
    impact(o: { style: string }): Promise<void>;
    notification(o: { type: string }): Promise<void>;
    selectionChanged(): Promise<void>;
  }>('Haptics');
  if (cap) {
    if (kind === 'success' || kind === 'warning' || kind === 'error') {
      void cap.notification({ type: kind.toUpperCase() });
    } else if (kind === 'selection') {
      void cap.selectionChanged();
    } else {
      void cap.impact({ style: kind.toUpperCase() });
    }
    return;
  }

  const b = bridge();
  if (b?.vibrate || b?.vibratePattern) {
    if (Array.isArray(ms)) b.vibratePattern?.(JSON.stringify(ms));
    else b.vibrate?.(ms);
    return;
  }
  const n = nav();
  if (n && 'vibrate' in n) { try { n.vibrate(ms); } catch { /* user-gesture gated */ } }
}

/** The shell's own click tick — native only, and only when the app enabled sounds. */
export const click = (): void => { bridge()?.playClick?.(); };

/**
 * The looping background track the creator chose when they built the app, 0..100.
 *
 * `musicVolume()` returns -1 when this app ships no music — on the web, or in a build where the
 * creator picked no file. Check it before drawing a music slider: a settings control that moves
 * and changes nothing is worse than no control.
 *
 *     const v = musicVolume();
 *     if (v >= 0) showMusicSlider(v, setMusicVolume);
 */
export const musicVolume = (): number => bridge()?.getMusicVolume?.() ?? -1;

/** Set the background-music level, 0..100. No-op when the app ships no music. */
export const setMusicVolume = (percent: number): void => {
  bridge()?.setMusicVolume?.(Math.max(0, Math.min(100, Math.round(percent))));
};

export interface ShareInput { title?: string; text?: string; url?: string; files?: File[] }

/** Native Android share sheet in the app; Web Share API on the web. */
export async function share(input: ShareInput): Promise<boolean> {
  const { title = '', text = '', url = '', files } = input;

  const cap = capPlugin<{ share(o: Record<string, unknown>): Promise<unknown> }>('Share');
  if (cap && !files?.length) {
    // Only the fields the caller actually gave. The Android plugin (share 8.0.1) treats a PRESENT
    // `url` as something to validate — `url != null && !isFileUrl && !isHttpUrl` rejects with
    // "Unsupported url" — so passing the '' default for a text-only share made every such share
    // reject before the sheet opened, and this function reported it as a user cancel.
    const payload: Record<string, string> = {};
    if (title) payload.title = title;
    if (text) payload.text = text;
    if (url) payload.url = url;
    // Capacitor rejects when the user dismisses the sheet; that is a cancel, not a failure, and
    // this function's contract is to report it as `false`.
    try { await cap.share(payload); return true; } catch { return false; }
  }

  const b = bridge();
  if (files?.length && b?.shareFiles) {
    // The shell writes each file to its cache and shares it through its FileProvider, so it needs
    // the BYTES — `[{name, mimeType, base64}]`. Sending the names alone made every file share fail.
    let payload: string;
    try {
      payload = JSON.stringify(await Promise.all(files.map(async (f) => ({
        name: f.name, mimeType: f.type || 'application/octet-stream',
        base64: bytesToB64(new Uint8Array(await f.arrayBuffer())),
      }))));
    } catch { return false; }
    // A file share carries no url field; the link rides in the text instead of vanishing.
    const body = url ? (text ? `${text}\n${url}` : url) : text;
    return b.shareFiles(payload, title, body) ?? false;
  }
  if (b?.shareNative) { b.shareNative(title, text, url); return true; }
  const n = nav();
  if (n && 'share' in n) {
    try {
      if (files?.length && n.canShare?.({ files })) await n.share({ title, text, files });
      else await n.share({ title, text, url });
      return true;
    } catch { return false; }                       // user dismissed the sheet
  }
  return false;
}

export async function copy(text: string): Promise<boolean> {
  const cap = capPlugin<{ write(o: { string: string }): Promise<void> }>('Clipboard');
  if (cap) { await cap.write({ string: text }); return true; }

  const b = bridge();
  if (b?.copyToClipboard) return b.copyToClipboard(text) ?? false;
  const c = nav()?.clipboard;
  if (!c?.writeText) return false;
  try { await c.writeText(text); return true; } catch { return false; }
}

export async function paste(): Promise<string> {
  const cap = capPlugin<{ read(): Promise<{ value: string }> }>('Clipboard');
  if (cap) {
    try { return (await cap.read()).value; }
    catch (e) {
      // The Android plugin (clipboard 8.0.1) REJECTS an empty clipboard with "There is no data on
      // the clipboard". That is this function's '' answer — the same one the shell bridge and the
      // web rung give — not a failure, and surfacing it as a throw made every "Paste" control
      // blow up the first time it was pressed on a fresh device. Anything else still propagates.
      if (/no data/i.test(String((e as Error)?.message ?? e))) return '';
      throw e;
    }
  }

  const b = bridge();
  if (b?.readClipboard) return b.readClipboard() ?? '';
  const c = nav()?.clipboard;
  // Not supported here at all — ask can('clipboardRead') before offering a paste control.
  if (!c?.readText) throw new Error('appmint: clipboard read unavailable — check can("clipboardRead")');
  // A rejection here is a denied permission, which the caller must be able to tell apart from an
  // empty clipboard; swallowing it to '' makes "you denied access" look like "nothing to paste".
  return c.readText();
}

export interface SpeakOptions { lang?: string; rate?: number; pitch?: number }

/** Android TTS in the app; SpeechSynthesis on the web. */
export function speak(text: string, opts: SpeakOptions = {}): void {
  const { lang = '', rate = 1, pitch = 1 } = opts;

  // Android: the shell's own engine (the same one speechSynthesis uses), so a page mixing the
  // two queues on ONE engine. The TextToSpeech plugin is baked on Android too since 2026-09-23,
  // for imported code that calls it directly — this wrapper keeps the shell first.
  const b = bridge();
  if (b?.ttsSpeak) { b.ttsSpeak(text, lang, rate, pitch, rid('tts')); return; }

  const cap = capPlugin<{ speak(o: Record<string, unknown>): Promise<void> }>('TextToSpeech');
  if (cap) { void cap.speak({ text, lang: lang || undefined, rate, pitch }); return; }
  if (hasWin() && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text);
    if (lang) u.lang = lang;
    u.rate = rate; u.pitch = pitch;
    window.speechSynthesis.speak(u);
  }
}

export function stopSpeaking(): void {
  // Symmetric with speak(): on iOS speech runs through the TextToSpeech plugin, so a stop that
  // never asked the plugin left the Stop button doing nothing while the voice carried on.
  const b = bridge();
  if (b?.ttsCancel) { b.ttsCancel(); return; }

  const cap = capPlugin<{ stop(): Promise<void> }>('TextToSpeech');
  if (cap) { void cap.stop().catch(() => {}); return; }
  if (hasWin() && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

export const fullscreen = {
  async enter(): Promise<void> {
    const b = bridge();
    if (b?.setFullscreen) { b.setFullscreen(true); return; }
    if (typeof document !== 'undefined') {
      try { await document.documentElement.requestFullscreen(); } catch { /* gesture-gated */ }
    }
  },
  async exit(): Promise<void> {
    const b = bridge();
    if (b?.setFullscreen) { b.setFullscreen(false); return; }
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { /* already exiting */ }
    }
  },
  isOn(): boolean {
    const b = bridge();
    if (b?.isFullscreen) return b.isFullscreen() ?? false;
    return typeof document !== 'undefined' && !!document.fullscreenElement;
  },
};

/**
 * Drives the shell's own top loading bar for a transition it cannot see on its own — one where
 * nothing in the DOM changes until data arrives. ALWAYS pair them (try/finally).
 *
 * On the web there is no shell chrome to drive, so these do nothing: the page owns its own
 * loading UI there. Render your skeleton/spinner as usual either way — this is the native
 * chrome ON TOP of that, not a replacement for it.
 */
export const navStart = (): void => { bridge()?.navStarted?.(); };
export const navEnd = (): void => { bridge()?.navSettled?.(); };

// ── device identity ──────────────────────────────────────────────────────────────────────────

export interface DeviceInfo {
  platform: Platform;
  /** Android: e.g. 'Pixel 8'. Absent on the web (a browser does not say). */
  model?: string;
  /** Android: e.g. '14'. On the web this is the browser's user-agent string. */
  osVersion?: string;
  /** Android: the app's version name, e.g. '1.4.0'. */
  appVersion?: string;
  manufacturer?: string;
  language: string;
  [k: string]: unknown;
}

/**
 * Stays SYNCHRONOUS on purpose — it is read during render, and every generated app in the wild
 * calls it that way. Capacitor's Device plugin is async, so the richer detail it offers is served
 * by [Device.getInfo] instead; what matters here is that `platform` is never wrong.
 *
 * It used to be typed `'android' | 'web'` and report `'web'` on iOS, where there is no shell
 * bridge — so an exported iOS app took the web branch of every check written against it. The
 * platform is asked of [platform], which reads Capacitor's own answer.
 */
export function deviceInfo(): DeviceInfo {
  const b = bridge();
  if (b?.getDeviceInfo) {
    // Deliberately NOT wrapped in try/catch. If the shell is present but its payload is
    // unparseable that is a real defect, and reporting `platform: 'web'` from inside the Android
    // app would be worse than throwing: callers branch on `platform`, so they would take the web
    // path while running natively and the bug would surface far from its cause.
    const parsed = JSON.parse(b.getDeviceInfo() || '{}') as Record<string, unknown>;
    // The shell nests its answer (`hardware.model`, `android.release`, `app.versionName`, plus
    // screen/runtime/installId). The documented top-level fields are lifted out of it, so
    // `deviceInfo().model` is the phone's model rather than undefined; the nested groups stay.
    const group = (k: string) => (parsed[k] && typeof parsed[k] === 'object' ? parsed[k] as Record<string, unknown> : {});
    const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
    return {
      ...parsed,
      platform: 'android',
      language: nav()?.language ?? 'en',
      model: str(parsed.model) ?? str(group('hardware').model),
      manufacturer: str(parsed.manufacturer) ?? str(group('hardware').manufacturer),
      osVersion: str(parsed.osVersion) ?? str(group('android').release),
      appVersion: str(parsed.appVersion) ?? str(group('app').versionName),
    };
  }
  return { platform: platform(), language: nav()?.language ?? 'en', osVersion: nav()?.userAgent };
}

const INSTALL_ID_KEY = 'appmint.installId';

/**
 * Stable per-install id. Native: the shell's own id. Web: a real random id persisted in
 * localStorage — per browser profile, cleared when the user clears site data, which is the
 * honest web equivalent of an install.
 */
export function installId(): string {
  const b = bridge();
  const fromShell = b?.getInstallId?.();
  if (fromShell) return fromShell;
  if (!hasWin()) throw new Error('appmint: installId needs a browser context');
  // Not caught: when storage is denied (private mode, blocked site data) there is no stable
  // per-install id to give. Returning '' would hand every such visitor the SAME blank id, which
  // silently corrupts anything keyed on it — licences, analytics, per-device limits. The caller
  // must decide what to do about it, so the failure has to reach them.
  const existing = window.localStorage.getItem(INSTALL_ID_KEY);
  if (existing) return existing;
  const made = (window.crypto?.randomUUID?.() ??
    `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  window.localStorage.setItem(INSTALL_ID_KEY, made);
  return made;
}

// ── notifications ────────────────────────────────────────────────────────────────────────────

export interface NotifyInput {
  title: string; body?: string;
  /** Image URL shown beside the text (https:// or data:) — Android's large icon, the web's icon. */
  icon?: string;
  /** A second post with the same tag replaces the first. */
  tag?: string;
  /**
   * Anything JSON-serialisable (under 16 KB) handed back by onNotificationClick when the user
   * taps this notification — e.g. `{orderId: 7}` to open the right screen. Needs a `tag`.
   */
  data?: unknown;
}

/**
 * The Android notification grant, asked for when it still can be.
 *
 * `notify` posts through the shell, and Android 13+ drops a post from an app without
 * POST_NOTIFICATIONS without a word — the bridge still answers true. So the grant is read first
 * and, while Android can still ask ('default'), requested; the shell settles the request from its
 * permission callback through `window.__notifPermResolvers` (the same queue the Notification
 * polyfill parks on). Older shells without the permission methods answer 'granted', which is
 * what they did before.
 */
async function shellNotificationGrant(b: NonNullable<ReturnType<typeof bridge>>): Promise<string> {
  const x = b as unknown as { getNotificationPermission?(): string; requestNotificationPermission?(): string };
  if (!x.getNotificationPermission) return 'granted';
  const now = String(x.getNotificationPermission());
  if (now !== 'default' || !x.requestNotificationPermission || !hasWin()) return now;
  const w = window as unknown as { __notifPermResolvers?: Array<(p: string) => void> };
  return new Promise<string>((resolve) => {
    // Parked BEFORE the request: on a device that answers at once the callback may run first.
    const q = (w.__notifPermResolvers = w.__notifPermResolvers ?? []);
    const settle = (p: string) => resolve(String(p));
    q.push(settle);
    let answer = 'denied';
    try { answer = String(x.requestNotificationPermission!()); } catch { /* reported as denied */ }
    if (answer !== 'default') {
      // Answered synchronously (already granted, or Android 12 and below): no dialog will call
      // the queue, so take our resolver back out and settle here.
      const i = (w.__notifPermResolvers ?? []).indexOf(settle);
      if (i >= 0) w.__notifPermResolvers!.splice(i, 1);
      resolve(answer);
    }
  });
}

/** The option names NotificationBridge.show reads — `icon` is its `largeIcon`. */
function shellNotifyJson(input: NotifyInput, extra: Record<string, unknown> = {}): string {
  const o: Record<string, unknown> = { title: input.title, body: input.body ?? '', ...extra };
  if (input.tag) o.tag = input.tag;
  if (input.icon) o.largeIcon = input.icon;
  if (input.data !== undefined) { try { o.data = JSON.stringify(input.data); } catch { /* not serialisable: no data */ } }
  return JSON.stringify(o);
}

/** Posts through the shell once the grant is in place; false when the user refused it. */
async function shellNotify(b: NonNullable<ReturnType<typeof bridge>>, input: NotifyInput, extra: Record<string, unknown> = {}): Promise<boolean> {
  if ((await shellNotificationGrant(b)) !== 'granted') return false;
  return b.notify?.(shellNotifyJson(input, extra)) ?? false;
}

/** As much of `@capacitor/local-notifications` as an immediate post needs. */
interface LocalNotificationsPlugin {
  checkPermissions(): Promise<{ display?: string }>;
  requestPermissions(): Promise<{ display?: string }>;
  schedule(o: { notifications: Array<Record<string, unknown>> }): Promise<unknown>;
}

/**
 * Posts one notification through Capacitor, asking for permission first.
 *
 * iOS never posts a local notification without an explicit grant, and the plugin does NOT prompt
 * on its own — `schedule()` on an ungranted app resolves without error and shows nothing, which
 * is the same silent no-op this whole file exists to prevent. So permission is checked, requested
 * once, and a refusal is reported as `false` for the caller to handle.
 *
 * The id must be a 32-bit int; a tag is hashed into one so repeated posts under the same tag
 * replace each other, matching the Web Notification `tag` semantics of the rung below.
 */
async function capNotify(cap: LocalNotificationsPlugin, input: NotifyInput, actionTypeId?: string): Promise<boolean> {
  try {
    let display = (await cap.checkPermissions())?.display;
    if (display === 'prompt' || display === 'prompt-with-rationale') {
      display = (await cap.requestPermissions())?.display;
    }
    if (display !== 'granted') return false;

    let id = 0;
    if (input.tag) {
      for (let i = 0; i < input.tag.length; i += 1) id = (id * 31 + input.tag.charCodeAt(i)) | 0;
      id = Math.abs(id) || 1;
    } else {
      seq += 1;
      id = seq;
    }
    await cap.schedule({ notifications: [{
      id, title: input.title, body: input.body ?? '',
      ...(actionTypeId ? { actionTypeId } : {}),
      // Read back by onNotificationClick / onNotificationAction on a tap.
      extra: { tag: input.tag ?? '', ...(input.data !== undefined ? { data: input.data } : {}) },
    }] });
    return true;
  } catch { return false; }
}

/**
 * Immediate notification. For SCHEDULED reminders use the notifications addon's bridge calls.
 *
 * Asks for the notification permission the first time on every surface (Android 13+, iOS, the
 * web) and resolves false when the user refuses it — never true for a post nobody will see.
 */
export async function notify(input: NotifyInput): Promise<boolean> {
  // The SHELL BRIDGE IS PREFERRED HERE, against this file's usual Capacitor-first order. That is
  // deliberate and Android-specific: the shell's own notification stack does strictly more than
  // the plugin — exact alarms, `openApp`, per-notification custom sounds, boot rescheduling — and
  // all of it is already wired into the generated manifest. Swapping it for the plugin would have
  // been a downgrade dressed up as a migration.
  const b = bridge();
  if (b?.notify) return shellNotify(b, input);

  // iOS. There is no shell bridge there, and WKWebView has no Web Notification API at all, so
  // without this rung `notify()` returned false on iOS while `can('notify')` — which resolves
  // through CAP_PLUGIN_FOR and finds the baked-in plugin — answered 'native'. The UI drew a
  // control that could never fire. This is the platform split the comment above anticipated.
  const cap = capPlugin<LocalNotificationsPlugin>('LocalNotifications');
  if (cap) return capNotify(cap, input);

  if (!hasWin() || !('Notification' in window)) return false;
  try {
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
    new Notification(input.title, { body: input.body, icon: input.icon, tag: input.tag });
    return true;
  } catch { return false; }
}

// ── Turn notifications back on ───────────────────────────────────────────────────────────────

/**
 * 'granted' — notifications reach the phone. 'prompt' — the app can still show the system
 * permission dialog. 'blocked' — refused for good, or switched off in system settings: only the
 * settings screen can fix it. 'unavailable' — this surface (or build) has no notifications.
 */
export type NotificationState = 'granted' | 'prompt' | 'blocked' | 'unavailable';

export interface EnableNotificationsResult {
  state: NotificationState;
  /** True when the state is different from what it was before the call. */
  changed: boolean;
  /** True when the app's notification settings were opened (the dialog could no longer be shown). */
  openedSettings: boolean;
}

function webNotificationState(): NotificationState {
  if (!hasWin() || !('Notification' in window)) return 'unavailable';
  const p = Notification.permission;
  return p === 'granted' ? 'granted' : p === 'denied' ? 'blocked' : 'prompt';
}

function capDisplayState(display?: string): NotificationState {
  if (display === 'granted') return 'granted';
  if (display === 'denied') return 'blocked';
  return display ? 'prompt' : 'unavailable';
}

const NOTIF_STATES: NotificationState[] = ['granted', 'prompt', 'blocked', 'unavailable'];

/**
 * Whether notifications are on, and if not whether the app can still ask. Use it to decide when
 * to show a "Turn on notifications" banner: show it for 'prompt' and 'blocked', hide it otherwise.
 */
export async function getNotificationState(): Promise<NotificationState> {
  const b = bridge();
  if (b?.getNotificationState) {
    try {
      const s = String(b.getNotificationState()) as NotificationState;
      return NOTIF_STATES.includes(s) ? s : 'unavailable';
    } catch { return 'unavailable'; }
  }
  const cap = capPlugin<LocalNotificationsPlugin>('LocalNotifications');
  if (cap) {
    try { return capDisplayState((await cap.checkPermissions()).display); } catch { return 'unavailable'; }
  }
  return webNotificationState();
}

/**
 * Brings the user back to notifications, from a button they tapped: the system permission dialog
 * while it can still be shown, otherwise (Android) this app's notification settings, answering
 * once they come back. Resolves with the new state; never rejects.
 */
export async function enableNotifications(): Promise<EnableNotificationsResult> {
  const b = bridge();
  if (b?.enableNotifications && hasWin()) {
    const w = window as unknown as { __appmintReplies?: Record<string, (r: unknown) => void> };
    const replies = (w.__appmintReplies = w.__appmintReplies ?? {});
    return new Promise<EnableNotificationsResult>((resolve) => {
      const id = `am-notif-${Math.random().toString(36).slice(2)}${Date.now()}`;
      replies[id] = (r: unknown) => {
        const o = (r ?? {}) as Partial<EnableNotificationsResult>;
        resolve({
          state: NOTIF_STATES.includes(o.state as NotificationState) ? o.state as NotificationState : 'unavailable',
          changed: !!o.changed, openedSettings: !!o.openedSettings,
        });
      };
      try { b.enableNotifications!(id); }
      catch { delete replies[id]; resolve({ state: 'unavailable', changed: false, openedSettings: false }); }
    });
  }
  const cap = capPlugin<LocalNotificationsPlugin>('LocalNotifications');
  if (cap) {
    try {
      const before = capDisplayState((await cap.checkPermissions()).display);
      if (before !== 'prompt') return { state: before, changed: false, openedSettings: false };
      const after = capDisplayState((await cap.requestPermissions()).display);
      return { state: after, changed: after !== before, openedSettings: false };
    } catch { return { state: 'unavailable', changed: false, openedSettings: false }; }
  }
  const before = webNotificationState();
  if (before !== 'prompt') return { state: before, changed: false, openedSettings: false };
  try { await Notification.requestPermission(); } catch { /* the state below says what happened */ }
  const after = webNotificationState();
  return { state: after, changed: after !== before, openedSettings: false };
}

/**
 * Opens this app's notification settings (Android app). False where there is no such screen to
 * open — a browser, or a build without notifications.
 */
export async function openNotificationSettings(): Promise<boolean> {
  const b = bridge();
  if (!b?.openNotificationSettings) return false;
  try { return !!b.openNotificationSettings(); } catch { return false; }
}

// ── Alarm clock ──────────────────────────────────────────────────────────────────────────────

/** How a scheduled reminder repeats. daily…yearly keep the wall-clock time across DST changes. */
export type ReminderRepeat = 'none' | 'minutely' | 'hourly' | 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'yearly';

export interface AlarmInput {
  /** Epoch milliseconds of the first ring. */
  at: number;
  title: string;
  body?: string;
  repeat?: ReminderRepeat;
  /** With repeat 'weekdays': ISO days, Monday = 1 … Sunday = 7. Default Monday–Friday. */
  days?: number[];
  /** '' / omitted = the phone's alarm tone; 'silent'; or a file in your app ('/audio/wake.mp3'). */
  sound?: string;
  /** Vibrate while ringing (needs Vibration on in the build). Default true. */
  vibrate?: boolean;
  /** Stops and counts as missed after this many seconds unanswered. Default 600, max 3600. */
  ringSeconds?: number;
  /** Snooze length; 0 hides the Snooze button. Default 10. */
  snoozeMinutes?: number;
  /** Put the app on screen over the lock screen when it rings. Default true. */
  openApp?: boolean;
  dismissLabel?: string;
  snoozeLabel?: string;
}

export type AlarmSupport = 'ready' | 'not_enabled' | 'needs_exact_alarm' | 'needs_notification_permission' | 'unavailable';

/**
 * Whether `scheduleAlarm` can set an alarm right now. 'unavailable' on the web and on iOS: a web
 * page cannot ring the phone's alarm, so do not draw alarm controls there.
 */
export function alarmSupport(): AlarmSupport {
  const s = bridge()?.getAlarmSupport?.();
  return (s as AlarmSupport | undefined) ?? 'unavailable';
}

/**
 * A real alarm clock (Android app): rings on the alarm stream — through silent mode, and through
 * Do Not Disturb when the user allows alarms — looping until Dismiss / Snooze or `ringSeconds`.
 * False when it was not set; read `alarmSupport()` for why. The same id replaces an older alarm.
 */
export function scheduleAlarm(id: string, input: AlarmInput): boolean {
  const b = bridge();
  if (!b?.scheduleNotificationEx || !b.getAlarmSupport) return false;
  return b.scheduleNotificationEx(id, JSON.stringify({ ...input, alarm: true })) === true;
}

/** Stops the ringing alarm (id '' = whichever rings). Repeating alarms stay set. */
export const stopAlarm = (id = ''): boolean => bridge()?.stopAlarm?.(id) ?? false;

/** Stops the ringing alarm and rings it again in `minutes` (0 = its own snoozeMinutes). */
export const snoozeAlarm = (id = '', minutes = 0): boolean =>
  bridge()?.snoozeAlarm?.(id, Math.max(0, Math.min(1440, Math.round(minutes)))) ?? false;

export const isAlarmRinging = (): boolean => bridge()?.isAlarmRinging?.() ?? false;

export interface AlarmEvent {
  id: string;
  /** open = the app was opened from it; the rest are how a ringing alarm ended. */
  action: 'open' | 'dismiss' | 'snooze' | 'missed' | 'error';
  /** On 'open': whether it is still ringing (show your stop / snooze screen). */
  ringing?: boolean;
  source?: 'notification' | 'page' | 'timeout' | 'replaced' | 'system';
  snoozeMinutes?: number;
  snoozedUntil?: number;
  error?: string;
  soundError?: boolean;
}

/**
 * Every alarm outcome, including ones answered while the app was closed (delivered when the page
 * next loads). Also fires with action 'open' for ordinary reminders that opened the app.
 */
export function onAlarm(cb: (e: AlarmEvent) => void): () => void {
  if (!hasWin()) return () => {};
  const h = (e: Event) => {
    const d = (e as CustomEvent).detail;
    try { cb((typeof d === 'string' ? JSON.parse(d) : d) as AlarmEvent); } catch { /* malformed detail */ }
  };
  window.addEventListener('appmint:reminder', h);
  return () => window.removeEventListener('appmint:reminder', h);
}

// ── System volume ────────────────────────────────────────────────────────────────────────────

export type VolumeStream = 'media' | 'alarm' | 'ring' | 'notification' | 'call';
export interface VolumeLevel { stream: VolumeStream; current: number; max: number; percent: number; muted?: boolean }
export interface VolumeResult extends Partial<VolumeLevel> {
  ok: boolean;
  /** unknown_stream | bad_percent | fixed_volume | dnd_access_required | muted | not_applied | failed | foreign_origin | unavailable */
  error?: string;
}

function parseJson<T>(s: string | undefined | null): T | null {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

/** The phone's level for one stream (Android app); null on the web. */
export function getVolume(stream: VolumeStream): VolumeLevel | null {
  const r = parseJson<VolumeLevel & { error?: string }>(bridge()?.getVolume?.(stream));
  return r && !r.error ? r : null;
}

/**
 * Sets the phone's level for one stream, 0–100. `dnd_access_required`: Do Not Disturb is on and
 * the user must allow it first — call `requestDndAccess()`.
 */
export function setVolume(stream: VolumeStream, percent: number, showUi = false): VolumeResult {
  const b = bridge();
  if (!b?.setVolume) return { ok: false, error: 'unavailable' };
  return parseJson<VolumeResult>(b.setVolume(stream, Number(percent), showUi)) ?? { ok: false, error: 'failed' };
}

/** 'granted' | 'opened' (settings screen shown) | 'not_declared' | 'unavailable' (web). */
export const requestDndAccess = (): string => bridge()?.requestDndAccess?.() ?? 'unavailable';

let volumeWatchers = 0;

/** Level changes from the hardware keys or anywhere else. Returns the unsubscribe. */
export function onVolumeChange(cb: (level: VolumeLevel) => void): () => void {
  const b = bridge();
  if (!hasWin() || !b?.watchVolume) return () => {};
  const h = (e: Event) => {
    const d = (e as CustomEvent).detail;
    const v = typeof d === 'string' ? parseJson<VolumeLevel>(d) : (d as VolumeLevel);
    if (v) cb(v);
  };
  window.addEventListener('appmint:volume', h);
  if (volumeWatchers++ === 0) b.watchVolume(true);
  let done = false;
  return () => {
    if (done) return;
    done = true;
    window.removeEventListener('appmint:volume', h);
    if (--volumeWatchers === 0) bridge()?.watchVolume?.(false);
  };
}

// ── AppMint Push inbox (creator-sent notifications) ─────────────────────────────────────────

export interface PushMessage {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  link: string;
  receivedAt: number;
  read: boolean;
  /** Design fields — present only when the creator used a template in the send center. */
  template?: string;
  accent?: string;
  iconUrl?: string;
  buttons?: { label: string; link: string }[];
  badge?: string;
  inapp?: 'banner' | 'modal' | 'sheet' | 'fullscreen';
  countdownAt?: number;
  progress?: number;
  lines?: string[];
  collapse?: string;
}

/**
 * Creator-sent push messages received by this install, newest first (max 50). Empty on the
 * web build and on installs where the creator did not enable AppMint Push — render the
 * notifications screen from this and it is simply empty there, never broken.
 *
 * Live updates: while the app is open, `window.addEventListener('appmint:push', e => ...)`
 * fires with detail {type:'received', message: PushMessage, presented: boolean} on arrival
 * (presented = the shell already showed it on screen) and {type:'revoked', id} when the
 * creator retracts one. The inbox is the pullable truth —
 * code that mounts after an event fired loses nothing: call pushInbox() again.
 */
export function pushInbox(): PushMessage[] {
  const b = bridge();
  if (!b?.getPushInbox) return [];
  try { return JSON.parse(b.getPushInbox() || '[]') as PushMessage[]; } catch { return []; }
}

/** Marks one push message read; call with no argument to mark every message read. */
export function markPushRead(id = ''): boolean {
  const b = bridge();
  return b?.markPushRead ? (b.markPushRead(id) ?? false) : false;
}

/**
 * Dismisses ONE inbox message — the per-row swipe-away. REVERSIBLE: pair it with a brief
 * Undo that calls restorePushMessage(id); a swipe that destroys a message for good is the
 * kind of thing users only notice once it has already cost them something.
 */
export function dismissPushMessage(id: string): boolean {
  const b = bridge();
  return b?.dismissPushMessage ? (b.dismissPushMessage(id) ?? false) : false;
}

/** Undo a dismiss — puts the message back where it was. */
export function restorePushMessage(id: string): boolean {
  const b = bridge();
  return b?.restorePushMessage ? (b.restorePushMessage(id) ?? false) : false;
}

/** Empties the push inbox (tray notifications and the creator's history are untouched). */
export function clearPushInbox(): boolean {
  const b = bridge();
  return b?.clearPushInbox ? (b.clearPushInbox() ?? false) : false;
}

/**
 * Who draws a message the creator sent with an in-app style while the app is open.
 * 'auto' (default): the shell shows its native banner / modal / sheet / full-screen card, and the
 * 'appmint:push' received event carries presented: true — never draw a second banner then.
 * 'none': the shell never draws it (saved on the phone); the app renders its own from the event.
 * False on the web and when AppMint Push is off.
 */
export function setPushPresentation(mode: 'auto' | 'none'): boolean {
  const b = bridge();
  return b?.setPushPresentation ? (b.setPushPresentation(mode) ?? false) : false;
}

/**
 * Tells AppMint Push which of YOUR users is signed in on this install, so the creator's send
 * center can message that one user (every phone they are signed in on). Call it after sign-in
 * with your own stable account id (e.g. the Supabase auth user id) and with '' on sign-out.
 * Letters, digits and _ @ . : + - (up to 128) — never an email address or phone number.
 * False for any other id, on the web and when AppMint Push is off.
 */
export function setPushUser(id: string): boolean {
  const b = bridge();
  return b?.setPushUser ? (b.setPushUser(id) ?? false) : false;
}

/** The user id this install last set with setPushUser; '' when signed out, never set, or on the web. */
export function getPushUser(): string {
  const b = bridge();
  return b?.getPushUser ? (b.getPushUser() ?? '') : '';
}

/**
 * Sets one AppMint Push tag on this install ("plan" = "pro"). The send center can target a tag,
 * and a tag automation can send a set time after the tag is set — an abandoned cart: set
 * cart='open' when items are added, cart='' at checkout. Key: letters, digits, _ (up to 32);
 * value up to 128; '' removes the tag; at most 50 tags. Tags belong to the install, not the user:
 * clear user-specific ones on sign-out. False when refused, on the web and when AppMint Push is off.
 */
export function setPushTag(key: string, value: string): boolean {
  const b = bridge();
  return b?.setPushTag ? (b.setPushTag(key, value) ?? false) : false;
}

/** Sets several tags in one change (all saved or none); '' values remove. Same rules as setPushTag. */
export function setPushTags(tags: Record<string, string>): boolean {
  const b = bridge();
  if (!b?.setPushTags) return false;
  try { return b.setPushTags(JSON.stringify(tags)) ?? false; } catch { return false; }
}

/** This install's AppMint Push tags ({} on the web and when AppMint Push is off). */
export function getPushTags(): Record<string, string> {
  const b = bridge();
  if (!b?.getPushTags) return {};
  try { return JSON.parse(b.getPushTags() || '{}') as Record<string, string>; } catch { return {}; }
}

// ── in-app messages ──────────────────────────────────────────────────────────────────────────
// The creator makes in-app messages in the send center and picks WHEN each shows: the Nth app
// open, a page/route, N seconds in the app, an event your code tracks, a push tag, notifications
// turned off, or the first open after an update. The app downloads them and shows them itself.
// Your code's part: call trackEvent() at the moments that matter, and (optionally) listen.

/**
 * Reports a moment in your app ("checkout_done", "level:3"). A campaign whose trigger is that
 * event name shows. Name: letters, digits and _ . : - (up to 64). props is optional and is not
 * stored. A view change the URL does not show (a tab switch, a modal "page") can be reported as
 * trackEvent('appmint:route', { path: '/cart' }) so route campaigns see it.
 * False for an invalid name, on the web, and in apps built without AppMint Push.
 */
export function trackEvent(name: string, props?: Record<string, unknown>): boolean {
  const b = bridge();
  if (!b?.trackEvent) return false;
  try { return b.trackEvent(String(name), props == null ? '' : JSON.stringify(props)) ?? false; } catch { return false; }
}

export interface InAppMessageEvent {
  type: 'shown' | 'clicked' | 'dismissed' | 'answered';
  id: string;
  name: string;
  /** The gallery template the message was made from (e.g. 'rate_us'), when it was. */
  template?: string;
  /** 'shown' only: false when setInAppPresentation('none') — then YOUR code draws `message`. */
  presented?: boolean;
  message?: {
    title: string; body: string; imageUrl: string; link: string;
    inapp: 'banner' | 'modal' | 'sheet' | 'fullscreen';
    accent?: string; buttons?: { label: string; link: string }[];
    emoji?: string; question?: 'stars' | 'nps'; lines?: string[]; countdownAt?: number;
    sticky?: boolean; required?: boolean;
  };
  /** 'clicked' only: the button index (-1 = the message itself) and its link. */
  button?: number;
  link?: string;
  /** 'answered' only: 'stars' (value 1-5) or 'nps' (value 0-10), sent once when the message closes. */
  question?: 'stars' | 'nps';
  value?: number;
}

/** Every in-app message shown / clicked / dismissed / answered on this install. Returns the unsubscribe. */
export function onInAppMessage(cb: (e: InAppMessageEvent) => void): () => void {
  if (!hasWin()) return () => {};
  const h = (e: Event) => {
    const d = (e as CustomEvent).detail;
    try { cb((typeof d === 'string' ? JSON.parse(d) : d) as InAppMessageEvent); } catch { /* malformed detail */ }
  };
  window.addEventListener('appmint:inapp', h);
  return () => window.removeEventListener('appmint:inapp', h);
}

/**
 * Who draws an in-app message. 'auto' (default): the app shows the creator's design. 'none'
 * (saved on the phone): nothing is drawn; onInAppMessage gets {type:'shown', presented:false,
 * message} and your UI renders it. False on the web and without AppMint Push.
 */
export function setInAppPresentation(mode: 'auto' | 'none'): boolean {
  const b = bridge();
  return b?.setInAppPresentation ? (b.setInAppPresentation(mode) ?? false) : false;
}

/** The in-app messages this install holds right now ([{id, name}]; [] on the web). */
export function inAppCampaigns(): { id: string; name: string }[] {
  const b = bridge();
  if (!b?.getInAppCampaigns) return [];
  try { return JSON.parse(b.getInAppCampaigns() || '[]') as { id: string; name: string }[]; } catch { return []; }
}

// ── files ────────────────────────────────────────────────────────────────────────────────────

export interface PickedFile {
  name: string; mime: string; size: number;
  /** The whole file as UTF-8 text. Rejects when the file can no longer be read. */
  text(): Promise<string>;
}

interface FilePickReply { ok: boolean; uri: string; name?: string; mime?: string; size?: number; error?: string }

/** An Error carrying the machine-readable `code` the caller branches on. */
function codedError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(`appmint: ${message}`), { code });
}

type BridgeReply = (ok: boolean, payload: string, requestId: string, error?: string) => void;
type ReplyHook = BridgeReply & { __amHook?: true };

/**
 * One permanent dispatcher per shell reply global, with a waiter per request id.
 *
 * The shell answers a picker through ONE page global (`WebToApkOnFilePickResult`,
 * `WebToApkOnFolderAccessResult`). The old install-then-restore dance broke on the shell's own
 * helper, which turns that global into an accessor: reading it always yields the helper's
 * dispatcher and writing it stores a page callback the dispatcher calls. "Restoring" the value
 * read therefore stored the dispatcher as its own callback — the next reply called itself until
 * the stack overflowed, silently. Now the hook is installed once, is never restored, answers its
 * own ids and hands every other id to whatever page callback was there before it.
 */
function replyHook(global: 'WebToApkOnFilePickResult' | 'WebToApkOnFolderAccessResult',
                   userSlot: string, waiters: Map<string, BridgeReply>): void {
  const w = window as unknown as Record<string, unknown>;
  const accessor = !!Object.getOwnPropertyDescriptor(w, global)?.get;
  // Under the accessor the page's callback lives in the helper's slot; the getter would only
  // ever hand back the helper's own dispatcher.
  const current = (accessor ? w[userSlot] : w[global]) as ReplyHook | null | undefined;
  if (current?.__amHook) return;
  const helper = accessor ? (w[global] as unknown) : undefined;
  const previous = typeof current === 'function' && current !== helper ? current : null;
  const hook: ReplyHook = (ok, payload, requestId, error) => {
    const key = String(requestId ?? '');
    const waiter = waiters.get(key);
    if (waiter) { waiters.delete(key); waiter(ok, payload, key, error); return; }
    previous?.(ok, payload, requestId, error);
  };
  hook.__amHook = true;
  w[global] = hook;   // under the accessor this lands in the helper's page-callback slot
}

const filePickWaiters = new Map<string, BridgeReply>();
const folderWaiters = new Map<string, BridgeReply>();

/**
 * Opens the real system picker: Android's document picker in the app when the build enabled
 * Native Folder Access (otherwise the page's own file chooser, which the shell also serves), and
 * `<input type=file>` on iOS and the web.
 *
 * Resolves null ONLY when the user cancels. A picker that could not open rejects with an Error
 * whose `code` is 'no-picker' (no document picker app on this device), 'disabled' (the build's
 * file bridge is off) or 'failed' — a broken picker never looks like a cancel.
 */
export function pickFile(accept = '*/*'): Promise<PickedFile | null> {
  const b = shellFilePicker();
  if (b?.pickFile) {
    const id = rid('file');
    const done = new Promise<PickedFile | null>((resolve, reject) => {
      if (!hasWin()) { reject(new Error('appmint: no window')); return; }
      filePickWaiters.set(id, (ok, payloadJson) => {
        let reply: FilePickReply;
        try { reply = JSON.parse(payloadJson || '{}') as FilePickReply; }
        catch (e) {
          // Rejected, not resolved-null: null is this function's "user cancelled" answer, so
          // reporting a malformed reply as a cancel would hide a real defect behind an outcome
          // the caller treats as normal.
          reject(codedError('failed', `unreadable pickFile reply — ${String(e)}`));
          return;
        }
        if (ok && reply.ok && reply.uri) {
          const uri = reply.uri;
          resolve({
            name: reply.name ?? '', mime: reply.mime ?? 'application/octet-stream',
            size: reply.size ?? 0,
            text: async () => new TextDecoder().decode(readShellFile(uri)),
          });
          return;
        }
        const code = reply.error ?? 'cancelled';
        if (code === 'cancelled') { resolve(null); return; }            // the user backed out
        reject(codedError(code, code === 'no-picker'
          ? 'this device has no document picker app'
          : `the file picker could not open (${code})`));
      });
      replyHook('WebToApkOnFilePickResult', '__webToApkFsUserFileCallback', filePickWaiters);
    });
    b.pickFile(id, accept);
    return done;
  }
  return pickFileWeb(accept);
}

/**
 * The whole of a picked file, chunk by chunk. The shell reads at most 4 MB per call and answers
 * `{ok, base64, bytesRead, eof, error}` JSON — decoding that envelope as base64 made every read
 * throw, and one call would have kept only the first 4 MB anyway. Loops until `eof`; a refused
 * read ('disabled', 'not-found', 'foreign_origin', …) is thrown with its code.
 */
function readShellFile(uri: string): Uint8Array {
  const b = bridge();
  if (!b?.readFileBase64) throw codedError('disabled', 'the file bridge is not available');
  const parts: Uint8Array[] = [];
  let offset = 0;
  let total = 0;
  for (;;) {
    let r: { ok?: boolean; base64?: string; bytesRead?: number; eof?: boolean; error?: string };
    try { r = JSON.parse(b.readFileBase64(uri, offset, 0) || '{}'); }
    catch (e) { throw codedError('failed', `unreadable file read reply — ${String(e)}`); }
    if (!r.ok) throw codedError(r.error ?? 'failed', `could not read the file (${r.error ?? 'failed'})`);
    const chunk = b64ToBytes(r.base64 ?? '');
    parts.push(chunk);
    total += chunk.length;
    offset += r.bytesRead ?? chunk.length;
    if (r.eof !== false || chunk.length === 0) break;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

function pickFileWeb(accept: string): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return; }
    const input = document.createElement('input');
    input.type = 'file';
    if (accept && accept !== '*/*') input.accept = accept;
    input.style.display = 'none';
    // 'cancel' is not universally fired, so the element is removed on either outcome and the
    // promise simply stays pending if the user never returns — same as the native picker.
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      input.remove();
      resolve(f ? { name: f.name, mime: f.type, size: f.size, text: () => f.text() } : null);
    });
    input.addEventListener('cancel', () => { input.remove(); resolve(null); });
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Saves a file the user keeps. A plain `<a download>` is the real path on BOTH surfaces: the
 * shell turns it into Android's "Save as…" sheet with this exact filename.
 */
export function saveFile(fileName: string, data: string | Blob, mime = 'text/plain'): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;            // never omit: an unnamed save lands as "download"
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  } catch { return false; }
}

// ── device unlock (biometrics) ───────────────────────────────────────────────────────────────

/**
 * Device-local user verification: Android BiometricPrompt in the app, WebAuthn's platform
 * authenticator on the web.
 *
 * BOTH surfaces prove *this device's owner is present*. Neither authenticates identity to a
 * server. Gate a local view with it (a private note, a locked tab); never treat it as proof of
 * who someone is, and never use it as the only guard on money or data that lives server-side.
 *
 * The device PIN/pattern/password is accepted wherever the platform allows it: Android 11+
 * (a PIN-only phone gets the prompt too), iOS (passcode). On Android 10 and below the shell can
 * only prompt once a fingerprint is enrolled, so a PIN-only phone there resolves false.
 * Resolves false on cancel, lockout, or a phone with no screen lock at all.
 */
/**
 * `@aparajita/capacitor-biometric-auth`, which the iOS scaffold links.
 *
 * The npm package's `authenticate()` is a JS wrapper that maps rejections to typed errors; the
 * NATIVE plugin exposes `internalAuthenticate`, and that is the one to call here, because a
 * generated project has no npm package to import the wrapper from.
 */
interface BiometricPlugin {
  checkBiometry(): Promise<{ isAvailable?: boolean }>;
  internalAuthenticate(o: Record<string, unknown>): Promise<void>;
}

export async function unlock(title = 'Unlock', subtitle = ''): Promise<boolean> {
  const cap = capPlugin<BiometricPlugin>('BiometricAuthNative');
  if (cap) {
    try {
      // Ask first: an unenrolled or lockout device should return false for the caller to handle,
      // not throw an opaque plugin error from inside a prompt the user never saw.
      if ((await cap.checkBiometry())?.isAvailable === false) return false;
      await cap.internalAuthenticate({
        reason: title,
        cancelTitle: 'Cancel',
        iosFallbackTitle: 'Use passcode',
        // The device passcode is a real device-owner proof and the only way in for a user whose
        // biometrics fail or were never enrolled — matching what the Android rung already allows.
        allowDeviceCredential: true,
      });
      return true;
    } catch { return false; }   // cancelled, failed or locked out — all "not unlocked"
  }

  const b = bridge();
  if (b?.authenticateBiometricEx || b?.authenticateBiometric) {
    // No pre-check here. `isBiometricAvailable()` reports the FINGERPRINT sensor only, so a
    // phone with just a PIN (or face unlock) reads 'not_enrolled'/'no_hardware' — and the old
    // `/available/` test also matched 'unavailable'. The shell decides for itself, with the
    // device credential allowed: on Android 11+ the prompt opens whenever the phone has any
    // screen lock, and a phone with none answers `{ok:false}` at once, which resolves false below.
    const id = rid('bio');
    return new Promise<boolean>((resolve) => {
      if (!hasWin()) { resolve(false); return; }
      const table = (window.__webToApkAuth = window.__webToApkAuth ?? {});
      table[id] = (json: string) => {
        delete table[id];
        try {
          const r = JSON.parse(json || '{}') as { ok?: boolean; success?: boolean };
          resolve(!!(r.ok ?? r.success));
        } catch { resolve(false); }
      };
      if (b.authenticateBiometricEx) {
        b.authenticateBiometricEx(id, JSON.stringify({ title, subtitle, allowDeviceCredential: true }));
      } else {
        b.authenticateBiometric?.(id, title, subtitle);
      }
    });
  }
  return unlockWeb(title);
}

const WEBAUTHN_KEY = 'appmint.unlockCredential';

async function unlockWeb(title: string): Promise<boolean> {
  if (!hasWin() || !window.PublicKeyCredential || !nav()?.credentials) return false;
  try {
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const stored = window.localStorage.getItem(WEBAUTHN_KEY);
    if (!stored) {
      // First use on this browser enrols the platform authenticator, then counts as unlocked —
      // the enrolment ceremony itself required the fingerprint/face/PIN.
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: title || document.title || 'App' },
          user: { id: window.crypto.getRandomValues(new Uint8Array(16)), name: 'device', displayName: 'This device' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
          timeout: 60_000,
        },
      }) as PublicKeyCredential | null;
      if (!cred) return false;
      window.localStorage.setItem(WEBAUTHN_KEY, bufToB64(cred.rawId));
      return true;
    }
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: 'public-key', id: b64ToBuf(stored).buffer as ArrayBuffer }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return !!assertion;
  } catch { return false; }                          // user cancelled or no platform authenticator
}

const bufToB64 = (b: ArrayBuffer): string =>
  window.btoa(String.fromCharCode(...new Uint8Array(b)));
const b64ToBuf = (s: string): Uint8Array =>
  Uint8Array.from(window.atob(s), (c) => c.charCodeAt(0));

// ── contacts ─────────────────────────────────────────────────────────────────────────────────

/**
 * One contact, the same shape on every surface. `phones` and `emails` are plain strings; the
 * Android shell's richer reply (`displayName`, `phones: [{number, type}]`, `photoUri`) is
 * normalised into this. `photoUri` is Android-only (a `content://` URI of the contact photo).
 */
export interface Contact { id?: string; name?: string; phones?: string[]; emails?: string[]; photoUri?: string }

/** The Android shell's contact JSON — `{id, displayName, photoUri, phones:[{number,type}], emails}` — as a [Contact]. */
function fromShellContact(raw: unknown): Contact | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const list = (v: unknown, field: string): string[] | undefined => Array.isArray(v)
    ? v.map((x) => (typeof x === 'string' ? x : String((x as Record<string, unknown>)?.[field] ?? ''))).filter(Boolean)
    : undefined;
  const name = String(o.displayName ?? o.name ?? '');
  return {
    id: o.id != null && o.id !== '' ? String(o.id) : undefined,
    name: name || undefined,
    phones: list(o.phones, 'number'),
    emails: list(o.emails, 'address'),
    photoUri: typeof o.photoUri === 'string' && o.photoUri ? o.photoUri : undefined,
  };
}
const fromShellContacts = (raw: unknown): Contact[] =>
  Array.isArray(raw) ? raw.map(fromShellContact).filter((c): c is Contact => !!c) : [];

/**
 * `@capacitor-community/contacts`, which the iOS scaffold bakes in and the Android template does
 * not — Android is served by the shell bridge below.
 *
 * Without these branches the plugin shipped inside every exported iOS app and was never called
 * once: the four functions below were bridge-only, `window.WebToApk` does not exist on iOS, and
 * so a contacts screen came back empty on a platform that could have filled it.
 */
interface ContactsPlugin {
  requestPermissions(): Promise<{ contacts?: string }>;
  getContacts(o: { projection: Record<string, boolean> }): Promise<{ contacts?: CapContact[] }>;
  pickContact(o: { projection: Record<string, boolean> }): Promise<{ contact?: CapContact }>;
  createContact(o: { contact: Record<string, unknown> }): Promise<{ contactId?: string }>;
}

interface CapContact {
  contactId?: string;
  name?: { display?: string; given?: string; family?: string };
  phones?: Array<{ number?: string }>;
  emails?: Array<{ address?: string }>;
}

/** Everything the contact screens ask for, and nothing else. */
const CONTACT_PROJECTION = { name: true, phones: true, emails: true };

/** Capacitor's nested contact shape flattened into ours. */
function fromCapContact(c: CapContact | undefined): Contact | null {
  if (!c) return null;
  const display = c.name?.display ?? [c.name?.given, c.name?.family].filter(Boolean).join(' ');
  return {
    id: c.contactId,
    name: display || undefined,
    phones: c.phones?.map((p) => p.number ?? '').filter(Boolean),
    emails: c.emails?.map((e) => e.address ?? '').filter(Boolean),
  };
}

/**
 * iOS shows the system permission sheet only when asked, and a denied grant must surface as an
 * empty result rather than a hang — the caller's screen then has something honest to render.
 */
async function contactsGranted(cap: ContactsPlugin): Promise<boolean> {
  try { return (await cap.requestPermissions())?.contacts === 'granted'; }
  catch { return false; }
}

/** System contact picker: Android's in the app, the Contact Picker API on the web (Chrome on Android). */
export async function pickContact(): Promise<Contact | null> {
  // Android bakes the Contacts plugin too (for imported Capacitor projects), but the shell
  // bridge stays this wrapper's rung there: it carries the build's contacts switches and origin gate.
  const cap = bridge()?.pickContact ? undefined : capPlugin<ContactsPlugin>('Contacts');
  if (cap) {
    if (!(await contactsGranted(cap))) return null;
    try { return fromCapContact((await cap.pickContact({ projection: CONTACT_PROJECTION }))?.contact); }
    catch { return null; }   // the user dismissed the picker — a normal outcome, not an error
  }

  const b = bridge();
  if (b?.pickContact) {
    const id = rid('contacts');
    b.pickContact(id);
    return awaitEvent('contacts', id, (d) => fromShellContact(d.contact), 300_000);
  }
  const n = nav();
  const picker = (n as unknown as { contacts?: { select(p: string[], o?: { multiple?: boolean }): Promise<Array<Record<string, unknown>>> } } | undefined)?.contacts;
  if (!picker) return null;
  try {
    const [first] = await picker.select(['name', 'tel', 'email'], { multiple: false });
    if (!first) return null;
    return {
      name: (first.name as string[] | undefined)?.[0],
      phones: first.tel as string[] | undefined,
      emails: first.email as string[] | undefined,
    };
  } catch { return null; }
}

/** App-only — `can('contactList')` is 'none' on the web. Check before rendering the screen. */
export async function listContacts(limit = 200, offset = 0): Promise<Contact[]> {
  // Android bakes the Contacts plugin too (for imported Capacitor projects), but the shell
  // bridge stays this wrapper's rung there: it carries the build's contacts switches and origin gate.
  const cap = bridge()?.listContacts ? undefined : capPlugin<ContactsPlugin>('Contacts');
  if (cap) {
    if (!(await contactsGranted(cap))) return [];
    try {
      // The plugin has no limit/offset of its own — it returns the whole book — so the window is
      // applied here. Same call shape for the caller, same slice of results.
      const all = (await cap.getContacts({ projection: CONTACT_PROJECTION }))?.contacts ?? [];
      return all.slice(offset, offset + limit).map(fromCapContact).filter((c): c is Contact => !!c);
    } catch { return []; }
  }

  const b = bridge();
  if (!b?.listContacts) return [];
  const id = rid('contacts');
  b.listContacts(id, limit, offset);
  return awaitEvent('contacts', id, (d) => fromShellContacts(d.contacts));
}

/** App-only. */
export async function searchContacts(query: string, limit = 50): Promise<Contact[]> {
  // Android bakes the Contacts plugin too (for imported Capacitor projects), but the shell
  // bridge stays this wrapper's rung there: it carries the build's contacts switches and origin gate.
  const cap = bridge()?.searchContacts ? undefined : capPlugin<ContactsPlugin>('Contacts');
  if (cap) {
    // No server-side search in the plugin either; matching name, phone and email locally is what
    // the shell's own query does, so the two platforms return the same set for the same input.
    const q = query.trim().toLowerCase();
    const all = await listContacts(10_000, 0);
    if (!q) return all.slice(0, limit);
    return all.filter((c) =>
      (c.name ?? '').toLowerCase().includes(q) ||
      c.phones?.some((p) => p.replace(/\s/g, '').includes(q)) ||
      c.emails?.some((e) => e.toLowerCase().includes(q))
    ).slice(0, limit);
  }

  const b = bridge();
  if (!b?.searchContacts) return [];
  const id = rid('contacts');
  b.searchContacts(id, query, limit);
  return awaitEvent('contacts', id, (d) => fromShellContacts(d.contacts));
}

/**
 * App-only. SAVES the contact straight into the address book — no editor is shown, the user only
 * sees the one-time contacts permission prompt. Confirm with the user in your own UI first.
 *
 * Resolves true once saved, false when the user refused the permission or the address book
 * refused the insert. Rejects with an Error whose `code` is 'not_enabled' (the build did not
 * switch on writing contacts) or 'foreign_origin' — a build mistake never reads as "saved".
 */
export async function addContact(contact: Contact): Promise<boolean> {
  // Android bakes the Contacts plugin too (for imported Capacitor projects), but the shell
  // bridge stays this wrapper's rung there: it carries the build's contacts switches and origin gate.
  const cap = bridge()?.addContact ? undefined : capPlugin<ContactsPlugin>('Contacts');
  if (cap) {
    if (!(await contactsGranted(cap))) return false;
    try {
      // Capacitor wants the name split. A single display name goes to `given` with the remainder
      // as `family`, which is what the iOS contact card shows for a one-field entry.
      const parts = (contact.name ?? '').trim().split(/\s+/);
      await cap.createContact({
        contact: {
          name: { given: parts[0] ?? '', family: parts.slice(1).join(' ') },
          phones: (contact.phones ?? []).map((number) => ({ number })),
          emails: (contact.emails ?? []).map((address) => ({ address })),
        },
      });
      return true;
    } catch { return false; }
  }

  const b = bridge();
  if (!b?.addContact) return false;
  const id = rid('contacts');
  b.addContact(id, JSON.stringify({ name: contact.name ?? '', phones: contact.phones ?? [], emails: contact.emails ?? [] }));
  // The shell answers `{ok, id}` once the insert ran, or `{error}` when it never started. The old
  // `d.ok ?? true` read every error reply (it has no `ok`) as a successful save.
  return awaitEvent('contacts', id, (d) => {
    if (d.ok === true) return true;
    const err = typeof d.error === 'string' ? d.error : '';
    if (!err || err === 'permission_denied') return false;
    throw codedError(err, `addContact refused (${err})`);
  }, 300_000);
}

// ── SMS and call log ─────────────────────────────────────────────────────────────────────────

/**
 * Opens the messaging app with the message pre-filled and lets the USER press send. Real on both
 * surfaces — an `sms:` link opens the messaging app from mobile web too. Prefer this over send().
 */
export function composeSms(phoneNumber: string, message: string): boolean {
  const b = bridge();
  if (b?.composeSms) return b.composeSms(phoneNumber, message) ?? false;
  if (!hasWin()) return false;
  // `?body=` is the widely honoured form on Android; iOS accepts `&body=` after a `?`.
  window.location.href = `sms:${encodeURIComponent(phoneNumber)}?body=${encodeURIComponent(message)}`;
  return true;
}

/**
 * Sends SMS directly, without the user confirming. App-only, requires the SMS capability, and
 * costs the user real money per message — prefer composeSms() unless silent send is the actual
 * product (an alert dispatcher, a field-report app). `can('smsSend')` is 'none' on the web.
 */
export async function sendSms(phoneNumber: string, message: string): Promise<boolean> {
  const b = bridge();
  if (!b?.sendSms) return false;
  const id = rid('sms');
  b.sendSms(id, phoneNumber, message, true);
  return awaitEvent('sms', id, (d) => !!(d.ok ?? d.sent), 180_000);
}

export interface SmsMessage { id?: string; address?: string; body?: string; date?: number; read?: boolean; box?: string }

/** App-only. `box` is 'inbox' | 'sent' | 'draft'. */
export async function listSms(box: 'inbox' | 'sent' | 'draft' = 'inbox', limit = 100, offset = 0): Promise<SmsMessage[]> {
  const b = bridge();
  if (!b?.listSms) return [];
  const id = rid('sms');
  b.listSms(id, box, limit, offset);
  return awaitEvent('sms', id, (d) => (d.messages as SmsMessage[]) ?? (d.sms as SmsMessage[]) ?? []);
}

export interface CallLogEntry { number?: string; name?: string; type?: string; date?: number; duration?: number }

/** App-only. `sinceMillis` is a string because the value exceeds a 32-bit int. */
export async function listCallLog(limit = 100, offset = 0, sinceMillis = 0): Promise<CallLogEntry[]> {
  const b = bridge();
  if (!b?.listCallLog) return [];
  const id = rid('calllog');
  b.listCallLog(id, limit, offset, String(sinceMillis));
  return awaitEvent('calllog', id, (d) => (d.calls as CallLogEntry[]) ?? (d.entries as CallLogEntry[]) ?? []);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Native feel: toast, dialog, action sheet, keyboard, orientation, network, status bar
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// These are the six plugins the Android template bakes in specifically because they have no
// equivalent in the shell's own bridge — a real Android action sheet, toast, alert and keyboard
// behave nothing like their HTML imitations, and that difference is most of what separates an app
// that feels installed from one that feels like a website in a frame.
//
// They shipped in every generated APK and nothing could call them: no wrapper here, no capability
// name in `can()`, and the prompt (correctly) forbids importing `@capacitor/*` because those npm
// packages are not in a generated project. The dex cost was paid and the feature was unreachable.
//
// Both installed apps bake all six now (the iOS scaffold gained them 2026-09-04, so an iOS user
// gets UIKit's own alert, action sheet and toast rather than a DOM imitation). THE WEB RUNG IS
// STILL NOT A CONSOLATION PRIZE: it is what the website half of the same bundle runs, and the DOM
// implementations below are written to read the app's OWN design tokens, so a sheet or toast
// arrives wearing the app's palette, radius and motion rather than a generic grey panel dropped
// into someone's carefully art-directed screen.

/**
 * One of the app's DESIGN DNA tokens, or the given default.
 *
 * Every generated app declares `--bg --surface --ink --muted --accent --accent-ink --border` on
 * `:root` (the prompt requires it), so the shared controls below can dress themselves in the app's
 * own palette instead of shipping a look that fights it. An app that somehow lacks a token gets
 * the neutral default and still renders correctly.
 */
function token(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch { return fallback; }
}

/** Users who asked the OS for less motion get none of it. */
const reducedMotion = (): boolean =>
  hasWin() && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Shared host for the DOM controls, kept out of the app's own stacking contexts. */
function overlayHost(): HTMLElement | null {
  // `document.body` is null while the head is still parsing, which a module-scope call during
  // hydration can hit — there is nowhere to mount yet, and appending to null would throw.
  if (typeof document === 'undefined' || !document.body) return null;
  let host = document.getElementById('appmint-overlay') as HTMLElement | null;
  if (!host) {
    host = document.createElement('div');
    host.id = 'appmint-overlay';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;';
    document.body.appendChild(host);
  }
  return host;
}

// ── toast ────────────────────────────────────────────────────────────────────────────────────

export interface ToastOptions {
  /** 'short' ≈ 2s, 'long' ≈ 3.5s. Matches Android's own two durations. */
  duration?: 'short' | 'long';
}

/**
 * A brief confirmation that needs no acknowledgement — "Copied", "Saved", "Added to list".
 *
 * Android draws its own toast. Everywhere else this is a snackbar in the app's palette, pinned
 * above the safe-area inset so it clears the home indicator and any bottom navigation.
 *
 * Not for errors the user must act on: a toast is missable by design. Use `Dialog.alert` when the
 * message has to be seen.
 */
export function toast(message: string, opts: ToastOptions = {}): void {
  const duration = opts.duration ?? 'short';

  const cap = capPlugin<{ show(o: Record<string, unknown>): Promise<void> }>('Toast');
  if (cap) { void cap.show({ text: message, duration, position: 'bottom' }); return; }

  const host = overlayHost();
  if (!host) return;

  // One toast at a time: a stack of them covers the screen the user is trying to see, and the
  // newest message is the one that matters.
  host.querySelector('[data-appmint-toast]')?.remove();

  const el = document.createElement('div');
  el.setAttribute('data-appmint-toast', '');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = message;
  el.style.cssText = [
    'position:absolute',
    'left:50%',
    'bottom:calc(env(safe-area-inset-bottom, 0px) + 24px)',
    'transform:translateX(-50%) translateY(8px)',
    'max-width:min(calc(100vw - 32px), 420px)',
    'box-sizing:border-box',
    'padding:12px 18px',
    `background:${token('--ink', '#15161a')}`,
    `color:${token('--bg', '#ffffff')}`,
    'font:500 14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif',
    'border-radius:12px',
    'box-shadow:0 8px 28px rgba(0,0,0,.24)',
    'pointer-events:none',
    'opacity:0',
    reducedMotion() ? '' : 'transition:opacity 180ms ease-out,transform 180ms ease-out',
  ].filter(Boolean).join(';');
  host.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
  });

  const ms = duration === 'long' ? 3500 : 2000;
  window.setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(8px)';
    window.setTimeout(() => el.remove(), reducedMotion() ? 0 : 200);
  }, ms);
}

// ── action sheet ─────────────────────────────────────────────────────────────────────────────

export interface SheetOption {
  title: string;
  /** Renders in the app's danger colour and, on iOS/Android, as the platform's destructive style. */
  destructive?: boolean;
}

/**
 * The platform's own choose-one-of-these control: an Android bottom sheet, and a real sheet in
 * the app's palette everywhere else.
 *
 * Resolves the chosen index, or `null` when the user dismisses it — dismissal is a normal
 * outcome, so never treat the null as an error.
 *
 * This is the control the design rules already ask for ("bottom sheets on phone rather than
 * centred modals"). Reach for it instead of hand-rolling one per app: it handles the backdrop,
 * Escape, focus, the safe-area inset and the drag affordance, and it is haptic on selection.
 */
export async function actionSheet(title: string, options: SheetOption[]): Promise<number | null> {
  if (!options.length) return null;

  const cap = capPlugin<{ showActions(o: Record<string, unknown>): Promise<{ index: number }> }>('ActionSheet');
  if (cap) {
    try {
      const r = await cap.showActions({
        title,
        options: options.map((o) => ({ title: o.title, style: o.destructive ? 'DESTRUCTIVE' : 'DEFAULT' })),
      });
      // Android's sheet reports the cancel dismissal as an out-of-range index rather than
      // rejecting, so a bare `r.index` would select a button the user never pressed.
      return r && r.index >= 0 && r.index < options.length ? r.index : null;
    } catch { return null; }
  }

  const host = overlayHost();
  if (!host) return null;

  const surface = token('--surface', '#ffffff');
  const ink = token('--ink', '#15161a');
  const muted = token('--muted', '#6b7280');
  const border = token('--border', 'rgba(0,0,0,.1)');
  const danger = token('--danger', '#dc2626');
  const fast = reducedMotion();

  return new Promise<number | null>((resolve) => {
    const root = document.createElement('div');
    root.style.cssText = 'position:absolute;inset:0;pointer-events:auto;display:flex;align-items:flex-end;justify-content:center;';

    const backdrop = document.createElement('div');
    backdrop.style.cssText = [
      'position:absolute;inset:0;background:rgba(0,0,0,.4)',
      'opacity:0',
      fast ? '' : 'transition:opacity 220ms ease-out',
    ].filter(Boolean).join(';');

    const sheet = document.createElement('div');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    if (title) sheet.setAttribute('aria-label', title);
    sheet.style.cssText = [
      'position:relative',
      'width:min(100%, 520px)',
      'box-sizing:border-box',
      `background:${surface}`,
      'border-radius:20px 20px 0 0',
      'padding:8px 12px calc(env(safe-area-inset-bottom, 0px) + 12px)',
      'box-shadow:0 -12px 40px rgba(0,0,0,.22)',
      'transform:translateY(100%)',
      // The overshoot-free spring the design rules name for sheets.
      fast ? '' : 'transition:transform 260ms cubic-bezier(0.16,1,0.3,1)',
    ].filter(Boolean).join(';');

    const grip = document.createElement('div');
    grip.style.cssText = `width:36px;height:4px;border-radius:2px;background:${border};margin:6px auto 10px;`;
    sheet.appendChild(grip);

    if (title) {
      const h = document.createElement('div');
      h.textContent = title;
      h.style.cssText = `color:${muted};font:600 13px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.02em;padding:4px 12px 10px;`;
      sheet.appendChild(h);
    }

    let settled = false;
    const close = (value: number | null) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey);
      backdrop.style.opacity = '0';
      sheet.style.transform = 'translateY(100%)';
      window.setTimeout(() => { root.remove(); resolve(value); }, fast ? 0 : 240);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(null); };

    options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = opt.title;
      btn.style.cssText = [
        'display:block;width:100%;text-align:left',
        'box-sizing:border-box',
        'min-height:52px;padding:14px 12px',
        'background:transparent;border:0',
        `border-top:${i === 0 ? '0' : `1px solid ${border}`}`,
        `color:${opt.destructive ? danger : ink}`,
        'font:500 16px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif',
        'cursor:pointer;border-radius:10px',
      ].join(';');
      btn.addEventListener('pointerdown', () => { btn.style.background = border; });
      const clear = () => { btn.style.background = 'transparent'; };
      btn.addEventListener('pointerup', clear);
      btn.addEventListener('pointerleave', clear);
      btn.addEventListener('click', () => { haptic('selection'); close(i); });
      sheet.appendChild(btn);
    });

    backdrop.addEventListener('click', () => close(null));
    document.addEventListener('keydown', onKey);

    root.appendChild(backdrop);
    root.appendChild(sheet);
    host.appendChild(root);

    // Focus moves into the sheet so a keyboard or screen-reader user is not left behind it.
    (sheet.querySelector('button') as HTMLButtonElement | null)?.focus();

    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      sheet.style.transform = 'translateY(0)';
    });
  });
}

// ── keyboard ─────────────────────────────────────────────────────────────────────────────────

/**
 * How many pixels the software keyboard currently covers, whenever that changes.
 *
 * The classic mobile-web bug this removes: a bottom-anchored composer or Save bar sitting under
 * the keyboard, invisible exactly while the user is typing into it. Add the reported height as
 * bottom padding and the bar rides above the keyboard the way an installed app's does.
 *
 * Returns an unsubscribe function — call it on unmount.
 */
export function onKeyboard(cb: (insetPx: number) => void): () => void {
  return watchKeyboard((insetPx) => cb(insetPx));
}

/**
 * The keyboard's two facts, kept apart: `insetPx` (what the page still has to clear) and `open`.
 *
 * They are NOT the same thing in the Android app: the shell resizes the page for the keyboard, so
 * the inset drops to 0 a frame after the keyboard opens while the keyboard is plainly still up.
 * `Keyboard.addListener` used to read "0" as "hidden" and fired keyboardDidHide mid-typing.
 */
function watchKeyboard(cb: (insetPx: number, open: boolean) => void): () => void {
  const cap = capPlugin<{
    addListener(e: string, h: (info: { keyboardHeight?: number }) => void): Promise<{ remove(): Promise<void> }>;
  }>('Keyboard');

  if (cap && hasWin()) {
    // The plugin reports the keyboard's FULL height (IME inset, in CSS px). What the page must add
    // as padding is only the part of it the layout did not already absorb: the shell resizes the
    // WebView for the keyboard (adjustResize below API 35, the IME inset applied to the content
    // layout on 35+), and on that resized viewport a bottom-anchored bar is ALREADY above the
    // keyboard. Reporting the raw height there padded it a second time, so the composer floated a
    // full keyboard-height above the keys. The shrink is measured from window.innerHeight against
    // a baseline taken while the keyboard was down; a fullscreen/kiosk app, whose WebView is not
    // resized, measures 0 shrink and gets the whole height — the right answer in both layouts.
    let baseline = window.innerHeight;
    let shown = 0;   // the plugin's height while the keyboard is up, 0 once it is going away
    const report = () => {
      if (!shown) { cb(0, false); return; }
      const shrink = Math.max(0, baseline - window.innerHeight);
      cb(Math.max(0, shown - shrink), true);
    };
    // The viewport resize lands a frame or so after the plugin's event, so re-report on it; while
    // the keyboard is down the same event keeps the baseline honest across rotation.
    const onResize = () => { if (shown) report(); else baseline = window.innerHeight; };
    window.addEventListener('resize', onResize);
    const pending = [
      // Reported on keyboardDIDShow, after the layout has settled — the raw will-show height is
      // the one number that is wrong in every resized layout.
      cap.addListener('keyboardWillShow', () => { if (!shown) baseline = window.innerHeight; }),
      cap.addListener('keyboardDidShow', (info) => { shown = info?.keyboardHeight ?? 0; report(); }),
      cap.addListener('keyboardWillHide', () => { shown = 0; report(); }),
    ];
    return () => {
      window.removeEventListener('resize', onResize);
      pending.forEach((p) => void p.then((h) => h.remove()).catch(() => {}));
    };
  }

  // visualViewport is the real web answer, and it is the ONLY one: `window.innerHeight` does not
  // change when the keyboard opens on iOS Safari, which is why the naive version of this fix
  // never worked there.
  const vv = hasWin() ? (window as unknown as { visualViewport?: VisualViewport }).visualViewport : undefined;
  if (!vv) { cb(0, false); return () => {}; }

  const onResize = () => {
    const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    // Under ~80px is browser chrome collapsing, not a keyboard.
    const open = covered > 80;
    cb(open ? Math.round(covered) : 0, open);
  };
  vv.addEventListener('resize', onResize);
  vv.addEventListener('scroll', onResize);
  onResize();
  return () => {
    vv.removeEventListener('resize', onResize);
    vv.removeEventListener('scroll', onResize);
  };
}

/** Dismiss the software keyboard — e.g. when a form submits or a sheet opens over the field. */
export function hideKeyboard(): void {
  const cap = capPlugin<{ hide(): Promise<void> }>('Keyboard');
  if (cap) { void cap.hide().catch(() => {}); return; }
  // Blurring the focused field is what actually closes it on the web.
  const el = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
  if (el && typeof el.blur === 'function') el.blur();
}

// ── orientation ──────────────────────────────────────────────────────────────────────────────

export type OrientationLock = 'portrait' | 'landscape' | 'any';

/**
 * Pin the screen for a view that only makes sense one way up — a game board, a chart the user is
 * reading landscape, a signature pad.
 *
 * Resolves false when the platform refuses, which desktop browsers always do. Always give the
 * user a way out of a locked view, and release the lock when leaving it.
 */
export async function lockOrientation(to: OrientationLock): Promise<boolean> {
  const cap = capPlugin<{
    lock(o: { orientation: string }): Promise<void>; unlock(): Promise<void>;
  }>('ScreenOrientation');
  if (cap) {
    try {
      if (to === 'any') await cap.unlock(); else await cap.lock({ orientation: to });
      return true;
    } catch { return false; }
  }

  const so = hasWin() ? (window.screen as unknown as {
    orientation?: { lock?(o: string): Promise<void>; unlock?(): void };
  }).orientation : undefined;
  if (!so) return false;
  try {
    if (to === 'any') { so.unlock?.(); return true; }
    if (!so.lock) return false;
    await so.lock(to);
    return true;
  } catch { return false; }   // browsers reject outside fullscreen; that is a refusal, not a crash
}

// ── network ──────────────────────────────────────────────────────────────────────────────────

export interface NetworkStatus {
  connected: boolean;
  /** 'wifi' | 'cellular' | 'none' | 'unknown'. */
  type: string;
}

interface NetworkPlugin {
  getStatus(): Promise<{ connected?: boolean; connectionType?: string }>;
  addListener(e: string, h: (s: { connected?: boolean; connectionType?: string }) => void): Promise<{ remove(): Promise<void> }>;
}

/**
 * The Network plugin's last answer, kept current by one listener for the life of the page.
 *
 * `networkStatus()` is synchronous (it is read during render) while the plugin is async, so the
 * plugin's reading is cached here. Until its first answer lands — a few ms after the first call —
 * the reading comes from the WebView's own `navigator.connection`, which describes the same phone.
 */
let netCache: NetworkStatus | null = null;
let netWatching = false;
const netFrom = (s: { connected?: boolean; connectionType?: string } | undefined): NetworkStatus => {
  const connected = s?.connected !== false;
  return { connected, type: connected ? (s?.connectionType || 'unknown') : 'none' };
};
function watchPluginNetwork(cap: NetworkPlugin): void {
  if (netWatching) return;
  netWatching = true;
  void cap.getStatus().then((s) => { netCache = netFrom(s); }).catch(() => {});
  void cap.addListener('networkStatusChange', (s) => { netCache = netFrom(s); }).catch(() => {});
}

/**
 * `navigator.connection` in the medium vocabulary. Its `effectiveType` ('4g', '3g'…) is a SPEED
 * class, not a medium — a desktop on wifi reports '4g' — so it is never passed off as a type.
 */
function webNetworkType(): string {
  const conn = (nav() as unknown as { connection?: { type?: string } } | undefined)?.connection;
  switch (conn?.type) {
    case 'wifi': case 'ethernet': case 'wimax': return 'wifi';
    case 'cellular': case 'bluetooth': return 'cellular';
    case 'none': return 'none';
    default: return 'unknown';
  }
}

/**
 * Current connectivity. Synchronous and cheap enough to call in a render. In the apps it is the
 * Network plugin's answer (Android's ConnectivityManager), on the web `navigator.onLine` plus
 * `navigator.connection.type` where the browser has it ('unknown' where it does not).
 */
export function networkStatus(): NetworkStatus {
  const cap = capPlugin<NetworkPlugin>('Network');
  if (cap) {
    watchPluginNetwork(cap);
    if (netCache) return netCache;
  }
  const n = nav();
  const connected = n ? n.onLine !== false : true;
  if (!connected) return { connected, type: 'none' };
  const type = webNetworkType();
  return { connected: type !== 'none', type };
}

/**
 * Connectivity changes. Returns an unsubscribe function.
 *
 * Worth wiring in any app that syncs: an offline banner that appears the moment the connection
 * drops, and a queued write that retries when it returns, is a thing users notice.
 */
export function onNetworkChange(cb: (status: NetworkStatus) => void): () => void {
  const cap = capPlugin<NetworkPlugin>('Network');
  if (cap) {
    watchPluginNetwork(cap);
    const p = cap.addListener('networkStatusChange', (s) => { netCache = netFrom(s); cb(netCache); });
    return () => { void p.then((h) => h.remove()).catch(() => {}); };
  }

  if (!hasWin()) return () => {};
  const fire = () => cb(networkStatus());
  window.addEventListener('online', fire);
  window.addEventListener('offline', fire);
  return () => {
    window.removeEventListener('online', fire);
    window.removeEventListener('offline', fire);
  };
}

// ── status bar ───────────────────────────────────────────────────────────────────────────────

/**
 * Paint the system bars to match the screen.
 *
 * The single cheapest native tell after haptics, and the most visible when it is missing: a dark
 * app under a white status bar reads instantly as a web page in a wrapper. Call it once at
 * startup with the app's `--bg`, and again on any screen that changes the background.
 *
 * `style` is the CONTENT colour: 'light' means light icons for a dark background. Pass `null`
 * to leave the current style untouched — the Capacitor-shaped `StatusBar.setBackgroundColor`
 * wrapper uses that, because the real plugin's setBackgroundColor never touches the style and
 * imitating it with a forced 'light' flipped dark icons to light on every background change.
 */
/** The colour this page last painted the bars with through the shell — what a style-only call re-sends. */
let shellBarColor = '';

export function setStatusBar(backgroundColor: string | null, style: 'light' | 'dark' | null = 'light'): void {
  // THE SHELL BRIDGE IS PREFERRED HERE, against this file's usual Capacitor-first order, for the
  // same reason notify() prefers it: on Android the shell owns the bars. Capacitor's StatusBar
  // plugin writes window.statusBarColor, which API 35+ ignores under enforced edge-to-edge — so
  // the plugin rung reported 'native' and changed nothing on every Android 15 device, while the
  // shell paints the strip itself (its inset content layout) and is the only party that can
  // colour it there. The bridge also takes the style, so one call does both halves atomically.
  const b = bridge();
  if (b?.setStatusBarColor) {
    if (backgroundColor) {
      if (b.setStatusBarColor(backgroundColor, style ?? '') !== false) shellBarColor = backgroundColor;
      return;
    }
    if (!style) return;
    // Style only. The bridge takes the style WITH a colour, so it gets the colour this page last
    // set — the bars keep their colour and only the icons flip. Before any colour was set here
    // the bars still wear the creator's build colour, which the page cannot read; the StatusBar
    // plugin then flips the icons on its own (appearance, unlike colour, is honoured on every API
    // level). Previously a style-only call did nothing at all on Android.
    if (shellBarColor) { b.setStatusBarColor(shellBarColor, style); return; }
    const sb = capPlugin<{ setStyle(o: { style: string }): Promise<void> }>('StatusBar');
    if (sb) void sb.setStyle({ style: style === 'light' ? 'DARK' : 'LIGHT' }).catch(() => {});
    return;
  }

  const cap = capPlugin<{
    setBackgroundColor(o: { color: string }): Promise<void>;
    setStyle(o: { style: string }): Promise<void>;
  }>('StatusBar');
  if (cap) {
    // Capacitor names the style by the BACKGROUND it is meant for: DARK = light content.
    if (style) void cap.setStyle({ style: style === 'light' ? 'DARK' : 'LIGHT' }).catch(() => {});
    if (backgroundColor) void cap.setBackgroundColor({ color: backgroundColor }).catch(() => {});
    return;
  }

  // The web has no separate content-style control — `theme-color` is the whole API, and the
  // browser picks readable icons from it — so a style-only call has nothing to do here.
  if (!backgroundColor) return;
  if (typeof document === 'undefined') return;
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = backgroundColor;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Gestures: back, swipe
// ─────────────────────────────────────────────────────────────────────────────────────────────

// ── back gesture ─────────────────────────────────────────────────────────────────────────────

/**
 * Handlers, innermost last. A stack rather than one slot because the shell exposes exactly ONE
 * global handler: two components registering directly would silently overwrite each other, and
 * the one that lost is usually the sheet the user is actually looking at.
 */
const backStack: Array<() => boolean> = [];

/** Innermost handler first — the sheet on top of the detail screen answers before the screen. */
function runBack(): boolean {
  for (let i = backStack.length - 1; i >= 0; i -= 1) {
    try { if (backStack[i]() === true) return true; } catch { /* a thrown handler consumes nothing */ }
  }
  return false;
}

const BACK_SENTINEL = { __appmintBack: true };
let webBackArmed = false;
let webListenerAttached = false;
let skipNextPop = false;

/**
 * Attached once and never removed.
 *
 * Detaching looked tidier and was a bug: teardown sets [skipNextPop] and calls `history.back()`
 * to consume its own sentinel, but `back()` delivers `popstate` on a LATER task — so removing the
 * listener first meant nothing ever cleared the flag, and the user's next real back press was
 * swallowed by a stale skip. The listener is inert while [backStack] is empty, so leaving it is
 * free; the flag having exactly one consumer is what makes it correct.
 */
function attachPopListener(): void {
  if (webListenerAttached || !hasWin()) return;
  window.addEventListener('popstate', onPopState);
  webListenerAttached = true;
}

function onPopState(): void {
  // Our own history.back() — teardown, or the pass-through below. Not the user going back.
  if (skipNextPop) { skipNextPop = false; return; }
  if (!backStack.length) { webBackArmed = false; return; }

  if (runBack()) {
    // Consumed: re-arm so the NEXT back press is ours too. Without this a second sheet, or
    // reopening the first, would fall straight through to leaving the page.
    window.history.pushState(BACK_SENTINEL, '');
    return;
  }

  // Nobody wanted it. The press was spent popping OUR sentinel, which is not a place the user
  // has ever seen — so stopping here would eat the press and look like the button is broken.
  // Go back once more, for real, and ignore the popstate that produces.
  webBackArmed = false;
  skipNextPop = true;
  window.history.back();
}

function syncBackRegistration(): void {
  const s = shell();
  if (s?.setBackHandler) {
    s.setBackHandler(backStack.length ? runBack : null);
    return;
  }
  if (!hasWin() || !window.history) return;

  if (backStack.length && !webBackArmed) {
    attachPopListener();
    window.history.pushState(BACK_SENTINEL, '');
    webBackArmed = true;
  } else if (!backStack.length && webBackArmed) {
    webBackArmed = false;
    // Consume the sentinel we pushed, or the user is left with one dead back press.
    skipNextPop = true;
    window.history.back();
  }
}

/**
 * Give this view first refusal on the BACK GESTURE — the edge swipe on Android, the browser's
 * back button on the web.
 *
 * Return `true` to consume it (you closed a sheet, dismissed a lightbox, stepped back a wizard
 * page); return `false` to let it through. Returns an unsubscribe function: call it on unmount,
 * always, or the closed sheet keeps eating the user's back presses.
 *
 * Why this matters more than it sounds: on Android the edge swipe is how most people navigate.
 * Without a handler, swiping back with a sheet open closes the WHOLE APP instead of the sheet —
 * the single most jarring difference between a generated app and a real one. A React Router app
 * gets ordinary navigation back for free; this is for state the router does not know about.
 *
 * `can('backGesture')` is 'none' on iOS, where no back gesture reaches page code. Render a
 * visible back control there — which is the native iOS pattern regardless.
 */
export function onBackGesture(handler: () => boolean): () => void {
  backStack.push(handler);
  syncBackRegistration();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const i = backStack.lastIndexOf(handler);
    if (i >= 0) backStack.splice(i, 1);
    syncBackRegistration();
  };
}

// ── swipe ────────────────────────────────────────────────────────────────────────────────────

export interface SwipeOptions {
  onLeft?(): void;
  onRight?(): void;
  onUp?(): void;
  onDown?(): void;
  /** Minimum travel in px before it counts as a swipe. Default 56 — roughly a thumb flick. */
  threshold?: number;
  /**
   * Px from the left/right screen edge where a horizontal swipe is IGNORED. Default 24.
   *
   * Android's system back gesture owns those strips. A card that reacts to a swipe starting
   * there fights the OS and loses — the user gets navigation, not the card, and it reads as a
   * broken control. Set 0 only for a full-screen pager where you have measured the conflict.
   */
  edgeGuard?: number;
  /** Fire a selection haptic on a recognised swipe. Default true. */
  haptics?: boolean;
}

/**
 * Swipe gestures on an element: swipe-to-delete rows, paging between tabs, dismissing a card.
 *
 * Pointer Events, so one implementation covers touch, pen and mouse-drag on desktop web — the
 * same code path everywhere, not a touch build and a mouse build.
 *
 * It sets `touch-action` for you, which is the part hand-rolled versions almost always miss:
 * without it the browser claims the gesture for scrolling and the handler never sees a coherent
 * drag. Horizontal handlers get `pan-y` (vertical scrolling still works), vertical handlers get
 * `pan-x`, both get `none`.
 *
 * Returns an unsubscribe function that also restores the original `touch-action`.
 *
 * SWIPE IS NEVER THE ONLY WAY TO REACH AN ACTION. It is invisible, undiscoverable, and unusable
 * by keyboard or screen reader. Every swipe must have a visible equivalent — a button in the row,
 * an item in an action sheet, a tab the user can tap.
 */
export function swipeable(el: HTMLElement, opts: SwipeOptions): () => void {
  const {
    onLeft, onRight, onUp, onDown,
    threshold = 56, edgeGuard = 24, haptics = true,
  } = opts;

  const horizontal = !!(onLeft || onRight);
  const vertical = !!(onUp || onDown);
  if (!horizontal && !vertical) return () => {};
  if (!hasWin() || typeof window.PointerEvent !== 'function') return () => {};

  const previousTouchAction = el.style.touchAction;
  el.style.touchAction = horizontal && vertical ? 'none' : horizontal ? 'pan-y' : 'pan-x';

  let id: number | null = null;
  let x0 = 0, y0 = 0;

  const down = (e: PointerEvent) => {
    // A second finger means pinch/zoom, not a swipe — drop the gesture rather than misreading it.
    if (id !== null) { id = null; return; }
    if (horizontal && edgeGuard > 0) {
      const w = window.innerWidth;
      if (e.clientX < edgeGuard || e.clientX > w - edgeGuard) return;
    }
    id = e.pointerId; x0 = e.clientX; y0 = e.clientY;
  };

  const up = (e: PointerEvent) => {
    if (id !== e.pointerId) return;
    id = null;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    const ax = Math.abs(dx), ay = Math.abs(dy);

    // A swipe has to be clearly ONE axis. Without the dominance check a sloppy diagonal scroll
    // fires a delete, which is the bug that makes people distrust swipe rows.
    const isHorizontal = ax > ay * 1.5;
    const isVertical = ay > ax * 1.5;

    let fired: (() => void) | undefined;
    if (horizontal && isHorizontal && ax >= threshold) fired = dx < 0 ? onLeft : onRight;
    else if (vertical && isVertical && ay >= threshold) fired = dy < 0 ? onUp : onDown;
    if (!fired) return;

    if (haptics) haptic('selection');
    fired();
  };

  const cancel = (e: PointerEvent) => { if (id === e.pointerId) id = null; };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  // A pointer that leaves the element never delivers pointerup here, so the gesture would stay
  // half-open and the next pointerdown would be dropped as a "second finger".
  el.addEventListener('pointerleave', cancel);

  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', cancel);
    el.removeEventListener('pointerleave', cancel);
    el.style.touchAction = previousTouchAction;
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Capacitor-shaped API
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// The same implementations above, exposed under the names and payload shapes the Capacitor
// plugins use. Two reasons, in order of importance:
//
//  1. The model already knows this API. It has seen an enormous amount of Capacitor code and zero
//     of ours, so `Haptics.impact({ style: 'LIGHT' })` is generated correctly from recognition,
//     while a bespoke API has to be taught in always-on prompt tokens that are re-billed on every
//     create and fix call.
//  2. It is the migration seam. When Capacitor lands underneath the shell, these names and
//     payloads do not change — only what they call internally does. Generated app code written
//     today keeps working unchanged after the native migration.
//
// The short forms (`haptic()`, `share()`, `copy()`) stay exported and are not deprecated: they are
// terser, and terseness matters in code the model writes a hundred times. Both call the same
// implementation, so an app can mix them freely.

export type ImpactStyle = 'LIGHT' | 'MEDIUM' | 'HEAVY';
export type NotificationType = 'SUCCESS' | 'WARNING' | 'ERROR';

export const Haptics = {
  impact: ({ style = 'LIGHT' as ImpactStyle } = {}): void =>
    haptic(style.toLowerCase() as HapticKind),
  notification: ({ type = 'SUCCESS' as NotificationType } = {}): void =>
    haptic(type.toLowerCase() as HapticKind),
  vibrate: ({ duration = 300 }: { duration?: number } = {}): void => {
    // Same rung order as haptic(): the plugin is the surface that exists on iOS, where there is no
    // shell bridge and WKWebView has no navigator.vibrate — without it this was a no-op there.
    const cap = capPlugin<{ vibrate(o: { duration: number }): Promise<void> }>('Haptics');
    if (cap) { void cap.vibrate({ duration }); return; }
    const b = bridge();
    if (b?.vibrate) { b.vibrate(duration); return; }
    const n = nav();
    if (n && 'vibrate' in n) { try { n.vibrate(duration); } catch { /* gesture-gated */ } }
  },
  selectionStart: (): void => haptic('selection'),
  selectionChanged: (): void => haptic('selection'),
  selectionEnd: (): void => { /* no distinct end tick on either surface */ },
};

export const Share = {
  share: async (opts: ShareInput = {}): Promise<{ activityType: string }> => {
    const ok = await share(opts);
    // Capacitor resolves with the chosen target and REJECTS on dismissal. Matching that matters:
    // apps written against Capacitor wrap this in try/catch and would treat a silent resolve as a
    // completed share, showing "Shared!" when the user actually cancelled.
    if (!ok) throw new Error('share cancelled or unavailable');
    return { activityType: '' };
  },
  canShare: async (): Promise<{ value: boolean }> => ({ value: can('share') !== 'none' }),
};

export const Clipboard = {
  write: async ({ string = '', url = '' }: { string?: string; url?: string } = {}):
    Promise<void> => { await copy(string || url); },
  read: async (): Promise<{ value: string; type: string }> =>
    ({ value: await paste(), type: 'text/plain' }),
};

export const Device = {
  /**
   * Async, so this one CAN use the plugin where the sync [deviceInfo] cannot — which is the whole
   * reason it is worth having both. On iOS the plugin is the only source of model and OS version.
   */
  getInfo: async (): Promise<DeviceInfo & { operatingSystem: string; isVirtual: boolean }> => {
    const cap = capPlugin<{ getInfo(): Promise<Record<string, unknown>> }>('Device');
    if (cap) {
      try {
        const d = await cap.getInfo();
        return {
          platform: platform(),
          language: nav()?.language ?? 'en',
          model: d.model as string | undefined,
          osVersion: d.osVersion as string | undefined,
          operatingSystem: (d.operatingSystem as string) ?? 'unknown',
          isVirtual: d.isVirtual === true,
          ...d,
        };
      } catch { /* fall through to the shell/web answer below */ }
    }
    const info = deviceInfo();
    return {
      ...info,
      operatingSystem: info.platform === 'web' ? 'unknown' : info.platform,
      isVirtual: false,
    };
  },

  getId: async (): Promise<{ identifier: string }> => {
    // The plugin's id is the stable one on iOS: `installId`'s web rung stores in localStorage,
    // which WKWebView can evict under storage pressure, and a per-install id that changes is
    // worse than useless to anything keyed on it.
    const cap = capPlugin<{ getId(): Promise<{ identifier?: string }> }>('Device');
    if (cap) {
      try {
        const id = (await cap.getId())?.identifier;
        if (id) return { identifier: id };
      } catch { /* fall through */ }
    }
    return { identifier: installId() };
  },

  getLanguageCode: async (): Promise<{ value: string }> =>
    ({ value: nav()?.language?.slice(0, 2) ?? 'en' }),
};

export const App = {
  getInfo: async (): Promise<{ name: string; id: string; build: string; version: string }> => {
    // The plugin is the only source on iOS, and it is the richer one everywhere: the shell's
    // bridge has no bundle id or build number to give.
    const cap = capPlugin<{
      getInfo(): Promise<{ name?: string; id?: string; build?: string; version?: string }>;
    }>('App');
    if (cap) {
      try {
        const i = await cap.getInfo();
        if (i?.name || i?.id) {
          return { name: i.name ?? '', id: i.id ?? '', build: i.build ?? '', version: i.version ?? '' };
        }
      } catch { /* fall through to the shell/web answer below */ }
    }
    const b = bridge();
    return {
      name: b?.getAppName?.() ?? (typeof document !== 'undefined' ? document.title : ''),
      id: '',
      build: '',
      version: b?.getAppVersion?.() ?? '',
    };
  },

  exitApp: (): void => {
    const b = bridge();
    if (b?.closeWindow) { b.closeWindow(); return; }
    // iOS has no shell bridge. Apple's HIG says an app should never quit itself and the plugin's
    // implementation reflects that, so this may legitimately do nothing there — never build a UI
    // whose only way forward is an Exit button.
    const cap = capPlugin<{ exitApp(): Promise<void> }>('App');
    if (cap) void cap.exitApp().catch(() => {});
  },
};

/**
 * Capacitor's TextToSpeech shape. `speak` resolves when the utterance is QUEUED, not when it
 * finishes — same as the plugin, and same as what both underlying engines actually report.
 */
export const TextToSpeech = {
  speak: async ({ text, lang, rate, pitch }:
    { text: string; lang?: string; rate?: number; pitch?: number }): Promise<void> => {
    speak(text, { lang, rate, pitch });
  },
  stop: async (): Promise<void> => { stopSpeaking(); },
};

/** Capacitor's LocalNotifications shape, immediate-only. Scheduling stays on the bridge addon. */
export const LocalNotifications = {
  schedule: async ({ notifications }: { notifications: NotifyInput[] }):
    Promise<{ notifications: NotifyInput[] }> => {
    for (const n of notifications) await notify(n);
    return { notifications };
  },
};

export const Toast = {
  show: async ({ text, duration = 'short' }: { text: string; duration?: 'short' | 'long' }): Promise<void> => {
    toast(text, { duration });
  },
};

export const ActionSheet = {
  showActions: async ({ title = '', options }: { title?: string; options: SheetOption[] }):
    Promise<{ index: number }> => {
    const i = await actionSheet(title, options);
    // Dismissal is `index: -1`, matching the plugin, which reports it as an out-of-range index
    // rather than rejecting. So test the bound — `if (index >= 0)` — never `if (index)`: that
    // reads the FIRST option (0) as "nothing chosen" and a dismissal (-1) as a choice.
    return { index: i ?? -1 };
  },
};

/**
 * Capacitor's Dialog shape — a REAL system alert on every surface.
 *
 * Android gets the plugin's Material dialog. On iOS and the web the browser's own dialogs are the
 * right answer rather than a compromise: WKWebView renders `confirm()` as a native
 * UIAlertController, which is exactly the control an iOS user expects, and no DOM imitation gets
 * closer. They are modal and synchronous, so use them for decisions that genuinely block — a
 * destructive confirm — and `toast()` or an inline message for anything that does not.
 */
export const Dialog = {
  alert: async ({ title = '', message }: { title?: string; message: string }): Promise<void> => {
    const cap = capPlugin<{ alert(o: Record<string, unknown>): Promise<void> }>('Dialog');
    if (cap) { await cap.alert({ title, message }).catch(() => {}); return; }
    if (hasWin()) window.alert(title ? `${title}\n\n${message}` : message);
  },

  confirm: async ({ title = '', message, okButtonTitle, cancelButtonTitle }:
    { title?: string; message: string; okButtonTitle?: string; cancelButtonTitle?: string }):
    Promise<{ value: boolean }> => {
    const cap = capPlugin<{ confirm(o: Record<string, unknown>): Promise<{ value: boolean }> }>('Dialog');
    if (cap) {
      try { return await cap.confirm({ title, message, okButtonTitle, cancelButtonTitle }); }
      catch { return { value: false } }   // dismissal is a "no", never an unhandled rejection
    }
    return { value: hasWin() ? window.confirm(title ? `${title}\n\n${message}` : message) : false };
  },

  prompt: async ({ title = '', message, inputPlaceholder = '', inputText = '' }:
    { title?: string; message: string; inputPlaceholder?: string; inputText?: string }):
    Promise<{ value: string; cancelled: boolean }> => {
    const cap = capPlugin<{
      prompt(o: Record<string, unknown>): Promise<{ value: string; cancelled: boolean }>;
    }>('Dialog');
    if (cap) {
      try { return await cap.prompt({ title, message, inputPlaceholder, inputText }); }
      catch { return { value: '', cancelled: true } }
    }
    if (!hasWin()) return { value: '', cancelled: true };
    const v = window.prompt(title ? `${title}\n\n${message}` : message, inputText);
    return v === null ? { value: '', cancelled: true } : { value: v, cancelled: false };
  },
};

export const Keyboard = {
  hide: async (): Promise<void> => { hideKeyboard(); },
  /**
   * `addListener('keyboardWillShow'|'keyboardDidShow'|'keyboardWillHide'|'keyboardDidHide', …)`,
   * in Capacitor's remove-handle shape. Show events fire when the keyboard opens and again when
   * the space it covers changes, with `keyboardHeight` = what the page still has to clear (0 in
   * the Android app once the shell has resized the page). Hide events fire only when the keyboard
   * actually closes — never because that number reached 0.
   */
  addListener: (event: string, handler: (info: { keyboardHeight: number }) => void):
    { remove(): void } => {
    let wasOpen = false;
    let lastPx = -1;
    const off = watchKeyboard((px, open) => {
      if (open) {
        if ((!wasOpen || px !== lastPx) && (event === 'keyboardWillShow' || event === 'keyboardDidShow')) {
          handler({ keyboardHeight: px });
        }
      } else if (wasOpen && (event === 'keyboardWillHide' || event === 'keyboardDidHide')) {
        handler({ keyboardHeight: 0 });
      }
      wasOpen = open;
      lastPx = open ? px : -1;
    });
    return { remove: off };
  },
};

export const ScreenOrientation = {
  lock: async ({ orientation }: { orientation: string }): Promise<void> => {
    await lockOrientation(orientation.startsWith('landscape') ? 'landscape' : 'portrait');
  },
  unlock: async (): Promise<void> => { await lockOrientation('any'); },
};

export const Network = {
  getStatus: async (): Promise<{ connected: boolean; connectionType: string }> => {
    // Async, so it asks the plugin itself rather than reading the cache networkStatus() keeps.
    const cap = capPlugin<NetworkPlugin>('Network');
    if (cap) {
      const s = (netCache = netFrom(await cap.getStatus()));
      return { connected: s.connected, connectionType: s.type };
    }
    const s = networkStatus();
    return { connected: s.connected, connectionType: s.type };
  },
  addListener: (_event: string, handler: (s: { connected: boolean; connectionType: string }) => void):
    { remove(): void } => {
    const off = onNetworkChange((s) => handler({ connected: s.connected, connectionType: s.type }));
    return { remove: off };
  },
};

export const StatusBar = {
  /** Background only — the real plugin's setBackgroundColor leaves the style alone. */
  setBackgroundColor: async ({ color }: { color: string }): Promise<void> => { setStatusBar(color, null); },
  /** Capacitor names the style by the background it suits: 'DARK' = light content. */
  setStyle: async ({ style }: { style: string }): Promise<void> => {
    setStatusBar(null, style.toUpperCase() === 'DARK' ? 'light' : 'dark');
  },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Remote updates — page-driven lane RETIRED 2026-09-03 (`updates.supported()` is always false)
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// HISTORY. Classic AppMint updates natively (RemoteUpdateManager); what follows is the design of a
// page-driven lane written for Appwright's iOS export, kept because the file is shared lineage
// and its reasoning (checksum, pending→confirmed, revert) is what the native updater implements.
// None of it runs in a classic app.
//
// The Android shell already does this natively (RemoteUpdateManager): download a new web bundle,
// serve it instead of the baked one, revert if it fails to load. iOS needs none of that written
// in Swift, because everything required already ships in the scaffold:
//
//   - `@capacitor/filesystem` writes the downloaded bundle into the app's Library directory;
//   - Capacitor core's WebView plugin exposes `setServerBasePath`, which repoints the server at
//     that directory — the same hook Ionic Appflow and Capgo are built on.
//
// ## Apple allows this, within limits
//
// The Developer Program License Agreement §3.3.2 permits downloading and running code
// interpreted by WebKit/JavaScriptCore, provided it does not change the app's primary purpose.
// That is why live-update products exist and ship in App Store apps.
//
// The limit is absolute and worth stating plainly: **an update may change HTML, CSS and
// JavaScript only.** It cannot add a native capability. A generated app whose update starts
// calling a Capacitor plugin that was not compiled into the submitted binary will find that
// plugin simply absent — which `can()` already reports honestly as `'none'`. Shipping a genuinely
// new native capability still needs a new binary through review.
//
// ## Bricking is the real risk, so reverting is the real feature
//
// `setServerBasePath` survives relaunch. Point it at a bundle that throws on load and the app is
// dead on every subsequent launch — reinstall is the only way out, and the creator's users are
// the ones who suffer. So an update is staged as PENDING, and only a page that boots and calls
// [confirmUpdate] promotes it. Anything else reverts on next launch. This mirrors the Android
// shell's quarantine, which exists for exactly the same reason.

const UPDATE_PENDING_KEY = 'appmint.update.pending';
const UPDATE_ACTIVE_KEY = 'appmint.update.active';

interface UpdateRecord { path: string; version: string; binaryVersion: string }

/** Reads a record without letting malformed storage take the app down with it. */
function readUpdateRecord(key: string): UpdateRecord | null {
  if (!hasWin()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as UpdateRecord) : null;
  } catch { return null; }
}

/** Capacitor's Filesystem plugin, as much of it as the updater needs. */
interface FilesystemPlugin {
  writeFile(o: { path: string; data: string; directory: string; recursive?: boolean }): Promise<{ uri: string }>;
  mkdir(o: { path: string; directory: string; recursive: boolean }): Promise<void>;
  rmdir(o: { path: string; directory: string; recursive: boolean }): Promise<void>;
  getUri(o: { path: string; directory: string }): Promise<{ uri: string }>;
}

/**
 * Reads a ZIP central directory and inflates each entry.
 *
 * Written by hand rather than pulled from a library because this file is deliberately
 * dependency-free — it is injected into every generated app, and a bundled zip library would be
 * dead weight in the many apps that never update. Inflation itself is NOT hand-written: it goes
 * through the platform's `DecompressionStream`, so the compression is done by the same code the
 * browser uses everywhere else.
 */
async function unzip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const dv = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // The End Of Central Directory record sits at the end, after a comment of unknown length, so
  // it has to be found by scanning backwards for its signature.
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= 0 && i > buf.byteLength - 66_000; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('appmint: not a zip file (no end-of-central-directory record)');

  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = new Map<string, Uint8Array>();

  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('appmint: corrupt zip directory');
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOff = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    if (name.endsWith('/')) continue;                       // directory entry
    // A zip-slip guard matters even here: an entry named ../../x would otherwise be written
    // outside the update directory when Filesystem resolves the path.
    if (name.includes('..')) throw new Error(`appmint: unsafe path in update bundle: ${name}`);

    // The local header repeats the name and extra fields, with its own lengths.
    const lNameLen = dv.getUint16(localOff + 26, true);
    const lExtraLen = dv.getUint16(localOff + 28, true);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const raw = bytes.subarray(start, start + compSize);

    if (method === 0) out.set(name, raw.slice());
    else if (method === 8) {
      const ds = new DecompressionStream('deflate-raw');
      const inflated = new Response(new Blob([raw]).stream().pipeThrough(ds));
      out.set(name, new Uint8Array(await inflated.arrayBuffer()));
    } else {
      throw new Error(`appmint: unsupported zip compression (${method}) for ${name}`);
    }
  }
  return out;
}

const b64 = (u8: Uint8Array): string => {
  // Chunked: String.fromCharCode(...u8) blows the argument limit on a bundle-sized array.
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) {
    s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  }
  return btoa(s);
};

const hex = (b: ArrayBuffer): string =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

/**
 * One download at a time, for the whole page.
 *
 * Cold start, resume and a foreground tick can all reach the updater within a second of each
 * other. The Android shell hit exactly this: two threads streamed the SAME bundle into the SAME
 * file, the bytes interleaved, the checksum failed, and the update simply never landed with the
 * only clue in logcat.
 */
let downloadInFlight = false;

/**
 * Page-driven bundle updates — RETIRED. `supported()` answers false on every platform and
 * `download()` therefore does nothing; do not build an "update now" screen on this object.
 *
 * Remote Update is real, but it is NATIVE: the Android shell's RemoteUpdateManager downloads,
 * verifies and activates a published bundle on its own at launch, with no page code at all. A
 * creator publishes from the generator; the app picks it up. The methods below are kept only so
 * code written against them still compiles.
 */
export const updates = {
  /**
   * Always false (since 2026-09-03). Kept for source compatibility — see the object's comment:
   * the native updaters own the whole lane, so a page never stages a bundle itself.
   *
   * Why no page-driven lane is left: this one repointed Capacitor's server with
   * `setServerBasePath`. In the Android shell that server never serves the page (the shell's
   * own WebViewClient does — see CapacitorHost), so a staged bundle would never render and the
   * unconfirmed update would be reported as a rollback. (It was written for Appwright's iOS
   * export, which has since moved to a native updater as well.)
   */
  supported(): boolean {
    // 2026-09-03: false on EVERY platform. Android is served natively by RemoteUpdateManager
    // and iOS by the scaffold's AppwrightUpdater.swift, which re-points Capacitor's base path
    // from its own `active.json` on every launch — a bundle staged from page code would be
    // overridden at the next start and then reported as a rollback. Page code has no
    // update to perform; the native updaters own the whole lane on both stores.
    return false;
  },

  /**
   * Downloads a bundle, verifies it, unpacks it and stages it for the next launch.
   *
   * @param url the zip to fetch
   * @param sha256 its expected digest, lower-case hex. NOT optional: this bundle becomes the
   *   app's own code, so a truncated download or a tampered file must never be executed. The
   *   Android shell discards on checksum mismatch for the same reason.
   * @returns true when staged; the caller should then prompt for a restart.
   */
  async download(
    url: string,
    sha256: string,
    version: string,
    binaryVersion: string,
  ): Promise<boolean> {
    if (!this.supported()) return false;
    if (downloadInFlight) return false;
    downloadInFlight = true;
    try {
      const fs = capPlugin<FilesystemPlugin>('Filesystem')!;

      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`appmint: update download failed (HTTP ${res.status})`);
      const buf = await res.arrayBuffer();

      const actual = hex(await crypto.subtle.digest('SHA-256', buf));
      if (actual !== sha256.trim().toLowerCase()) {
        throw new Error('appmint: update checksum mismatch — discarded');
      }

      const files = await unzip(buf);
      if (!files.has('index.html')) {
        // Staging a bundle with no entry point would brick the app on next launch, and the
        // revert would only kick in one failed launch later.
        throw new Error('appmint: update bundle has no index.html');
      }

      // A fresh directory per version, so a half-written update can never be mistaken for a
      // complete one and the previous bundle stays intact until this one is confirmed.
      const dir = `updates/${version}`;
      const DIRECTORY = 'LIBRARY';
      try { await fs.rmdir({ path: dir, directory: DIRECTORY, recursive: true }); } catch { /* first run */ }
      await fs.mkdir({ path: dir, directory: DIRECTORY, recursive: true });

      for (const [name, data] of files) {
        await fs.writeFile({
          path: `${dir}/${name}`, data: b64(data), directory: DIRECTORY, recursive: true,
        });
      }

      // setServerBasePath wants a filesystem path, not a file:// URI.
      const { uri } = await fs.getUri({ path: dir, directory: DIRECTORY });
      return await this.stage(uri.replace(/^file:\/\//, ''), version, binaryVersion);
    } finally {
      downloadInFlight = false;
    }
  },

  /**
   * Points the app at a downloaded bundle on the NEXT launch, staged as pending.
   *
   * [dir] must already contain the bundle's `index.html`, written via `Filesystem`. [version] is
   * the bundle's own version and [binaryVersion] the app version it was built for — an update
   * built for a different binary must never activate, because the plugins it expects may not be
   * in this one. The Android shell drops remote content whose apkVersionCode does not match for
   * the same reason: a store update always wins.
   */
  async stage(dir: string, version: string, binaryVersion: string): Promise<boolean> {
    const wv = capPlugin<{ setServerBasePath(o: { path: string }): Promise<void> }>('WebView');
    if (!wv) return false;
    if (!hasWin()) return false;
    window.localStorage.setItem(UPDATE_PENDING_KEY,
      JSON.stringify({ path: dir, version, binaryVersion } satisfies UpdateRecord));
    await wv.setServerBasePath({ path: dir });
    return true;
  },

  /**
   * Call once the updated page has actually rendered and is healthy.
   *
   * Until this runs the update is pending, and [revertIfUnconfirmed] will roll it back. Call it
   * LATE — after the first screen has data, not in a script tag at the top — or a bundle that
   * throws halfway through will confirm itself and brick the app.
   */
  confirm(): void {
    if (!hasWin()) return;
    const pending = readUpdateRecord(UPDATE_PENDING_KEY);
    if (!pending) return;
    window.localStorage.setItem(UPDATE_ACTIVE_KEY, JSON.stringify(pending));
    window.localStorage.removeItem(UPDATE_PENDING_KEY);
  },

  /**
   * Reverts to the bundled app when a staged update never confirmed, or was built for another
   * binary. Call this FIRST on every launch, before anything else touches the page.
   */
  async revertIfUnconfirmed(binaryVersion: string): Promise<boolean> {
    const wv = capPlugin<{ setServerBasePath(o: { path: string }): Promise<void> }>('WebView');
    if (!wv || !hasWin()) return false;

    const pending = readUpdateRecord(UPDATE_PENDING_KEY);
    const active = readUpdateRecord(UPDATE_ACTIVE_KEY);

    // Staged but never confirmed ⇒ it failed to boot. Back to the bundled app.
    if (pending) {
      window.localStorage.removeItem(UPDATE_PENDING_KEY);
      await wv.setServerBasePath({ path: '' });   // '' restores the bundled public/ directory
      return true;
    }
    // A store update shipped a new binary; content built for the old one is dead.
    if (active && active.binaryVersion !== binaryVersion) {
      window.localStorage.removeItem(UPDATE_ACTIVE_KEY);
      await wv.setServerBasePath({ path: '' });
      return true;
    }
    return false;
  },

  /** The bundle currently serving, or null when running the version from the App Store. */
  current(): UpdateRecord | null {
    return readUpdateRecord(UPDATE_ACTIVE_KEY);
  },
};


// ── remote config: announcements and maintenance, without a rebuild ──────────────────────────

/** The subset of the published manifest this runtime acts on. */
export interface RemoteConfig {
  version: number;
  announcementText: string;
  announcementId: string;
  announcementImageUrl: string;
  announcementBgColor: string;
  announcementTextColor: string;
  maintenanceMode: boolean;
  maintenanceText: string;
}

const RC_DISMISSED_KEY = 'appmint.rc.dismissed';

function rcTargetsThisPlatform(m: Record<string, unknown>): boolean {
  const list = m.platforms;
  // Absent means both. Every manifest published before platform targeting existed omits the key,
  // and reading those as "nobody" would switch remote config off for apps already installed.
  if (!Array.isArray(list)) return true;
  const me = platform();
  return list.some((p) => String(p).toLowerCase() === me);
}

/**
 * Remote config for the platforms the native shell does not already handle.
 *
 * On Android the shell reads this same manifest natively (RemoteUpdateManager) and draws the
 * announcement itself, so this runs on the web only — otherwise a creator publishing one
 * announcement would see two of them stacked on Android.
 *
 * The manifest is a public Supabase object, so it needs no key and no bridge: the whole lane is
 * one authenticated-by-nobody GET.
 */
export const remoteConfig = {
  /**
   * The manifest URL the build baked into the page, or ''.
   *
   * Read from `<meta name="appmint-remote-manifest">`. NOTHING in classic AppMint writes that tag
   * — the Android shell gets the manifest URL from its build config and draws remote config
   * itself — so this is '' unless the page's own HTML carries the tag. A website build that wants
   * the announcement strip must add the meta tag (or pass the URL to `start()`) itself.
   */
  manifestUrl(): string {
    if (!hasWin()) return '';
    const el = document.querySelector('meta[name="appmint-remote-manifest"]');
    return el?.getAttribute('content')?.trim() || '';
  },

  /** True where this runtime, rather than the native shell, owns remote config. */
  handledHere(): boolean {
    return platform() !== 'android';
  },

  /**
   * Fetches the manifest and returns what applies here, or null.
   *
   * Never throws: a creator's app must not fail to start because a CDN blipped or because the
   * manifest was hand-edited into invalid JSON. A miss simply means "no remote config", which is
   * exactly how the app behaves when none was ever published.
   */
  async fetch(manifestUrl: string): Promise<RemoteConfig | null> {
    if (!manifestUrl) return null;
    try {
      const res = await globalThis.fetch(manifestUrl, { cache: 'no-store' });
      if (!res.ok) return null;
      const m = (await res.json()) as Record<string, unknown>;
      if (m.manifestFormat !== 1) return null;         // newer than this runtime understands
      if (m.paused === true || m.revertToShipped === true) return null;
      if (!rcTargetsThisPlatform(m)) return null;
      const c = (m.config ?? {}) as Record<string, unknown>;
      const str = (k: string) => (typeof c[k] === 'string' ? (c[k] as string) : '');
      return {
        version: typeof m.version === 'number' ? m.version : 0,
        announcementText: str('announcementText'),
        announcementId: str('announcementId'),
        announcementImageUrl: str('announcementImageUrl'),
        announcementBgColor: str('announcementBgColor'),
        announcementTextColor: str('announcementTextColor'),
        maintenanceMode: c.maintenanceMode === true,
        maintenanceText: str('maintenanceText'),
      };
    } catch {
      return null;
    }
  },

  /** Whether this exact announcement was already dismissed on this device. */
  dismissed(id: string): boolean {
    if (!id || !hasWin()) return false;
    try { return window.localStorage.getItem(RC_DISMISSED_KEY) === id; } catch { return false; }
  },

  dismiss(id: string): void {
    if (!id || !hasWin()) return;
    try { window.localStorage.setItem(RC_DISMISSED_KEY, id); } catch { /* private mode */ }
  },

  /**
   * Draws the announcement strip and the maintenance screen, matching what the Android shell
   * shows so one publish looks the same on both platforms.
   *
   * Returns a teardown function. Styling is inline rather than injected CSS so it cannot be
   * broken by, or break, whatever the generated app already loaded.
   */
  apply(cfg: RemoteConfig | null): () => void {
    if (!cfg || !hasWin() || !document.body) return () => {};

    // Maintenance wins: it means "do not use the app right now", so showing the app underneath a
    // banner would be the wrong end of the message.
    if (cfg.maintenanceMode) {
      const veil = document.createElement('div');
      veil.setAttribute('data-appmint-maintenance', '');
      veil.style.cssText =
        'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;' +
        'justify-content:center;padding:24px;text-align:center;font:16px/1.5 system-ui,sans-serif;' +
        "background:#0B0F1A;color:#fff";
      veil.textContent = cfg.maintenanceText || 'This app is temporarily unavailable.';
      document.body.appendChild(veil);
      return () => veil.remove();
    }

    if (!cfg.announcementText && !cfg.announcementImageUrl) return () => {};
    if (cfg.announcementId && remoteConfig.dismissed(cfg.announcementId)) return () => {};

    const bar = document.createElement('div');
    bar.setAttribute('data-appmint-announcement', '');
    bar.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:2147483646;display:flex;align-items:center;' +
      'gap:10px;padding:10px 12px;font:14px/1.4 system-ui,sans-serif;' +
      `background:${cfg.announcementBgColor || '#1F2937'};color:${cfg.announcementTextColor || '#FFFFFF'}`;
    // Sits under the status bar on a notched iPhone without this.
    bar.style.paddingTop = 'calc(10px + env(safe-area-inset-top))';

    if (cfg.announcementImageUrl) {
      const img = document.createElement('img');
      img.src = cfg.announcementImageUrl;
      img.alt = '';
      img.style.cssText = 'max-height:28px;flex:0 0 auto';
      bar.appendChild(img);
    }
    if (cfg.announcementText) {
      const span = document.createElement('span');
      span.textContent = cfg.announcementText;
      span.style.cssText = 'flex:1 1 auto';
      bar.appendChild(span);
    }

    const close = document.createElement('button');
    close.textContent = '\u2715';
    close.setAttribute('aria-label', 'Dismiss');
    close.style.cssText =
      'flex:0 0 auto;background:transparent;border:0;color:inherit;font-size:16px;cursor:pointer';
    close.onclick = () => { remoteConfig.dismiss(cfg.announcementId); bar.remove(); };
    bar.appendChild(close);

    document.body.appendChild(bar);
    return () => bar.remove();
  },

  /**
   * One call for the common case: fetch, then draw. Safe to await at startup.
   *
   * No-ops on Android so the native strip is never doubled.
   */
  async start(manifestUrl?: string): Promise<void> {
    if (!remoteConfig.handledHere()) return;
    remoteConfig.apply(await remoteConfig.fetch(manifestUrl || remoteConfig.manifestUrl()));
  },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Formerly Android-only bridge families: folder access, secure keys, media session, Bluetooth
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// Until 2026-09-04 these four were taught RAW — `window.WebToApk.requestFolderAccess(...)` — so
// they were Android-only by construction: no wrapper, no iOS plugin, and the addon itself told
// the model the feature did not exist elsewhere. Each now has a real implementation on every
// surface that can support it: the shell bridge on Android, an Appwright plugin in the iOS
// scaffold (AppwrightFolders / AppwrightSecureKeys / AppwrightMediaSession, plus the community
// BluetoothLe plugin the scaffold already carried), and the web standard where one exists.
//
// The Android bridge is synchronous; every wrapper here is async anyway so app code is written
// once. Reply shapes were designed to match field-for-field across the two natives.

// ── UTF-8 <-> base64 ─────────────────────────────────────────────────────────────────────────

const utf8ToB64 = (s: string): string => bytesToB64(new TextEncoder().encode(s));
const b64ToUtf8 = (b: string): string => new TextDecoder().decode(b64ToBytes(b));

function bytesToB64(u8: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function b64ToBytes(b: string): Uint8Array {
  const bin = atob(b || '');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

// ── folder access ────────────────────────────────────────────────────────────────────────────

export interface FolderEntry {
  name: string; uri: string; isDirectory: boolean; length: number; lastModified: number;
}
export interface FolderStat {
  name: string; size: number; mime: string; lastModified: number; uri: string;
  isDirectory: boolean; canWrite: boolean;
}

/** The AppwrightFolders plugin (iOS): security-scoped bookmark to a user-picked folder. */
interface FoldersPlugin {
  request(): Promise<{ ok?: boolean; label?: string }>;
  status(): Promise<{ connected?: boolean; label?: string; uri?: string }>;
  clear(): Promise<void>;
  list(o: { path: string }): Promise<{ entries?: FolderEntry[] }>;
  readText(o: { path: string }): Promise<{ ok?: boolean; text?: string }>;
  writeText(o: { path: string; content: string }): Promise<{ ok?: boolean }>;
  mkdir(o: { path: string }): Promise<{ ok?: boolean }>;
  rename(o: { path: string; newName: string }): Promise<{ ok?: boolean }>;
  remove(o: { path: string; recursive: boolean }): Promise<{ ok?: boolean }>;
  stat(o: { path: string }): Promise<{ ok?: boolean } & Partial<FolderStat>>;
}

const foldersPlugin = () => capPlugin<FoldersPlugin>('AppwrightFolders');

/** Human-readable name for an Android tree URI: `…/tree/primary%3ADocuments%2FNotes` → `Documents/Notes`. */
function folderLabelFromUri(uri: string): string {
  const tail = uri.split('/tree/')[1] ?? '';
  const decoded = (() => { try { return decodeURIComponent(tail); } catch { return tail; } })();
  return decoded.split(':').pop() || decoded || uri;
}

/**
 * A whole folder the user grants ONCE, kept across launches, with real file operations inside it:
 * the Android shell's SAF tree grant (Native Folder Access must be on in the build).
 * `can('folderAccess')` is 'none' on the web — do not render the feature there;
 * pickFile()/saveFile() are the both-surface alternative.
 *
 * Every path is RELATIVE to the granted folder ('' is the root, 'notes/todo.md' a file). The
 * shell rejects '..' and absolute paths, so never build one.
 */
export const folder = {
  /** True when a folder is currently granted. */
  async connected(): Promise<boolean> {
    const cap = foldersPlugin();
    if (cap) { try { return !!(await cap.status())?.connected; } catch { return false; } }
    return bridge()?.hasFolderAccess?.() === 'true';
  },

  /** The granted folder's display name, or '' — show it, so the user knows where files go. */
  async label(): Promise<string> {
    const cap = foldersPlugin();
    if (cap) { try { return (await cap.status())?.label ?? ''; } catch { return ''; } }
    const uri = bridge()?.getFolderAccessUri?.() ?? '';
    return uri ? folderLabelFromUri(uri) : '';
  },

  /**
   * Opens the system folder picker. Call from a user gesture. Resolves true when a folder was
   * granted and false when the user cancelled. A picker that could not run REJECTS with an Error
   * whose `code` says why — never a silent false: 'busy' (a picker is already open; that request
   * keeps its own answer), 'no-picker' (no document picker app on this device), 'disabled' (the
   * build's Native Folder Access is off), 'not-persisted' (Android refused to keep the grant —
   * pick another folder) or 'foreign-origin'.
   */
  request(): Promise<boolean> {
    const cap = foldersPlugin();
    if (cap) return cap.request().then((r) => !!r?.ok).catch(() => false);
    const b = bridge();
    const request = b?.requestFolderAccess;
    if (!request || !hasWin()) return Promise.resolve(false);
    const id = rid('folder');
    return new Promise<boolean>((resolve, reject) => {
      // A permanent per-id dispatcher (see replyHook): the old save-and-restore of the global
      // looped forever under the shell's own accessor-backed helper.
      folderWaiters.set(id, (ok, _uri, _id, error) => {
        if (ok) { resolve(true); return; }
        // A shell older than the 4th argument sends none: that shell only ever failed on cancel.
        const code = String(error || 'cancelled').replace(/_/g, '-');
        if (code === 'cancelled') { resolve(false); return; }
        reject(codedError(code, code === 'busy'
          ? 'a folder picker is already open'
          : code === 'no-picker' ? 'this device has no document picker app'
          : `the folder picker could not complete (${code})`));
      });
      replyHook('WebToApkOnFolderAccessResult', '__webToApkFsUserFolderCallback', folderWaiters);
      // Called on the bridge object: a @JavascriptInterface method detached from its receiver
      // is not guaranteed to dispatch.
      request.call(b, id);
    });
  },

  /** Forgets the grant. Always offer this next to the folder's name. */
  async disconnect(): Promise<void> {
    const cap = foldersPlugin();
    if (cap) { await cap.clear().catch(() => {}); return; }
    bridge()?.clearFolderAccess?.();
  },

  async list(path = ''): Promise<FolderEntry[]> {
    const cap = foldersPlugin();
    if (cap) { try { return (await cap.list({ path }))?.entries ?? []; } catch { return []; } }
    const raw = bridge()?.listFolderEntries?.(path);
    if (!raw) return [];
    return JSON.parse(raw) as FolderEntry[];
  },

  /** File contents as UTF-8, or null when the file does not exist (a normal outcome). */
  async readText(path: string): Promise<string | null> {
    const cap = foldersPlugin();
    if (cap) {
      try { const r = await cap.readText({ path }); return r?.ok ? (r.text ?? '') : null; }
      catch { return null; }
    }
    const b = bridge();
    if (!b?.readTextFile) return null;
    // The bridge answers '' for both "empty file" and "no such file"; stat tells them apart.
    const st = b.statFile ? JSON.parse(b.statFile(path) || '{}') as { ok?: boolean } : { ok: true };
    if (!st.ok) return null;
    return b.readTextFile(path) ?? '';
  },

  /** Creates or overwrites. Parent folders are created as needed. */
  async writeText(path: string, text: string): Promise<boolean> {
    const cap = foldersPlugin();
    if (cap) { try { return !!(await cap.writeText({ path, content: text }))?.ok; } catch { return false; } }
    return bridge()?.writeTextFile?.(path, text) === 'true';
  },

  async mkdir(path: string): Promise<boolean> {
    const cap = foldersPlugin();
    if (cap) { try { return !!(await cap.mkdir({ path }))?.ok; } catch { return false; } }
    return bridge()?.mkdir?.(path) === 'true';
  },

  /** `newName` is a leaf name, not a path — an entry cannot be moved between folders. */
  async rename(path: string, newName: string): Promise<boolean> {
    const cap = foldersPlugin();
    if (cap) { try { return !!(await cap.rename({ path, newName }))?.ok; } catch { return false; } }
    return bridge()?.renameEntry?.(path, newName) === 'true';
  },

  /** A non-empty directory is only removed with `recursive: true`. The root is never removable. */
  async remove(path: string, recursive = false): Promise<boolean> {
    const cap = foldersPlugin();
    if (cap) { try { return !!(await cap.remove({ path, recursive }))?.ok; } catch { return false; } }
    return bridge()?.deleteEntry?.(path, String(recursive)) === 'true';
  },

  async stat(path: string): Promise<FolderStat | null> {
    const cap = foldersPlugin();
    if (cap) {
      try { const r = await cap.stat({ path }); return r?.ok ? (r as FolderStat) : null; }
      catch { return null; }
    }
    const b = bridge();
    const raw = b?.statFile?.(path);
    if (!raw) return null;
    const r = JSON.parse(raw) as { ok?: boolean; error?: string } & FolderStat;
    if (r.ok) return r;
    // The shell's statFile resolves FILES only, so a sub-folder answered 'not-found'. A folder is
    // stat-ed from its parent's listing — the same native entry the shell reports for it.
    if (r.error !== 'not-found' || !b?.listFolderEntries) return null;
    const clean = path.replace(/\/+$/, '');
    const cut = clean.lastIndexOf('/');
    const parent = cut >= 0 ? clean.slice(0, cut) : '';
    const leaf = cut >= 0 ? clean.slice(cut + 1) : clean;
    if (!leaf) return null;
    const entries = JSON.parse(b.listFolderEntries(parent) || '[]') as FolderEntry[];
    const dir = entries.find((e) => e.isDirectory && e.name === leaf);
    if (!dir) return null;
    return {
      name: dir.name, size: 0, mime: 'vnd.android.document/directory', lastModified: dir.lastModified,
      // Everything inside the granted tree is writable: the grant is taken read + write.
      uri: dir.uri, isDirectory: true, canWrite: true,
    };
  },
};

// ── secure keys ──────────────────────────────────────────────────────────────────────────────

/**
 * Machine-readable failure. `code` is one vocabulary on every surface — the natives' own error
 * strings are normalised into it, and the original text rides in `message`:
 *   'no-such-key' · 'auth-required' (Android: call unlock() and retry; iOS: the user cancelled
 *   the system prompt) · 'key-invalidated' (biometrics changed / screen lock removed — the data
 *   is gone) · 'strongbox-unavailable' (no secure hardware on this device) · 'disabled'
 *   (capability not in this build) · 'bad-alias' · 'bad-payload' (not valid base64 or too short;
 *   on the web also a payload that fails authentication — the natives report that one as
 *   'failed', they cannot tell it apart from other cipher errors) · 'too-large' (over 4 MB
 *   per call on Android — encrypt a record at a time) · 'access-control' (iOS could not create
 *   the key's access policy) · 'foreign-origin' (a page from another origin; refused) ·
 *   'failed' (anything else).
 */
export class SecureKeyError extends Error {
  code: string;
  constructor(code: string, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'SecureKeyError';
    this.code = code;
  }
}

export interface SecureKeyOptions {
  /**
   * Tie the key to the device owner. What that means per surface:
   *   Android — the key only works within `authValiditySeconds` of the owner unlocking. Outside
   *     that window encrypt/decrypt throw `SecureKeyError('auth-required')` and show NOTHING:
   *     call `unlock()` (it counts as the unlock) and retry.
   *   iOS — decrypt shows the Face ID / passcode prompt itself; a cancel is 'auth-required'.
   *   Web — this runtime shows `unlock()` itself before the key is used.
   */
  requireAuth?: boolean;
  /** Seconds after a successful unlock during which no new prompt is shown. Default 30. */
  authValiditySeconds?: number;
}

interface SecureKeysPlugin {
  generate(o: { alias: string; requireAuth: boolean; authValiditySeconds: number }):
    Promise<{ ok?: boolean; hardwareBacked?: boolean; error?: string; detail?: string }>;
  has(o: { alias: string }): Promise<{ value?: boolean }>;
  list(): Promise<{ aliases?: string[] }>;
  remove(o: { alias: string }): Promise<{ value?: boolean }>;
  isHardwareBacked(o: { alias: string }): Promise<{ value?: boolean }>;
  encrypt(o: { alias: string; base64: string }): Promise<{ ok?: boolean; base64?: string; error?: string; detail?: string }>;
  decrypt(o: { alias: string; base64: string }): Promise<{ ok?: boolean; base64?: string; error?: string; detail?: string }>;
}

const secureKeysPlugin = () => capPlugin<SecureKeysPlugin>('AppwrightSecureKeys');

const ALIAS_RE = /^[A-Za-z0-9_.-]{1,64}$/;

/**
 * The natives' error strings in the one [SecureKeyError] vocabulary. Android's bridge answers
 * 'bad alias' / 'bad base64' / 'chunk too large (max N bytes)' / 'foreign_origin' / an exception's
 * own message; iOS answers 'bad-base64' / 'encrypt-failed' / 'decrypt-failed' (both 'failed' here). A caller
 * branching on the documented codes could never have matched those.
 */
function keyCode(raw: string): string {
  const e = raw.trim().toLowerCase();
  if (['no-such-key', 'auth-required', 'key-invalidated', 'strongbox-unavailable', 'disabled',
    'bad-alias', 'bad-payload', 'access-control'].includes(e)) return e;
  if (e === 'bad alias') return 'bad-alias';
  if (e === 'bad base64' || e === 'bad-base64') return 'bad-payload';
  if (e.startsWith('chunk too large')) return 'too-large';
  if (e === 'foreign_origin' || e === 'foreign-origin') return 'foreign-origin';
  return 'failed';
}

function keyReply<T extends { ok?: boolean; error?: string; detail?: string }>(r: T | undefined): T {
  if (!r || !r.ok) {
    const raw = r?.error ?? 'failed';
    const code = keyCode(raw);
    // Keep the native's own words when they said more than the code does.
    throw new SecureKeyError(code, r?.detail ?? (raw !== code ? raw : undefined));
  }
  return r;
}

// Web rung: AES-256-GCM CryptoKeys that are NON-EXTRACTABLE and live in IndexedDB. The browser
// manages them, not device hardware — which is why `can('secureKeys')` says 'web' here and
// isHardwareBacked() answers false. `requireAuth` is honoured by this runtime gating each use on
// unlock() (the platform authenticator) within the validity window; it is a software gate and is
// documented as such.
interface WebKeyRecord { alias: string; key: CryptoKey; requireAuth: boolean; validity: number }
const WEB_KEYS_DB = 'appmint-securekeys';
let lastWebUnlockAt = 0;

function webKeysDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(WEB_KEYS_DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('keys', { keyPath: 'alias' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'));
  });
}
function webKeysTx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return webKeysDb().then((db) => new Promise<T>((resolve, reject) => {
    const req = run(db.transaction('keys', mode).objectStore('keys'));
    req.onsuccess = () => { resolve(req.result); db.close(); };
    req.onerror = () => { reject(req.error ?? new Error('indexedDB request failed')); db.close(); };
  }));
}
async function webKeyRecord(alias: string): Promise<WebKeyRecord> {
  const rec = await webKeysTx<WebKeyRecord | undefined>('readonly', (s) => s.get(alias) as IDBRequest<WebKeyRecord | undefined>);
  if (!rec) throw new SecureKeyError('no-such-key', alias);
  if (rec.requireAuth && Date.now() - lastWebUnlockAt > rec.validity * 1000) {
    if (!(await unlock('Unlock'))) throw new SecureKeyError('auth-required');
    lastWebUnlockAt = Date.now();
  }
  return rec;
}
const webCryptoReady = (): boolean => hasWin() && !!window.crypto?.subtle && !!window.indexedDB;

/**
 * Encryption keys the device holds and the app cannot export: the Android Keystore (StrongBox
 * where present) and the iOS Secure Enclave. Deleting the key is the only genuine "secure delete"
 * on either platform — overwriting bytes on flash is not — so encrypt-then-remove is the tool for
 * data that must become unrecoverable.
 *
 * Payloads are strings in, base64 out; encrypt a record at a time, never a whole database in one
 * call. Every failure is a [SecureKeyError] with a `code`.
 */
export const secureKeys = {
  /** Creates (or replaces) a key. Returns whether it is held in secure hardware. */
  async generate(alias: string, opts: SecureKeyOptions = {}): Promise<{ hardwareBacked: boolean }> {
    if (!ALIAS_RE.test(alias)) throw new SecureKeyError('bad-alias', alias);
    const requireAuth = !!opts.requireAuth;
    const validity = Math.max(0, opts.authValiditySeconds ?? 30);
    const cap = secureKeysPlugin();
    if (cap) {
      const r = keyReply(await cap.generate({ alias, requireAuth, authValiditySeconds: validity }));
      return { hardwareBacked: !!r.hardwareBacked };
    }
    const b = bridge();
    if (b?.generateKey) {
      if (b.isKeystoreEnabled?.() !== 'true') throw new SecureKeyError('disabled');
      const r = keyReply(JSON.parse(b.generateKey(alias, JSON.stringify({ requireAuth, authValiditySeconds: validity })) || '{}') as
        { ok?: boolean; hardwareBacked?: boolean; error?: string; detail?: string });
      return { hardwareBacked: !!r.hardwareBacked };
    }
    if (!webCryptoReady()) throw new SecureKeyError('disabled');
    const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await webKeysTx('readwrite', (s) => s.put({ alias, key, requireAuth, validity } as WebKeyRecord));
    return { hardwareBacked: false };
  },

  async has(alias: string): Promise<boolean> {
    const cap = secureKeysPlugin();
    if (cap) { try { return !!(await cap.has({ alias }))?.value; } catch { return false; } }
    const b = bridge();
    if (b?.hasKey) return b.hasKey(alias) === 'true';
    if (!webCryptoReady()) return false;
    try { return !!(await webKeysTx('readonly', (s) => s.getKey(alias))); } catch { return false; }
  },

  async list(): Promise<string[]> {
    const cap = secureKeysPlugin();
    if (cap) { try { return (await cap.list())?.aliases ?? []; } catch { return []; } }
    const b = bridge();
    if (b?.listKeys) return JSON.parse(b.listKeys() || '[]') as string[];
    if (!webCryptoReady()) return [];
    try { return ((await webKeysTx('readonly', (s) => s.getAllKeys())) as string[]).sort(); } catch { return []; }
  },

  /** Destroys the key. Everything encrypted with it is unrecoverable from this moment. */
  async remove(alias: string): Promise<boolean> {
    const cap = secureKeysPlugin();
    if (cap) { try { return !!(await cap.remove({ alias }))?.value; } catch { return false; } }
    const b = bridge();
    if (b?.deleteKey) return b.deleteKey(alias) === 'true';
    if (!webCryptoReady()) return false;
    try { await webKeysTx('readwrite', (s) => s.delete(alias)); return true; } catch { return false; }
  },

  /** False on the web and on a device without secure hardware — say so in the UI, never claim it. */
  async isHardwareBacked(alias: string): Promise<boolean> {
    const cap = secureKeysPlugin();
    if (cap) { try { return !!(await cap.isHardwareBacked({ alias }))?.value; } catch { return false; } }
    const b = bridge();
    if (b?.isKeyHardwareBacked) return b.isKeyHardwareBacked(alias) === 'true';
    return false;
  },

  /** Returns an opaque base64 payload. Store it wherever you like — it is useless without the key. */
  async encrypt(alias: string, plaintext: string): Promise<string> {
    const cap = secureKeysPlugin();
    if (cap) return keyReply(await cap.encrypt({ alias, base64: utf8ToB64(plaintext) })).base64 ?? '';
    const b = bridge();
    if (b?.encryptWithKey) {
      return keyReply(JSON.parse(b.encryptWithKey(alias, utf8ToB64(plaintext)) || '{}') as
        { ok?: boolean; base64?: string; error?: string; detail?: string }).base64 ?? '';
    }
    if (!webCryptoReady()) throw new SecureKeyError('disabled');
    const rec = await webKeyRecord(alias);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, rec.key, new TextEncoder().encode(plaintext)));
    const out = new Uint8Array(iv.length + ct.length);
    out.set(iv); out.set(ct, iv.length);
    return bytesToB64(out);
  },

  /** Reverses encrypt(). Throws 'auth-required' when a `requireAuth` key needs the user first. */
  async decrypt(alias: string, payload: string): Promise<string> {
    const cap = secureKeysPlugin();
    if (cap) return b64ToUtf8(keyReply(await cap.decrypt({ alias, base64: payload })).base64 ?? '');
    const b = bridge();
    if (b?.decryptWithKey) {
      return b64ToUtf8(keyReply(JSON.parse(b.decryptWithKey(alias, payload) || '{}') as
        { ok?: boolean; base64?: string; error?: string; detail?: string }).base64 ?? '');
    }
    if (!webCryptoReady()) throw new SecureKeyError('disabled');
    const rec = await webKeyRecord(alias);
    const bytes = b64ToBytes(payload);
    if (bytes.length < 13) throw new SecureKeyError('bad-payload');
    try {
      // `.slice()` so each half owns a plain ArrayBuffer — WebCrypto's BufferSource typing
      // rejects a view over an ArrayBufferLike.
      const plain = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: bytes.slice(0, 12).buffer as ArrayBuffer }, rec.key, bytes.slice(12).buffer as ArrayBuffer);
      return new TextDecoder().decode(plain);
    } catch { throw new SecureKeyError('bad-payload', 'authentication tag mismatch'); }
  },
};

// ── media session (lock-screen controls, casting) ────────────────────────────────────────────

export type MediaAction = 'play' | 'pause' | 'next' | 'prev' | 'stop' | 'seek';
export interface MediaMetadataInput { title: string; artist?: string; artworkUrl?: string }
export interface PlaybackStateInput { playing: boolean; positionMs?: number; durationMs?: number }

interface MediaSessionPlugin {
  setMetadata(o: { title: string; artist: string; artworkUrl: string }): Promise<void>;
  setPlaybackState(o: { playing: boolean; positionMs: number; durationMs: number }): Promise<void>;
  clear(): Promise<void>;
  showCastPicker(): Promise<{ ok?: boolean }>;
  addListener(e: 'action', h: (d: { action?: string; positionMs?: number }) => void): Promise<{ remove(): Promise<void> }>;
}

const mediaPlugin = () => capPlugin<MediaSessionPlugin>('AppwrightMediaSession');

/** Android marks the `navigator.mediaSession` it installs over its bridge. */
function mediaPolyfilled(): boolean {
  const ms = (nav() as unknown as { mediaSession?: { __polyfilled?: boolean } } | undefined)?.mediaSession;
  return ms?.__polyfilled === true;
}

/** The standard API where the platform provides it (the web, and Android's marked polyfill). */
function webMediaSession(): MediaSession | undefined {
  const n = nav();
  return n && 'mediaSession' in n ? n.mediaSession : undefined;
}

/**
 * Lock-screen / notification / Control Center playback controls for an app that plays audio or
 * video. The page still owns playback; this publishes what is playing and delivers the system's
 * transport buttons back. Android: the shell's media notification. iOS: Now Playing via the
 * AppwrightMediaSession plugin. Web: `navigator.mediaSession`.
 *
 * Keep it in step with the real `<audio>`/`<video>` element: setMetadata on every track change,
 * setPlaybackState on play/pause/seek and about once a second while playing, clear() on stop
 * and on unmount. A stale lock-screen title is worse than none.
 */
export const mediaSession = {
  setMetadata({ title, artist = '', artworkUrl = '' }: MediaMetadataInput): void {
    const cap = mediaPlugin();
    if (cap) { void cap.setMetadata({ title, artist, artworkUrl }).catch(() => {}); return; }
    const b = bridge();
    if (b?.setMediaMetadata) { b.setMediaMetadata(title, artist, artworkUrl); return; }
    const ms = webMediaSession();
    if (ms && hasWin() && 'MediaMetadata' in window) {
      ms.metadata = new MediaMetadata({ title, artist, artwork: artworkUrl ? [{ src: artworkUrl }] : [] });
    }
  },

  setPlaybackState({ playing, positionMs = 0, durationMs = 0 }: PlaybackStateInput): void {
    const cap = mediaPlugin();
    if (cap) { void cap.setPlaybackState({ playing, positionMs, durationMs }).catch(() => {}); return; }
    const b = bridge();
    if (b?.setPlaybackState) { b.setPlaybackState(playing, Math.floor(positionMs), Math.floor(durationMs)); return; }
    const ms = webMediaSession();
    if (!ms) return;
    ms.playbackState = playing ? 'playing' : 'paused';
    if (durationMs > 0 && typeof ms.setPositionState === 'function') {
      try {
        ms.setPositionState({ duration: durationMs / 1000, position: Math.min(positionMs, durationMs) / 1000, playbackRate: 1 });
      } catch { /* a position past the duration is rejected by the browser; nothing to publish */ }
    }
  },

  /** Removes the controls. Call on stop and on unmount. */
  clear(): void {
    const cap = mediaPlugin();
    if (cap) { void cap.clear().catch(() => {}); return; }
    const b = bridge();
    if (b?.clearMediaNotification) { b.clearMediaNotification(); return; }
    const ms = webMediaSession();
    if (!ms) return;
    ms.metadata = null;
    ms.playbackState = 'none';
    if (typeof ms.setPositionState === 'function') {
      try { ms.setPositionState(); } catch { /* not every browser accepts an empty state */ }
    }
  },

  /**
   * The system's transport buttons. `seek` carries `positionMs`. Returns an unsubscribe.
   * On Android and the web this registers through `navigator.mediaSession.setActionHandler`,
   * which is where the shell's polyfill delivers its notification buttons.
   */
  onAction(handler: (action: MediaAction, detail: { positionMs?: number }) => void): () => void {
    const cap = mediaPlugin();
    if (cap) {
      const p = cap.addListener('action', (d) => {
        const a = d?.action as MediaAction | undefined;
        if (a) handler(a, { positionMs: d?.positionMs });
      });
      return () => { void p.then((h) => h.remove()).catch(() => {}); };
    }
    const ms = webMediaSession();
    if (!ms || typeof ms.setActionHandler !== 'function') return () => {};
    const map: Array<[MediaSessionAction, MediaAction]> = [
      ['play', 'play'], ['pause', 'pause'], ['nexttrack', 'next'], ['previoustrack', 'prev'],
      ['stop', 'stop'], ['seekto', 'seek'],
    ];
    const installed: MediaSessionAction[] = [];
    for (const [sys, ours] of map) {
      try {
        ms.setActionHandler(sys, (d) => handler(ours, { positionMs: d?.seekTime != null ? d.seekTime * 1000 : undefined }));
        installed.push(sys);
      } catch { /* this browser does not support that action — skip it, the rest still work */ }
    }
    return () => { for (const sys of installed) { try { ms.setActionHandler(sys, null); } catch { /* already gone */ } } };
  },

  /**
   * Hands a media URL to a cast target: Android's "Cast to…" chooser, the AirPlay route picker
   * on iOS, the Remote Playback API prompt on the web. Resolves false when nothing could be
   * offered. Gate the button on can('cast').
   */
  async cast(url: string): Promise<boolean> {
    const cap = mediaPlugin();
    if (cap) { try { return !!(await cap.showCastPicker())?.ok; } catch { return false; } }
    const b = bridge();
    if (b?.castMedia) { b.castMedia(url); return true; }
    if (typeof document === 'undefined' || typeof HTMLMediaElement === 'undefined' ||
        !('remote' in HTMLMediaElement.prototype)) return false;
    const v = document.createElement('video');
    v.src = url;
    v.style.display = 'none';
    document.body.appendChild(v);
    try {
      await (v as unknown as { remote: { prompt(): Promise<void> } }).remote.prompt();
      return true;
    } catch { return false; }   // the user dismissed the device list, or none was found
    finally { window.setTimeout(() => v.remove(), 60_000); }
  },
};

// ── Bluetooth: navigator.bluetooth on iOS, and the fitness-sensor family on both ─────────────

/** `@capacitor-community/bluetooth-le`, native surface. Values are hex strings, no separators. */
interface BleDevice { deviceId: string; name?: string; uuids?: string[] }
interface BleLePlugin {
  initialize(o: Record<string, unknown>): Promise<void>;
  isEnabled(): Promise<{ value?: boolean }>;
  requestDevice(o: Record<string, unknown>): Promise<BleDevice>;
  requestLEScan(o: Record<string, unknown>): Promise<void>;
  stopLEScan(): Promise<void>;
  connect(o: { deviceId: string; timeout?: number }): Promise<void>;
  disconnect(o: { deviceId: string }): Promise<void>;
  getServices(o: { deviceId: string }): Promise<{ services?: Array<{ uuid: string; characteristics?: Array<{ uuid: string; properties?: Record<string, boolean> }> }> }>;
  read(o: { deviceId: string; service: string; characteristic: string }): Promise<{ value?: string }>;
  write(o: { deviceId: string; service: string; characteristic: string; value: string }): Promise<void>;
  writeWithoutResponse(o: { deviceId: string; service: string; characteristic: string; value: string }): Promise<void>;
  startNotifications(o: { deviceId: string; service: string; characteristic: string }): Promise<void>;
  stopNotifications(o: { deviceId: string; service: string; characteristic: string }): Promise<void>;
  addListener(e: string, h: (d: Record<string, unknown>) => void): Promise<{ remove(): Promise<void> }>;
}

const blePlugin = () => capPlugin<BleLePlugin>('BluetoothLe');
let bleInitialised: Promise<void> | null = null;
/** The plugin needs one `initialize` before anything else; it is idempotent here. */
function bleReady(cap: BleLePlugin): Promise<void> {
  if (!bleInitialised) bleInitialised = cap.initialize({}).catch((e) => { bleInitialised = null; throw e; });
  return bleInitialised;
}

const BLE_BASE = '-0000-1000-8000-00805f9b34fb';
const hex8 = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
const canonicalUUID = (n: number) => hex8(n) + BLE_BASE;
/** CoreBluetooth prints Bluetooth-base UUIDs in their 4/8-hex short form; event keys use that. */
function shortUUID(full: string): string {
  const m = /^([0-9a-f]{8})-0000-1000-8000-00805f9b34fb$/.exec(full);
  if (!m) return full;
  return m[1].startsWith('0000') ? m[1].slice(4) : m[1];
}
const hexToBytes = (h: string): Uint8Array => {
  const clean = (h || '').replace(/[^0-9a-f]/gi, '');
  const out = new Uint8Array(clean.length >> 1);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
};
const bytesToHex = (u8: Uint8Array): string =>
  Array.from(u8, (x) => x.toString(16).padStart(2, '0')).join('');
const toBytes = (v: BufferSource): Uint8Array =>
  v instanceof ArrayBuffer ? new Uint8Array(v) : new Uint8Array(v.buffer, v.byteOffset, v.byteLength);

const GATT_SERVICES: Record<string, number> = {
  generic_access: 0x1800, generic_attribute: 0x1801, immediate_alert: 0x1802, link_loss: 0x1803,
  tx_power: 0x1804, current_time: 0x1805, glucose: 0x1808, health_thermometer: 0x1809,
  device_information: 0x180a, heart_rate: 0x180d, phone_alert_status: 0x180e, battery_service: 0x180f,
  blood_pressure: 0x1810, alert_notification: 0x1811, human_interface_device: 0x1812,
  scan_parameters: 0x1813, running_speed_and_cadence: 0x1814, automation_io: 0x1815,
  cycling_speed_and_cadence: 0x1816, cycling_power: 0x1818, location_and_navigation: 0x1819,
  environmental_sensing: 0x181a, body_composition: 0x181b, user_data: 0x181c, weight_scale: 0x181d,
  bond_management: 0x181e, continuous_glucose_monitoring: 0x181f, fitness_machine: 0x1826,
  audio_input_control: 0x1843, device_time: 0x1847,
};
const GATT_CHARACTERISTICS: Record<string, number> = {
  device_name: 0x2a00, appearance: 0x2a01, battery_level: 0x2a19, temperature_measurement: 0x2a1c,
  glucose_measurement: 0x2a18, system_id: 0x2a23, model_number_string: 0x2a24, serial_number_string: 0x2a25,
  firmware_revision_string: 0x2a26, hardware_revision_string: 0x2a27, software_revision_string: 0x2a28,
  manufacturer_name_string: 0x2a29, blood_pressure_measurement: 0x2a35, heart_rate_measurement: 0x2a37,
  body_sensor_location: 0x2a38, heart_rate_control_point: 0x2a39, rsc_measurement: 0x2a53,
  rsc_feature: 0x2a54, sc_control_point: 0x2a55, csc_measurement: 0x2a5b, csc_feature: 0x2a5c,
  sensor_location: 0x2a5d, cycling_power_measurement: 0x2a63, cycling_power_feature: 0x2a65,
  cycling_power_control_point: 0x2a66, weight_measurement: 0x2a9d, fitness_machine_feature: 0x2acc,
  treadmill_data: 0x2acd, indoor_bike_data: 0x2ad2,
};
function resolveUUID(value: unknown, names: Record<string, number>, what: string): string {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new TypeError(`Invalid ${what} UUID: ${value}`);
    return canonicalUUID(value);
  }
  if (typeof value !== 'string') throw new TypeError(`Invalid ${what} UUID: ${String(value)}`);
  const v = value.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)) return v;
  if (/^(0x)?[0-9a-f]{1,8}$/.test(v)) return canonicalUUID(parseInt(v, 16));
  if (Object.prototype.hasOwnProperty.call(names, v)) return canonicalUUID(names[v]);
  throw new TypeError(`Invalid ${what} UUID '${value}': pass a full UUID, a 16-bit number, or a standard name`);
}

function domError(name: string, message: string): Error {
  try { return new DOMException(message, name); }
  catch { const e = new Error(message); e.name = name; return e; }
}

/** Minimal EventTarget for the polyfill objects: addEventListener + `on<event>` properties. */
class BleEmitter {
  private listeners: Record<string, Array<(e: Event) => void>> = {};
  addEventListener(type: string, fn: ((e: Event) => void) | null): void {
    if (!fn) return;
    (this.listeners[type] = this.listeners[type] ?? []).push(fn);
  }
  removeEventListener(type: string, fn: ((e: Event) => void) | null): void {
    const list = this.listeners[type];
    if (!list || !fn) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }
  dispatchEvent(event: Event): boolean {
    const ev = event as Event & { target?: unknown };
    if (!ev.target) { try { Object.defineProperty(ev, 'target', { value: this, configurable: true }); } catch { /* frozen event */ } }
    const own = (this as unknown as Record<string, unknown>)[`on${event.type}`];
    if (typeof own === 'function') { try { (own as (e: Event) => void).call(this, event); } catch (e) { console.error(e); } }
    for (const fn of (this.listeners[event.type] ?? []).slice()) { try { fn.call(this, event); } catch (e) { console.error(e); } }
    return true;
  }
}
const bleEvent = (type: string, target: unknown): Event => {
  const e = new Event(type);
  try { Object.defineProperty(e, 'target', { value: target, configurable: true }); } catch { /* fine */ }
  return e;
};

// No TypeScript parameter properties in these classes: the file is imported by Node's type
// stripping in scripts/native-runtime-harness.mjs, which erases annotations but cannot rewrite
// `constructor(readonly x)` into a field assignment.
class IosCharacteristic extends BleEmitter {
  value: DataView | null = null;
  readonly service: IosService;
  readonly uuid: string;
  readonly properties: Record<string, boolean>;
  private notifyHandles: Array<Promise<{ remove(): Promise<void> }>> = [];
  constructor(service: IosService, uuid: string, properties: Record<string, boolean>) {
    super();
    this.service = service; this.uuid = uuid; this.properties = properties;
  }
  private args() { return { deviceId: this.service.device.id, service: this.service.uuid, characteristic: this.uuid }; }
  async readValue(): Promise<DataView> {
    const r = await this.service.device.plugin.read(this.args());
    this.value = new DataView(hexToBytes(r?.value ?? '').buffer);
    return this.value;
  }
  writeValue(v: BufferSource): Promise<void> { return this.writeValueWithResponse(v); }
  async writeValueWithResponse(v: BufferSource): Promise<void> {
    await this.service.device.plugin.write({ ...this.args(), value: bytesToHex(toBytes(v)) });
  }
  async writeValueWithoutResponse(v: BufferSource): Promise<void> {
    await this.service.device.plugin.writeWithoutResponse({ ...this.args(), value: bytesToHex(toBytes(v)) });
  }
  async startNotifications(): Promise<IosCharacteristic> {
    const plugin = this.service.device.plugin;
    const id = this.service.device.id;
    const onValue = (d: Record<string, unknown>) => {
      this.value = new DataView(hexToBytes(String(d?.value ?? '')).buffer);
      this.dispatchEvent(bleEvent('characteristicvaluechanged', this));
    };
    // CoreBluetooth prints a Bluetooth-base UUID in its short form, so the plugin's event key
    // may carry either spelling; subscribing to both is harmless and never misses a value.
    const keys = new Set([
      `notification|${id}|${this.service.uuid}|${this.uuid}`,
      `notification|${id}|${shortUUID(this.service.uuid)}|${shortUUID(this.uuid)}`,
    ]);
    this.notifyHandles = [...keys].map((k) => plugin.addListener(k, onValue));
    await plugin.startNotifications(this.args());
    return this;
  }
  async stopNotifications(): Promise<IosCharacteristic> {
    for (const h of this.notifyHandles) void h.then((x) => x.remove()).catch(() => {});
    this.notifyHandles = [];
    await this.service.device.plugin.stopNotifications(this.args());
    return this;
  }
  getDescriptor(): Promise<never> { return Promise.reject(domError('NotSupportedError', 'Descriptors are not available in this app')); }
}

class IosService {
  readonly isPrimary = true;
  readonly device: IosDevice;
  readonly uuid: string;
  private chars: IosCharacteristic[];
  constructor(device: IosDevice, uuid: string, raw: Array<{ uuid: string; properties?: Record<string, boolean> }>) {
    this.device = device; this.uuid = uuid;
    this.chars = raw.map((c) => new IosCharacteristic(this, String(c.uuid).toLowerCase(), c.properties ?? {}));
  }
  async getCharacteristics(uuid?: unknown): Promise<IosCharacteristic[]> {
    const wanted = uuid == null ? null : resolveUUID(uuid, GATT_CHARACTERISTICS, 'characteristic');
    const out = wanted ? this.chars.filter((c) => c.uuid === wanted) : this.chars.slice();
    if (!out.length) throw domError('NotFoundError', 'No matching characteristic on this service');
    return out;
  }
  async getCharacteristic(uuid: unknown): Promise<IosCharacteristic> { return (await this.getCharacteristics(uuid))[0]; }
}

class IosGatt {
  connected = false;
  readonly device: IosDevice;
  private services: IosService[] = [];
  constructor(device: IosDevice) { this.device = device; }
  async connect(): Promise<IosGatt> {
    const plugin = this.device.plugin;
    await bleReady(plugin);
    await plugin.connect({ deviceId: this.device.id });
    this.connected = true;
    const r = await plugin.getServices({ deviceId: this.device.id });
    this.services = (r?.services ?? []).map((s) => new IosService(this.device, String(s.uuid).toLowerCase(), s.characteristics ?? []));
    return this;
  }
  disconnect(): void {
    this.connected = false;
    void this.device.plugin.disconnect({ deviceId: this.device.id }).catch(() => {});
  }
  async getPrimaryServices(uuid?: unknown): Promise<IosService[]> {
    if (!this.connected) throw domError('NetworkError', 'GATT server is not connected');
    const wanted = uuid == null ? null : resolveUUID(uuid, GATT_SERVICES, 'service');
    const out = wanted ? this.services.filter((s) => s.uuid === wanted) : this.services.slice();
    if (!out.length) throw domError('NotFoundError', 'No matching service on this device');
    return out;
  }
  async getPrimaryService(uuid: unknown): Promise<IosService> { return (await this.getPrimaryServices(uuid))[0]; }
}

class IosDevice extends BleEmitter {
  readonly gatt: IosGatt;
  readonly plugin: BleLePlugin;
  readonly id: string;
  name: string | null;
  constructor(plugin: BleLePlugin, id: string, name: string | null) {
    super();
    this.plugin = plugin; this.id = id; this.name = name;
    this.gatt = new IosGatt(this);
    void plugin.addListener(`disconnected|${id}`, () => {
      this.gatt.connected = false;
      this.dispatchEvent(bleEvent('gattserverdisconnected', this));
    });
  }
  watchAdvertisements(): Promise<never> { return Promise.reject(domError('NotSupportedError', 'watchAdvertisements is not available in this app')); }
  forget(): Promise<void> { this.gatt.disconnect(); return Promise.resolve(); }
}

/**
 * Installs `navigator.bluetooth` over the BluetoothLe plugin on iOS, where WKWebView has none.
 *
 * Same surface the Android shell's polyfill provides (requestDevice with the system chooser,
 * gatt.connect, getPrimaryService(s), getCharacteristic(s), read/write, notifications, the two
 * events, BluetoothUUID) so an app written against the standard runs unchanged on both.
 * getDevices(), requestLEScan() and watchAdvertisements() reject with NotSupportedError, as on
 * Android. Called once at import; a no-op everywhere else.
 */
function installIosWebBluetooth(): void {
  if (!hasWin() || platform() !== 'ios') return;
  const n = nav();
  if (!n || 'bluetooth' in n) return;
  const plugin = blePlugin();
  if (!plugin) return;

  const devices = new Map<string, IosDevice>();
  const bluetooth = Object.assign(new BleEmitter(), {
    async getAvailability(): Promise<boolean> {
      try { await bleReady(plugin); return !!(await plugin.isEnabled())?.value; } catch { return false; }
    },
    getDevices(): Promise<never> { return Promise.reject(domError('NotSupportedError', 'getDevices() is not available in this app')); },
    requestLEScan(): Promise<never> { return Promise.reject(domError('NotSupportedError', 'requestLEScan() is not available in this app')); },
    async requestDevice(options: { filters?: Array<{ services?: unknown[]; name?: string; namePrefix?: string }>; acceptAllDevices?: boolean; optionalServices?: unknown[] } = {}): Promise<IosDevice> {
      const filters = options.filters ?? [];
      if (!options.acceptAllDevices && !filters.length) {
        throw new TypeError('requestDevice: either options.filters or options.acceptAllDevices is required');
      }
      // The plugin takes ONE filter set; the union of the requested services is what the system
      // chooser lists, and name filters narrow it further.
      const services = filters.flatMap((f) => (f.services ?? []).map((s) => resolveUUID(s, GATT_SERVICES, 'service')));
      const optional = (options.optionalServices ?? []).map((s) => resolveUUID(s, GATT_SERVICES, 'service'));
      const req: Record<string, unknown> = { services, optionalServices: optional };
      const named = filters.find((f) => f.name || f.namePrefix);
      if (named?.name) req.name = named.name;
      if (named?.namePrefix) req.namePrefix = named.namePrefix;
      await bleReady(plugin);
      let d: BleDevice;
      try { d = await plugin.requestDevice(req); }
      catch (e) { throw domError('NotFoundError', String((e as Error)?.message ?? e)); }
      let dev = devices.get(d.deviceId);
      if (!dev) { dev = new IosDevice(plugin, d.deviceId, d.name ?? null); devices.set(d.deviceId, dev); }
      if (d.name) dev.name = d.name;
      return dev;
    },
  });

  const w = window as unknown as { BluetoothUUID?: unknown };
  w.BluetoothUUID = w.BluetoothUUID ?? {
    canonicalUUID,
    getService: (v: unknown) => resolveUUID(v, GATT_SERVICES, 'service'),
    getCharacteristic: (v: unknown) => resolveUUID(v, GATT_CHARACTERISTICS, 'characteristic'),
    getDescriptor: (v: unknown) => resolveUUID(v, {}, 'descriptor'),
  };
  try { Object.defineProperty(n, 'bluetooth', { value: bluetooth, configurable: true, enumerable: true }); }
  catch { (n as unknown as { bluetooth: unknown }).bluetooth = bluetooth; }
}

installIosWebBluetooth();

// ── BLE fitness sensors ──────────────────────────────────────────────────────────────────────

const SVC_HR = canonicalUUID(0x180d), SVC_CSC = canonicalUUID(0x1816), SVC_POWER = canonicalUUID(0x1818),
  SVC_RSC = canonicalUUID(0x1814), SVC_BATTERY = canonicalUUID(0x180f);
const CHR_HR = canonicalUUID(0x2a37), CHR_CSC = canonicalUUID(0x2a5b), CHR_POWER = canonicalUUID(0x2a63),
  CHR_RSC = canonicalUUID(0x2a53), CHR_BATTERY = canonicalUUID(0x2a19);
const SENSOR_OF: Record<string, string> = {
  [SVC_HR]: 'heart_rate', [SVC_CSC]: 'speed_cadence', [SVC_POWER]: 'power', [SVC_RSC]: 'running',
};

/** `kind:'data'` payloads, per sensor `type` — identical on Android (shell) and iOS (parsed here). */
export interface BleHeartRateData {
  bpm: number;
  /** Beat-to-beat intervals in this notification, ms (HRV). Present only when the strap sends them. */
  rrIntervalsMs?: number[];
  /** Cumulative energy expended, kJ, when the strap reports it. */
  energyKj?: number;
  /** Skin contact, when the strap reports it (false = loose strap: bpm is unreliable). */
  contact?: boolean;
}
export interface BleSpeedCadenceData { speedKmh?: number; cadenceRpm?: number }
/** `cadenceRpm` only from meters that send crank data (from the second notification on). */
export interface BlePowerData { watts: number; cadenceRpm?: number }
export interface BleRunningData { speedKmh: number; cadenceSpm: number }
export interface BleBatteryData { percent: number }
export type BleSensorEvent =
  | { kind: 'device'; address: string; name: string | null; sensors: string[]; rssi: number }
  | { kind: 'state'; state: 'scanning' | 'scan_stopped' | 'connecting' | 'connected' | 'ready' | 'disconnected'; address?: string; services?: string[] }
  | { kind: 'data'; type: 'heart_rate'; data: BleHeartRateData }
  | { kind: 'data'; type: 'speed_cadence'; data: BleSpeedCadenceData }
  | { kind: 'data'; type: 'power'; data: BlePowerData }
  | { kind: 'data'; type: 'running'; data: BleRunningData }
  | { kind: 'data'; type: 'battery'; data: BleBatteryData }
  | { kind: 'error'; error: string; detail?: string };

function emitBle(detail: Record<string, unknown>): void {
  if (!hasWin()) return;
  window.dispatchEvent(new CustomEvent('appmint:ble', { detail }));
}

/** iOS state for the sensor family: one connected device, its subscriptions, CSC deltas. */
const iosBle = {
  scanning: false, scanTimer: 0, scanHandle: null as Promise<{ remove(): Promise<void> }> | null,
  connectedId: '' as string, subs: [] as Array<Promise<{ remove(): Promise<void> }>>,
  wheelMm: 2096, lastWheel: null as null | { revs: number; t: number }, lastCrank: null as null | { revs: number; t: number },
  lastPowerCrank: null as null | { revs: number; t: number },
};

/** Crank cadence from two cumulative readings (uint16 revs, uint16 1/1024 s), wrap-aware — FitnessGatt.cadenceRpm. */
function crankRpm(prev: { revs: number; t: number } | null, revs: number, t: number): number | undefined {
  if (!prev || prev.t === t) return undefined;
  const dRevs = (revs - prev.revs + 65536) % 65536, dT = ((t - prev.t + 65536) % 65536) / 1024;
  return dT > 0 ? dRevs / (dT / 60) : undefined;
}

function parseSensor(chr: string, v: DataView): void {
  if (chr === CHR_HR) {
    // Heart Rate Measurement (0x2A37), the same fields as the Android shell's FitnessGatt.heartRate.
    const flags = v.getUint8(0);
    let i = (flags & 1) ? 3 : 2;
    const data: BleHeartRateData = { bpm: (flags & 1) ? v.getUint16(1, true) : v.getUint8(1) };
    if (flags & 0x04) data.contact = !!(flags & 0x02);
    if (flags & 0x08 && v.byteLength >= i + 2) { data.energyKj = v.getUint16(i, true); i += 2; }
    if (flags & 0x10) {
      const rr: number[] = [];
      while (i + 1 < v.byteLength) { rr.push(Math.round(v.getUint16(i, true) * 1000 / 1024)); i += 2; }
      if (rr.length) data.rrIntervalsMs = rr;
    }
    emitBle({ kind: 'data', type: 'heart_rate', data });
  } else if (chr === CHR_CSC) {
    const flags = v.getUint8(0);
    let off = 1;
    const out: Record<string, number> = {};
    if (flags & 1) {
      const revs = v.getUint32(off, true), t = v.getUint16(off + 4, true); off += 6;
      const prev = iosBle.lastWheel;
      if (prev) {
        const dRevs = revs - prev.revs, dT = ((t - prev.t + 65536) % 65536) / 1024;
        if (dT > 0 && dRevs >= 0) out.speedKmh = (dRevs * iosBle.wheelMm / 1e6) / (dT / 3600);
      }
      iosBle.lastWheel = { revs, t };
    }
    if (flags & 2) {
      const revs = v.getUint16(off, true), t = v.getUint16(off + 2, true);
      const prev = iosBle.lastCrank;
      if (prev) {
        const dRevs = (revs - prev.revs + 65536) % 65536, dT = ((t - prev.t + 65536) % 65536) / 1024;
        if (dT > 0) out.cadenceRpm = dRevs / (dT / 60);
      }
      iosBle.lastCrank = { revs, t };
    }
    if (Object.keys(out).length) emitBle({ kind: 'data', type: 'speed_cadence', data: out });
  } else if (chr === CHR_POWER) {
    // Cycling Power (0x2A63): crank data (flag bit 5) sits after pedal balance (bit 0, 1 byte),
    // accumulated torque (bit 2, 2 bytes) and wheel data (bit 4, 6 bytes).
    const flags = v.getUint16(0, true);
    const data: BlePowerData = { watts: v.getInt16(2, true) };
    let i = 4;
    if (flags & 0x01) i += 1;
    if (flags & 0x04) i += 2;
    if (flags & 0x10) i += 6;
    if (flags & 0x20 && v.byteLength >= i + 4) {
      const revs = v.getUint16(i, true), t = v.getUint16(i + 2, true);
      const rpm = crankRpm(iosBle.lastPowerCrank, revs, t);
      if (rpm !== undefined) data.cadenceRpm = rpm;
      iosBle.lastPowerCrank = { revs, t };
    }
    emitBle({ kind: 'data', type: 'power', data });
  } else if (chr === CHR_RSC) {
    emitBle({ kind: 'data', type: 'running', data: { speedKmh: v.getUint16(1, true) / 256 * 3.6, cadenceSpm: v.getUint8(3) } });
  } else if (chr === CHR_BATTERY) {
    emitBle({ kind: 'data', type: 'battery', data: { percent: v.getUint8(0) } });
  }
}

async function iosBleConnect(cap: BleLePlugin, address: string): Promise<void> {
  emitBle({ kind: 'state', state: 'connecting', address });
  try {
    await bleReady(cap);
    await cap.connect({ deviceId: address });
  } catch (e) {
    emitBle({ kind: 'error', error: 'connect_failed', detail: String((e as Error)?.message ?? e) });
    emitBle({ kind: 'state', state: 'disconnected' });
    return;
  }
  iosBle.connectedId = address;
  iosBle.lastWheel = null; iosBle.lastCrank = null; iosBle.lastPowerCrank = null;
  emitBle({ kind: 'state', state: 'connected', address });
  void cap.addListener(`disconnected|${address}`, () => {
    if (iosBle.connectedId !== address) return;
    iosBle.connectedId = '';
    emitBle({ kind: 'state', state: 'disconnected' });
  });
  const r = await cap.getServices({ deviceId: address }).catch(() => ({ services: [] }));
  const wanted: Array<[string, string]> = [
    [SVC_HR, CHR_HR], [SVC_CSC, CHR_CSC], [SVC_POWER, CHR_POWER], [SVC_RSC, CHR_RSC], [SVC_BATTERY, CHR_BATTERY],
  ];
  const present = new Set((r?.services ?? []).map((s) => String(s.uuid).toLowerCase()));
  const subscribed: string[] = [];
  for (const [svc, chr] of wanted) {
    if (!present.has(svc)) continue;
    const onValue = (d: Record<string, unknown>) => {
      try { parseSensor(chr, new DataView(hexToBytes(String(d?.value ?? '')).buffer)); } catch { /* short packet */ }
    };
    for (const key of new Set([
      `notification|${address}|${svc}|${chr}`,
      `notification|${address}|${shortUUID(svc)}|${shortUUID(chr)}`,
    ])) iosBle.subs.push(cap.addListener(key, onValue));
    try {
      if (svc === SVC_BATTERY) {
        // Battery level is a one-shot read as well as a notification.
        const level = await cap.read({ deviceId: address, service: svc, characteristic: chr });
        if (level?.value) onValue({ value: level.value });
      }
      await cap.startNotifications({ deviceId: address, service: svc, characteristic: chr });
      subscribed.push(svc);
    } catch { /* a sensor that refuses notifications simply contributes no data */ }
  }
  emitBle({ kind: 'state', state: 'ready', services: subscribed });
}

/**
 * Standard fitness sensors — heart rate, cycling speed/cadence, power, running speed/cadence,
 * battery — over the same `appmint:ble` event stream on both installed apps (typed as
 * `BleSensorEvent`: heart rate carries `rrIntervalsMs`/`energyKj`/`contact` when the strap sends
 * them, power carries `cadenceRpm` from crank-equipped meters). Android: the
 * shell's own BLE bridge. iOS: the BluetoothLe plugin with the GATT profiles parsed here.
 *
 * App-only: there is no web rung here. Gate the sensor screen on `can('bluetooth') === 'native'`
 * — NOT on `!== 'none'`: in Chrome `can('bluetooth')` is 'web' (Web Bluetooth exists there), yet
 * `startScan()` in a browser only emits an `error` event ('not_enabled'). On the web, show the
 * screen's non-sensor content or a "use the app" note instead.
 */
export const bleSensors = {
  /** 15-second scan; each device found fires a `device` event. The first scan prompts for permission. */
  async startScan(): Promise<void> {
    const b = bridge();
    if (b?.bleStartScan) { b.bleStartScan(); return; }
    const cap = blePlugin();
    if (!cap) { emitBle({ kind: 'error', error: 'not_enabled' }); return; }
    if (iosBle.scanning) return;
    try {
      await bleReady(cap);
      if (!(await cap.isEnabled())?.value) { emitBle({ kind: 'error', error: 'bluetooth_off' }); return; }
    } catch (e) {
      emitBle({ kind: 'error', error: /denied|unauthori/i.test(String((e as Error)?.message ?? e)) ? 'permission_denied' : 'not_enabled' });
      return;
    }
    const seen = new Set<string>();
    iosBle.scanHandle = cap.addListener('onScanResult', (d) => {
      const dev = d?.device as BleDevice | undefined;
      if (!dev?.deviceId || seen.has(dev.deviceId)) return;
      seen.add(dev.deviceId);
      const uuids = ((d?.uuids as string[] | undefined) ?? dev.uuids ?? []).map((u) => String(u).toLowerCase());
      emitBle({
        kind: 'device', address: dev.deviceId, name: dev.name ?? null,
        sensors: uuids.map((u) => SENSOR_OF[u]).filter(Boolean), rssi: (d?.rssi as number | undefined) ?? 0,
      });
    });
    try {
      await cap.requestLEScan({ services: [SVC_HR, SVC_CSC, SVC_POWER, SVC_RSC], allowDuplicates: false });
    } catch (e) {
      emitBle({ kind: 'error', error: 'scan_failed', detail: String((e as Error)?.message ?? e) });
      return;
    }
    iosBle.scanning = true;
    emitBle({ kind: 'state', state: 'scanning' });
    iosBle.scanTimer = window.setTimeout(() => { void bleSensors.stopScan(); }, 15_000);
  },

  async stopScan(): Promise<void> {
    const b = bridge();
    if (b?.bleStopScan) { b.bleStopScan(); return; }
    const cap = blePlugin();
    if (!cap || !iosBle.scanning) return;
    iosBle.scanning = false;
    window.clearTimeout(iosBle.scanTimer);
    void iosBle.scanHandle?.then((h) => h.remove()).catch(() => {});
    iosBle.scanHandle = null;
    await cap.stopLEScan().catch(() => {});
    emitBle({ kind: 'state', state: 'scan_stopped' });
  },

  /** `address` comes from a `device` event. Connect on a user tap, never blind. */
  async connect(address: string): Promise<void> {
    const b = bridge();
    if (b?.bleConnect) { b.bleConnect(address); return; }
    const cap = blePlugin();
    if (!cap) { emitBle({ kind: 'error', error: 'not_enabled' }); return; }
    await bleSensors.stopScan();
    if (iosBle.connectedId) await bleSensors.disconnect();
    await iosBleConnect(cap, address);
  },

  async disconnect(): Promise<void> {
    const b = bridge();
    if (b?.bleDisconnect) { b.bleDisconnect(); return; }
    const cap = blePlugin();
    const id = iosBle.connectedId;
    if (!cap || !id) return;
    for (const s of iosBle.subs) void s.then((h) => h.remove()).catch(() => {});
    iosBle.subs = [];
    iosBle.connectedId = '';
    await cap.disconnect({ deviceId: id }).catch(() => {});
    emitBle({ kind: 'state', state: 'disconnected' });
  },

  /** Wheel circumference in mm, for speed from a CSC sensor. 2096 = 700x23c. */
  setWheelCircumference(mm: number): void {
    const b = bridge();
    if (b?.bleSetWheelCircumference) { b.bleSetWheelCircumference(mm); return; }
    if (mm > 0) iosBle.wheelMm = mm;
  },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Look and feel: splash handoff, safe areas, base chrome, pull-to-refresh, transitions,
// long-press, sheets, offline banner, collapsing header, shortcuts, deep links
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// Each of these is what separates "installed app" from "website in a frame", and each is a DOM
// implementation that runs on all three surfaces — the platform pieces (the Android shell's splash
// hold, the iOS SplashScreen plugin, launcher shortcuts) sit underneath the same call.

/** Runs `fn` once the page has painted real content: document complete, body has children, two frames. */
function whenPainted(fn: () => void, maxMs = 6000): void {
  if (!hasWin() || typeof document === 'undefined') return;
  const started = Date.now();
  const tick = () => {
    const ready = document.readyState === 'complete' && !!document.body && document.body.children.length > 0;
    if (ready || Date.now() - started > maxMs) {
      requestAnimationFrame(() => requestAnimationFrame(fn));
      return;
    }
    window.setTimeout(tick, 50);
  };
  tick();
}

let splashHeld = false;

/**
 * The launch splash → first paint handoff.
 *
 * By default the splash hides at the app's first real paint on every platform: the Android shell
 * polls the DOM for laid-out children, and on iOS this file hides the SplashScreen plugin at the
 * same moment (the plugin's own auto-hide is a 6s backstop). An app that would rather reveal a
 * FINISHED first screen — data loaded, no skeleton — calls `splash.hold()` at import and
 * `splash.ready()` once that screen is on. Both platforms cap the hold at ~6s.
 */
export const splash = {
  hold(): void {
    splashHeld = true;
    bridge()?.splashHold?.();
  },
  ready(): void {
    splashHeld = false;
    const b = bridge();
    if (b?.splashReady) { b.splashReady(); return; }
    const cap = capPlugin<{ hide(o?: { fadeOutDuration?: number }): Promise<void> }>('SplashScreen');
    if (cap) void cap.hide({ fadeOutDuration: 200 }).catch(() => {});
  },
};

// ── safe areas ───────────────────────────────────────────────────────────────────────────────

export interface SafeArea { top: number; right: number; bottom: number; left: number }

let safeAreaCache: SafeArea | null = null;

/**
 * The insets under the status bar, notch and home indicator, in CSS px, measured from `env()`.
 * Also published as `--safe-top/right/bottom/left` on `:root` by the base chrome, so CSS can use
 * `padding-bottom: var(--safe-bottom)`. Re-measured on resize/rotation.
 */
export function safeArea(): SafeArea {
  if (safeAreaCache) return safeAreaCache;
  if (typeof document === 'undefined' || !document.body) return { top: 0, right: 0, bottom: 0, left: 0 };
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;inset:0;pointer-events:none;visibility:hidden;' +
    'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  safeAreaCache = {
    top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return safeAreaCache;
}

// ── base chrome ──────────────────────────────────────────────────────────────────────────────

const BASE_CHROME_CSS = `
:root{--safe-top:env(safe-area-inset-top,0px);--safe-right:env(safe-area-inset-right,0px);--safe-bottom:env(safe-area-inset-bottom,0px);--safe-left:env(safe-area-inset-left,0px)}
html{-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}
html[data-appmint-platform="android"] body,html[data-appmint-platform="ios"] body{overscroll-behavior-y:none}
button,[role=button],a,nav,header,summary,label,[data-appmint-chrome]{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
img,svg,video{-webkit-user-drag:none;-webkit-touch-callout:none}
input,textarea,[contenteditable]{-webkit-user-select:text;user-select:text}
@keyframes appmint-in-right{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}
@keyframes appmint-in-left{from{transform:translateX(-24px);opacity:0}to{transform:none;opacity:1}}
@keyframes appmint-in-fade{from{opacity:0}to{opacity:1}}
@keyframes appmint-out-left{to{transform:translateX(-24px);opacity:0}}
@keyframes appmint-out-right{to{transform:translateX(24px);opacity:0}}
@keyframes appmint-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:no-preference){
::view-transition-old(root),::view-transition-new(root){animation-duration:240ms;animation-timing-function:cubic-bezier(.2,0,0,1)}
html[data-appmint-transition=push]::view-transition-old(root){animation-name:appmint-out-left}
html[data-appmint-transition=push]::view-transition-new(root){animation-name:appmint-in-right}
html[data-appmint-transition=pop]::view-transition-old(root){animation-name:appmint-out-right}
html[data-appmint-transition=pop]::view-transition-new(root){animation-name:appmint-in-left}
html[data-appmint-transition=fade]::view-transition-new(root){animation-name:appmint-in-fade}
.appmint-enter-push{animation:appmint-in-right 240ms cubic-bezier(.2,0,0,1)}
.appmint-enter-pop{animation:appmint-in-left 240ms cubic-bezier(.2,0,0,1)}
.appmint-enter-fade{animation:appmint-in-fade 200ms ease-out}
}
`;

/**
 * Installed once at import: the styles every installed app needs and no generated CSS should
 * have to remember — no tap flash, no text-selection on chrome, no long-press link preview, no
 * rubber-band-to-reload in the app, the safe-area variables, and the transition keyframes.
 * `data-appmint-platform` on <html> lets app CSS branch per platform.
 */
function installBaseChrome(): void {
  if (typeof document === 'undefined') return;
  const apply = () => {
    if (!document.head || document.getElementById('appmint-base')) return;
    document.documentElement.setAttribute('data-appmint-platform', platform());
    const style = document.createElement('style');
    style.id = 'appmint-base';
    style.textContent = BASE_CHROME_CSS;
    document.head.appendChild(style);
    window.addEventListener('resize', () => { safeAreaCache = null; });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
}

/** iOS: the "‹ › Done" bar above the keyboard, and the launch screen handed off at first paint. */
function installIosFeel(): void {
  if (platform() !== 'ios') return;
  const kb = capPlugin<{ setAccessoryBarVisible(o: { isVisible: boolean }): Promise<void> }>('Keyboard');
  if (kb) void kb.setAccessoryBarVisible({ isVisible: true }).catch(() => {});
  if (capPlugin('SplashScreen')) whenPainted(() => { if (!splashHeld) splash.ready(); });
}

installBaseChrome();
installIosFeel();

// ── pull to refresh ──────────────────────────────────────────────────────────────────────────

export interface PullToRefreshOptions {
  /** Px of pull before release triggers a refresh. Default 72. */
  threshold?: number;
}

/**
 * The OS gesture on a scrolling list: pull down from the top, release, the app's own data
 * reloads. `el` is the scroll container (or `document.scrollingElement` for a page that scrolls
 * as a whole). Draws an indicator in the app's palette, fires a haptic at the commit point, runs
 * `onRefresh` and hides when it settles. Returns an unsubscribe.
 *
 * Pointer Events, so it is the same implementation on every surface; the Android shell's own
 * page-reload pull stays off for generated apps because this one refreshes DATA, not the page.
 */
export function onPullToRefresh(el: HTMLElement, onRefresh: () => void | Promise<void>, opts: PullToRefreshOptions = {}): () => void {
  if (!hasWin() || typeof window.PointerEvent !== 'function') return () => {};
  const threshold = opts.threshold ?? 72;
  const scroller = el === document.documentElement || el === document.body
    ? (document.scrollingElement as HTMLElement | null) ?? document.documentElement : el;
  const prevOverscroll = el.style.overscrollBehaviorY || '';
  el.style.overscrollBehaviorY = 'contain';

  const ring = document.createElement('div');
  ring.setAttribute('data-appmint-chrome', '');
  ring.setAttribute('role', 'progressbar');
  ring.setAttribute('aria-label', 'Refreshing');
  ring.style.cssText = [
    'position:fixed', 'left:50%', 'top:calc(var(--safe-top, 0px) + 8px)', 'width:36px', 'height:36px',
    'margin-left:-18px', 'border-radius:50%', `background:${token('--surface', '#ffffff')}`,
    'box-shadow:0 4px 16px rgba(0,0,0,.18)', 'display:flex', 'align-items:center', 'justify-content:center',
    'opacity:0', 'transform:translateY(-48px)', 'pointer-events:none', 'z-index:2147483000',
    reducedMotion() ? '' : 'transition:transform 160ms ease-out,opacity 160ms ease-out',
  ].filter(Boolean).join(';');
  const arc = document.createElement('div');
  arc.style.cssText = `width:18px;height:18px;border-radius:50%;border:2.5px solid ${token('--accent', '#2563eb')};border-right-color:transparent;`;
  ring.appendChild(arc);

  let id: number | null = null, y0 = 0, pulled = 0, busy = false;
  const setPull = (px: number) => {
    pulled = px;
    ring.style.opacity = String(Math.min(1, px / threshold));
    ring.style.transform = `translateY(${Math.min(px, threshold + 24) - 48}px) rotate(${px * 2}deg)`;
  };
  const reset = () => {
    ring.style.opacity = '0';
    ring.style.transform = 'translateY(-48px)';
    arc.style.animation = '';
    window.setTimeout(() => ring.remove(), 200);
    pulled = 0;
  };
  const down = (e: PointerEvent) => {
    if (busy || id !== null || scroller.scrollTop > 0) return;
    id = e.pointerId; y0 = e.clientY;
  };
  const move = (e: PointerEvent) => {
    if (id !== e.pointerId || busy) return;
    const dy = e.clientY - y0;
    if (dy <= 0 || scroller.scrollTop > 0) { if (pulled) setPull(0); return; }
    if (!ring.isConnected) document.body.appendChild(ring);
    setPull(Math.sqrt(dy) * 6);   // resistance, the way native lists rubber-band
  };
  const up = async (e: PointerEvent) => {
    if (id !== e.pointerId) return;
    id = null;
    if (pulled < threshold) { reset(); return; }
    busy = true;
    haptic('medium');
    ring.style.transform = 'translateY(16px)';
    ring.style.opacity = '1';
    arc.style.animation = 'appmint-spin 800ms linear infinite';
    try { await onRefresh(); } finally { busy = false; reset(); }
  };
  const cancel = (e: PointerEvent) => { if (id === e.pointerId) { id = null; reset(); } };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', cancel);
    el.style.overscrollBehaviorY = prevOverscroll;
    ring.remove();
  };
}

// ── page transitions ─────────────────────────────────────────────────────────────────────────

export type TransitionType = 'push' | 'pop' | 'fade';

/**
 * Runs a screen change with a native-feeling transition: `push` slides the new screen in from
 * the right, `pop` back out to the right, `fade` cross-fades. Uses the View Transitions API
 * where the WebView has it and an enter animation on the app root elsewhere; both honour
 * reduced-motion. `update` is the state change (a router navigate, a setState) — awaited.
 *
 *   await transition(() => navigate('/note/12'));            // push
 *   await transition(() => navigate(-1), { type: 'pop' });
 */
export async function transition(update: () => void | Promise<void>, opts: { type?: TransitionType } = {}): Promise<void> {
  const type = opts.type ?? 'push';
  if (typeof document === 'undefined' || reducedMotion()) { await update(); return; }
  const doc = document as Document & { startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> } };
  if (typeof doc.startViewTransition === 'function') {
    doc.documentElement.setAttribute('data-appmint-transition', type);
    try { await doc.startViewTransition(update).finished; }
    catch { /* a skipped transition still applied the update */ }
    finally { doc.documentElement.removeAttribute('data-appmint-transition'); }
    return;
  }
  await update();
  const root = (document.getElementById('root') ?? document.body.firstElementChild) as HTMLElement | null;
  if (!root) return;
  const cls = `appmint-enter-${type}`;
  root.classList.remove('appmint-enter-push', 'appmint-enter-pop', 'appmint-enter-fade');
  void root.offsetWidth;   // restart the animation when the same class is re-applied
  root.classList.add(cls);
  await new Promise<void>((resolve) => {
    const done = () => { root.classList.remove(cls); resolve(); };
    root.addEventListener('animationend', done, { once: true });
    window.setTimeout(done, 300);
  });
}

// ── long press ───────────────────────────────────────────────────────────────────────────────

export interface LongPressOptions {
  /** Hold time in ms. Default 450 — the platform norm. */
  ms?: number;
  /** Selection haptic when it fires. Default true. */
  haptics?: boolean;
}

/**
 * Hold-to-open on an element: a row's context menu, a message's reactions, a card's actions.
 * Fires once, with a haptic, and swallows the click that would otherwise follow. Cancelled by
 * moving more than 8px (so a scroll never triggers it). Pair it with `actionSheet()` for the
 * menu itself. Returns an unsubscribe.
 *
 * Like swipe, never the ONLY route to an action — it is invisible. Keep a visible button too.
 */
export function longPress(el: HTMLElement, handler: (e: PointerEvent) => void, opts: LongPressOptions = {}): () => void {
  if (!hasWin() || typeof window.PointerEvent !== 'function') return () => {};
  const ms = opts.ms ?? 450;
  let timer = 0, id: number | null = null, x0 = 0, y0 = 0, fired = false;
  const clear = () => { if (timer) { window.clearTimeout(timer); timer = 0; } id = null; };
  const down = (e: PointerEvent) => {
    if (id !== null) { clear(); return; }
    id = e.pointerId; x0 = e.clientX; y0 = e.clientY; fired = false;
    timer = window.setTimeout(() => {
      timer = 0; id = null; fired = true;
      if (opts.haptics !== false) haptic('medium');
      handler(e);
    }, ms);
  };
  const move = (e: PointerEvent) => {
    if (id !== e.pointerId) return;
    if (Math.abs(e.clientX - x0) > 8 || Math.abs(e.clientY - y0) > 8) clear();
  };
  const upOrCancel = (e: PointerEvent) => { if (id === e.pointerId) clear(); };
  const click = (e: Event) => { if (fired) { fired = false; e.stopPropagation(); e.preventDefault(); } };
  const ctx = (e: Event) => e.preventDefault();   // the browser's own long-press menu must not race ours
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', upOrCancel);
  el.addEventListener('pointercancel', upOrCancel);
  el.addEventListener('pointerleave', upOrCancel);
  el.addEventListener('click', click, true);
  el.addEventListener('contextmenu', ctx);
  return () => {
    clear();
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', upOrCancel);
    el.removeEventListener('pointercancel', upOrCancel);
    el.removeEventListener('pointerleave', upOrCancel);
    el.removeEventListener('click', click, true);
    el.removeEventListener('contextmenu', ctx);
  };
}

// ── bottom sheet ─────────────────────────────────────────────────────────────────────────────

export interface SheetOptions {
  title?: string;
  /** The body: an element, HTML-free text, or a function that fills the host element. */
  content: HTMLElement | string | ((host: HTMLElement) => void);
  /** Backdrop tap, drag-down and the back gesture close it. Default true. */
  dismissible?: boolean;
}

export interface SheetHandle {
  close(): void;
  /** The body host, for apps that update the sheet's content while it is open. */
  element: HTMLElement;
  /** Resolves when the sheet has closed, however it closed. */
  closed: Promise<void>;
}

/**
 * A modal bottom sheet with real sheet physics: slides up, drags down to dismiss (with the
 * content's own scroll respected), closes on backdrop tap, Escape and the back gesture, and is
 * haptic on open. Dressed in the app's tokens. This is the "bottom sheet instead of a centred
 * modal" the design rules ask for whenever the content is more than a list of actions — a
 * filter panel, a composer, a detail preview. For a plain list of actions use `actionSheet()`.
 */
export function sheet(opts: SheetOptions): SheetHandle {
  const host = overlayHost();
  const body = document.createElement('div');
  let resolveClosed: () => void = () => {};
  const closed = new Promise<void>((r) => { resolveClosed = r; });
  if (!host) return { close() { resolveClosed(); }, element: body, closed };

  const dismissible = opts.dismissible !== false;
  const fast = reducedMotion();
  const surface = token('--surface', '#ffffff'), ink = token('--ink', '#15161a');
  const muted = token('--muted', '#6b7280'), border = token('--border', 'rgba(0,0,0,.1)');

  const root = document.createElement('div');
  root.style.cssText = 'position:absolute;inset:0;pointer-events:auto;display:flex;align-items:flex-end;justify-content:center;';
  const backdrop = document.createElement('div');
  backdrop.style.cssText = ['position:absolute;inset:0;background:rgba(0,0,0,.4)', 'opacity:0', fast ? '' : 'transition:opacity 220ms ease-out'].filter(Boolean).join(';');
  const panel = document.createElement('div');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  if (opts.title) panel.setAttribute('aria-label', opts.title);
  panel.style.cssText = [
    'position:relative', 'width:min(100%, 560px)', 'max-height:calc(100vh - var(--safe-top, 0px) - 48px)',
    'box-sizing:border-box', `background:${surface}`, `color:${ink}`, 'border-radius:20px 20px 0 0',
    'padding:8px 0 var(--safe-bottom, 0px)', 'box-shadow:0 -12px 40px rgba(0,0,0,.22)',
    'display:flex', 'flex-direction:column', 'transform:translateY(100%)', 'touch-action:none',
    fast ? '' : 'transition:transform 260ms cubic-bezier(0.16,1,0.3,1)',
  ].filter(Boolean).join(';');
  const grip = document.createElement('div');
  grip.setAttribute('data-appmint-chrome', '');
  grip.style.cssText = `width:36px;height:4px;border-radius:2px;background:${border};margin:6px auto 10px;flex:0 0 auto;`;
  panel.appendChild(grip);
  if (opts.title) {
    const h = document.createElement('div');
    h.textContent = opts.title;
    h.setAttribute('data-appmint-chrome', '');
    h.style.cssText = `color:${muted};font:600 13px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.02em;padding:4px 20px 10px;flex:0 0 auto;`;
    panel.appendChild(h);
  }
  body.style.cssText = 'flex:1 1 auto;overflow-y:auto;padding:0 20px 12px;touch-action:pan-y;-webkit-overflow-scrolling:touch;';
  if (typeof opts.content === 'string') body.textContent = opts.content;
  else if (typeof opts.content === 'function') opts.content(body);
  else body.appendChild(opts.content);
  panel.appendChild(body);

  let settled = false;
  let offBack: () => void = () => {};
  const close = () => {
    if (settled) return;
    settled = true;
    offBack();
    document.removeEventListener('keydown', onKey);
    backdrop.style.opacity = '0';
    panel.style.transition = fast ? '' : 'transform 220ms ease-in';
    panel.style.transform = 'translateY(100%)';
    window.setTimeout(() => { root.remove(); resolveClosed(); }, fast ? 0 : 230);
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && dismissible) close(); };

  // Drag to dismiss. The body scrolls itself; the drag only takes over when it is at the top.
  let dragId: number | null = null, dragY0 = 0, dragLast = 0, dragT0 = 0;
  const dragDown = (e: PointerEvent) => {
    if (!dismissible || dragId !== null) return;
    if (body.contains(e.target as Node) && body.scrollTop > 0) return;
    dragId = e.pointerId; dragY0 = e.clientY; dragLast = 0; dragT0 = performance.now();
    panel.style.transition = 'none';
  };
  const dragMove = (e: PointerEvent) => {
    if (dragId !== e.pointerId) return;
    const dy = Math.max(0, e.clientY - dragY0);
    dragLast = dy;
    panel.style.transform = `translateY(${dy}px)`;
    backdrop.style.opacity = String(Math.max(0, 1 - dy / 400));
  };
  const dragUp = (e: PointerEvent) => {
    if (dragId !== e.pointerId) return;
    dragId = null;
    const velocity = dragLast / Math.max(1, performance.now() - dragT0);   // px per ms
    panel.style.transition = fast ? '' : 'transform 220ms cubic-bezier(0.16,1,0.3,1)';
    if (dragLast > 120 || velocity > 0.6) { close(); return; }
    panel.style.transform = 'translateY(0)';
    backdrop.style.opacity = '1';
  };
  panel.addEventListener('pointerdown', dragDown);
  panel.addEventListener('pointermove', dragMove);
  panel.addEventListener('pointerup', dragUp);
  panel.addEventListener('pointercancel', dragUp);

  if (dismissible) backdrop.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  if (dismissible) offBack = onBackGesture(() => { close(); return true; });

  root.appendChild(backdrop);
  root.appendChild(panel);
  host.appendChild(root);
  haptic('light');
  requestAnimationFrame(() => {
    backdrop.style.opacity = '1';
    panel.style.transform = 'translateY(0)';
  });
  (panel.querySelector('button, input, textarea, [tabindex]') as HTMLElement | null)?.focus();

  return { close, element: body, closed };
}

// ── offline banner ───────────────────────────────────────────────────────────────────────────

export interface OfflineBannerOptions {
  message?: string;
  /** Shown briefly when the connection returns. Default "Back online". */
  onlineMessage?: string;
}

/**
 * The ready-made offline strip: slides in under the status bar the moment connectivity drops,
 * flips to a brief "Back online" when it returns. Mount once at app start; returns an unsubscribe.
 * Built on onNetworkChange(), so it is real on every surface.
 */
export function offlineBanner(opts: OfflineBannerOptions = {}): () => void {
  if (typeof document === 'undefined') return () => {};
  const message = opts.message ?? 'You are offline';
  const onlineMessage = opts.onlineMessage ?? 'Back online';
  let bar: HTMLElement | null = null;
  let hideTimer = 0;
  const show = (text: string, online: boolean) => {
    const host = overlayHost();
    if (!host) return;
    if (!bar) {
      bar = document.createElement('div');
      bar.setAttribute('role', 'status');
      bar.setAttribute('data-appmint-chrome', '');
      bar.style.cssText = [
        'position:absolute', 'left:12px', 'right:12px', 'top:calc(var(--safe-top, 0px) + 8px)',
        'padding:10px 14px', 'border-radius:12px', 'text-align:center',
        'font:500 13px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif',
        'box-shadow:0 6px 20px rgba(0,0,0,.2)', 'transform:translateY(-16px)', 'opacity:0',
        reducedMotion() ? '' : 'transition:transform 200ms ease-out,opacity 200ms ease-out',
      ].filter(Boolean).join(';');
      host.appendChild(bar);
    }
    bar.textContent = text;
    bar.style.background = online ? token('--accent', '#16a34a') : token('--ink', '#15161a');
    bar.style.color = online ? token('--accent-ink', '#ffffff') : token('--bg', '#ffffff');
    requestAnimationFrame(() => { if (bar) { bar.style.transform = 'translateY(0)'; bar.style.opacity = '1'; } });
  };
  const hide = () => {
    if (!bar) return;
    bar.style.transform = 'translateY(-16px)'; bar.style.opacity = '0';
    const el = bar; bar = null;
    window.setTimeout(() => el.remove(), 220);
  };
  let wasOffline = !networkStatus().connected;
  if (wasOffline) show(message, false);
  const off = onNetworkChange((s) => {
    window.clearTimeout(hideTimer);
    if (!s.connected) { wasOffline = true; show(message, false); return; }
    if (!wasOffline) return;
    wasOffline = false;
    show(onlineMessage, true);
    hideTimer = window.setTimeout(hide, 1800);
  });
  return () => { off(); window.clearTimeout(hideTimer); hide(); };
}

// ── collapsing header ────────────────────────────────────────────────────────────────────────

export interface CollapsingHeaderOptions {
  /** The element that scrolls. Default: the page. */
  scroller?: HTMLElement | Window;
  /** Scroll distance over which the header collapses. Default 64. */
  range?: number;
}

/**
 * A header that reacts to scroll the way native ones do: publishes `--collapse` (0 → 1) on the
 * header element and toggles `data-collapsed` past the range, so CSS can shrink a large title,
 * fade a subtitle, or raise an elevation:
 *
 *   header { font-size: calc(28px - 10px * var(--collapse, 0)); }
 *   header[data-collapsed] { box-shadow: var(--shadow); }
 *
 * Passive scroll listener with rAF coalescing. Returns an unsubscribe.
 */
export function collapsingHeader(header: HTMLElement, opts: CollapsingHeaderOptions = {}): () => void {
  if (!hasWin()) return () => {};
  const scroller = opts.scroller ?? window;
  const range = Math.max(1, opts.range ?? 64);
  let ticking = false;
  const read = () => (scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop);
  const apply = () => {
    ticking = false;
    const p = Math.min(1, Math.max(0, read() / range));
    header.style.setProperty('--collapse', p.toFixed(3));
    if (p >= 1) header.setAttribute('data-collapsed', ''); else header.removeAttribute('data-collapsed');
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
  scroller.addEventListener('scroll', onScroll, { passive: true });
  apply();
  return () => {
    scroller.removeEventListener('scroll', onScroll);
    header.style.removeProperty('--collapse');
    header.removeAttribute('data-collapsed');
  };
}

// ── launcher shortcuts ───────────────────────────────────────────────────────────────────────

export interface AppShortcut { id?: string; title: string; route: string }

/**
 * Long-press-the-icon shortcuts (Android 7.1+ dynamic shortcuts, iOS Home Screen quick actions).
 * Up to four. A tap opens the app with `route` as its launch deep link — handle it with
 * `launchUrl()` / `onDeepLink()`, the same way as any other link. Gate on `can('shortcuts')`.
 */
export const shortcuts = {
  async set(items: AppShortcut[]): Promise<boolean> {
    const list = items.slice(0, 4).map((s) => ({ id: s.id ?? '', title: s.title, route: s.route.startsWith('/') ? s.route : `/${s.route}` }));
    const cap = capPlugin<{ set(o: { items: AppShortcut[] }): Promise<unknown> }>('AppwrightShortcuts');
    if (cap) { try { await cap.set({ items: list }); return true; } catch { return false; } }
    const b = bridge();
    if (b?.setAppShortcuts) { b.setAppShortcuts(JSON.stringify(list)); return true; }
    return false;
  },
  async clear(): Promise<void> {
    const cap = capPlugin<{ clear(): Promise<void> }>('AppwrightShortcuts');
    if (cap) { await cap.clear().catch(() => {}); return; }
    bridge()?.setAppShortcuts?.('[]');
  },
};

// ── deep links ───────────────────────────────────────────────────────────────────────────────

interface AppPlugin {
  getLaunchUrl(): Promise<{ url?: string } | null>;
  addListener(e: 'appUrlOpen', h: (d: { url?: string }) => void): Promise<{ remove(): Promise<void> }>;
}

let lastDeepLink = '';

/**
 * The link that launched or resumed the app — a deep link, a shortcut, a notification — or ''
 * when it opened normally. Kept, not consumed, so a late-mounting app still sees it. Route on it:
 *
 *   const u = await launchUrl();
 *   if (u) navigate(new URL(u).pathname);
 *
 * '' on the web: there the URL bar already IS the route.
 */
export async function launchUrl(): Promise<string> {
  const b = bridge();
  if (b?.getLaunchUrl) return b.getLaunchUrl() || lastDeepLink;
  const cap = capPlugin<AppPlugin>('App');
  if (cap) {
    try { return (await cap.getLaunchUrl())?.url || lastDeepLink; } catch { return lastDeepLink; }
  }
  return '';
}

/** A link arriving while the app runs. Returns an unsubscribe. Silent on the web. */
export function onDeepLink(cb: (url: string) => void): () => void {
  if (!hasWin()) return () => {};
  const b = bridge();
  if (b?.getLaunchUrl) {
    const handler = (e: Event) => {
      const url = String((e as CustomEvent<{ url?: string }>).detail?.url ?? '');
      if (url) { lastDeepLink = url; cb(url); }
    };
    window.addEventListener('appmint:deep-link', handler);
    return () => window.removeEventListener('appmint:deep-link', handler);
  }
  const cap = capPlugin<AppPlugin>('App');
  if (cap) {
    const p = cap.addListener('appUrlOpen', (d) => { if (d?.url) { lastDeepLink = d.url; cb(d.url); } });
    return () => { void p.then((h) => h.remove()).catch(() => {}); };
  }
  return () => {};
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// The remaining official plugins (2026-09-05): app launcher, browser, camera, geolocation,
// screen reader, text zoom, privacy screen, file viewer, file transfer, calendar, background
// sync, motion
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** Plugin-first, promise-typed helper: resolves the plugin's result or `undefined` if absent. */
async function withCap<T, R>(name: string, run: (p: T) => Promise<R>): Promise<R | undefined> {
  const cap = capPlugin<T>(name);
  if (!cap) return undefined;
  return run(cap);
}

// ── app launcher ─────────────────────────────────────────────────────────────────────────────

/**
 * Opens another app by URL — `whatsapp://send?text=…`, `spotify:track:…`, `maps://…`, or a plain
 * https link the OS routes to its app. In the installed apps `canOpen()` asks the OS; on the web
 * a custom scheme cannot be probed, so it answers true for http(s) only.
 */
export const appLauncher = {
  /**
   * Whether an installed app handles this URL. Android 11+ only answers for URL schemes the app
   * DECLARED it will query, and generated apps declare exactly these: https, geo,
   * google.navigation, tel, mailto, sms, whatsapp, intent and upi. For any other scheme
   * (`spotify:`, `fb://`, `tg://`…) `canOpen()` is false on Android 11+ EVEN WHEN the app is
   * installed. For those, skip the probe: call `open()`, which starts the app when it is there
   * and resolves false when nothing handles the URL. iOS answers only for schemes the Info.plist
   * lists under LSApplicationQueriesSchemes, which the exported project does not fill — the same
   * advice applies.
   */
  async canOpen(url: string): Promise<boolean> {
    const r = await withCap<{ canOpenUrl(o: { url: string }): Promise<{ value?: boolean }> }, boolean>(
      'AppLauncher', async (p) => !!(await p.canOpenUrl({ url }))?.value).catch(() => false);
    if (r !== undefined) return r;
    return /^https?:/i.test(url);
  },
  async open(url: string): Promise<boolean> {
    const r = await withCap<{ openUrl(o: { url: string }): Promise<{ completed?: boolean }> }, boolean>(
      'AppLauncher', async (p) => (await p.openUrl({ url }))?.completed !== false).catch(() => false);
    if (r !== undefined) return r;
    if (!hasWin()) return false;
    if (/^https?:/i.test(url)) window.open(url, '_blank', 'noopener');
    else window.location.href = url;
    return true;
  },
};

// ── in-app browser ───────────────────────────────────────────────────────────────────────────

/**
 * An in-app browser tab — Chrome Custom Tabs — for docs, terms, an OAuth page: the user stays in
 * the app and comes back with one gesture. A new tab on the web. `close()` closes it from code in
 * the app (the Browser plugin finishes the Custom Tab); on the web it does nothing — the user
 * closes the tab.
 */
export const browser = {
  async open(url: string, opts: { toolbarColor?: string } = {}): Promise<boolean> {
    const r = await withCap<{ open(o: Record<string, unknown>): Promise<void> }, boolean>('Browser', async (p) => {
      await p.open({ url, toolbarColor: opts.toolbarColor ?? token('--bg', '#ffffff'), presentationStyle: 'popover' });
      return true;
    }).catch(() => false);
    if (r !== undefined) return r;
    if (!hasWin()) return false;
    window.open(url, '_blank', 'noopener');
    return true;
  },
  async close(): Promise<void> {
    await withCap<{ close(): Promise<void> }, void>('Browser', (p) => p.close()).catch(() => {});
  },
  /** Fires when the user closes the tab (native only). Returns an unsubscribe. */
  onClosed(cb: () => void): () => void {
    const cap = capPlugin<{ addListener(e: string, h: () => void): Promise<{ remove(): Promise<void> }> }>('Browser');
    if (!cap) return () => {};
    const p = cap.addListener('browserFinished', cb);
    return () => { void p.then((h) => h.remove()).catch(() => {}); };
  },
};

// ── camera ───────────────────────────────────────────────────────────────────────────────────

export interface Photo { dataUrl: string; mime: string; width?: number; height?: number }
export interface TakePhotoOptions {
  /** 'camera' opens the camera, 'photos' the gallery. Default 'camera'. */
  source?: 'camera' | 'photos';
  /** JPEG quality 0–100. Default 80. */
  quality?: number;
  direction?: 'rear' | 'front';
  allowEditing?: boolean;
}

interface CameraPlugin {
  checkPermissions(): Promise<Record<string, string>>;
  requestPermissions(o: { permissions: string[] }): Promise<Record<string, string>>;
  getPhoto(o: Record<string, unknown>): Promise<{ dataUrl?: string; format?: string; webPath?: string }>;
  pickImages(o: Record<string, unknown>): Promise<{ photos?: Array<{ webPath?: string; format?: string }> }>;
}

async function cameraGranted(cap: CameraPlugin, which: 'camera' | 'photos'): Promise<boolean> {
  try {
    let s = (await cap.checkPermissions())?.[which];
    if (s !== 'granted' && s !== 'limited') s = (await cap.requestPermissions({ permissions: [which] }))?.[which];
    return s === 'granted' || s === 'limited';
  } catch { return false; }
}

function pickWeb(accept: string, capture: string | null, multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve([]); return; }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept; input.multiple = multiple;
    if (capture) input.setAttribute('capture', capture);
    input.style.display = 'none';
    input.addEventListener('change', () => { const f = Array.from(input.files ?? []); input.remove(); resolve(f); });
    input.addEventListener('cancel', () => { input.remove(); resolve([]); });
    document.body.appendChild(input);
    input.click();
  });
}
function fileToPhoto(f: Blob): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ dataUrl: String(r.result), mime: f.type || 'image/jpeg' });
    r.onerror = () => reject(r.error ?? new Error('appmint: could not read the image'));
    r.readAsDataURL(f);
  });
}
async function webPathToPhoto(webPath: string, format?: string): Promise<Photo> {
  const blob = await (await fetch(webPath)).blob();
  const p = await fileToPhoto(blob);
  return { ...p, mime: format ? `image/${format}` : p.mime };
}

/**
 * The native camera and photo picker on both stores; a file input with `capture` on the web.
 * Resolves null on cancel or a refused permission — both are normal outcomes to render, never
 * errors to throw. Both arm the camera / photo permissions from the call shape.
 */
export const camera = {
  async take(opts: TakePhotoOptions = {}): Promise<Photo | null> {
    const source = opts.source ?? 'camera';
    const cap = capPlugin<CameraPlugin>('Camera');
    if (cap) {
      if (!(await cameraGranted(cap, source))) return null;
      try {
        const r = await cap.getPhoto({
          quality: opts.quality ?? 80, allowEditing: !!opts.allowEditing, resultType: 'dataUrl',
          source: source === 'camera' ? 'CAMERA' : 'PHOTOS', direction: opts.direction === 'front' ? 'FRONT' : 'REAR',
          saveToGallery: false, correctOrientation: true,
        });
        if (r?.dataUrl) return { dataUrl: r.dataUrl, mime: r.format ? `image/${r.format}` : 'image/jpeg' };
        if (r?.webPath) return webPathToPhoto(r.webPath, r.format);
        return null;
      } catch { return null; }   // the user cancelled
    }
    const [f] = await pickWeb('image/*', source === 'camera' ? (opts.direction === 'front' ? 'user' : 'environment') : null, false);
    return f ? fileToPhoto(f) : null;
  },

  async pick(opts: { limit?: number; quality?: number } = {}): Promise<Photo[]> {
    const cap = capPlugin<CameraPlugin>('Camera');
    if (cap) {
      if (!(await cameraGranted(cap, 'photos'))) return [];
      try {
        const r = await cap.pickImages({ quality: opts.quality ?? 80, limit: opts.limit ?? 0 });
        return Promise.all((r?.photos ?? []).filter((p) => p.webPath).map((p) => webPathToPhoto(p.webPath!, p.format)));
      } catch { return []; }
    }
    const files = await pickWeb('image/*', null, (opts.limit ?? 0) !== 1);
    return Promise.all(files.slice(0, opts.limit || files.length).map(fileToPhoto));
  },
};

// ── geolocation (Capacitor shape) ────────────────────────────────────────────────────────────

interface GeoPlugin {
  getCurrentPosition(o?: Record<string, unknown>): Promise<GeolocationPosition>;
  watchPosition(o: Record<string, unknown>, cb: (pos: GeolocationPosition | null, err?: unknown) => void): Promise<string>;
  clearWatch(o: { id: string }): Promise<void>;
  checkPermissions(): Promise<{ location?: string }>;
  requestPermissions(): Promise<{ location?: string }>;
}
export interface PositionOptions { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }

/**
 * `@capacitor/geolocation`'s shape — the native plugin in the installed apps, the standard
 * `navigator.geolocation` on the web. Both return the W3C position object. Plain
 * `navigator.geolocation` in app code keeps working too; this exists so code written against
 * Capacitor runs unchanged.
 */
export const Geolocation = {
  async getCurrentPosition(opts: PositionOptions = {}): Promise<GeolocationPosition> {
    const cap = capPlugin<GeoPlugin>('Geolocation');
    if (cap) return cap.getCurrentPosition(opts as Record<string, unknown>);
    const g = nav()?.geolocation;
    if (!g) throw new Error('appmint: geolocation unavailable — check can("location")');
    return new Promise((resolve, reject) => g.getCurrentPosition(resolve, reject, opts));
  },
  async watchPosition(opts: PositionOptions, cb: (pos: GeolocationPosition | null, err?: unknown) => void): Promise<string> {
    const cap = capPlugin<GeoPlugin>('Geolocation');
    if (cap) return cap.watchPosition(opts as Record<string, unknown>, cb);
    const g = nav()?.geolocation;
    if (!g) throw new Error('appmint: geolocation unavailable — check can("location")');
    return String(g.watchPosition((p) => cb(p), (e) => cb(null, e), opts));
  },
  async clearWatch({ id }: { id: string }): Promise<void> {
    const cap = capPlugin<GeoPlugin>('Geolocation');
    if (cap) { await cap.clearWatch({ id }); return; }
    nav()?.geolocation?.clearWatch(Number(id));
  },
  async checkPermissions(): Promise<{ location: string }> {
    const cap = capPlugin<GeoPlugin>('Geolocation');
    if (cap) return { location: (await cap.checkPermissions())?.location ?? 'prompt' };
    try {
      const s = await nav()?.permissions?.query({ name: 'geolocation' });
      return { location: s?.state ?? 'prompt' };
    } catch { return { location: 'prompt' }; }
  },
  async requestPermissions(): Promise<{ location: string }> {
    const cap = capPlugin<GeoPlugin>('Geolocation');
    if (cap) return { location: (await cap.requestPermissions())?.location ?? 'denied' };
    // The web asks on first use; a probe call is the request.
    try { await Geolocation.getCurrentPosition({ timeout: 10_000 }); return { location: 'granted' }; }
    catch { return { location: 'denied' }; }
  },
};

// ── screen reader ────────────────────────────────────────────────────────────────────────────

/**
 * TalkBack / VoiceOver. `isEnabled()` answers only in the installed apps (no web API exists —
 * `can('screenReader')` is 'none' there); `speak()` announces through the screen reader in the
 * app and through TTS elsewhere. Use it to shorten animations and announce state changes.
 */
export const screenReader = {
  async isEnabled(): Promise<boolean> {
    const r = await withCap<{ isEnabled(): Promise<{ value?: boolean }> }, boolean>('ScreenReader', async (p) => !!(await p.isEnabled())?.value).catch(() => false);
    return r ?? false;
  },
  async speak(text: string, lang?: string): Promise<void> {
    const r = await withCap<{ speak(o: { value: string; language?: string }): Promise<void> }, boolean>('ScreenReader', async (p) => {
      await p.speak({ value: text, language: lang }); return true;
    }).catch(() => false);
    if (!r) speak(text, lang ? { lang } : {});
  },
  onChange(cb: (enabled: boolean) => void): () => void {
    const cap = capPlugin<{ addListener(e: string, h: (s: { value?: boolean }) => void): Promise<{ remove(): Promise<void> }> }>('ScreenReader');
    if (!cap) return () => {};
    const p = cap.addListener('stateChange', (s) => cb(!!s?.value));
    return () => { void p.then((h) => h.remove()).catch(() => {}); };
  },
};

// ── text zoom ────────────────────────────────────────────────────────────────────────────────

/**
 * An in-app text-size control. Natively the WebView's text zoom (1 = the OS setting); on the
 * web the root font-size, which scales every rem-based layout the same way.
 */
export const textZoom = {
  async get(): Promise<number> {
    const r = await withCap<{ get(): Promise<{ value?: number }> }, number>('TextZoom', async (p) => (await p.get())?.value ?? 1).catch(() => 1);
    if (r !== undefined) return r;
    const v = typeof document !== 'undefined' ? parseFloat(document.documentElement.style.fontSize) : NaN;
    return Number.isFinite(v) ? v / 100 : 1;
  },
  /** The size the user chose in system settings; 1 on the web (the browser already applied it). */
  async getPreferred(): Promise<number> {
    const r = await withCap<{ getPreferred(): Promise<{ value?: number }> }, number>('TextZoom', async (p) => (await p.getPreferred())?.value ?? 1).catch(() => 1);
    return r ?? 1;
  },
  async set(value: number): Promise<void> {
    const v = Math.min(3, Math.max(0.5, value));
    const r = await withCap<{ set(o: { value: number }): Promise<void> }, boolean>('TextZoom', async (p) => { await p.set({ value: v }); return true; }).catch(() => false);
    if (r) return;
    if (typeof document !== 'undefined') document.documentElement.style.fontSize = `${Math.round(v * 100)}%`;
  },
};

// ── privacy screen ───────────────────────────────────────────────────────────────────────────

/**
 * Blocks screenshots, screen recording and the app-switcher preview while a screen with secrets
 * is up. Android: the shell's FLAG_SECURE bridge. iOS: the PrivacyScreen plugin (blur in the
 * switcher, capture blocked). `can('privacyScreen')` is 'none' on the web — nothing there can
 * stop a screenshot, and nothing should pretend to.
 */
export const privacyScreen = {
  // Android: the shell's secure screen first — it follows the page (released when the app
  // navigates away from the page that asked). The PrivacyScreen plugin is baked on Android too
  // since 2026-09-23 for imported code that calls it directly; iOS has only the plugin.
  async enable(): Promise<boolean> {
    const b = bridge();
    if (b?.setSecureScreen) return b.setSecureScreen(true) ?? true;
    const r = await withCap<{ enable(o?: Record<string, unknown>): Promise<{ success?: boolean }> }, boolean>('PrivacyScreen', async (p) =>
      (await p.enable({ ios: { blurEffect: 'dark' }, android: { preventScreenshots: true, privacyModeOnActivityHidden: 'dim' } }))?.success !== false).catch(() => false);
    return r ?? false;
  },
  async disable(): Promise<void> {
    const b = bridge();
    if (b?.setSecureScreen) { b.setSecureScreen(false); return; }
    await withCap<{ disable(): Promise<unknown> }, boolean>('PrivacyScreen', async (p) => { await p.disable(); return true; }).catch(() => false);
  },
  async isEnabled(): Promise<boolean> {
    const b = bridge();
    if (b?.isSecureScreen) return b.isSecureScreen() ?? false;
    const r = await withCap<{ isEnabled(): Promise<{ enabled?: boolean }> }, boolean>('PrivacyScreen', async (p) => !!(await p.isEnabled())?.enabled).catch(() => false);
    return r ?? false;
  },
};

// ── file viewer / file transfer ──────────────────────────────────────────────────────────────

/** Opens a document (PDF, image, office file) in the OS viewer; a new tab on the web. */
export const fileViewer = {
  async open(target: string): Promise<boolean> {
    const r = await withCap<{
      openDocumentFromUrl(o: { url: string }): Promise<void>;
      openDocumentFromLocalPath(o: { path: string }): Promise<void>;
    }, boolean>('FileViewer', async (p) => {
      if (/^https?:/i.test(target)) await p.openDocumentFromUrl({ url: target });
      else await p.openDocumentFromLocalPath({ path: target.replace(/^file:\/\//, '') });
      return true;
    }).catch(() => false);
    if (r !== undefined) return r;
    if (!hasWin() || !/^(https?:|blob:|data:)/i.test(target)) return false;
    window.open(target, '_blank', 'noopener');
    return true;
  },
};

export interface TransferProgress { bytes: number; total: number; fraction: number }
export interface DownloadResult { path?: string; blob?: Blob }
export interface UploadResult { responseCode: number; responseBody: string }

interface FileTransferPlugin {
  downloadFile(o: Record<string, unknown>): Promise<{ path?: string }>;
  uploadFile(o: Record<string, unknown>): Promise<{ responseCode?: string | number; response?: string }>;
  addListener(e: 'progress', h: (p: { url?: string; bytes?: number; contentLength?: number }) => void): Promise<{ remove(): Promise<void> }>;
}
interface FsPlugin {
  getUri(o: { path: string; directory: string }): Promise<{ uri: string }>;
  writeFile(o: { path: string; data: string; directory: string; recursive?: boolean }): Promise<{ uri: string }>;
}
async function transferProgress(cap: FileTransferPlugin, url: string, onProgress?: (p: TransferProgress) => void): Promise<() => void> {
  if (!onProgress) return () => {};
  const h = cap.addListener('progress', (p) => {
    if (p?.url && p.url !== url) return;
    const total = p?.contentLength ?? 0, bytes = p?.bytes ?? 0;
    onProgress({ bytes, total, fraction: total > 0 ? Math.min(1, bytes / total) : 0 });
  });
  return () => { void h.then((x) => x.remove()).catch(() => {}); };
}

/**
 * Downloads and uploads with progress. In the app the transfer is native (and a download lands
 * as a real file the app can hand to fileViewer.open or share); on the web it is fetch/XHR with
 * the same progress callback, and a download is saved through the browser.
 */
export const fileTransfer = {
  async download(url: string, fileName: string, opts: { headers?: Record<string, string>; onProgress?: (p: TransferProgress) => void } = {}): Promise<DownloadResult> {
    const cap = capPlugin<FileTransferPlugin>('FileTransfer');
    const fs = capPlugin<FsPlugin>('Filesystem');
    if (cap && fs) {
      const path = (await fs.getUri({ path: fileName, directory: 'CACHE' })).uri;
      const off = await transferProgress(cap, url, opts.onProgress);
      try {
        const r = await cap.downloadFile({ url, path, headers: opts.headers ?? {}, progress: !!opts.onProgress });
        return { path: r?.path ?? path };
      } finally { off(); }
    }
    const res = await fetch(url, { headers: opts.headers });
    if (!res.ok) throw new Error(`appmint: download failed (HTTP ${res.status})`);
    const total = Number(res.headers.get('content-length') ?? 0);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    const reader = res.body?.getReader();
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) { chunks.push(value); bytes += value.length; opts.onProgress?.({ bytes, total, fraction: total ? Math.min(1, bytes / total) : 0 }); }
      }
    }
    const blob = new Blob(chunks as BlobPart[], { type: res.headers.get('content-type') ?? 'application/octet-stream' });
    saveFile(fileName, blob, blob.type);
    return { blob };
  },

  async upload(url: string, file: Blob, opts: { method?: string; fieldName?: string; fileName?: string; headers?: Record<string, string>; onProgress?: (p: TransferProgress) => void } = {}): Promise<UploadResult> {
    const fieldName = opts.fieldName ?? 'file';
    const fileName = opts.fileName ?? (file as File).name ?? 'upload.bin';
    const cap = capPlugin<FileTransferPlugin>('FileTransfer');
    const fs = capPlugin<FsPlugin>('Filesystem');
    if (cap && fs) {
      // The native uploader reads from a path, so the blob is staged in the cache first.
      const b64 = bytesToB64(new Uint8Array(await file.arrayBuffer()));
      const { uri } = await fs.writeFile({ path: `appwright-upload/${fileName}`, data: b64, directory: 'CACHE', recursive: true });
      const off = await transferProgress(cap, url, opts.onProgress);
      try {
        const r = await cap.uploadFile({ url, path: uri, method: opts.method ?? 'POST', fileKey: fieldName, mimeType: file.type || undefined, headers: opts.headers ?? {}, progress: !!opts.onProgress });
        return { responseCode: Number(r?.responseCode ?? 0), responseBody: r?.response ?? '' };
      } finally { off(); }
    }
    return new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(opts.method ?? 'POST', url);
      for (const [k, v] of Object.entries(opts.headers ?? {})) xhr.setRequestHeader(k, v);
      xhr.upload.onprogress = (e) => opts.onProgress?.({ bytes: e.loaded, total: e.total, fraction: e.lengthComputable && e.total ? e.loaded / e.total : 0 });
      xhr.onload = () => resolve({ responseCode: xhr.status, responseBody: xhr.responseText });
      xhr.onerror = () => reject(new Error('appmint: upload failed'));
      const form = new FormData();
      form.append(fieldName, file, fileName);
      xhr.send(form);
    });
  },
};

// ── device calendar ──────────────────────────────────────────────────────────────────────────

export interface CalendarEventInput {
  title: string; start: Date | number; end: Date | number;
  location?: string; notes?: string; allDay?: boolean;
}
export interface CalendarEventItem {
  id: string; title: string; start: number; end: number; location?: string; notes?: string; allDay?: boolean;
}
interface CalendarPlugin {
  checkPermissions(): Promise<{ readCalendar?: string; writeCalendar?: string }>;
  requestPermissions(o?: { permissions?: string[] }): Promise<{ readCalendar?: string; writeCalendar?: string }>;
  createEvent(o: Record<string, unknown>): Promise<{ id?: string }>;
  findEvents(o: { startDate: number; endDate: number }): Promise<{ events?: Array<Record<string, unknown>> }>;
  deleteEvent(o: { id: string }): Promise<void>;
  openCalendar(o?: { date?: number }): Promise<void>;
}
const ms = (d: Date | number) => (d instanceof Date ? d.getTime() : d);
const icsDate = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/**
 * The user's OWN calendar app (EventKit / CalendarContract) — not the Google Calendar
 * connector. Creating an event on the web downloads an .ics the user opens in their calendar;
 * reading events has no web equivalent (`can('calendarRead')` is 'none' there).
 */
export const calendar = {
  async requestPermission(): Promise<'granted' | 'denied'> {
    const cap = capPlugin<CalendarPlugin>('Calendar');
    if (!cap) return typeof document !== 'undefined' ? 'granted' : 'denied';   // the .ics route needs none
    try {
      let s = await cap.checkPermissions();
      if (s?.readCalendar !== 'granted' || s?.writeCalendar !== 'granted') s = await cap.requestPermissions();
      return s?.writeCalendar === 'granted' ? 'granted' : 'denied';
    } catch { return 'denied'; }
  },

  /** Resolves the event id, or null when the user refused. */
  async createEvent(input: CalendarEventInput): Promise<string | null> {
    const cap = capPlugin<CalendarPlugin>('Calendar');
    if (cap) {
      if ((await calendar.requestPermission()) !== 'granted') return null;
      try {
        const r = await cap.createEvent({
          title: input.title, startDate: ms(input.start), endDate: ms(input.end),
          location: input.location, notes: input.notes, isAllDay: !!input.allDay,
        });
        return r?.id ?? null;
      } catch { return null; }
    }
    if (typeof document === 'undefined') return null;
    const uid = `${Date.now()}@appwright`;
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Appwright//EN', 'BEGIN:VEVENT', `UID:${uid}`,
      `DTSTAMP:${icsDate(Date.now())}`, `DTSTART:${icsDate(ms(input.start))}`, `DTEND:${icsDate(ms(input.end))}`,
      `SUMMARY:${input.title.replace(/\n/g, ' ')}`,
      input.location ? `LOCATION:${input.location.replace(/\n/g, ' ')}` : '',
      input.notes ? `DESCRIPTION:${input.notes.replace(/\n/g, '\\n')}` : '',
      'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
    return saveFile(`${input.title.replace(/[^\w.-]+/g, '_') || 'event'}.ics`, ics, 'text/calendar') ? uid : null;
  },

  async listEvents(range: { from: Date | number; to: Date | number }): Promise<CalendarEventItem[]> {
    const cap = capPlugin<CalendarPlugin>('Calendar');
    if (!cap) return [];
    if ((await calendar.requestPermission()) !== 'granted') return [];
    try {
      const r = await cap.findEvents({ startDate: ms(range.from), endDate: ms(range.to) });
      return (r?.events ?? []).map((e) => ({
        id: String(e.id ?? ''), title: String(e.title ?? ''), start: Number(e.startDate ?? 0), end: Number(e.endDate ?? 0),
        location: e.location as string | undefined, notes: e.notes as string | undefined, allDay: !!e.isAllDay,
      }));
    } catch { return []; }
  },

  async deleteEvent(id: string): Promise<boolean> {
    const r = await withCap<CalendarPlugin, boolean>('Calendar', async (p) => { await p.deleteEvent({ id }); return true; }).catch(() => false);
    return r ?? false;
  },

  /** Opens the system calendar app at a date. */
  async openCalendar(date: Date | number = Date.now()): Promise<boolean> {
    const r = await withCap<CalendarPlugin, boolean>('Calendar', async (p) => { await p.openCalendar({ date: ms(date) }); return true; }).catch(() => false);
    return r ?? false;
  },
};

// ── background sync ──────────────────────────────────────────────────────────────────────────

export interface BackgroundRequest {
  id: string; url: string; method?: string; headers?: Record<string, string>; body?: string;
}
export interface BackgroundJob {
  id: string; url: string; periodic: boolean; createdAt?: number; intervalMinutes?: number;
  /** Android: a one-shot whose delivery has not succeeded yet. */
  pendingDelivery?: boolean;
}

interface RunnerPlugin { dispatchEvent(o: { label: string; event: string; details: Record<string, unknown> }): Promise<unknown> }
interface AppInfoPlugin { getInfo(): Promise<{ id?: string }> }

let runnerLabel = '';
async function runnerDispatch(event: string, details: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const cap = capPlugin<RunnerPlugin>('BackgroundRunner');
  if (!cap) return null;
  if (!runnerLabel) {
    const id = (await capPlugin<AppInfoPlugin>('App')?.getInfo().catch(() => null))?.id ?? '';
    runnerLabel = `${id}.appwright.sync`;
  }
  try { return ((await cap.dispatchEvent({ label: runnerLabel, event, details })) as Record<string, unknown>) ?? {}; }
  catch { return null; }
}

/** Android: the reply to a work* call arrives as an `appmint:work` event carrying the job id. */
function awaitWork<T>(match: (d: Record<string, unknown>) => boolean, pick: (d: Record<string, unknown>) => T, timeoutMs = 10_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const onEvent = (e: Event) => {
      const d = (e as CustomEvent<Record<string, unknown>>).detail;
      if (!d || !match(d)) return;
      cleanup(); resolve(pick(d));
    };
    const timer = window.setTimeout(() => { cleanup(); reject(new Error('appmint: background work timed out')); }, timeoutMs);
    const cleanup = () => { window.removeEventListener('appmint:work', onEvent as EventListener); window.clearTimeout(timer); };
    window.addEventListener('appmint:work', onEvent as EventListener);
  });
}

/**
 * Native HTTP deliveries that run while the app is closed: WorkManager on Android, the Background
 * Runner on iOS (best-effort, ≥15 min, at the OS's discretion). `enqueue` is the durable
 * auto-save primitive — the same id replaces the pending attempt, so newest state wins.
 * `can('backgroundSync')` is 'none' on the web.
 */
/**
 * The shell's answer to an enqueue/schedule: `{id, status}` where status is the call's own
 * success word or 'failed' (+ `reason`: 'invalid_arguments' — the url must be http(s) and the
 * id non-empty — 'enqueue_failed', 'schedule_failed'). The status is matched, not just the id:
 * a cancel for the same id also answers on `appmint:work`. The old `d.ok !== false` read every
 * reply as success (the shell never sends `ok`), and a reply that never came resolved true.
 */
function workAccepted(id: string, success: string): Promise<boolean> {
  return awaitWork((d) => d.id === id && (d.status === success || d.status === 'failed'),
    (d) => d.status === success).catch(() => false);
}

export const backgroundSync = {
  /**
   * Resolves true once the job is queued (it runs whenever the device is online, retrying with
   * backoff), false when the OS refused it or the arguments were invalid.
   */
  async enqueue(req: BackgroundRequest): Promise<boolean> {
    const b = bridge();
    if (b?.workEnqueueOnline) {
      const p = workAccepted(req.id, 'enqueued');
      b.workEnqueueOnline(req.id, req.url, req.method ?? 'POST', JSON.stringify(req.headers ?? {}), req.body ?? '');
      return p;
    }
    const r = await runnerDispatch('appwright.enqueue', { ...req, method: req.method ?? 'POST' });
    return !!r && r.ok !== false;
  },
  async schedule(req: BackgroundRequest & { intervalMinutes: number }): Promise<boolean> {
    const b = bridge();
    if (b?.workSchedulePeriodic) {
      const p = workAccepted(req.id, 'scheduled');
      b.workSchedulePeriodic(req.id, req.url, req.method ?? 'POST', JSON.stringify(req.headers ?? {}), req.body ?? '', Math.max(15, Math.round(req.intervalMinutes)));
      return p;
    }
    const r = await runnerDispatch('appwright.schedule', { ...req, method: req.method ?? 'POST' });
    return !!r && r.ok !== false;
  },
  async cancel(id: string): Promise<void> {
    const b = bridge();
    if (b?.workCancel) { b.workCancel(id); return; }
    await runnerDispatch('appwright.cancel', { id });
  },
  async list(): Promise<BackgroundJob[]> {
    const b = bridge();
    if (b?.workList) {
      const id = rid('work');
      const p = awaitWork((d) => String(d.requestId) === id, (d) => (d.jobs as BackgroundJob[]) ?? []).catch(() => [] as BackgroundJob[]);
      b.workList(id);
      return p;
    }
    const r = await runnerDispatch('appwright.list', {});
    return ((r?.jobs as BackgroundJob[] | undefined) ?? []);
  },
};

// ── Background execution (Android app; each family is a build option) ─────────────────────────
//
// keepAlive: a real foreground service the page starts (the app keeps running, with a
// notification, while the user is away). backgroundLocation: fixes that keep coming in the
// background, buffered while the page is away and optionally POSTed natively. geofences: enter /
// exit / dwell with the app closed. backgroundTasks: the page's own code run every ≥15 minutes
// with the app closed. A family the build did not enable answers `{ok:false, reason:'not_enabled'}`;
// in a browser and on iOS every call answers `{ok:false, reason:'unsupported'}`.

export interface BgResult { ok: boolean; reason?: string; [k: string]: unknown }
export interface KeepAliveOptions {
  title?: string; text?: string;
  /** One of the types the build declared ('dataSync' | 'mediaPlayback' | 'location' | 'specialUse'). */
  type?: string;
  progress?: { value: number; max?: number; indeterminate?: boolean };
  /** Adds a Stop button to the notification. */
  stopLabel?: string;
  /** Keep the service after the user swipes the app away (the page itself is gone then). */
  keepAfterSwipe?: boolean;
}
export interface LocationFix {
  type: 'fix'; lat: number; lng: number; accuracy: number; altitude?: number; speed?: number;
  bearing?: number; time: number; provider: string; background: boolean;
}
export interface BackgroundLocationOptions {
  intervalMs?: number; minDistanceM?: number; accuracy?: 'high' | 'balanced' | 'low';
  /** true (default): runs in the foreground service and continues in the background. */
  background?: boolean;
  /** Each fix is POSTed here as JSON from native code (retried by WorkManager when offline). */
  uploadUrl?: string; headers?: Record<string, string>;
}
export interface GeofenceSpec {
  id: string; lat: number; lng: number; radiusM?: number;
  events?: Array<'enter' | 'exit' | 'dwell'>; dwellMs?: number; expiresInMs?: number; initialTrigger?: boolean;
  /** A notification for every event, or per event: `{ enter: {...}, exit: {...} }`. */
  notify?: Record<string, unknown>;
}
export interface GeofenceEvent { id: string; event: 'enter' | 'exit' | 'dwell'; time: number; lat: number; lng: number; queued?: boolean }

const BG_UNSUPPORTED: BgResult = { ok: false, reason: 'unsupported' };
function bgJson<T>(s: string | undefined | null, fallback: T): T {
  if (s == null) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}
function bgListen<T>(event: string, cb: (d: T) => void): () => void {
  if (!hasWin()) return () => {};
  const h = (e: Event) => cb((e as CustomEvent<T>).detail);
  window.addEventListener(event, h as EventListener);
  return () => window.removeEventListener(event, h as EventListener);
}

/** Keep the app running in the background with a foreground-service notification. */
export const keepAlive = {
  available: (): Availability => (bridge()?.startBackgroundService ? 'native' : 'none'),
  async start(options: KeepAliveOptions = {}): Promise<BgResult> {
    const b = bridge();
    if (!b?.startBackgroundService) return BG_UNSUPPORTED;
    return bgJson(b.startBackgroundService(JSON.stringify(options)), { ok: false, reason: 'failed' });
  },
  async update(options: KeepAliveOptions): Promise<BgResult> {
    const b = bridge();
    if (!b?.updateBackgroundService) return BG_UNSUPPORTED;
    return bgJson(b.updateBackgroundService(JSON.stringify(options)), { ok: false, reason: 'failed' });
  },
  async stop(): Promise<boolean> { return !!bridge()?.stopBackgroundService?.(); },
  isRunning: (): boolean => !!bridge()?.isBackgroundServiceRunning?.(),
  /** 'running' | 'stopped' | 'failed' | 'not_restarted', with a reason. Returns an unsubscribe. */
  onState(cb: (d: { state: string; reason?: string; types?: string[]; queued?: boolean }) => void): () => void {
    return bgListen('appmint:background-service', cb);
  },
};

/** Battery-optimisation exemption (keeps background work from being deferred by Doze). */
export const batteryOptimization = {
  isIgnoring: (): boolean => !!bridge()?.isIgnoringBatteryOptimizations?.(),
  /** 'already_ignoring' | 'dialog_opened' | 'settings_opened' | 'unavailable' | 'unsupported'. */
  async request(): Promise<string> {
    const b = bridge();
    return b?.requestIgnoreBatteryOptimizations ? b.requestIgnoreBatteryOptimizations() : 'unsupported';
  },
};

/** Location that keeps coming while the app is in the background. */
export const backgroundLocation = {
  available: (): Availability => (bridge()?.startLocationUpdates ? 'native' : 'none'),
  async start(options: BackgroundLocationOptions = {}): Promise<BgResult> {
    const b = bridge();
    if (!b?.startLocationUpdates) return BG_UNSUPPORTED;
    return bgJson(b.startLocationUpdates(JSON.stringify(options)), { ok: false, reason: 'failed' });
  },
  async stop(): Promise<boolean> { return !!bridge()?.stopLocationUpdates?.(); },
  /** Fixes recorded while the page was away, oldest first. */
  async buffered(): Promise<LocationFix[]> { return bgJson(bridge()?.getBufferedLocations?.(), [] as LocationFix[]); },
  async clearBuffered(): Promise<boolean> { return !!bridge()?.clearBufferedLocations?.(); },
  permissionState(): { foreground: string; background: string; precise: boolean } {
    return bgJson(bridge()?.getLocationPermissionState?.(), { foreground: 'denied', background: 'denied', precise: false });
  },
  /** Location, then "Allow all the time"; resolves with the state after both steps. */
  requestAlways(): Promise<{ foreground: string; background: string; precise: boolean; error?: string }> {
    const b = bridge();
    if (!b?.requestBackgroundLocation || !hasWin()) {
      return Promise.resolve({ foreground: 'denied', background: 'denied', precise: false, error: 'unsupported' });
    }
    return new Promise((resolve) => {
      const off = bgListen<{ foreground: string; background: string; precise: boolean; error?: string }>(
        'appmint:location-permission', (d) => { off(); resolve(d); });
      b.requestBackgroundLocation!();
    });
  },
  /** Live fixes (and `{type:'error', reason}`) while the page is there. Returns an unsubscribe. */
  onFix(cb: (d: LocationFix | { type: 'error'; reason: string; time: number }) => void): () => void {
    return bgListen('appmint:location', cb);
  },
};

/** Geofences that fire with the app closed and survive restarts. */
export const geofences = {
  available: (): Availability => (bridge()?.addGeofence ? 'native' : 'none'),
  /** Resolves when Play services accepted (or refused) the geofence. */
  add(spec: GeofenceSpec): Promise<BgResult> {
    const b = bridge();
    if (!b?.addGeofence || !hasWin()) return Promise.resolve(BG_UNSUPPORTED);
    const first = bgJson<BgResult>(b.addGeofence(JSON.stringify(spec)), { ok: false, reason: 'failed' });
    if (!first.ok) return Promise.resolve(first);
    return new Promise((resolve) => {
      const off = bgListen<BgResult & { id?: string }>('appmint:geofence-added', (d) => {
        if (d.id !== spec.id) return;
        off(); resolve(d);
      });
    });
  },
  async remove(id: string): Promise<boolean> { return !!bridge()?.removeGeofence?.(id); },
  async list(): Promise<GeofenceSpec[]> { return bgJson(bridge()?.getGeofences?.(), [] as GeofenceSpec[]); },
  /** The last 100 transitions, oldest first — including those that happened while the app was closed. */
  async events(): Promise<GeofenceEvent[]> { return bgJson(bridge()?.getGeofenceEvents?.(), [] as GeofenceEvent[]); },
  async clearEvents(): Promise<boolean> { return !!bridge()?.clearGeofenceEvents?.(); },
  onEvent(cb: (d: GeofenceEvent) => void): () => void { return bgListen('appmint:geofence', cb); },
};

/** The page's own code, run periodically with the app closed (a headless copy of the page). */
export const backgroundTasks = {
  available: (): Availability => (shell()?.background ? 'native' : 'none'),
  isBackgroundRun: (): boolean => !!shell()?.background?.isBackgroundRun(),
  currentRun: (): { name: string; runId: string } | null => shell()?.background?.currentRun() ?? null,
  async register(name: string, options: { intervalMinutes?: number; requiresNetwork?: boolean; requiresCharging?: boolean } = {}): Promise<BgResult> {
    const bg = shell()?.background;
    return bg ? (await bg.register(name, options)) as BgResult : BG_UNSUPPORTED;
  },
  async unregister(name: string): Promise<boolean> { return !!(await shell()?.background?.unregister(name)); },
  async list() { return (await shell()?.background?.list()) ?? []; },
  async runNow(name: string): Promise<BgResult> {
    const bg = shell()?.background;
    return bg ? (await bg.runNow(name)) as BgResult : BG_UNSUPPORTED;
  },
  async done(runId: string, result: { ok: boolean; retry?: boolean } = { ok: true }): Promise<boolean> {
    return !!(await shell()?.background?.done(runId, result));
  },
  /** Called once per background run, when the page has loaded (immediately if it already has). */
  onRun(cb: (run: { name: string; runId: string }) => void): void { shell()?.background?.onRun(cb); },
};

// ── motion (Capacitor shape) ─────────────────────────────────────────────────────────────────

export interface AccelEvent { acceleration: { x: number; y: number; z: number }; accelerationIncludingGravity: { x: number; y: number; z: number }; rotationRate: { alpha: number; beta: number; gamma: number }; interval: number }
export interface OrientationEvent { alpha: number; beta: number; gamma: number }

/**
 * `@capacitor/motion`'s shape over the standard DeviceMotion / DeviceOrientation events — the
 * plugin itself is web-only and does exactly this. iOS 13+ requires a user-gesture permission
 * request, which this makes on the first call. Returns a Capacitor-style remove handle.
 */
export const Motion = {
  async addListener(event: 'accel' | 'orientation', cb: (e: AccelEvent | OrientationEvent) => void): Promise<{ remove(): Promise<void> }> {
    if (!hasWin()) return { remove: async () => {} };
    const ctor = (event === 'accel' ? window.DeviceMotionEvent : window.DeviceOrientationEvent) as unknown as { requestPermission?(): Promise<string> } | undefined;
    if (ctor && typeof ctor.requestPermission === 'function') {
      try { if ((await ctor.requestPermission()) !== 'granted') return { remove: async () => {} }; }
      catch { return { remove: async () => {} }; }
    }
    const num = (v: number | null | undefined) => v ?? 0;
    const handler = event === 'accel'
      ? (e: Event) => {
        const m = e as DeviceMotionEvent;
        cb({
          acceleration: { x: num(m.acceleration?.x), y: num(m.acceleration?.y), z: num(m.acceleration?.z) },
          accelerationIncludingGravity: { x: num(m.accelerationIncludingGravity?.x), y: num(m.accelerationIncludingGravity?.y), z: num(m.accelerationIncludingGravity?.z) },
          rotationRate: { alpha: num(m.rotationRate?.alpha), beta: num(m.rotationRate?.beta), gamma: num(m.rotationRate?.gamma) },
          interval: m.interval ?? 0,
        });
      }
      : (e: Event) => { const o = e as DeviceOrientationEvent; cb({ alpha: num(o.alpha), beta: num(o.beta), gamma: num(o.gamma) }); };
    const type = event === 'accel' ? 'devicemotion' : 'deviceorientation';
    window.addEventListener(type, handler);
    return { remove: async () => window.removeEventListener(type, handler) };
  },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Popular-app feature layer (2026-09-05): keep awake, brightness, review, update, badge,
// dictation, haptic patterns, document scanner, system palette, live progress, widget, NFC,
// picture-in-picture, share target, notification actions, app lock
// ─────────────────────────────────────────────────────────────────────────────────────────────

// ── keep awake / brightness ──────────────────────────────────────────────────────────────────

let wakeLock: { release(): Promise<void> } | null = null;

/**
 * Stops the screen dimming while a recipe, a route, a QR code or a timer is on screen.
 * Native: the KeepAwake plugin. Web: the Screen Wake Lock API. Call `keepAwake(false)` on unmount.
 */
export async function keepAwake(on: boolean): Promise<boolean> {
  const cap = capPlugin<{ keepAwake(): Promise<void>; allowSleep(): Promise<void> }>('KeepAwake');
  if (cap) { try { await (on ? cap.keepAwake() : cap.allowSleep()); return true; } catch { return false; } }
  const wl = (nav() as unknown as { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } } | undefined)?.wakeLock;
  if (!wl) return false;
  try {
    if (on) { if (!wakeLock) wakeLock = await wl.request('screen'); }
    else if (wakeLock) { await wakeLock.release(); wakeLock = null; }
    return true;
  } catch { return false; }
}

/**
 * Screen brightness 0–1 for a boarding pass or QR screen; `brightness.restore()` when leaving.
 * Native only — a web page cannot drive the backlight, so `can('brightness')` is 'none' there.
 */
export const brightness = {
  /**
   * This app's brightness override, 0–1 — or -1 when the app is FOLLOWING THE SYSTEM level
   * (Android's "no override", the state before any `set()` and after `restore()`). It is not the
   * system level itself; no API reads that. Null where brightness cannot be read at all (the
   * web, or the plugin refused) — a separate answer, so -1 always means "following the system".
   */
  async get(): Promise<number | null> {
    const r = await withCap<{ getBrightness(): Promise<{ brightness?: number }> }, number | null>('ScreenBrightness', async (p) => {
      const v = (await p.getBrightness())?.brightness;
      return typeof v === 'number' ? (v < 0 ? -1 : v) : null;
    }).catch(() => null);
    return r ?? null;
  },
  async set(value: number): Promise<boolean> {
    const r = await withCap<{ setBrightness(o: { brightness: number }): Promise<void> }, boolean>('ScreenBrightness', async (p) => {
      await p.setBrightness({ brightness: Math.min(1, Math.max(0, value)) }); return true;
    }).catch(() => false);
    return r ?? false;
  },
  /** Back to the system level (Android: -1 means "follow the system"; iOS restores the saved level). */
  async restore(): Promise<void> {
    await withCap<{ setBrightness(o: { brightness: number }): Promise<void> }, void>('ScreenBrightness', (p) => p.setBrightness({ brightness: -1 })).catch(() => {});
  },
};

// ── store review / update ────────────────────────────────────────────────────────────────────

/** What a review request did: Play's sheet, or why there was none. */
export interface ReviewOutcome {
  /**
   * 'shown' — Play put its sheet up (it never says whether the user rated).
   * 'not_from_play' — this install did not come from Google Play; Play never shows the sheet then.
   * 'quota' — Play declined to show it now (its quota for this user, or they already reviewed).
   * 'error' — Play could not be asked (no Play Store, offline, Play's own error).
   * 'unavailable' — the web or a preview: there is no store here.
   */
  result: 'shown' | 'not_from_play' | 'quota' | 'error' | 'unavailable';
  /** True when `{ openStore: true }` opened the Play listing because the sheet did not show. */
  openedStore: boolean;
  message?: string;
}

/**
 * The store's own in-app rating sheet (Play In-App Review), reporting what happened. Ask after
 * a success moment, rarely. `{ openStore: true }` (only from a "Rate us" tap) opens the Play
 * listing when the sheet did not show; without it nothing ever leaves the app.
 */
export async function askForReview(options: { openStore?: boolean } = {}): Promise<ReviewOutcome> {
  const r = await withCap<{ requestReview(o?: { openStore?: boolean }): Promise<Partial<ReviewOutcome> | void> }, ReviewOutcome>('InAppReview', async (p) => {
    const res = (await p.requestReview({ openStore: !!options.openStore })) || {};
    return { result: (res.result as ReviewOutcome['result']) || 'shown', openedStore: !!res.openedStore, message: res.message };
  }).catch((e) => ({ result: 'error' as const, openedStore: false, message: String(e) }));
  return r ?? { result: 'unavailable', openedStore: false };
}

/**
 * The store's own in-app rating sheet. True only when Play actually showed it; false on the web,
 * for an install that did not come from Play, when Play declined (quota) or failed. Use
 * `askForReview()` to learn which.
 *
 * The shell's `rateApp` is deliberately NOT used: it leaves the app for the Play listing (not
 * the in-app sheet) and does nothing at all when the creator switched Rate App off.
 */
export async function requestReview(): Promise<boolean> {
  return (await askForReview()).result === 'shown';
}

export interface AppUpdateInfo {
  /** The installed version NAME, e.g. '2.3.1'. */
  currentVersion: string;
  /** iOS: the App Store's version name. Android: Play's version CODE as a string (Play gives no name). */
  availableVersion?: string;
  /** Android: the installed version code, to compare with `availableVersion`. */
  currentVersionCode?: string;
  /** The store's own verdict: a newer version is published for this device. */
  updateAvailable: boolean;
  /** Android: an in-place Play update can be started with `appUpdate.start()`. */
  inPlace: boolean;
}

/**
 * "A newer version is available": Play's in-app update through the AppUpdate plugin (downloads
 * and installs in place). Nothing on the web.
 */
export const appUpdate = {
  async check(): Promise<AppUpdateInfo | null> {
    const r = await withCap<{ getAppUpdateInfo(): Promise<Record<string, unknown>> }, AppUpdateInfo | null>('AppUpdate', async (p) => {
      const i = await p.getAppUpdateInfo();
      const current = String(i.currentVersionName ?? i.currentVersion ?? '');
      const available = i.availableVersionName ?? i.availableVersionCode;
      // The plugin's own verdict on BOTH platforms: 2 = UPDATE_AVAILABLE (Play's answer on
      // Android, the plugin's store-version comparison on iOS). The old fallback compared the
      // version NAME with Play's version CODE ('2.3.1' vs '42'), which differ whenever Play
      // answers — so every up-to-date app was told an update was waiting.
      const availability = Number(i.updateAvailability ?? 0);
      const updateAvailable = availability === 2;
      return {
        currentVersion: current,
        availableVersion: available != null && available !== '' ? String(available) : undefined,
        currentVersionCode: i.currentVersionCode != null ? String(i.currentVersionCode) : undefined,
        updateAvailable,
        inPlace: updateAvailable && platform() === 'android' && i.immediateUpdateAllowed !== false,
      };
    }).catch(() => null);
    return r ?? null;
  },
  /**
   * Android: runs Play's full-screen update and resolves true only when it completed — false when
   * the user cancelled, Play refused, or no update is available. iOS: opens the App Store listing
   * (true once it opened; the update itself happens in the App Store).
   */
  async start(): Promise<boolean> {
    const r = await withCap<{
      getAppUpdateInfo(): Promise<Record<string, unknown>>;
      performImmediateUpdate(): Promise<{ code?: number }>;
      openAppStore(o?: Record<string, unknown>): Promise<void>;
    }, boolean>('AppUpdate', async (p) => {
      if (platform() === 'android') {
        // Play needs a fresh update-info in this session before it will start the flow
        // (INFO_MISSING otherwise), so it is fetched here rather than trusted to an earlier check().
        await p.getAppUpdateInfo();
        // AppUpdateResultCode: 0 OK · 1 CANCELED · 2 FAILED · 3 NOT_AVAILABLE · 4 NOT_ALLOWED · 5 INFO_MISSING.
        // The call RESOLVES with the code on every outcome, so resolving is not success.
        return (await p.performImmediateUpdate())?.code === 0;
      }
      await p.openAppStore({}); return true;
    }).catch(() => false);
    return r ?? false;
  },
};

// ── badge ────────────────────────────────────────────────────────────────────────────────────

/** The unread count on the launcher icon. Exact on iOS; launcher-dependent on Android. */
export const badge = {
  async set(count: number): Promise<boolean> {
    const r = await withCap<{ set(o: { count: number }): Promise<void>; clear(): Promise<void>; requestPermissions(): Promise<{ display?: string }> }, boolean>('Badge', async (p) => {
      if (count <= 0) { await p.clear(); return true; }
      try { await p.requestPermissions(); } catch { /* Android needs none */ }
      await p.set({ count: Math.floor(count) }); return true;
    }).catch(() => false);
    if (r !== undefined) return r;
    // The Badging API (installed PWAs). Absent in a plain browser tab — can('badge') says 'none'.
    const w3c = nav() as unknown as { setAppBadge?(n?: number): Promise<void>; clearAppBadge?(): Promise<void> } | undefined;
    if (!w3c?.setAppBadge) return false;
    try { await (count <= 0 ? w3c.clearAppBadge!() : w3c.setAppBadge(Math.floor(count))); return true; }
    catch { return false; }
  },
  async clear(): Promise<void> { await badge.set(0); },
};

// ── one-time codes (WebOTP) ──────────────────────────────────────────────────────────────────

/**
 * Waits for the SMS one-time code for THIS app and returns it, or null when the user declined,
 * the wait timed out (five minutes) or `signal` aborted. Call it when the "enter the code" screen
 * opens, fill the field with the answer, and keep the field typeable — it is an accelerator, not
 * the only way in.
 *
 * The SMS must end with the WebOTP line naming this app's host: `@<host> #<code>` — in the
 * Android app the host is `appassets.androidplatform.net`, on the web it is the site's own
 * domain. Android shows Google's "allow this app to read this one message" sheet (no SMS
 * permission); can('otp') is 'none' on iOS, where `autocomplete="one-time-code"` on the input is
 * the platform's own mechanism.
 */
export async function readOtp(opts: { signal?: AbortSignal } = {}): Promise<string | null> {
  const creds = nav()?.credentials as unknown as { get(o: unknown): Promise<{ code?: string } | null> } | undefined;
  if (can('otp') === 'none' || !creds) throw new Error('appmint: one-time codes unavailable — check can("otp")');
  try {
    const c = await creds.get({ otp: { transport: ['sms'] }, signal: opts.signal });
    return c?.code ?? null;
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === 'AbortError' || name === 'InvalidStateError') return null;   // declined / aborted / timed out
    throw e;
  }
}

// ── copy an image ────────────────────────────────────────────────────────────────────────────

/**
 * Copies an image (a PNG/JPEG Blob, e.g. from canvas.toBlob) to the clipboard so it pastes into
 * WhatsApp, Gmail or Notes. Gate the control on can('clipboardImage').
 */
export async function copyImage(image: Blob): Promise<boolean> {
  if (platform() === 'ios') {
    const cap = capPlugin<{ write(o: { image: string }): Promise<void> }>('Clipboard');
    if (cap) {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(image);
      });
      try { await cap.write({ image: dataUrl }); return true; } catch { return false; }
    }
  }
  const c = nav()?.clipboard as unknown as { write?(items: unknown[]): Promise<void> } | undefined;
  const Item = hasWin() ? (window as unknown as { ClipboardItem?: new (i: Record<string, Blob>) => unknown }).ClipboardItem : undefined;
  if (!c?.write || !Item) return false;
  try { await c.write([new Item({ [image.type || 'image/png']: image })]); return true; } catch { return false; }
}

// ── dictation ────────────────────────────────────────────────────────────────────────────────

export interface SpeechOptions { lang?: string; partial?: boolean; prompt?: string }

interface SpeechPlugin {
  available(): Promise<{ available?: boolean }>;
  checkPermissions(): Promise<{ speechRecognition?: string }>;
  requestPermissions(): Promise<{ speechRecognition?: string }>;
  start(o: Record<string, unknown>): Promise<{ matches?: string[] }>;
  stop(): Promise<void>;
  addListener(e: string, h: (d: Record<string, unknown>) => void): Promise<{ remove(): Promise<void> }>;
}
type WebSpeechCtor = new () => {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: unknown) => void) | null; start(): void; stop(): void;
};
let webSpeech: InstanceType<WebSpeechCtor> | null = null;

/**
 * The open plugin session, if any. `wind()` = speech is over, deliver the final result (used by
 * 'stopped' and by speech.stop()); `abort()` = drop it silently (a new start()).
 */
let capSpeech: { wind(): void; abort(): void } | null = null;

/**
 * A partial-mode plugin session. The plugin resolves `start()` AT ONCE in partial mode and
 * delivers every result — the final one included — as `partialResults` events, then reports
 * `listeningState: stopped`. The old code removed its listener when `start()` resolved, i.e.
 * before a single word arrived, so partial dictation returned nothing on Android.
 *
 * The final result is the last text of the session: on Android it arrives just AFTER 'stopped'
 * (onResults follows onEndOfSpeech), on iOS just before it. So after 'stopped' the session waits
 * briefly; a result in that window is the final one, otherwise the last partial already was.
 */
async function capSpeechSession(cap: SpeechPlugin, onResult: (text: string, isFinal: boolean) => void): Promise<void> {
  capSpeech?.abort();
  let last = '';
  let stopped = false;
  let done = false;
  let timer = 0;
  const handles: Array<Promise<{ remove(): Promise<void> }>> = [];
  const end = (finalText: string | null) => {
    if (done) return;
    done = true;
    if (timer) window.clearTimeout(timer);
    handles.forEach((h) => void h.then((x) => x.remove()).catch(() => {}));
    if (capSpeech === session) capSpeech = null;
    if (finalText) onResult(finalText, true);
  };
  const wind = () => {
    if (stopped || done) return;
    stopped = true;
    timer = window.setTimeout(() => end(last), 1500);   // iOS: the last partial was the final
  };
  const session = { wind, abort: () => end(null) };
  capSpeech = session;
  handles.push(cap.addListener('partialResults', (d) => {
    const m = (d?.matches as string[] | undefined)?.[0];
    if (!m || done) return;
    if (stopped) { end(m); return; }                    // Android's final, after 'stopped'
    last = m;
    onResult(m, false);
  }));
  handles.push(cap.addListener('listeningState', (d) => { if (d?.status === 'stopped') wind(); }));
  await Promise.all(handles);
}

/**
 * Native dictation: SpeechRecognizer on Android, SFSpeechRecognizer on iOS, the Web Speech API
 * in Chrome. `start()` listens until `stop()` (or the platform's own silence timeout) and calls
 * `onResult(text, isFinal)` as words arrive when `partial` is on. Neither WebView has the Web
 * Speech API, so before the plugin this only worked on the website build.
 */
export const speech = {
  async isAvailable(): Promise<boolean> {
    const r = await withCap<SpeechPlugin, boolean>('SpeechRecognition', async (p) => !!(await p.available())?.available).catch(() => false);
    if (r !== undefined) return r;
    return can('speech') !== 'none';
  },
  async start(onResult: (text: string, isFinal: boolean) => void, opts: SpeechOptions = {}): Promise<boolean> {
    const cap = capPlugin<SpeechPlugin>('SpeechRecognition');
    if (cap) {
      try {
        let s = (await cap.checkPermissions())?.speechRecognition;
        if (s !== 'granted') s = (await cap.requestPermissions())?.speechRecognition;
        if (s !== 'granted') return false;
        const partial = opts.partial !== false;
        if (partial) await capSpeechSession(cap, onResult);
        else capSpeech?.abort();
        cap.start({ language: opts.lang ?? nav()?.language ?? 'en-US', partialResults: partial, popup: false, prompt: opts.prompt })
          // Non-partial: the call itself resolves with the final matches. Partial: it resolved at
          // once with nothing, and the session above delivers everything.
          .then((r) => { const m = r?.matches?.[0]; if (!partial && m) onResult(m, true); })
          // A recognizer error (no match, busy, network) ends the session with what was heard.
          .catch(() => { capSpeech?.wind(); });
        return true;
      } catch { return false; }
    }
    const Ctor = (hasWin() ? ((window as unknown as { SpeechRecognition?: WebSpeechCtor; webkitSpeechRecognition?: WebSpeechCtor }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: WebSpeechCtor }).webkitSpeechRecognition) : undefined);
    if (!Ctor) return false;
    const rec = new Ctor();
    rec.lang = opts.lang ?? nav()?.language ?? 'en-US';
    rec.continuous = true;
    rec.interimResults = opts.partial !== false;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      if (last) onResult(last[0].transcript, last.isFinal);
    };
    rec.onend = () => { if (webSpeech === rec) webSpeech = null; };
    rec.onerror = () => { if (webSpeech === rec) webSpeech = null; };
    webSpeech = rec;
    try { rec.start(); return true; } catch { webSpeech = null; return false; }
  },
  async stop(): Promise<void> {
    const cap = capPlugin<SpeechPlugin>('SpeechRecognition');
    if (cap) {
      await cap.stop().catch(() => {});
      // The user stopped: what was heard so far becomes the final result (Android may still
      // deliver a last recognition just after stopping — the session's grace window takes it).
      capSpeech?.wind();
      return;
    }
    webSpeech?.stop(); webSpeech = null;
  },
};

// ── haptic patterns ──────────────────────────────────────────────────────────────────────────

export interface HapticEvent { at: number; duration?: number; intensity?: number; sharpness?: number }
export type HapticPattern = 'success-ramp' | 'heartbeat' | 'tick-tick-thud' | 'drum-roll' | 'nudge' | HapticEvent[];

/** Named patterns, in ms. Shared by the CoreHaptics and VibrationEffect halves. */
const HAPTIC_PATTERNS: Record<string, HapticEvent[]> = {
  'success-ramp': [{ at: 0, intensity: 0.4, sharpness: 0.3 }, { at: 90, intensity: 0.7, sharpness: 0.5 }, { at: 180, intensity: 1, sharpness: 0.8 }],
  'heartbeat': [{ at: 0, intensity: 0.8, sharpness: 0.4 }, { at: 140, intensity: 0.5, sharpness: 0.3 }, { at: 700, intensity: 0.8, sharpness: 0.4 }, { at: 840, intensity: 0.5, sharpness: 0.3 }],
  'tick-tick-thud': [{ at: 0, intensity: 0.4, sharpness: 0.9 }, { at: 120, intensity: 0.4, sharpness: 0.9 }, { at: 260, intensity: 1, duration: 90, sharpness: 0.2 }],
  'drum-roll': Array.from({ length: 8 }, (_, i) => ({ at: i * 45, intensity: 0.3 + i * 0.09, sharpness: 0.7 })),
  'nudge': [{ at: 0, intensity: 0.6, duration: 120, sharpness: 0.2 }],
};

/**
 * Rich haptics — the Apple Pay "success", a Duolingo streak, a game hit. Named patterns or your
 * own events `{at, duration?, intensity?, sharpness?}`. CoreHaptics on iOS, VibrationEffect
 * compositions on Android, a timed `navigator.vibrate` pattern on the web (intensity is lost
 * there, timing is not). Extends `haptic()` — use that for taps, this for moments.
 */
export async function hapticPlay(pattern: HapticPattern): Promise<boolean> {
  const events = typeof pattern === 'string' ? HAPTIC_PATTERNS[pattern] : pattern;
  if (!events?.length) return false;
  const r = await withCap<{ play(o: { events: HapticEvent[] }): Promise<{ ok?: boolean }> }, boolean>('AppwrightHaptics', async (p) => (await p.play({ events }))?.ok !== false).catch(() => false);
  if (r !== undefined) return r;
  // W3C vibrate order — buzz, pause, buzz, … — which navigator.vibrate takes by spec and the
  // shell's vibratePattern converts to Android's wait-first waveform itself. A pattern whose
  // first event is not at 0 starts with a zero-length buzz and the wait.
  const timeline: number[] = [];
  let cursor = 0;
  for (const e of [...events].sort((x, y) => x.at - y.at)) {
    const on = e.duration && e.duration >= 20 ? e.duration : 30;
    const gap = Math.max(0, e.at - cursor);
    if (timeline.length) timeline.push(gap);
    else if (gap > 0) timeline.push(0, gap);
    timeline.push(on);
    cursor = e.at + on;
  }
  const b = bridge();
  if (b?.vibratePattern) { b.vibratePattern(JSON.stringify(timeline)); return true; }
  const n = nav();
  if (n && 'vibrate' in n) { try { return n.vibrate(timeline); } catch { return false; } }
  return false;
}
haptic.play = hapticPlay;

// ── document scanner ─────────────────────────────────────────────────────────────────────────

export interface ScanResult {
  pages: string[];
  /** The PDF as a data URL (`data:application/pdf;base64,…`) — download it, upload it or show it in an `<iframe>`. Only with `pdf: true`. */
  pdfDataUrl?: string;
  /** The PDF's cache-file path on the device (iOS-shaped; a page cannot load it — use pdfDataUrl). */
  pdfPath?: string;
  /** Set instead of pdfDataUrl when the PDF was asked for but could not be read; the pages are still good. */
  pdfError?: string;
}

/**
 * The OS document scanner — edge detection, deskew, multi-page — ML Kit on Android, VisionKit
 * on iOS. Returns JPEG data URLs (and, with `pdf: true`, the PDF as `pdfDataUrl` — or `pdfError` when it could not be read). Null on cancel. No web rung:
 * `can('docScanner')` is 'none' there; use `camera.take()` for a plain photo.
 */
export const docScanner = {
  /**
   * Whether THIS device can scan: Google Play services on Android (the scanner module ships with
   * it), VisionKit's document camera on iOS. `can('docScanner')` only says the plugin is in the
   * build; this asks the device. False on the web.
   */
  async isSupported(): Promise<boolean> {
    const r = await withCap<{ isSupported(): Promise<{ value?: boolean }> }, boolean>('AppwrightDocScanner',
      async (p) => !!(await p.isSupported())?.value).catch(() => false);
    return r ?? false;
  },
  async scan(opts: { pageLimit?: number; pdf?: boolean; quality?: number } = {}): Promise<ScanResult | null> {
    const r = await withCap<{ scan(o: Record<string, unknown>): Promise<{ ok?: boolean; pages?: string[]; pdfPath?: string; pdfDataUrl?: string; pdfError?: string }> }, ScanResult | null>('AppwrightDocScanner', async (p) => {
      const res = await p.scan({ pageLimit: opts.pageLimit ?? 0, pdf: !!opts.pdf, quality: opts.quality ?? 0.85 });
      if (!res?.ok) return null;
      const out: ScanResult = { pages: res.pages ?? [] };
      if (res.pdfDataUrl) out.pdfDataUrl = res.pdfDataUrl;
      if (res.pdfPath) out.pdfPath = res.pdfPath;
      if (res.pdfError) out.pdfError = res.pdfError;
      return out;
    }).catch(() => null);
    return r ?? null;
  },
};

// ── system palette (Material You) ────────────────────────────────────────────────────────────

export interface SystemPalette { available: boolean; accent1?: Record<string, string>; accent2?: Record<string, string>; accent3?: Record<string, string>; neutral1?: Record<string, string>; neutral2?: Record<string, string> }

/**
 * The wallpaper-derived palette on Android 12+: tones 0–1000 per swatch as hex. Feed
 * `accent1['600']` into `--accent` and the app follows the user's wallpaper like the system apps
 * do. `{available:false}` everywhere else — iOS exposes no wallpaper colours.
 */
export async function systemPalette(): Promise<SystemPalette> {
  const r = await withCap<{ get(): Promise<SystemPalette> }, SystemPalette>('AppwrightSystemPalette', (p) => p.get()).catch(() => ({ available: false }));
  return r ?? { available: false };
}

// ── live progress ────────────────────────────────────────────────────────────────────────────

export interface LiveProgressInput {
  id?: string; title: string; text?: string;
  /** 0–1 for a bar; omit for none. */
  progress?: number;
  indeterminate?: boolean;
  /** Epoch ms: shows a running chronometer from that moment. */
  startedAt?: number;
  /** Route to open when tapped. */
  route?: string;
}

async function liveProgressCall(op: 'start' | 'update', input: LiveProgressInput): Promise<boolean> {
  let why = 'unavailable';
  const r = await withCap<Record<'start' | 'update', (o: Record<string, unknown>) => Promise<{ ok?: boolean; error?: string }>>, boolean>('AppwrightLiveProgress', async (p) => {
    const res = await p[op]({ ...input });
    if (res?.ok === false) { why = res.error || 'failed'; return false; }
    why = '';
    return true;
  }).catch(() => { why = 'failed'; return false; });
  liveProgress.lastError = r ? '' : why;
  return r ?? false;
}

/**
 * An ongoing status card for a delivery, a timer, a workout: the Android live notification
 * (sticky, silent, updated in place). iOS Live Activities need an extension target the scaffold
 * does not carry, so `can('liveProgress')` is 'none' there — render the same state in-app.
 */
export const liveProgress = {
  /**
   * Why the last start()/update() returned false, '' after a success:
   *   'permission' — notifications are not allowed (ask with Notification.requestPermission(), then retry) ·
   *   'channel_disabled' — the user turned this app's live-progress channel off in system settings
   *     (only they can turn it back on, in system settings) ·
   *   'unavailable' — no live-progress plugin on this surface · 'failed' — anything else.
   */
  lastError: '' as '' | 'permission' | 'channel_disabled' | 'unavailable' | 'failed' | string,
  async start(input: LiveProgressInput): Promise<boolean> {
    return liveProgressCall('start', input);
  },
  async update(input: LiveProgressInput): Promise<boolean> {
    return liveProgressCall('update', input);
  },
  async end(id = 'live'): Promise<void> {
    await withCap<{ end(o: { id: string }): Promise<void> }, void>('AppwrightLiveProgress', (p) => p.end({ id })).catch(() => {});
  },
};

// ── home-screen widget ───────────────────────────────────────────────────────────────────────

export interface WidgetCard {
  title?: string; value?: string; lines?: string[]; route?: string;
  /** Hex colours; default to the app's tokens. */
  bg?: string; ink?: string; accent?: string;
}

/**
 * One generic home-screen card the page fills — a title, a big value, up to six lines, a tap route.
 * Android widgets (persisted; survives reboot; the user places it from the launcher's widget
 * picker, or `widget.requestPin()` opens that flow). iOS WidgetKit needs an extension target the
 * scaffold does not carry, so `can('widget')` is 'none' there.
 */
export const widget = {
  async set(card: WidgetCard): Promise<boolean> {
    const r = await withCap<{ set(o: Record<string, unknown>): Promise<{ ok?: boolean }> }, boolean>('AppwrightWidget', async (p) => (await p.set({
      title: card.title ?? '', value: card.value ?? '', lines: (card.lines ?? []).slice(0, 6), route: card.route ?? '/',
      bg: card.bg ?? token('--bg', ''), ink: card.ink ?? token('--ink', ''), accent: card.accent ?? token('--accent', ''),
    }))?.ok !== false).catch(() => false);
    return r ?? false;
  },
  async clear(): Promise<void> { await withCap<{ clear(): Promise<void> }, void>('AppwrightWidget', (p) => p.clear()).catch(() => {}); },
  async placedCount(): Promise<number> {
    const r = await withCap<{ placedCount(): Promise<{ value?: number }> }, number>('AppwrightWidget', async (p) => (await p.placedCount())?.value ?? 0).catch(() => 0);
    return r ?? 0;
  },
  /** Opens the launcher's "add this widget" sheet (Android 8+). */
  async requestPin(): Promise<boolean> {
    const r = await withCap<{ requestPin(): Promise<{ value?: boolean }> }, boolean>('AppwrightWidget', async (p) => !!(await p.requestPin())?.value).catch(() => false);
    return r ?? false;
  },
};

// ── NFC (iOS: NDEFReader over the AppwrightNfc plugin) ───────────────────────────────────────

interface NfcPlugin {
  isSupported(): Promise<{ value?: boolean }>;
  scan(o: { message?: string }): Promise<{ ok?: boolean }>;
  stop(): Promise<void>;
  write(o: { records: Array<Record<string, unknown>>; message?: string }): Promise<{ ok?: boolean; error?: string; cancelled?: boolean }>;
  addListener(e: string, h: (d: Record<string, unknown>) => void): Promise<{ remove(): Promise<void> }>;
}

/**
 * Installs Web NFC's `NDEFReader` over the AppwrightNfc plugin on iOS, so the same `new
 * NDEFReader().scan()` / `.write()` code the Android shell's polyfill and Chrome accept runs on
 * iPhone. `reading` events carry `{serialNumber, message:{records:[{recordType, mediaType,
 * data: DataView, encoding, lang}]}}`. Installed once at import, iOS only.
 */
function installIosWebNfc(): void {
  if (!hasWin() || platform() !== 'ios' || 'NDEFReader' in window) return;
  const plugin = capPlugin<NfcPlugin>('AppwrightNfc');
  if (!plugin) return;

  class IosNDEFReader extends BleEmitter {
    private handles: Array<Promise<{ remove(): Promise<void> }>> = [];
    onreading: ((e: Event) => void) | null = null;
    onreadingerror: ((e: Event) => void) | null = null;
    async scan(): Promise<void> {
      this.handles.push(plugin!.addListener('tag', (d) => {
        const records = ((d?.records as Array<Record<string, unknown>>) ?? []).map((r) => ({
          recordType: r.recordType, mediaType: r.mediaType, encoding: r.encoding, lang: r.lang,
          data: new DataView(b64ToBytes(String(r.data ?? '')).buffer),
        }));
        const e = bleEvent('reading', this) as Event & { message?: unknown; serialNumber?: string };
        e.message = { records }; e.serialNumber = String(d?.serialNumber ?? '');
        this.dispatchEvent(e);
      }));
      this.handles.push(plugin!.addListener('error', () => this.dispatchEvent(bleEvent('readingerror', this))));
      const r = await plugin!.scan({});
      if (!r?.ok) throw domError('NotSupportedError', 'NFC reading is not available on this device');
    }
    async write(message: string | { records: Array<{ recordType?: string; mediaType?: string; data?: unknown; lang?: string }> }): Promise<void> {
      const records = typeof message === 'string'
        ? [{ recordType: 'text', data: utf8ToB64(message), lang: 'en' }]
        : message.records.map((r) => ({
          recordType: r.recordType ?? 'text', mediaType: r.mediaType, lang: r.lang,
          data: typeof r.data === 'string' ? utf8ToB64(r.data)
            : r.data instanceof ArrayBuffer ? bytesToB64(new Uint8Array(r.data))
            : ArrayBuffer.isView(r.data) ? bytesToB64(new Uint8Array((r.data as ArrayBufferView).buffer as ArrayBuffer, (r.data as ArrayBufferView).byteOffset, (r.data as ArrayBufferView).byteLength))
            : '',
        }));
      const res = await plugin!.write({ records });
      if (!res?.ok) throw domError(res?.cancelled ? 'AbortError' : 'NetworkError', res?.error || 'NFC write failed');
    }
    async stop(): Promise<void> {
      for (const h of this.handles) void h.then((x) => x.remove()).catch(() => {});
      this.handles = [];
      await plugin!.stop().catch(() => {});
    }
  }
  (window as unknown as { NDEFReader: unknown }).NDEFReader = IosNDEFReader;
}
installIosWebNfc();

/** URI record prefixes (NFC Forum URI RTD, identifier codes 0x00–0x23). */
const NDEF_URI_PREFIX = ['', 'http://www.', 'https://www.', 'http://', 'https://', 'tel:', 'mailto:',
  'ftp://anonymous:anonymous@', 'ftp://ftp.', 'ftps://', 'sftp://', 'smb://', 'nfs://', 'ftp://', 'dav://',
  'news:', 'telnet://', 'imap:', 'rtsp://', 'urn:', 'pop:', 'sip:', 'sips:', 'tftp:', 'btspp://',
  'btl2cap://', 'btgoep://', 'tcpobex://', 'irdaobex://', 'file://', 'urn:epc:id:', 'urn:epc:tag:',
  'urn:epc:pat:', 'urn:epc:raw:', 'urn:epc:', 'urn:nfc:'];

/** Web NFC's own recordType names — a record carrying one of these is already decoded. */
const W3C_RECORD_TYPES = new Set(['empty', 'text', 'url', 'absolute-url', 'mime', 'smart-poster', 'unknown']);

interface RawNdefRecord { recordType?: string; mediaType?: string | null; data?: DataView; encoding?: string; lang?: string }

/**
 * One record as `nfc.scan` reports it: the Web NFC record type and its text.
 *
 * Chrome's reader and the iOS plugin already hand over Web NFC records. The Android shell's
 * polyfill hands over the RAW NDEF record — `recordType` is the base64 of the type bytes ('VA=='
 * for a text record) and `data` the whole payload, status byte and language code included — so
 * a text tag read as recordType 'VA==' with text like '\u0002enHello'. Those are decoded here per
 * the NFC Forum RTDs: 'T' → text (language stripped, UTF-8/UTF-16 honoured), 'U' → url (prefix
 * code expanded), a MIME record → 'mime', an external type → its 'domain:type' name.
 */
function ndefRecord(r: RawNdefRecord): { recordType: string; text: string; mediaType?: string } {
  const type = String(r.recordType ?? '');
  const bytes = r.data ? new Uint8Array(r.data.buffer, r.data.byteOffset, r.data.byteLength) : new Uint8Array(0);
  const utf8 = (u: Uint8Array) => new TextDecoder('utf-8').decode(u);
  const w3c = W3C_RECORD_TYPES.has(type) || (type.includes(':') && !/^[A-Za-z0-9+/]+=*$/.test(type)) || type.startsWith(':');
  if (w3c) {
    const text = r.data ? new TextDecoder(r.encoding || 'utf-8').decode(bytes) : '';
    return { recordType: type, text, mediaType: r.mediaType ?? undefined };
  }
  let typeName = '';
  try { typeName = utf8(b64ToBytes(type)); } catch { typeName = type; }
  if (r.mediaType) {
    return { recordType: 'mime', mediaType: typeName || undefined, text: utf8(bytes) };
  }
  if (typeName === 'T' && bytes.length) {
    const status = bytes[0];
    const langLen = status & 0x3f;
    const body = bytes.subarray(1 + langLen);
    return { recordType: 'text', text: new TextDecoder(status & 0x80 ? 'utf-16be' : 'utf-8').decode(body) };
  }
  if (typeName === 'U' && bytes.length) {
    return { recordType: 'url', text: (NDEF_URI_PREFIX[bytes[0]] ?? '') + utf8(bytes.subarray(1)) };
  }
  if (typeName === 'Sp') return { recordType: 'smart-poster', text: '' };
  if (!typeName && !bytes.length) return { recordType: 'empty', text: '' };
  return { recordType: typeName.includes(':') ? typeName : 'unknown', text: utf8(bytes) };
}

/** `nfc.*`: the same capability as `new NDEFReader()`, as one-call helpers. */
export const nfc = {
  async isSupported(): Promise<boolean> {
    if (!hasWin() || !('NDEFReader' in window)) return false;
    const cap = capPlugin<NfcPlugin>('AppwrightNfc');
    if (cap) { try { return !!(await cap.isSupported())?.value; } catch { return false; } }
    return true;
  },
  /**
   * Reads tags until the returned stop function is called. `onTag` gets each record as
   * `{recordType, text, mediaType?}` — Web NFC's type names ('text', 'url', 'mime', …) and the
   * decoded text (a text record's language prefix removed, a URL record's prefix expanded) on
   * every surface.
   *
   * Stopping ends the delivery to `onTag` everywhere, and ends the reading itself in Chrome
   * (AbortSignal) and on iOS (the session closes). The Android shell keeps its NFC dispatch on
   * while the app is in front — tags keep landing in the app instead of opening another one —
   * but none reach `onTag` after stop.
   */
  async scan(onTag: (records: Array<{ recordType: string; text: string; mediaType?: string }>) => void): Promise<() => Promise<void>> {
    if (!hasWin() || !('NDEFReader' in window)) throw new Error('appmint: NFC unavailable — check can("nfc")');
    const Reader = (window as unknown as { NDEFReader: new () => {
      scan(o?: { signal?: AbortSignal }): Promise<void>; stop?(): Promise<void>;
      addEventListener(t: string, h: (e: Event) => void): void; removeEventListener(t: string, h: (e: Event) => void): void;
    } }).NDEFReader;
    const reader = new Reader();
    let active = true;
    const onReading = (e: Event) => {
      if (!active) return;
      const msg = (e as Event & { message?: { records?: RawNdefRecord[] } }).message;
      onTag((msg?.records ?? []).map(ndefRecord));
    };
    reader.addEventListener('reading', onReading);
    const abort = typeof AbortController === 'function' ? new AbortController() : null;
    await reader.scan(abort ? { signal: abort.signal } : undefined);
    return async () => {
      if (!active) return;
      active = false;
      reader.removeEventListener('reading', onReading);
      abort?.abort();                // Web NFC's own stop (Chrome)
      await reader.stop?.();         // the iOS reader closes its session
    };
  },
  async write(text: string): Promise<boolean> {
    if (!hasWin() || !('NDEFReader' in window)) return false;
    const Reader = (window as unknown as { NDEFReader: new () => { write(m: string): Promise<void> } }).NDEFReader;
    try { await new Reader().write(text); return true; } catch { return false; }
  },
};

// ── picture-in-picture ───────────────────────────────────────────────────────────────────────

/**
 * Keeps a video playing in a floating window when the user leaves. Android: the whole app
 * shrinks to PiP (needs the build's PiP option, armed from this call). iOS and the web: the
 * media element's own PiP. Pass the `<video>`; on Android it is ignored.
 */
export const pip = {
  async enter(video?: HTMLVideoElement): Promise<boolean> {
    const b = bridge();
    if (b?.enterPip) return b.enterPip() ?? false;
    if (!video) return false;
    const v = video as HTMLVideoElement & { webkitSetPresentationMode?(m: string): void; webkitSupportsPresentationMode?: boolean };
    try {
      if (typeof v.requestPictureInPicture === 'function') { await v.requestPictureInPicture(); return true; }
      if (v.webkitSupportsPresentationMode && typeof v.webkitSetPresentationMode === 'function') { v.webkitSetPresentationMode('picture-in-picture'); return true; }
    } catch { /* not playing yet, or refused */ }
    return false;
  },
  async exit(video?: HTMLVideoElement): Promise<void> {
    if (typeof document === 'undefined') return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      const v = video as (HTMLVideoElement & { webkitSetPresentationMode?(m: string): void }) | undefined;
      v?.webkitSetPresentationMode?.('inline');
    } catch { /* already inline */ }
  },
};

// ── share target ─────────────────────────────────────────────────────────────────────────────

export interface SharedPayload { text: string; subject: string; url: string; receivedAt: number }

/**
 * Text or a link another app shared INTO this one ("Share to <app>"). `sharedText()` returns the
 * pending share (kept until `clearShared()`), `onShared` fires for a share arriving while the app
 * is open. Android (the build's share-sheet entry is armed from this call); iOS needs a Share
 * Extension target the scaffold does not carry, so `can('shareTarget')` is 'none' there.
 */
export function sharedText(): SharedPayload | null {
  const raw = bridge()?.getSharedText?.();
  if (!raw) return null;
  try { return JSON.parse(raw) as SharedPayload; } catch { return null; }
}
export function clearShared(): void { bridge()?.clearSharedText?.(); }
export function onShared(cb: (p: SharedPayload) => void): () => void {
  if (!hasWin() || !bridge()?.getSharedText) return () => {};
  const h = (e: Event) => { const d = (e as CustomEvent<SharedPayload>).detail; if (d?.text != null) cb(d); };
  window.addEventListener('appmint:shared', h);
  return () => window.removeEventListener('appmint:shared', h);
}

// ── notification actions ─────────────────────────────────────────────────────────────────────

export interface NotificationAction {
  id: string; title: string;
  /**
   * NOT SUPPORTED in classic AppMint: the shell's notifications have no inline reply field, so
   * this is ignored and the button is a plain button. Kept only so code shared with Appwright
   * compiles.
   */
  input?: boolean | string;
}
/** `text` is always '' in classic AppMint — there is no inline reply to carry. */
export interface NotificationActionEvent { actionId: string; tag: string; text: string }

/**
 * A notification with buttons — "Mark done", "Snooze", "Open". The shell's notification bridge,
 * at most three buttons. The tap arrives through `onNotificationAction`. There is NO inline reply
 * in classic AppMint: an action's `input` is ignored and the event's `text` is always ''.
 *
 * App-only: `can('notificationActions')` is 'none' on the web. A page notification has no
 * buttons a page can hear (they belong to a service worker), so on the web this posts the plain
 * `notify()` — title, body, icon — WITHOUT the actions. Asks for the notification permission
 * first, like `notify()`, and resolves false when it is refused.
 */
export async function notifyWithActions(input: NotifyInput & { actions: NotificationAction[] }): Promise<boolean> {
  const b = bridge();
  if (b?.notify) {
    // NotificationBridge reads each button's text from `label` — this API calls it `title`, and
    // passing it through unrenamed drew every button with its id ("reply") instead of "Reply".
    const actions = input.actions.map((a) => ({ id: a.id, label: a.title }));
    return shellNotify(b, input, { actions });
  }
  const cap = capPlugin<LocalNotificationsPlugin & {
    registerActionTypes(o: { types: Array<{ id: string; actions: Array<Record<string, unknown>> }> }): Promise<void>;
  }>('LocalNotifications');
  if (cap) {
    const typeId = `appwright-${input.tag || input.actions.map((a) => a.id).join('-')}`;
    try {
      await cap.registerActionTypes({ types: [{ id: typeId, actions: input.actions.map((a) => ({
        id: a.id, title: a.title, input: !!a.input, inputPlaceholder: typeof a.input === 'string' ? a.input : undefined, inputButtonTitle: 'Send',
      })) }] });
    } catch { return false; }
    return capNotify(cap, { ...input, tag: input.tag }, typeId);
  }
  return notify(input);
}

export function onNotificationAction(cb: (e: NotificationActionEvent) => void): () => void {
  if (!hasWin()) return () => {};
  if (bridge()?.notify) {
    const h = (e: Event) => { const d = (e as CustomEvent<NotificationActionEvent>).detail; if (d?.actionId != null) cb(d); };
    window.addEventListener('appmint:notification-action', h);
    return () => window.removeEventListener('appmint:notification-action', h);
  }
  const cap = capPlugin<{ addListener(e: string, h: (d: Record<string, unknown>) => void): Promise<{ remove(): Promise<void> }> }>('LocalNotifications');
  if (cap) {
    const p = cap.addListener('localNotificationActionPerformed', (d) => cb({
      actionId: String(d?.actionId ?? ''), tag: String((d?.notification as { extra?: { tag?: string } } | undefined)?.extra?.tag ?? ''), text: String(d?.inputValue ?? ''),
    }));
    return () => { void p.then((h) => h.remove()).catch(() => {}); };
  }
  return () => {};
}

/** A tap on a notification this app posted (`notify({tag})`, `new Notification(…)`). */
export interface NotificationClickEvent { tag: string; title: string; body: string; data: unknown }

/**
 * Runs `cb` when the user taps one of this app's notifications — including the tap that
 * launched the app from cold (delivered once the page exists, through the unlock screen when the
 * app has a PIN). Android: the shell carries the tag, text and `data` of the tapped notification.
 * iOS: the LocalNotifications plugin's tap. Web: 'none' (the browser's own `click` on the
 * Notification object is the web path). Returns the unsubscribe function.
 */
export function onNotificationClick(cb: (e: NotificationClickEvent) => void): () => void {
  if (!hasWin()) return () => {};
  if (bridge()?.notify) {
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ tag?: string; title?: string; body?: string; data?: string }>).detail;
      if (!d?.tag) return;
      let data: unknown = null;
      if (typeof d.data === 'string') { try { data = JSON.parse(d.data); } catch { data = null; } }
      cb({ tag: d.tag, title: d.title ?? '', body: d.body ?? '', data });
    };
    window.addEventListener('appmint:notification-click', h);
    return () => window.removeEventListener('appmint:notification-click', h);
  }
  const cap = capPlugin<{ addListener(e: string, h: (d: Record<string, unknown>) => void): Promise<{ remove(): Promise<void> }> }>('LocalNotifications');
  if (cap) {
    const p = cap.addListener('localNotificationActionPerformed', (d) => {
      if (d?.actionId !== 'tap') return;
      const n = d?.notification as { title?: string; body?: string; extra?: { tag?: string; data?: unknown } } | undefined;
      cb({ tag: String(n?.extra?.tag ?? ''), title: n?.title ?? '', body: n?.body ?? '', data: n?.extra?.data ?? null });
    });
    return () => { void p.then((h) => h.remove()).catch(() => {}); };
  }
  return () => {};
}

// ── flashlight ───────────────────────────────────────────────────────────────────────────────

/**
 * The phone's flashlight (Android; `can('torch')`). No permission. While the app's own camera
 * stream is open the camera owns the flash — `on()` then rejects with code 'CAMERA_IN_USE'; light
 * a live viewfinder with `track.applyConstraints({advanced:[{torch:true}]})` instead. iOS and the
 * web: 'none' — do not render the control. The light is switched off when the app closes.
 */
export const torch = {
  async isAvailable(): Promise<boolean> {
    const r = await withCap<{ isAvailable(): Promise<{ available?: boolean }> }, boolean>('Torch', async (p) => !!(await p.isAvailable())?.available).catch(() => false);
    return r ?? false;
  },
  async isOn(): Promise<boolean> {
    const r = await withCap<{ isEnabled(): Promise<{ enabled?: boolean }> }, boolean>('Torch', async (p) => !!(await p.isEnabled())?.enabled).catch(() => false);
    return r ?? false;
  },
  /** Rejects (Error with `code`) when the light could not be switched — never a silent no-op. */
  async on(): Promise<void> {
    const p = capPlugin<{ enable(): Promise<void> }>('Torch');
    if (!p) throw codedError('unavailable', 'no flashlight here — check can("torch")');
    await p.enable();
  },
  async off(): Promise<void> {
    const p = capPlugin<{ disable(): Promise<void> }>('Torch');
    if (!p) throw codedError('unavailable', 'no flashlight here — check can("torch")');
    await p.disable();
  },
  async toggle(): Promise<boolean> {
    const p = capPlugin<{ toggle(): Promise<void>; isEnabled(): Promise<{ enabled?: boolean }> }>('Torch');
    if (!p) throw codedError('unavailable', 'no flashlight here — check can("torch")');
    await p.toggle();
    return !!(await p.isEnabled())?.enabled;
  },
};

// ── save to gallery ──────────────────────────────────────────────────────────────────────────

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}

/**
 * Saves a photo or video into the phone's gallery (Android, `can('gallery') === 'native'`):
 * Pictures/<album> or Movies/<album>, no permission on Android 10+. `source` is a Blob, a
 * `data:` URL or an http(s) URL. Resolves the saved item's URI. On the web ('web') the file is
 * downloaded — the browser's own "keep this" path — and the promise resolves ''. Rejects with an
 * Error carrying `code` ('permission-denied', 'download-failed', 'bad-source', 'failed').
 */
export async function saveToGallery(source: Blob | string,
  opts: { fileName?: string; album?: string; kind?: 'image' | 'video' } = {}): Promise<string> {
  const src = typeof source === 'string' ? source : await blobToDataUrl(source);
  const p = capPlugin<{ save(o: Record<string, unknown>): Promise<{ uri?: string }> }>('AppwrightGallery');
  if (p) {
    try {
      return (await p.save({ source: src, fileName: opts.fileName, album: opts.album, kind: opts.kind }))?.uri ?? '';
    } catch (e) {
      const code = String((e as { code?: string })?.code ?? 'failed');
      throw codedError(code, String((e as Error)?.message ?? e));
    }
  }
  if (platform() !== 'web' || typeof document === 'undefined') throw codedError('unavailable', 'no gallery here — check can("gallery")');
  const a = document.createElement('a');
  a.href = src;
  a.download = opts.fileName || (opts.kind === 'video' ? 'video.mp4' : 'image.png');
  document.body.appendChild(a); a.click(); a.remove();
  return '';
}

// ── text recognition (OCR) ───────────────────────────────────────────────────────────────────

export interface TextBox { x: number; y: number; w: number; h: number }
export interface RecognizedLine { text: string; box: TextBox }
export interface RecognizedBlock { text: string; box: TextBox; lines: RecognizedLine[] }
export interface RecognizedText { text: string; blocks: RecognizedBlock[] }

/**
 * Reads the text in an image — a receipt, a label, a business card — on the device
 * (`can('ocr')`): ML Kit's Latin-script recognizer in the Android app (the model comes from Play
 * services, so the first call on a fresh phone can take a few seconds longer), Chrome's
 * TextDetector where it is enabled. `image` is an <img> (loaded), <canvas>, <video>, ImageBitmap
 * or Blob. Boxes are in the image's pixels. Latin scripts only on Android (no Chinese,
 * Devanagari, Japanese, Korean or Arabic). Rejects when recognition fails; iOS: 'none'.
 */
export async function recognizeText(
  image: CanvasImageSource | Blob | ImageBitmap,
  /** Script to read (default Latin): devanagari, chinese, japanese, korean, or auto. Android app only. */
  options?: { script?: 'latin' | 'devanagari' | 'chinese' | 'japanese' | 'korean' | 'auto'; scripts?: string[] },
): Promise<RecognizedText> {
  const TD = hasWin() ? (window as unknown as {
    TextDetector?: (new () => { detect(i: unknown): Promise<Array<{ rawValue: string; boundingBox: DOMRectReadOnly }>> }) & {
      __amRecognize?: (i: unknown, o?: unknown) => Promise<Array<{ text: string; box: TextBox; lines: Array<{ text: string; box: TextBox }> }>>;
    };
  }).TextDetector : undefined;
  if (!TD) throw codedError('unavailable', 'no text recognition here — check can("ocr")');
  if (TD.__amRecognize) {
    const blocks = (await TD.__amRecognize(image, options && (options.script || options.scripts) ? options : undefined)).map((blk) => ({
      text: blk.text, box: blk.box, lines: (blk.lines ?? []).map((l) => ({ text: l.text, box: l.box })),
    }));
    return { text: blocks.map((blk) => blk.text).join('\n'), blocks };
  }
  // Chrome's own detector: one entry per line, no block grouping — one block per line.
  const lines = await new TD().detect(image);
  const blocks = lines.map((l) => {
    const box = { x: l.boundingBox.x, y: l.boundingBox.y, w: l.boundingBox.width, h: l.boundingBox.height };
    return { text: l.rawValue, box, lines: [{ text: l.rawValue, box }] };
  });
  return { text: blocks.map((blk) => blk.text).join('\n'), blocks };
}

// ── idle detection ───────────────────────────────────────────────────────────────────────────

/**
 * Tells the app when the user goes idle (no input for `thresholdMs`, minimum 60000) or locks the
 * screen, and when they come back (`can('idle')`): the Android shell's IdleDetector, Chrome's
 * own on the web. Call from a user gesture the first time — the permission prompt needs one.
 * Resolves the stop function; rejects NotAllowedError when the permission was refused.
 */
export async function watchIdle(cb: (s: { user: 'active' | 'idle'; screen: 'locked' | 'unlocked' }) => void,
  opts: { thresholdMs?: number } = {}): Promise<() => void> {
  const ID = hasWin() ? (window as unknown as {
    IdleDetector?: (new () => EventTarget & { userState: 'active' | 'idle'; screenState: 'locked' | 'unlocked';
      start(o: { threshold: number; signal: AbortSignal }): Promise<void> }) & { requestPermission(): Promise<string> };
  }).IdleDetector : undefined;
  if (!ID) throw codedError('unavailable', 'no idle detection here — check can("idle")');
  if ((await ID.requestPermission()) !== 'granted') throw codedError('permission-denied', 'idle detection was not allowed');
  const d = new ID();
  const ac = new AbortController();
  d.addEventListener('change', () => cb({ user: d.userState, screen: d.screenState }));
  await d.start({ threshold: Math.max(60000, opts.thresholdMs ?? 60000), signal: ac.signal });
  cb({ user: d.userState, screen: d.screenState });
  return () => ac.abort();
}

// ── app lock ─────────────────────────────────────────────────────────────────────────────────

/**
 * Re-lock on return: after `timeoutSec` in the background, the next foreground asks for the
 * device owner (`unlock()`), and the privacy screen hides the content in the app switcher. Runs
 * everywhere `unlock()` does; `onLocked` renders the app's own lock screen while locked.
 */
export function appLock(opts: { timeoutSec?: number; title?: string; onLocked?: (locked: boolean) => void } = {}): () => void {
  // Nothing to lock WITH on a surface that has no device-owner check: an app lock that can never
  // be opened would be a wall, not a lock. can('unlock') is the same gate the prompt teaches.
  if (typeof document === 'undefined' || can('unlock') === 'none') return () => {};
  const timeout = (opts.timeoutSec ?? 30) * 1000;
  let hiddenAt = 0;
  let locking = false;
  void privacyScreen.enable();
  const onVisibility = async () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (!hiddenAt || Date.now() - hiddenAt < timeout || locking) return;
    locking = true;
    opts.onLocked?.(true);
    // Ask again while the user cancels, with a beat between prompts; after five refusals in a
    // row STAY locked but stop prompting — the next background/foreground cycle asks again.
    // Never a tight loop: a prompt that fails instantly (revoked biometrics) would otherwise spin.
    let ok = false;
    for (let attempt = 0; !ok && attempt < 5 && can('unlock') !== 'none'; attempt += 1) {
      if (attempt > 0) await new Promise((r) => window.setTimeout(r, 400));
      ok = await unlock(opts.title ?? 'Unlock');
    }
    locking = false; hiddenAt = ok ? 0 : Date.now() - timeout;
    if (ok) opts.onLocked?.(false);
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => { document.removeEventListener('visibilitychange', onVisibility); void privacyScreen.disable(); };
}

// ── ambient declarations for the shell's callback tables ─────────────────────────────────────

declare global {
  interface Window {
    /** Set by the shell when a pickFile() request completes. */
    WebToApkOnFilePickResult?: (ok: boolean, payloadJson: string, requestId: string) => void;
    /**
     * Set by the shell when a folder.request() grant completes. `error` ("" on success) is
     * cancelled · busy · no_picker · disabled · not_persisted · foreign_origin.
     */
    WebToApkOnFolderAccessResult?: (ok: boolean, folderUri: string, requestId: string, error?: string) => void;
    /** Callback table the shell invokes for biometric and Google-auth results. */
    __webToApkAuth?: Record<string, (json: string) => void>;
  }
}

// ── Barcode / QR scanning ────────────────────────────────────────────────────────────────────
//
// Pure web, on purpose. The obvious route was Capacitor's own @capacitor/barcode-scanner, and it
// is the wrong one twice over: it is not published to Maven Central (every other plugin here
// resolves as `com.capacitorjs:<name>`, so it would have to be vendored as a tenth Gradle module
// and hand-maintained), and it declares minSdk 26 against this template's 24 — which would force
// Android 8.0 on EVERY generated app, including the ones that never scan anything.
//
// `BarcodeDetector` costs none of that. Measured on the OPPO (Chromium 151/152, 2026-09-10): the
// API is present and reports twelve formats — aztec, code_128, code_39, code_93, codabar,
// data_matrix, ean_13, ean_8, itf, pdf417, qr_code, upc_a, upc_e.
//
// It is a real implementation, not a consolation rung: it is the same Google barcode engine the
// plugin would call, reached through the browser API instead of through a native bridge.

/** The formats `scanBarcode` will look for when the caller does not narrow it down. */
export type BarcodeFormat =
  | 'aztec' | 'code_128' | 'code_39' | 'code_93' | 'codabar' | 'data_matrix'
  | 'ean_13' | 'ean_8' | 'itf' | 'pdf417' | 'qr_code' | 'upc_a' | 'upc_e';

export interface BarcodeResult {
  /** The decoded text. */
  value: string;
  /** Which symbology it was read from. */
  format: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string; format: string }>>;
}

function barcodeCtor(): (new (o?: { formats?: string[] }) => BarcodeDetectorLike) | undefined {
  if (!hasWin()) return undefined;
  return (window as unknown as {
    BarcodeDetector?: new (o?: { formats?: string[] }) => BarcodeDetectorLike;
  }).BarcodeDetector;
}

/** The formats this device can actually read. Empty array when scanning is unavailable. */
export async function barcodeFormats(): Promise<string[]> {
  const C = barcodeCtor() as unknown as { getSupportedFormats?(): Promise<string[]> } | undefined;
  if (!C?.getSupportedFormats) return [];
  try { return await C.getSupportedFormats(); } catch { return []; }
}

/**
 * Reads one barcode or QR code from a still image the page already has — a File from an
 * `<input type=file capture=environment>`, a Blob, a <video> frame, a <canvas>.
 *
 * This is the half that needs no camera permission and no UI of ours, so it is the one to reach
 * for when the page already owns the picture.
 *
 * @returns every code found, in the order the detector reports them; empty when there is none.
 */
export async function readBarcodeFrom(
  source: Blob | CanvasImageSource,
  formats?: BarcodeFormat[]
): Promise<BarcodeResult[]> {
  const C = barcodeCtor();
  if (!C) return [];
  let bitmap: ImageBitmap | undefined;
  try {
    // createImageBitmap decodes off the main thread and is what the detector wants anyway.
    // Assigned in one expression so the type stays narrowed for detect() — a `let` filled in two
    // branches is `CanvasImageSource | undefined` to tsc, which fails a generated project's build.
    if (source instanceof Blob) bitmap = await createImageBitmap(source);
    const image: CanvasImageSource = bitmap ?? (source as CanvasImageSource);
    const det = new C(formats?.length ? { formats } : undefined);
    const found = await det.detect(image);
    return found.map((f) => ({ value: f.rawValue, format: f.format }));
  } catch {
    return [];
  } finally {
    // An ImageBitmap holds decoded pixels until it is closed; a scanner loop that skips this
    // walks straight into an out-of-memory kill on a mid-range phone.
    bitmap?.close();
  }
}

/**
 * Opens the camera and resolves with the first code seen.
 *
 * The caller supplies the <video> element, so the scanner lives inside the app's own design
 * rather than a full-screen sheet dropped on top of it — which is the one thing the native plugin
 * cannot do. Nothing is drawn by this function.
 *
 * The stream is always stopped, on every exit path: a camera left running is a lit LED and a flat
 * battery, and it is the failure people notice.
 *
 * @param video   a <video> the page has already placed and sized.
 * @param opts.signal  abort to cancel — resolves with null.
 * @param opts.formats narrow the search; fewer formats is faster.
 * @returns the first code found, or null if cancelled or unavailable.
 */
export async function scanBarcode(
  video: HTMLVideoElement,
  opts: { signal?: AbortSignal; formats?: BarcodeFormat[]; facingMode?: 'environment' | 'user' } = {}
): Promise<BarcodeResult | null> {
  return scanBarcodeFrom(video, opts, false);
}

/** [scanBarcode], optionally letting a camera failure through instead of folding it into null. */
async function scanBarcodeFrom(
  video: HTMLVideoElement,
  opts: { signal?: AbortSignal; formats?: BarcodeFormat[]; facingMode?: 'environment' | 'user' },
  surfaceErrors: boolean,
): Promise<BarcodeResult | null> {
  const C = barcodeCtor();
  const n = nav();
  if (!C || !n?.mediaDevices?.getUserMedia) return null;

  let stream: MediaStream | undefined;
  try {
    stream = await n.mediaDevices.getUserMedia({
      video: { facingMode: opts.facingMode ?? 'environment' },
      audio: false,
    });
    video.srcObject = stream;
    video.setAttribute('playsinline', '');   // iOS Safari fullscreens the video without this
    video.muted = true;
    await video.play().catch(() => { /* autoplay policy: the frames still arrive */ });

    const det = new C(opts.formats?.length ? { formats: opts.formats } : undefined);
    return await new Promise<BarcodeResult | null>((resolve) => {
      let stopped = false;
      const finish = (r: BarcodeResult | null) => { if (!stopped) { stopped = true; resolve(r); } };
      opts.signal?.addEventListener('abort', () => finish(null), { once: true });

      const tick = async () => {
        if (stopped) return;
        if (video.readyState >= 2) {
          try {
            const found = await det.detect(video);
            if (found.length) {
              finish({ value: found[0].rawValue, format: found[0].format });
              return;
            }
          } catch { /* a frame the detector could not read; the next one usually is */ }
        }
        if (!stopped) requestAnimationFrame(() => { void tick(); });
      };
      void tick();
    });
  } catch (e) {
    if (surfaceErrors) throw e;
    return null;
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
}

// ── One-call scanner: scanCode() ─────────────────────────────────────────────────────────────
//
// The whole scanning screen in one await. In the app it is Google's own scanner (Play services):
// no camera permission, no <video>, nothing drawn by the page. On the web it is a full-screen
// camera layer this function draws and removes itself, decoding with the same BarcodeDetector
// as scanBarcode(). Use scanBarcode(video) instead only when the viewfinder must sit INSIDE the
// app's own layout.

export interface ScanCodeResult extends BarcodeResult {
  /** 'url' | 'wifi' | 'text' | 'phone' | 'email' | 'sms' | 'geo' | 'contact' | 'product' | … (app only) */
  type?: string;
  displayValue?: string;
  url?: { url: string; title: string };
  wifi?: { ssid: string; password: string; encryption: 'wpa' | 'wep' | 'open' };
  phone?: string;
  email?: { address: string; subject: string; body: string };
  sms?: { phoneNumber: string; message: string };
  geo?: { lat: number; lng: number };
  contact?: { name: string; organization: string; phones: string[]; emails: string[] };
}

/**
 * Opens a full-screen scanner and resolves with the first code, or null when the USER CLOSED it.
 *
 * Anything else rejects with an Error whose `code` says why, so a broken scanner never reads as a
 * cancel: 'unavailable' (no scanner here — Play services missing in the app, no BarcodeDetector
 * or camera on the web; `can('codeScanner')` says so up front), 'busy' (a scan is already open),
 * 'camera-denied' (web: the camera permission was refused), 'failed' (anything else).
 *
 * @param opts.formats     narrow the search, e.g. ['qr_code'].
 * @param opts.manualInput app only: lets the user type the code when it will not scan.
 */
export async function scanCode(
  opts: { formats?: BarcodeFormat[]; manualInput?: boolean } = {}
): Promise<ScanCodeResult | null> {
  const native = shell()?.scanCode;
  if (native) {
    const r = await native({ formats: opts.formats, manualInput: !!opts.manualInput });
    if (!r?.ok) {
      const code = String((r as { code?: string } | undefined)?.code ?? 'failed');
      if (code === 'cancelled') return null;
      throw codedError(code, `scanCode: ${(r as { message?: string } | undefined)?.message || code}`);
    }
    const { ok: _ok, code: _code, message: _message, ...rest } = r;
    return { ...rest, value: r.value ?? '', format: r.format ?? 'unknown' } as ScanCodeResult;
  }
  if (typeof document === 'undefined' || !barcodeCtor() || !nav()?.mediaDevices?.getUserMedia) {
    throw codedError('unavailable', 'scanCode: nothing can scan here — check can("codeScanner")');
  }

  const layer = document.createElement('div');
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-label', 'Scan a code');
  layer.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#000;display:flex;align-items:center;justify-content:center';
  const video = document.createElement('video');
  video.style.cssText = 'width:100%;height:100%;object-fit:cover';
  const frame = document.createElement('div');
  frame.style.cssText = 'position:absolute;width:min(70vw,70vh);aspect-ratio:1;border:3px solid rgba(255,255,255,.9);border-radius:16px;box-shadow:0 0 0 100vmax rgba(0,0,0,.45);pointer-events:none';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '✕';
  close.setAttribute('aria-label', 'Close scanner');
  close.style.cssText = 'position:absolute;top:calc(env(safe-area-inset-top,0px) + 12px);right:12px;width:44px;height:44px;border-radius:22px;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:20px';
  layer.append(video, frame, close);
  document.body.appendChild(layer);

  const abort = new AbortController();
  close.addEventListener('click', () => abort.abort(), { once: true });
  const offBack = onBackGesture(() => { abort.abort(); return true; });
  try {
    return await scanBarcodeFrom(video, { signal: abort.signal, formats: opts.formats }, true);
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw codedError('camera-denied', 'scanCode: camera permission refused');
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw codedError('unavailable', 'scanCode: no camera');
    throw codedError('failed', `scanCode: ${String((e as Error)?.message ?? e)}`);
  } finally {
    offBack();
    layer.remove();
  }
}

// ── Passkeys ─────────────────────────────────────────────────────────────────────────────────
//
// Sign-in without passwords. Both functions take the WebAuthn options JSON a server library
// produces (SimpleWebAuthn's generateRegistrationOptions / generateAuthenticationOptions, or any
// FIDO2 server) and resolve with the JSON to send back for verification — the same shapes in the
// app and on the web, so one server endpoint serves both.
//
// In the app the ceremony runs through Android's Credential Manager. Two server-side facts differ
// from the web, and both are answered at runtime by the app itself:
//   - your domain's /.well-known/assetlinks.json must list the app  →  passkeys.assetLinks()
//   - the response's origin is 'android:apk-key-hash:…', which the server must accept next to
//     its https origin                                              →  passkeys.origin()
// Errors reject as DOMException-style errors: `NotAllowedError` when the user cancels or has no
// passkey here, `InvalidStateError` when this passkey already exists, `SecurityError` when
// assetlinks.json does not list the app.

type Json = Record<string, unknown>;

function b64uToBuf(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
function bufToB64u(buf: ArrayBuffer | ArrayBufferView | null | undefined): string | undefined {
  if (!buf) return undefined;
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

type PkcStatics = {
  parseCreationOptionsFromJSON?(j: Json): PublicKeyCredentialCreationOptions;
  parseRequestOptionsFromJSON?(j: Json): PublicKeyCredentialRequestOptions;
};

function creationOptions(j: Json): PublicKeyCredentialCreationOptions {
  const P = window.PublicKeyCredential as unknown as PkcStatics;
  if (P.parseCreationOptionsFromJSON) return P.parseCreationOptionsFromJSON(j);
  const o = JSON.parse(JSON.stringify(j));
  o.challenge = b64uToBuf(o.challenge);
  if (o.user) o.user.id = b64uToBuf(o.user.id);
  for (const c of o.excludeCredentials ?? []) c.id = b64uToBuf(c.id);
  return o;
}
function requestOptions(j: Json): PublicKeyCredentialRequestOptions {
  const P = window.PublicKeyCredential as unknown as PkcStatics;
  if (P.parseRequestOptionsFromJSON) return P.parseRequestOptionsFromJSON(j);
  const o = JSON.parse(JSON.stringify(j));
  o.challenge = b64uToBuf(o.challenge);
  for (const c of o.allowCredentials ?? []) c.id = b64uToBuf(c.id);
  return o;
}

/** A browser credential as the JSON a server verifies (toJSON() where the browser has it). */
function credentialJSON(c: PublicKeyCredential): Json {
  const withJson = c as unknown as { toJSON?(): Json };
  if (typeof withJson.toJSON === 'function') return withJson.toJSON();
  const r = c.response as AuthenticatorResponse & Record<string, unknown>;
  const response: Json = { clientDataJSON: bufToB64u(r.clientDataJSON) };
  if ('attestationObject' in r) {
    const a = r as unknown as AuthenticatorAttestationResponse;
    response.attestationObject = bufToB64u(a.attestationObject);
    response.transports = a.getTransports?.() ?? [];
  } else {
    const a = r as unknown as AuthenticatorAssertionResponse;
    response.authenticatorData = bufToB64u(a.authenticatorData);
    response.signature = bufToB64u(a.signature);
    response.userHandle = bufToB64u(a.userHandle);
  }
  return {
    id: c.id, rawId: bufToB64u(c.rawId), type: c.type, response,
    authenticatorAttachment: (c as unknown as { authenticatorAttachment?: string }).authenticatorAttachment,
    clientExtensionResults: c.getClientExtensionResults(),
  };
}

export const passkeys = {
  /** Where passkeys work here; render the passkey button only when this is not 'none'. */
  available: (): Availability => can('passkeys'),

  /**
   * Registers a passkey. `optionsJSON` = your server's PublicKeyCredentialCreationOptionsJSON;
   * resolves with the RegistrationResponseJSON to POST back for verification.
   */
  async create(optionsJSON: Json): Promise<Json> {
    const pk = shell()?.passkey;
    if (pk) return pk.create(optionsJSON);
    const cred = await navigator.credentials.create({ publicKey: creationOptions(optionsJSON) });
    if (!cred) throw new DOMException('No passkey was created', 'NotAllowedError');
    return credentialJSON(cred as PublicKeyCredential);
  },

  /**
   * Signs in with a passkey. `optionsJSON` = your server's PublicKeyCredentialRequestOptionsJSON;
   * resolves with the AuthenticationResponseJSON to POST back for verification.
   */
  async get(optionsJSON: Json): Promise<Json> {
    const pk = shell()?.passkey;
    if (pk) return pk.get(optionsJSON);
    const cred = await navigator.credentials.get({ publicKey: requestOptions(optionsJSON) });
    if (!cred) throw new DOMException('No passkey was chosen', 'NotAllowedError');
    return credentialJSON(cred as PublicKeyCredential);
  },

  /** App only: 'android:apk-key-hash:…', the origin your server must also accept. '' on the web. */
  origin: (): string => shell()?.passkey?.origin() ?? '',

  /** App only: the assetlinks.json array to publish at https://<your domain>/.well-known/assetlinks.json. */
  assetLinks: (): unknown[] => shell()?.passkey?.assetLinks() ?? [],
};
