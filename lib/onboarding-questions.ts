export interface OnboardingQuestionType {
  id: string
  text: string
  subtitle?: string
  type: "text" | "textarea" | "radio" | "multiselect" | "number" | "slider"
  options?: string[]
  min?: number
  max?: number
  step?: number
  minLabel?: string
  maxLabel?: string
  required: boolean
  section: string
}

export const questions: OnboardingQuestionType[] = [
  // Section 1: Financial Snapshot
  {
    id: "monthly_income",
    text: "What's your current income after taxes each month?",
    subtitle: "Just a rough number is perfect: we can always adjust this later.",
    type: "text",
    required: true,
    section: "Understanding Your Financial World",
  },
  // ... (rest of the questions, see original file for full code)
] 