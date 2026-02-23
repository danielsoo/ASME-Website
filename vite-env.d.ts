/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string
  readonly GEMINI_API_KEY?: string

  readonly VITE_IMAGEKIT_PUBLIC_KEY?: string = "public_fRYiQ46mZ8bjizYnPgVESTo9izs"
  readonly VITE_IMAGEKIT_URL_ENDPOINT?: string = "https://ik.imagekit.io/zi9e3gkj8/"
  readonly VITE_IMAGEKIT_AUTH_ENDPOINT?: string = "/imagekitAuth"
  readonly VITE_IMAGEKIT_AUTH_ENDPOINT?: string = "https://us-central1-zi9e3gkj8.cloudfunctions.net/imagekitAuth"

}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
