import React from "react";
import { createRoot } from "react-dom/client";
import Bugsnag from "@bugsnag/js";
import BugsnagPluginReact from "@bugsnag/plugin-react";
import { ExercismTippy } from "../components/misc/ExercismTippy";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { componentMappings } from "@/lib/component-registry";

declare global {
  interface Window {
    queryClient?: QueryClient;
  }
}

type ErrorBoundaryType = React.ComponentType<{ children?: React.ReactNode }>;

// Use the same types as the component registry
interface ComponentData {
  [key: string]: unknown;
}

type GeneratorFunc = (data: ComponentData, elem?: HTMLElement) => React.JSX.Element;
type ComponentMappings = Record<string, GeneratorFunc>;

type TurboFrameRenderDetail = {
  fetchResponse: {
    response: {
      headers: {
        get: (name: string) => string | null;
      };
    };
  };
};

let ErrorBoundary: ErrorBoundaryType = ({ children }) => <>{children}</>;

if (process.env.BUGSNAG_API_KEY) {
  Bugsnag.start({
    apiKey: process.env.BUGSNAG_API_KEY,
    releaseStage: process.env.NODE_ENV,
    plugins: [new BugsnagPluginReact()],
    enabledReleaseStages: ["production"],
    collectUserIp: false,
    onError: function (event) {
      const tag = document.querySelector<HTMLMetaElement>(
        'meta[name="user-id"]'
      );

      if (!tag) {
        return true;
      }

      event.setUser(tag.content);
      return true;
    },
  });
  const reactPlugin = Bugsnag.getPlugin("react");
  if (reactPlugin) {
    ErrorBoundary = reactPlugin.createErrorBoundary(React) as ErrorBoundaryType;
  } else {
    throw new Error("Failed to load Bugsnag's react plugin");
  }
}

// Asynchronously appends a stylesheet to the head and resolves
// the promise when it's finished loading.
const loadStylesheet = function (url: string): Promise<void> {
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.onload = () => resolve();
    link.href = url;

    const head = document.getElementsByTagName("head")[0];
    if (head) {
      head.appendChild(link);
    }
  });
};

function initEventListeners() {
  // Only run on client side
  if (typeof window === 'undefined') return;
  
  // As we have conditional stylesheets per page, we need to extract and
  // render those when the frame changes. We want the CSS to load BEFORE
  // then HTML renders, so we get any stylesheets downloaded and THEN render
  // continue processing the frame render.
  document.addEventListener("turbo:before-frame-render", (e: Event) => {
    if (!(e instanceof CustomEvent)) return;

    const hrefs = Array.from(
      e.detail.newFrame.querySelectorAll('link[rel="stylesheet"]')
    ).map((link) => (link as HTMLLinkElement).getAttribute("href"));

    // If we have no stylesheets, just continue
    if (hrefs.length == 0) {
      return;
    }

    // Pause rendering until stylesheets are loaded
    e.preventDefault();

    // Load stylesheets in parallel asynchronously
    const promises = hrefs.map((href) =>
      href ? loadStylesheet(href) : Promise.resolve()
    );

    // When they're all loaded, resume
    Promise.all(promises).then(() => e.detail.resume());
  });

  // This changes any extra things that need changing from the
  // turbo frame, such as body class or page title
  document.addEventListener("turbo:frame-render", (e) => {
    const event = e as CustomEvent<TurboFrameRenderDetail>;
    const bodyClass = event.detail.fetchResponse.response.headers.get(
      "exercism-body-class"
    );
    if (bodyClass) {
      document.body.className = bodyClass;
    }
  });

  document.addEventListener("turbo:before-fetch-request", () => {
    setTurboStyle("* { cursor:wait !important }");
  });

  document.addEventListener("turbo:before-render", () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
    setTurboStyle("");
  });
}

/********************************************************/
/** Add a loading cursor when a turbo-frame is loading **/
/********************************************************/
const styleElemId = "turbo-style";
const setTurboStyle = (style: string) => {
  let styleElem = document.getElementById(styleElemId);
  if (!styleElem) {
    styleElem = document.createElement("style");
    styleElem.id = styleElemId;
    document.head.appendChild(styleElem);
  }
  styleElem.textContent = style;
};

export function initReact(mappings?: ComponentMappings): void {
  // Use provided mappings or default to component registry
  const componentMap = mappings || componentMappings;

  const renderThings = (): void => {
    renderComponents(document.body, componentMap);
    renderTooltips(document.body, componentMap);
  };

  // This adds rendering for all future turbo clicks
  document.addEventListener("turbo:load", () => {
    renderThings();
  });

  // This renders if turbo has already finished at the
  // point at which this calls. See packs/core.tsx
  if (window.turboLoaded) {
    renderThings();
  }
}

// Initialize with default component mappings
export function initDefaultReact(): void {
  initReact(componentMappings);
}

// Initialize QueryClient if not already initialized
if (typeof window !== "undefined" && !window.queryClient) {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: "REACT_QUERY_OFFLINE_CACHE",
  });

  window.queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
      },
    },
  });

  persistQueryClient({
    queryClient: window.queryClient,
    persister,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        const [key] = query.queryKey;
        // only persist notifications and reputation in localStorage cache
        return ["notifications", "reputation"].includes(key as string);
      },
    },
  });
}

function onGoogleTranslateDetected(): void {
  // See: https://github.com/facebook/react/issues/11538#issuecomment-417504600
  if (typeof Node === "function" && Node.prototype) {
    const originalRemoveChild: (child: Node) => Node =
      Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(
      this: Node,
      child: T
    ): T {
      if (child.parentNode !== this) {
        if (console) {
          console.error(
            "Cannot remove a child from a different parent",
            child,
            this
          );
        }
        return child;
      }
      return originalRemoveChild.apply(this, [child]) as T;
    };

    const originalInsertBefore: (
      newNode: Node,
      referenceNode: Node | null
    ) => Node = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(
      this: Node,
      newNode: T,
      referenceNode: Node | null
    ): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        if (console) {
          console.error(
            "Cannot insert before a reference node from a different parent",
            referenceNode,
            this
          );
        }
        return newNode;
      }
      return originalInsertBefore.apply(this, [newNode, referenceNode]) as T;
    };
  }
}

// Currently only Chrome produces this React bug, so let's not use this piece of code on other browsers
if (/Chrome/.test(navigator.userAgent)) {
  // We need to use MutationObserver here because translating almost only happens as a DOM mutation
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class"
      ) {
        const htmlElement = document.documentElement;
        const hasTranslationClasses =
          htmlElement.classList.contains("translated-ltr") ||
          htmlElement.classList.contains("translated-rtl");

        if (hasTranslationClasses) {
          onGoogleTranslateDetected();
        }
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

const roots = new WeakMap();
const eventListeners = new WeakSet();

const render = (elem: HTMLElement, component: React.ReactNode) => {
  let root = roots.get(elem);
  if (!root) {
    root = createRoot(elem);
    roots.set(elem, root);
  }

  root.render(
    <React.StrictMode>
      <QueryClientProvider client={window.queryClient!}>
        <ErrorBoundary>{component}</ErrorBoundary>
      </QueryClientProvider>
    </React.StrictMode>
  );

  // make sure we only add the event listener once per element
  if (!eventListeners.has(elem)) {
    eventListeners.add(elem);
    document.addEventListener("turbo:before-frame-render", () => {
      if (elem.dataset.persistent === "true") return;
      const rootToCleanup = roots.get(elem);
      if (rootToCleanup) {
        rootToCleanup.unmount();
        roots.delete(elem);
        eventListeners.delete(elem);
      }
    });
  }
};

export function renderComponents(
  parentElement: HTMLElement,
  mappings: ComponentMappings
): void {
  if (!parentElement) {
    parentElement = document.body;
  }
  // As getElementsByClassName returns a live collection, it is recommended to use Array.from
  // when iterating through it, otherwise the number of elements may change mid-loop.
  const elems = Array.from(
    parentElement.getElementsByClassName("c-react-component")
  );
  for (const elem of elems) {
    // dataset doesn't exist on type `Element`
    if (!(elem instanceof HTMLElement)) continue;

    if (
      elem.dataset.persistent === "true" &&
      elem.dataset.rendered === "true"
    ) {
      continue;
    }

    const reactId = elem.dataset["reactId"];
    const reactData = elem.dataset.reactData;
    const generator = reactId ? mappings[reactId] : null;

    if (reactId && generator && reactData) {
      const data = JSON.parse(reactData);
      render(elem, generator(data, elem));
      if (elem.dataset.persistent === "true") {
        elem.dataset.rendered = "true";
      }
    }
  }
}

function renderTooltips(parentElement: HTMLElement, mappings: ComponentMappings) {
  if (!parentElement) {
    parentElement = document.body;
  }
  parentElement
    .querySelectorAll("[data-tooltip-type][data-endpoint]")
    .forEach((elem) => renderTooltip(mappings, elem as HTMLElement));
}

function renderTooltip(mappings: ComponentMappings, elem: HTMLElement) {
  const name = elem.dataset["tooltipType"] + "-tooltip";
  const generator = mappings[name];

  if (!generator) {
    return;
  }
  const component = generator(elem.dataset, elem);

  const tooltipElem = document.createElement("span");
  elem.insertAdjacentElement("afterend", tooltipElem);

  render(
    tooltipElem,
    <ExercismTippy
      interactive={elem.dataset.interactive === "true"}
      renderReactComponents={elem.dataset.renderReactComponents === "true"}
      content={component}
      reference={elem}
    />
  );
}

// Only initialize event listeners on client side
if (typeof window !== 'undefined') {
  initEventListeners();
}
