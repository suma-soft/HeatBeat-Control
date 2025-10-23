/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // dodaj tu inne swoje zmienne środowiskowe zaczynające się od VITE_
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
