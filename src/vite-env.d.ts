/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_SERPAPI_KEY?: string;
    readonly VITE_BRAVE_SEARCH_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
