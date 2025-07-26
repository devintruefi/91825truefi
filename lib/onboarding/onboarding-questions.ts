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
  {
    id: "monthly_spending",
    text: "Roughly how much do you spend each month, and on what?",
    subtitle: "Don't worry about being exact: I'm just getting a sense of your life.",
    type: "textarea",
    required: true,
    section: "Understanding Your Financial World",
  },
  {
    id: "debt_situation",
    text: "Do you have any debt like credit cards, student loans, or a mortgage?",
    subtitle: "No judgment here, just helping me understand your full picture.",
    type: "multiselect",
    options: [
      "Credit card debt",
      "Student loans",
      "Mortgage",
      "Car loan",
      "Personal loans",
      "Business debt",
      "No debt at all",
    ],
    required: true,
    section: "Understanding Your Financial World",
  },
  {
    id: "savings_investments",
    text: "Do you already have savings or investments? If so, how much and where?",
    subtitle: "Whatever you have is a great start: or a great place to begin.",
    type: "textarea",
    required: true,
    section: "Understanding Your Financial World",
  },
  {
    id: "budgeting_habits",
    text: "Do you have a budget, and how closely do you stick to it?",
    type: "radio",
    options: [
      "I don't really budget at all",
      "I try to budget but struggle to stick to it",
      "I have a loose budget that I mostly follow",
      "I have a detailed budget and follow it closely",
      "I'm somewhere in between",
    ],
    required: true,
    section: "Understanding Your Financial World",
  },

  // Section 2: Life Goals & Time Horizon
  {
    id: "life_goals",
    text: "What are the top 3 things you'd like your money to help you do in life?",
    subtitle: "Dream big: what would make your heart sing?",
    type: "textarea",
    required: true,
    section: "Your Dreams and Aspirations",
  },
  {
    id: "retirement_timeline",
    text: "When would you ideally like to retire if at all?",
    type: "radio",
    options: [
      "I want to retire as early as possible",
      "Sometime in my 50s",
      "Traditional retirement age (60s)",
      "I'd like to work longer if I enjoy it",
      "I never want to fully retire",
      "I haven't really thought about it",
    ],
    required: true,
    section: "Your Dreams and Aspirations",
  },
  {
    id: "life_events",
    text: "Are there any big life events you're planning for? Like a wedding, kids, house, business?",
    subtitle: "Help me understand what's on the horizon for you.",
    type: "multiselect",
    options: [
      "Getting married",
      "Having children",
      "Buying a home",
      "Starting a business",
      "Going back to school",
      "Taking care of aging parents",
      "Major travel or sabbatical",
      "Nothing major planned right now",
    ],
    required: true,
    section: "Your Dreams and Aspirations",
  },
  {
    id: "financial_independence",
    text: "How important is financial independence or early retirement to you?",
    type: "slider",
    min: 1,
    max: 10,
    step: 1,
    minLabel: "Not important",
    maxLabel: "Extremely important",
    required: true,
    section: "Your Dreams and Aspirations",
  },
  {
    id: "financial_freedom_vision",
    text: "What would 'financial freedom' look like for you?",
    subtitle: "Paint me a picture of your ideal financial life.",
    type: "textarea",
    required: true,
    section: "Your Dreams and Aspirations",
  },

  // Section 3: Personality, Style & Risk
  {
    id: "money_volatility_feelings",
    text: "How do you feel when your money goes up or down in value?",
    type: "radio",
    options: [
      "I get very anxious and check constantly",
      "I notice but try not to worry too much",
      "I'm generally okay with normal ups and downs",
      "I barely pay attention to short term changes",
      "I actually find it exciting",
    ],
    required: true,
    section: "How We'll Work Together",
  },
  {
    id: "advice_style_preference",
    text: "If I give you advice, how would you prefer I do it?",
    type: "radio",
    options: [
      "Direct and confident: tell me what to do",
      "Gentle and educational: help me understand why",
      "Neutral and numbers focused: just give me the facts",
      "Supportive and encouraging: be my cheerleader",
    ],
    required: true,
    section: "How We'll Work Together",
  },
  {
    id: "investment_approach",
    text: "When it comes to investing, are you more cautious or more of a growth seeker?",
    type: "radio",
    options: [
      "Very cautious: I want to protect what I have",
      "Somewhat cautious: slow and steady wins",
      "Balanced: some safety, some growth",
      "Growth focused: I'm willing to take reasonable risks",
      "Aggressive: I want maximum growth potential",
    ],
    required: true,
    section: "How We'll Work Together",
  },
  {
    id: "coaching_style",
    text: "Do you want me to push you toward your goals or support you patiently?",
    type: "radio",
    options: [
      "Push me: I need accountability and motivation",
      "Gentle encouragement: support me but don't pressure",
      "Let me set the pace: I'll ask when I need help",
      "A mix: push sometimes, support always",
    ],
    required: true,
    section: "How We'll Work Together",
  },
  {
    id: "financial_safety",
    text: "What would make you feel truly safe and supported when it comes to money?",
    subtitle: "This is about your emotional relationship with money: what do you need to feel secure?",
    type: "textarea",
    required: true,
    section: "How We'll Work Together",
  },
] 