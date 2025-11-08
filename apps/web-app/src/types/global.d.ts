declare module "reconnecting-websocket" {
  interface ReconnectingWebsocket extends WebSocket {
    [key: string]: unknown;
    // eslint-disable-next-line @typescript-eslint/no-misused-new
    new (
      url: string | (() => string),
      protocols?: string | Array<string>,
      options?: {
        maxReconnectionDelay?: number;
        minReconnectionDelay?: number;
        reconnectionDelayGrowFactor?: number;
        connectionTimeout?: number;
        maxRetries?: number;
        debug?: boolean;
      },
    ): ReconnectingWebsocket;

    close(
      code?: number,
      reason?: string,
      options?: {
        keepClosed?: boolean;
        fastClosed?: boolean;
        delay?: number;
      },
    ): void;
  }

  const ReconnectingWebsocket: ReconnectingWebsocket;
  export = ReconnectingWebsocket;
}

interface Fonts {
  ready: Promise<void>;
}

interface Document {
  fonts: Fonts;
}

interface Window {
  turboLoaded: boolean;
  Turbo: {
    visit: (url: string) => void;
  };
  confetti?: WindowConfetti;
}

interface WindowConfetti {
  (options?: {
    particleCount?: number;
    spread?: number;
    origin?: { y: number };
  }): void;
}

declare module "nim-codemirror-mode" {
  import { StreamParser } from "@codemirror/stream-parser";
  export const nim: StreamParser<unknown>;
}

declare module "codemirror6-abap" {
  import { StreamParser } from "@codemirror/stream-parser";
  export const abapMode: StreamParser<unknown>;
}

declare module "codemirror-lang-jq" {
  import { LanguageSupport } from "@codemirror/language";
  export const jq: () => LanguageSupport;
}

declare module "@exercism/twine2-story-format/src/story" {
  export default class Story {
    constructor(params: Record<string, unknown>);
    start: (params: Record<string, unknown>) => unknown;
  }
}

declare module "highlightjs-sap-abap" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "highlightjs-cobol" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "highlightjs-bqn" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "highlightjs-zig" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "@gleam-lang/highlight.js-gleam" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "@ballerina/highlightjs-ballerina" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "highlightjs-redbol" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "highlightjs-chapel" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "@exercism/highlightjs-gdscript" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "highlightjs-jq" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "@exercism/highlightjs-arturo" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "highlightjs-roc" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "@exercism/highlightjs-uiua" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "@exercism/highlightjs-jikiscript" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

declare module "@exercism/highlightjs-futhark" {
  import { LanguageFn } from "highlight.js";
  const setup: LanguageFn;
  export default setup;
}

// Config interfaces
interface Config {
  projectType?: string;
  testsType?: string;
  interpreterOptions?: unknown;
  exerciseFunctions?: string[];
  exerciseClasses?: string[];
  [key: string]: unknown;
}

interface Manifest {
  [key: string]: string;
}

declare module "copy-to-clipboard" {
  function copy(
    text: string,
    options?: { debug?: boolean; message?: string },
  ): boolean;
  export = copy;
}

declare module "*.json" {
  const value: Record<string, string>;
  export default value;
}
