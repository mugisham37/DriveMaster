export interface BootcampProject {
  id: number
  slug: string
  title: string
  description?: string
  icon_url: string
  unlocked?: boolean
  links: {
    self: string
  }
}

export interface BootcampExercise {
  id: number
  slug: string
  title: string
  introduction_html: string
  icon_url: string
  major_project?: boolean
  brain_buster?: boolean
  css_checks?: string[]
  html_checks?: string[]
  tasks?: BootcampTask[]
  language?: string
  config: BootcampExerciseConfig
}

export interface BootcampConcept {
  id: number
  slug: string
  title: string
  description: string
  links: {
    self: string
  }
}

export interface BootcampUserProject {
  id: number
  status: 'available' | 'started' | 'completed' | 'locked'
  exercise_status: (exercise: BootcampExercise, solution?: BootcampSolution) => string
}

export interface BootcampExerciseConfig {
  title: string
  description: string
  allowed_properties?: string[]
  disallowed_properties?: string[]
  project_type?: string
  tests_type?: string
  interpreter_options?: any
  stdlib_functions?: any[]
  exercise_functions?: any[]
  exercise_classes?: any[]
  expected?: {
    html?: string
    css?: string
    js?: string
  }
}

export interface BootcampTask {
  id: string
  title: string
  description: string
}

export interface BootcampSolution {
  uuid: string
  status: string
  passed_basic_tests: boolean
  passed_bonus_tests?: boolean
  code?: any
}

export interface BootcampSubmission {
  test_results?: any
  created_at: string
  readonly_ranges?: any
  custom_functions?: string[]
}

export interface BootcampCode {
  normalize_css?: string
  default?: {
    css?: string
  }
  stub?: {
    css?: string
    html?: string
    js?: string
    jiki?: string
  }
  should_hide_css_editor?: boolean
  should_hide_html_editor?: boolean
  aspect_ratio?: number
  code?: any
  stored_at?: string
  readonly_ranges?: any
  default_readonly_ranges?: any
}

export interface BootcampLinks {
  post_submission: string
  complete_solution: string
  projects_index: string
  dashboard_index: string
  bootcamp_level_url: string
  custom_fns_dashboard: string
}

export interface BootcampDrawing {
  uuid: string
  title: string
  background_slug: string
  code?: any
  updated_at: string
}

export interface BootcampBackground {
  slug: string
  title: string
  image_url?: string
}

export interface BootcampCustomFunction {
  uuid: string
  name: string
  active: boolean
  description: string
  predefined: boolean
  code: string
  tests: any
}