// Main Editor component and contexts
export { 
  Editor as default, 
  TabsContext, 
  TasksContext, 
  FeaturesContext, 
  type TabIndex,
  type TasksContextType,
  type FeaturesContextType 
} from './Editor'

// Types
export { TestRun, TestRunStatus } from './types'
export { Props, EditorFeatures as EditorFeatures, TaskContext } from './Props'

// Components
export { Header } from './Header'
export { FileEditorCodeMirror, FileEditorHandle } from './FileEditorCodeMirror'
export { InstructionsPanel } from './panels/InstructionsPanel'
export { TestsPanel } from './panels/TestsPanel'
export { TestPanel } from './testComponents/TestPanel'
export { ResultsPanel } from './panels/ResultsPanel'
export { FeedbackPanel } from './FeedbackPanel'
export { InstructionsTab } from './tabs/InstructionsTab'
export { TestsTab } from './tabs/TestsTab'
export { ResultsTab } from './tabs/ResultsTab'
export { FeedbackTab } from './tabs/FeedbackTab'
export { EditorStatusSummary } from './EditorStatusSummary'
export { RunTestsButton } from './RunTestsButton'
export { SubmitButton } from './SubmitButton'
export { LegacyFileBanner } from './LegacyFileBanner'

// Hooks
export { useSaveFiles } from './useSaveFiles'
export { useEditorFiles } from './useEditorFiles'
export { useEditorFocus } from './useEditorFocus'
export { useSubmissionsList } from './useSubmissionsList'
export { useFileRevert } from './useFileRevert'
export { useIteration } from './useIteration'
export { useDefaultSettings } from './useDefaultSettings'
export { useEditorStatus, EditorStatus } from './useEditorStatus'
export { useEditorTestRunStatus } from './useEditorTestRunStatus'
export { useSubmissionCancelling } from './useSubmissionCancelling'

// Test Components
export { TestContentWrapper } from './testComponents/TestContentWrapper'

// Help Components
export { GetHelpTab } from './GetHelp/GetHelpTab'
export { GetHelpPanel } from './GetHelp'
export { StuckButton } from './GetHelp/StuckButton'

// ChatGPT Components
export * as ChatGPT from './ChatGptFeedback'