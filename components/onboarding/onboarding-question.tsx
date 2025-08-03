"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Mic, Send, Heart, Loader2 } from "lucide-react"
import type { OnboardingQuestionType } from "@/lib/onboarding/onboarding-questions"

interface OnboardingQuestionProps {
  question: OnboardingQuestionType
  onAnswer: (answer: any) => void
  isListening: boolean
  onStartListening: () => void
  micEnabled: boolean
  isSpeaking: boolean
}

export function OnboardingQuestion({
  question,
  onAnswer,
  isListening,
  onStartListening,
  micEnabled,
  isSpeaking,
}: OnboardingQuestionProps) {
  const [answer, setAnswer] = useState<any>("")
  const [multiSelectAnswers, setMultiSelectAnswers] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setAnswer("")
    setMultiSelectAnswers([])
  }, [question.id])

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (question.type === "multiselect") {
        onAnswer(multiSelectAnswers)
      } else {
        onAnswer(answer)
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleMultiSelectChange = (value: string, checked: boolean) => {
    if (checked) {
      setMultiSelectAnswers((prev) => [...prev, value])
    } else {
      setMultiSelectAnswers((prev) => prev.filter((item) => item !== value))
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isAnswerValid = () => {
    if (question.type === "multiselect") {
      return multiSelectAnswers.length > 0;
    }
    return answer && answer.toString().trim() !== "";
  }

  return (
    <div className="space-y-8 pb-32">
      <div className="space-y-6">
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 leading-relaxed tracking-wide drop-shadow-sm">
          {question.text}
        </h3>
        {question.subtitle && (
          <p className="text-lg sm:text-xl text-slate-800 leading-relaxed font-medium tracking-wide drop-shadow-sm">
            {question.subtitle}
          </p>
        )}
      </div>

      <div className="space-y-8">
        {question.type === "text" && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/20 via-teal-100/30 to-green-100/20 rounded-3xl blur-xl"></div>
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Share with me..."
              className="relative text-lg sm:text-xl p-4 sm:p-6 bg-white/90 border-2 border-emerald-200/60 text-slate-900 placeholder:text-slate-700 backdrop-blur-xl rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.1)] font-medium focus:bg-white focus:border-emerald-300/80 focus:shadow-[0_0_40px_rgba(16,185,129,0.2)] transition-all duration-500 min-h-[44px]"
              aria-label={question.text}
            />
          </div>
        )}

        {question.type === "textarea" && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/20 via-teal-100/30 to-green-100/20 rounded-3xl blur-xl"></div>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Take your time, tell me more..."
              className="relative text-lg sm:text-xl p-4 sm:p-6 bg-white/90 border-2 border-emerald-200/60 text-slate-900 placeholder:text-slate-700 backdrop-blur-xl rounded-3xl min-h-[120px] sm:min-h-[150px] shadow-[0_0_30px_rgba(16,185,129,0.1)] font-medium focus:bg-white focus:border-emerald-300/80 focus:shadow-[0_0_40px_rgba(16,185,129,0.2)] transition-all duration-500 resize-none"
              aria-label={question.text}
            />
          </div>
        )}

        {question.type === "radio" && question.options && (
          <RadioGroup value={answer} onValueChange={setAnswer} className="space-y-4 sm:space-y-5">
            {question.options.map((option) => (
              <div key={option} className="relative group cursor-pointer" onClick={() => setAnswer(option)}>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/30 via-teal-50/40 to-green-50/30 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                <div className="relative flex items-center space-x-4 sm:space-x-5 p-4 sm:p-6 rounded-3xl bg-white/70 hover:bg-white/90 transition-all duration-500 border-2 border-transparent hover:border-emerald-200/60 backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.05)] hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] min-h-[44px]">
                  <RadioGroupItem
                    value={option}
                    id={option}
                    className="border-2 border-teal-600 text-emerald-600 w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
                  />
                  <Label
                    htmlFor={option}
                    className="text-base sm:text-lg cursor-pointer flex-1 text-slate-900 font-medium leading-relaxed group-hover:text-slate-900 transition-colors duration-300 drop-shadow-sm"
                  >
                    {option}
                  </Label>
                </div>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.type === "multiselect" && question.options && (
          <div className="space-y-4 sm:space-y-5">
            {question.options.map((option) => (
              <div
                key={option}
                className="relative group cursor-pointer"
                onClick={() => handleMultiSelectChange(option, !multiSelectAnswers.includes(option))}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/30 via-teal-50/40 to-green-50/30 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                <div className="relative flex items-center space-x-4 sm:space-x-5 p-4 sm:p-6 rounded-3xl bg-white/70 hover:bg-white/90 transition-all duration-500 border-2 border-transparent hover:border-emerald-200/60 backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.05)] hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] min-h-[44px]">
                  <Checkbox
                    id={option}
                    checked={multiSelectAnswers.includes(option)}
                    onCheckedChange={(checked) => handleMultiSelectChange(option, checked as boolean)}
                    className="border-2 border-teal-600 data-[state=checked]:bg-emerald-500 w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
                  />
                  <Label
                    htmlFor={option}
                    className="text-base sm:text-lg cursor-pointer flex-1 text-slate-900 font-medium leading-relaxed group-hover:text-slate-900 transition-colors duration-300 drop-shadow-sm"
                  >
                    {option}
                  </Label>
                </div>
              </div>
            ))}
          </div>
        )}

        {question.type === "number" && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/20 via-teal-100/30 to-green-100/20 rounded-3xl blur-xl"></div>
            <Input
              type="number"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Whatever feels right..."
              className="relative text-lg sm:text-xl p-4 sm:p-6 bg-white/90 border-2 border-emerald-200/60 text-slate-900 placeholder:text-slate-700 backdrop-blur-xl rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.1)] font-medium focus:bg-white focus:border-emerald-300/80 focus:shadow-[0_0_40px_rgba(16,185,129,0.2)] transition-all duration-500 min-h-[44px]"
              aria-label={question.text}
            />
          </div>
        )}

        {question.type === "slider" && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/20 via-teal-100/30 to-green-100/20 rounded-3xl blur-xl"></div>
            <div className="relative space-y-6 sm:space-y-8 p-6 sm:p-8 bg-white/60 rounded-3xl backdrop-blur-xl border-2 border-emerald-200/40 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
              <Slider
                value={[answer || question.min || 0]}
                onValueChange={(value) => setAnswer(value[0])}
                max={question.max || 100}
                min={question.min || 0}
                step={question.step || 1}
                className="w-full h-6"
                aria-label={question.text}
              />
              <div className="flex justify-between text-lg sm:text-xl text-slate-800 font-semibold tracking-wide drop-shadow-sm">
                <span className="text-sm sm:text-base">{question.minLabel || question.min}</span>
                <span className="font-bold text-emerald-700 text-2xl sm:text-3xl">{answer || question.min || 0}</span>
                <span className="text-sm sm:text-base">{question.maxLabel || question.max}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pt-6 sm:pt-8">
        {micEnabled && (
          <Button
            variant="outline"
            onClick={onStartListening}
            disabled={isListening || isSpeaking || isSubmitting}
            className="relative group overflow-hidden flex items-center gap-3 sm:gap-4 bg-white/60 border-2 border-emerald-200/50 text-slate-800 hover:bg-white/80 hover:border-emerald-300/70 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(16,185,129,0.1)] font-medium transition-all duration-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] min-h-[44px] min-w-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Use voice input"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/30 via-teal-50/40 to-green-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <Mic className={`relative z-10 w-5 h-5 sm:w-6 sm:h-6 ${isListening ? "animate-pulse text-emerald-600" : ""}`} />
            <span className="relative z-10">{isListening ? "I'm listening..." : "Speak to me"}</span>
          </Button>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!isAnswerValid() || isSubmitting}
          className="relative group overflow-hidden bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500 hover:from-emerald-600 hover:via-green-500 hover:to-teal-600 text-white flex items-center gap-3 sm:gap-4 px-8 sm:px-10 py-3 sm:py-4 text-base sm:text-lg rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.4)] transform hover:scale-110 transition-all duration-700 font-medium tracking-wide border-2 border-emerald-400/30 min-h-[44px] min-w-[44px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          aria-label="Continue to next question"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 animate-spin" />
              <span className="relative z-10">Continuing...</span>
            </>
          ) : (
            <>
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
              <span className="relative z-10">Continue</span>
              <Send className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 