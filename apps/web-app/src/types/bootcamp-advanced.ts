// Advanced bootcamp types for migrated components

export interface JikiscriptExercisePageProps {
  exercise: {
    id: string;
    slug: string;
    title: string;
    introduction_html: string;
    language?: string;
    config?: {
      title: string;
      projectType: string;
      tests_type?: string;
      exercise_functions?: Array<{
        name: string;
        test_code?: string;
        setup_code?: string;
        expected_message?: string;
      }>;
      stdlib_functions?: Array<{
        name: string;
        description?: string;
        signature?: string;
      }>;
    };
    tasks?: Array<{
      id: string;
      title: string;
      description: string;
    }>;
  };
  code: {
    code: string;
    storedAt: string | Date | null;
    readonlyRanges?: Array<{ from: number; to: number }>;
  };
  solution: {
    status: string;
    passed_basic_tests: boolean;
    passed_bonus_tests?: boolean;
  };
  customFunctions: Array<{
    uuid: string;
    name: string;
    active: boolean;
    description: string;
    predefined: boolean;
    code: string;
    tests: Array<{
      name: string;
      code: string;
      expected?: unknown;
    }>;
  }>;
  links: {
    post_submission: string;
    complete_solution: string;
    custom_fns_dashboard: string;
    dashboardIndex?: string;
    bootcampLevelUrl?: string;
  };
}

export interface CSSExercisePageProps {
  exercise: {
    id: string;
    slug: string;
    title: string;
    introduction_html: string;
    config?: {
      title: string;
      aspect_ratio?: number;
    };
  };
  code: {
    code: string;
    storedAt: string | Date | null;
    stub?: {
      css?: string;
      html?: string;
    };
    normalize_css?: string;
    should_hide_html_editor?: boolean;
    should_hide_css_editor?: boolean;
    aspect_ratio?: number;
  };
  solution: {
    status: string;
    passedBasicTests: boolean;
  };
  links: {
    post_submission: string;
    complete_solution: string;
  };
}

export interface FrontendExercisePageProps {
  exercise: {
    id: string;
    slug: string;
    title: string;
    introduction_html: string;
    css_checks?: string[];
    html_checks?: string[];
  };
  code: {
    code: string;
    storedAt: string | Date | null;
    stub?: {
      css?: string;
      html?: string;
      js?: string;
    };
    normalize_css?: string;
    aspect_ratio?: number;
  };
  solution: {
    status: string;
    passed_basic_tests: boolean;
  };
  links: {
    post_submission: string;
    complete_solution: string;
  };
}

export interface DrawingPageProps {
  drawing: {
    uuid: string;
    title: string;
    background_slug: string;
  };
  code: {
    code: string;
    stored_at: string;
  };
  backgrounds: Array<{
    slug: string;
    title: string;
    image_url?: string;
  }>;
  links: {
    update_code: string;
    drawings_index: string;
  };
}

export interface CustomFunctionsFromServer {
  [key: string]: {
    uuid: string;
    name: string;
    active: boolean;
    description: string;
    predefined: boolean;
    code: string;
    tests: Array<{
      name: string;
      code: string;
      expected?: unknown;
    }>;
  };
}

// Global type declarations
declare global {
  interface Window {
    // Bootcamp-specific window properties
    bootcampConfig?: {
      apiEndpoint: string;
      version: string;
    };
    customFunctions?: CustomFunctionsFromServer;
  }
}

// Test result types
export interface NewTestResult {
  testIndex: number;
  name: string;
  descriptionHtml?: string;
  status: "pass" | "fail";
  expects: Array<{
    pass: boolean;
    type: string;
    actual?: unknown;
    expected?: unknown;
    errorHtml?: string;
    diff?: {
      added?: string;
      removed?: string;
      context?: string;
    };
    codeRun?: string;
  }>;
  codeRun?: string;
}

export interface TestSuiteResult<T> {
  suiteName: string;
  tests: T[];
  status: "pass" | "fail";
}

export interface TestCallback {
  (): Promise<{
    expects: Array<{
      pass: boolean;
      type: string;
      actual?: unknown;
      expected?: unknown;
      errorHtml?: string;
      diff?: {
        added?: string;
        removed?: string;
        context?: string;
      };
      codeRun?: string;
    }>;
    codeRun?: string;
  }>;
}

// Task types
export interface Task {
  uuid: string;
  status: "completed" | "active";
  description: string;
}

// Code types
export interface Code {
  code: string;
  storedAt: string | Date | null;
  readonlyRanges?: Array<{ from: number; to: number }>;
}
