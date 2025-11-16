// Core backend communication utilities
export { fetchJSON } from "./fetch-json";
export { sendRequest } from "./send-request";
export { hashQueryKey } from "./hashQueryKey";
export { camelizeKeysAs } from "./camelize-keys-as";
export { typecheck } from "./typecheck";
export { debounce } from "./debounce";
export { redirectTo } from "./redirect-to";
export { useLocalStorage } from "./use-storage";
export { generateHexString } from "./generate-hex-string";
export { copyToClipboard } from "./copyToClipboard";

// Minimal UI utilities (kept due to existing usage)
export { scrollToTop } from "./scroll-to-top";
export { assembleClassNames } from "./assemble-classnames";

// Learning platform utilities
export * from "./learning-platform";
export * from "./performance-monitoring";
