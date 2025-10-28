// Footer navigation and content data
// This file contains all the structured data for the site footer

export interface NavigationColumn {
  title: string;
  links: Array<{
    text: string;
    href: string;
  }>;
}

export interface SocialLink {
  platform: string;
  href: string;
  backgroundColor: string;
  iconColor: string;
}

export const navigationColumns: NavigationColumn[] = [
  {
    title: "Editions",
    links: [
      { text: "Exercism", href: "/" },
      { text: "Learn to Code", href: "/courses/coding-fundamentals" },
      { text: "Coding Fundamentals", href: "/courses/coding-fundamentals" },
      { text: "Front-end Course", href: "/courses/front-end-fundamentals" },
      { text: "Exercism Bootcamp", href: "/bootcamp" },
      { text: "Exercism for Teams", href: "/docs/using/editions/teams" },
      { text: "Exercism Research", href: "/docs/using/editions/research" }
    ]
  },
  {
    title: "About",
    links: [
      { text: "About Exercism", href: "/about" },
      { text: "Our team", href: "/about/team" },
      { text: "Contributors", href: "/contributing/contributors" },
      { text: "Partners", href: "/about/partners" },
      { text: "Individual supporters", href: "/about/supporters" }
    ]
  },
  {
    title: "Get involved",
    links: [
      { text: "Exercism Insiders", href: "/insiders" },
      { text: "Contribute", href: "/contributing" },
      { text: "Mentor", href: "/mentoring" },
      { text: "Donate", href: "/donate" }
    ]
  },
  {
    title: "Legal & policies",
    links: [
      { text: "Terms of usage", href: "/docs/using/legal/terms-of-service" },
      { text: "Privacy policy", href: "/docs/using/legal/privacy-policy" },
      { text: "Cookie policy", href: "/docs/using/legal/cookie-policy" },
      { text: "Code of conduct", href: "/docs/using/legal/code-of-conduct" },
      { text: "Accessibility statement", href: "/docs/using/legal/accessibility" }
    ]
  },
  {
    title: "Keep in touch",
    links: [
      { text: "Exercism's blog", href: "/blog" },
      { text: "Discuss on GitHub", href: "https://github.com/exercism/exercism/discussions" },
      { text: "Contact us", href: "/docs/using/contact" },
      { text: "Report abuse", href: "/docs/using/report-abuse" }
    ]
  },
  {
    title: "Get help",
    links: [
      { text: "Exercism's Docs", href: "/docs" },
      { text: "Getting started", href: "/docs/using/getting-started" },
      { text: "FAQs", href: "/docs/using/faqs" },
      { text: "Installing the CLI", href: "/docs/using/solving-exercises/working-locally" },
      { text: "Interactive CLI Walkthrough", href: "/cli-walkthrough" }
    ]
  }
];

export const socialLinks: SocialLink[] = [
  {
    platform: "twitter",
    href: "https://twitter.com/exercism_io",
    backgroundColor: "#1da1f2",
    iconColor: "#ffffff"
  },
  {
    platform: "facebook", 
    href: "https://facebook.com/exercism.io",
    backgroundColor: "#4267b2",
    iconColor: "#ffffff"
  },
  {
    platform: "github",
    href: "https://github.com/exercism",
    backgroundColor: "#6e5494",
    iconColor: "#ffffff"
  }
];

// Complete list of 78 programming languages in exact order from reference image
export const programmingLanguages: Array<{
  name: string;
  slug: string;
}> = [
  // Column 1
  { name: "8th", slug: "8th" },
  { name: "ABAP", slug: "abap" },
  { name: "ARM64 Assembly", slug: "arm64-assembly" },
  { name: "Arturo", slug: "arturo" },
  { name: "AWK", slug: "awk" },
  { name: "Ballerina", slug: "ballerina" },
  { name: "Bash", slug: "bash" },
  { name: "Batch Script", slug: "batch-script" },
  { name: "C", slug: "c" },
  { name: "C#", slug: "csharp" },
  { name: "C++", slug: "cpp" },
  { name: "Cairo", slug: "cairo" },
  { name: "CFML", slug: "cfml" },
  { name: "Clojure", slug: "clojure" },
  { name: "COBOL", slug: "cobol" },
  { name: "CoffeeScript", slug: "coffeescript" },
  
  // Column 2
  { name: "Common Lisp", slug: "common-lisp" },
  { name: "Crystal", slug: "crystal" },
  { name: "D", slug: "d" },
  { name: "Dart", slug: "dart" },
  { name: "Delphi Pascal", slug: "delphi-pascal" },
  { name: "Elixir", slug: "elixir" },
  { name: "Elm", slug: "elm" },
  { name: "Emacs Lisp", slug: "emacs-lisp" },
  { name: "Erlang", slug: "erlang" },
  { name: "Euphoria", slug: "euphoria" },
  { name: "F#", slug: "fsharp" },
  { name: "Fortran", slug: "fortran" },
  { name: "Futhark", slug: "futhark" },
  { name: "Gleam", slug: "gleam" },
  { name: "Go", slug: "go" },
  { name: "Groovy", slug: "groovy" },
  
  // Column 3
  { name: "Haskell", slug: "haskell" },
  { name: "Idris", slug: "idris" },
  { name: "Java", slug: "java" },
  { name: "JavaScript", slug: "javascript" },
  { name: "jq", slug: "jq" },
  { name: "Julia", slug: "julia" },
  { name: "Kotlin", slug: "kotlin" },
  { name: "Lisp Flavoured Erlang", slug: "lfe" },
  { name: "Lua", slug: "lua" },
  { name: "MIPS Assembly", slug: "mips-assembly" },
  { name: "Nim", slug: "nim" },
  { name: "Objective-C", slug: "objective-c" },
  { name: "OCaml", slug: "ocaml" },
  { name: "Perl", slug: "perl" },
  { name: "Pharo", slug: "pharo" },
  { name: "PHP", slug: "php" },
  
  // Column 4
  { name: "PowerShell", slug: "powershell" },
  { name: "Prolog", slug: "prolog" },
  { name: "PureScript", slug: "purescript" },
  { name: "Pyret", slug: "pyret" },
  { name: "Python", slug: "python" },
  { name: "R", slug: "r" },
  { name: "Racket", slug: "racket" },
  { name: "Raku", slug: "raku" },
  { name: "ReasonML", slug: "reasonml" },
  { name: "Red", slug: "red" },
  { name: "Roc", slug: "roc" },
  { name: "Ruby", slug: "ruby" },
  { name: "Rust", slug: "rust" },
  { name: "Scala", slug: "scala" },
  { name: "Scheme", slug: "scheme" },
  
  // Column 5
  { name: "SQLite", slug: "sqlite" },
  { name: "Standard ML", slug: "sml" },
  { name: "Swift", slug: "swift" },
  { name: "Tcl", slug: "tcl" },
  { name: "TypeScript", slug: "typescript" },
  { name: "Uiua", slug: "uiua" },
  { name: "Unison", slug: "unison" },
  { name: "V", slug: "v" },
  { name: "Vim script", slug: "vimscript" },
  { name: "Visual Basic", slug: "vbnet" },
  { name: "WebAssembly", slug: "wasm" },
  { name: "Wren", slug: "wren" },
  { name: "x86-64 Assembly", slug: "x86-64-assembly" },
  { name: "YAMLScript", slug: "yamlscript" },
  { name: "Zig", slug: "zig" }
];

export const legalLinks = [
  {
    text: "registered in the UK",
    href: "https://find-and-update.company-information.service.gov.uk/company/11733062"
  },
  {
    text: "Katrina Owen",
    href: "https://exercism.github.io/kytrinyx/"
  },
  {
    text: "Jeremy Walker", 
    href: "https://ihid.info/"
  },
  {
    text: "Erik Schierboom",
    href: "https://erikschierboom.com/"
  }
];