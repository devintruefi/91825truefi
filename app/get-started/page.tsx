"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, ArrowRight, Heart, Sparkles, ArrowLeft } from "lucide-react"
import { OnboardingQuestion } from "@/components/onboarding/onboarding-question"
import { PennyOrb } from "@/components/onboarding/penny-orb"
import { SeasonalBackground } from "@/components/onboarding/seasonal-background"
import { SeasonalTransitions } from "@/components/onboarding/seasonal-transitions"
import { ProgressDots } from "@/components/onboarding/progress-dots"
import { VoiceWaveform } from "@/components/onboarding/voice-waveform"
import { ConfettiEffect } from "@/components/onboarding/confetti-effect"
import { FloatingElements } from "@/components/onboarding/floating-elements"
import { useNaturalTheme } from "@/hooks/use-natural-theme"
import { questions } from "@/lib/onboarding/onboarding-questions"
import Image from "next/image"
import { useUser } from '@/contexts/user-context';

declare global {
  interface Window {
    webkitSpeechRecognition: any
  }
}

export default function GetStartedPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(true)
  const [isComplete, setIsComplete] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [showPreQuestion, setShowPreQuestion] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [slideDirection, setSlideDirection] = useState<"next" | "prev">("next")
  const [showConfetti, setShowConfetti] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [nextQuestion, setNextQuestion] = useState<number | null>(null)

  const theme = useNaturalTheme()
  const recognitionRef = useRef<any | null>(null)
  const synthRef = useRef<any | null>(null)
  const ambientAudioRef = useRef<any | null>(null)
  const { user } = useUser();

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const recognition = new (window as any).webkitSpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = "en-US"
      recognitionRef.current = recognition
    }

    // Initialize speech synthesis
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis
    }

    // Initialize ambient audio
    if (typeof window !== "undefined") {
      const ambientAudio = new Audio("/ocean-sanctuary.mp3")
      ambientAudio.loop = true
      ambientAudio.volume = 0.2
      ambientAudioRef.current = ambientAudio

      const startAudio = async () => {
        try {
          await ambientAudio.play()
        } catch (error) {
          console.log("Audio autoplay blocked")
        }
      }

      setTimeout(() => {
        setIsLoaded(true)
        startAudio()
      }, 1500)
    }

    return () => {
      if (ambientAudioRef.current) ambientAudioRef.current.pause()
    }
  }, [])

  const speakText = (text: string, isIntimate = false) => {
    if (!audioEnabled || !synthRef.current) return

    const speak = () => {
      const voices = synthRef.current.getVoices()
      const utterance = new SpeechSynthesisUtterance(text)

      const preferredVoice =
        voices.find((voice) => voice.name.includes("Samantha")) ||
        voices.find((voice) => voice.name.includes("Karen")) ||
        voices.find((voice) => voice.name.includes("Moira")) ||
        voices.find((voice) => voice.lang.includes("en") && voice.name.toLowerCase().includes("female"))

      if (preferredVoice) {
        utterance.voice = preferredVoice
      }

      utterance.rate = isIntimate ? 0.7 : 0.75
      utterance.pitch = isIntimate ? 0.8 : 0.85
      utterance.volume = 0.9

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)

      synthRef.current.speak(utterance)
    }

    if (synthRef.current.getVoices().length === 0) {
      synthRef.current.onvoiceschanged = speak
    } else {
      speak()
    }
  }

  const startListening = () => {
    if (!micEnabled || !recognitionRef.current) return

    setIsListening(true)
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      handleAnswer(transcript)
    }

    recognitionRef.current.onerror = () => setIsListening(false)
    recognitionRef.current.onend = () => setIsListening(false)

    recognitionRef.current.start()
  }

  const handleAnswer = (answer: any) => {
    const questionId = questions[currentQuestion].id
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))

    if (currentQuestion < questions.length - 1) {
      const nextQuestionIndex = currentQuestion + 1

      // Set next question and start transition
      setNextQuestion(nextQuestionIndex)
      setIsTransitioning(true)
      setSlideDirection("next")

      // Complete transition
      setTimeout(() => {
        setCurrentQuestion(nextQuestionIndex)
        setNextQuestion(null)
        setIsTransitioning(false)

        // Speak next question after transition completes
        setTimeout(() => {
          speakText(questions[nextQuestionIndex].text)
        }, 100)
      }, 200)
    } else {
      setIsTransitioning(true)
      setTimeout(() => {
        setIsComplete(true)
        setShowConfetti(true)
        setIsTransitioning(false)
        setTimeout(() => {
          speakText(
            "Thank you for trusting me with your story. I can already see the beautiful financial future we're going to create together. You're not alone in this journey anymore.",
            true,
          )
        }, 300)
      }, 200)
    }
  }

  const handleWelcomeComplete = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setShowWelcome(false)
      setShowPreQuestion(true)
      setTimeout(() => {
        setIsTransitioning(false)
        speakText(
          "It's absolutely okay if you don't have all the answers right now. This is just the beginning. As we continue talking, I'll get to know you better. I'm here with you, steady and supportive, every step of the way.",
          true,
        )
      }, 300)
    }, 200)
  }

  const handlePreQuestionComplete = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setShowPreQuestion(false)
      setTimeout(() => {
        setIsTransitioning(false)
        speakText(questions[0].text)
      }, 300)
    }, 200)
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      const prevQuestionIndex = currentQuestion - 1

      setNextQuestion(prevQuestionIndex)
      setIsTransitioning(true)
      setSlideDirection("prev")

      setTimeout(() => {
        setCurrentQuestion(prevQuestionIndex)
        setNextQuestion(null)
        setIsTransitioning(false)
      }, 200)
    }
  }

  const saveOnboardingData = async () => {
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })

      if (response.ok) {
        if (user) {
          window.location.href = "/chat";
        } else {
          window.location.href = "/auth";
        }
      }
    } catch (error) {
      console.error("Failed to save onboarding data:", error)
    }
  }

  const getSeasonalAnimationClass = (baseClass: string) => {
    const timeClasses = {
      dawn: "animate-dawn-fade-in",
      morning: "animate-morning-fade-in",
      afternoon: "animate-afternoon-fade-in",
      evening: "animate-evening-fade-in",
      night: "animate-night-fade-in",
    }

    const seasonClasses = {
      spring: "animate-spring-scale-in",
      summer: "animate-summer-scale-in",
      autumn: "animate-autumn-scale-in",
      winter: "animate-winter-scale-in",
    }

    if (baseClass.includes("fade-in")) {
      return timeClasses[theme.timeOfDay] || baseClass
    }
    if (baseClass.includes("scale-in")) {
      return seasonClasses[theme.season] || baseClass
    }
    return baseClass
  }

  return (
    <SeasonalTransitions isTransitioning={isTransitioning}>
      <div className="fixed inset-0 w-screen h-screen overflow-hidden">
        {/* Seasonal Background - Full Screen */}
        <SeasonalBackground />

        {/* Floating Elements */}
        <FloatingElements />

        {/* Logo in corner - Fixed position */}
        <div className="fixed top-4 left-4 z-50">
          <div className="bg-white/30 backdrop-blur-2xl rounded-2xl p-3 shadow-[0_0_30px_rgba(16,185,129,0.2)] border-2 border-emerald-200/30 hover:scale-105 transition-all duration-500">
            <Image src="/images/fin-logo-new.png" alt="TrueFi.ai" width={32} height={32} className="opacity-90" />
          </div>
        </div>

        {/* Audio Controls - Fixed position */}
        <div className="fixed top-4 right-4 flex gap-2 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="bg-white/30 backdrop-blur-2xl hover:bg-white/50 border-2 border-emerald-200/30 text-slate-800 shadow-[0_0_25px_rgba(16,185,129,0.15)] rounded-full w-12 h-12 p-0 transition-all duration-300 hover:scale-110"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMicEnabled(!micEnabled)}
            className="bg-white/30 backdrop-blur-2xl hover:bg-white/50 border-2 border-emerald-200/30 text-slate-800 shadow-[0_0_25px_rgba(16,185,129,0.15)] rounded-full w-12 h-12 p-0 transition-all duration-300 hover:scale-110"
          >
            {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
        </div>

        {/* Main Content - Scrollable and responsive */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10">
          <div className="w-full max-w-3xl mx-auto flex flex-col h-full">
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* All the main onboarding content goes here (showWelcome, showPreQuestion, isComplete, or questions) */}
              {showWelcome ? (
                <div
                  className={`transition-all duration-300 ease-out ${
                    isLoaded ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
                  } ${isTransitioning ? "animate-seamless-fade-out" : ""}`}
                >
                  <div className="text-center space-y-8">
                    <div className="relative animate-gentle-float">
                      <PennyOrb isSpeaking={isSpeaking} size="large" />
                      <div className="absolute inset-0 bg-gradient-radial from-emerald-300/15 via-transparent to-transparent blur-3xl animate-pulse"></div>
                    </div>

                    <div className={`space-y-6 ${getSeasonalAnimationClass("animate-organic-fade-in")}`}>
                      <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-slate-900 leading-tight tracking-wide drop-shadow-sm">
                        Welcome to Your
                        <span className="block text-slate-900 font-semibold mt-2">Financial Sanctuary</span>
                      </h1>

                      <p className="text-lg sm:text-xl md:text-2xl text-slate-800 leading-relaxed max-w-3xl mx-auto font-medium tracking-wide drop-shadow-sm">
                        I'm Penny. I'm here to walk with you through your financial journey, offering support, insight,
                        and a little peace of mind along the way.
                      </p>

                      <p className="text-base sm:text-lg text-slate-700 leading-relaxed max-w-2xl mx-auto font-medium drop-shadow-sm">
                        This is your safe space. Take a deep breath, let the gentle sounds wash over you, and know that
                        together, we'll create something beautiful.
                      </p>
                    </div>

                    <div className={getSeasonalAnimationClass("animate-organic-scale-in")}>
                      <Button
                        onClick={handleWelcomeComplete}
                        className="relative group overflow-hidden bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500 hover:from-emerald-600 hover:via-green-500 hover:to-teal-600 text-white px-8 py-4 text-lg sm:text-xl rounded-full shadow-[0_0_40px_rgba(16,185,129,0.4)] transform hover:scale-110 transition-all duration-700 font-medium tracking-wide border-2 border-emerald-400/30"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        <Heart className="mr-3 w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                        <span className="relative z-10">I'm Ready</span>
                        <ArrowRight className="ml-3 w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : showPreQuestion ? (
                <div
                  className={`transition-all duration-300 opacity-100 ${
                    isTransitioning ? "animate-seamless-fade-out" : "animate-seamless-fade-in"
                  }`}
                >
                  <div className="text-center space-y-8">
                    <div className="relative animate-gentle-float">
                      <PennyOrb isSpeaking={isSpeaking} size="medium" />
                      <div className="absolute inset-0 bg-gradient-radial from-green-300/12 via-transparent to-transparent blur-2xl animate-pulse"></div>
                    </div>

                    <div className={`space-y-6 ${getSeasonalAnimationClass("animate-organic-fade-in")}`}>
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-900 leading-tight tracking-wide drop-shadow-sm">
                        Before We Begin...
                      </h2>

                      <Card
                        className={`relative overflow-hidden bg-gradient-to-br from-white/60 via-emerald-50/50 to-teal-50/60 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-8 border-2 border-emerald-200/40 shadow-[0_0_60px_rgba(16,185,129,0.15)] ${getSeasonalAnimationClass("animate-organic-scale-in")}`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                        <p className="relative text-base sm:text-lg md:text-xl text-slate-800 leading-relaxed font-medium italic tracking-wide drop-shadow-sm">
                          It's absolutely okay if you don't have all the answers right now. This is just the beginning. As
                          we continue talking, I'll get to know you better. I'm here with you, steady and supportive,
                          every step of the way.
                        </p>
                      </Card>

                      <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-2xl mx-auto font-medium tracking-wide drop-shadow-sm">
                        Your financial journey is unique, and there's no right or wrong way to feel about money. Let's
                        explore this together, gently.
                      </p>
                    </div>

                    <div className={getSeasonalAnimationClass("animate-organic-scale-in")}>
                      <Button
                        onClick={handlePreQuestionComplete}
                        className="relative group overflow-hidden bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500 hover:from-emerald-600 hover:via-green-500 hover:to-teal-600 text-white px-6 py-3 text-base sm:text-lg rounded-full shadow-[0_0_30px_rgba(16,185,129,0.3)] transform hover:scale-110 transition-all duration-700 font-medium tracking-wide border-2 border-emerald-400/30"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        <Sparkles className="mr-2 w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
                        <span className="relative z-10">Let's Begin Together</span>
                        <Sparkles className="ml-2 w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : isComplete ? (
                <div
                  className={`transition-all duration-300 opacity-100 relative ${
                    isTransitioning ? "animate-seamless-fade-out" : "animate-seamless-fade-in"
                  }`}
                >
                  {showConfetti && <ConfettiEffect />}

                  <div className="text-center space-y-8">
                    <div className="relative animate-gentle-float">
                      <PennyOrb isSpeaking={isSpeaking} size="large" />
                      <div className="absolute inset-0 bg-gradient-radial from-emerald-300/15 via-transparent to-transparent blur-3xl animate-pulse"></div>
                    </div>

                    <div className={`space-y-6 ${getSeasonalAnimationClass("animate-organic-fade-in")}`}>
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-900 leading-tight tracking-wide drop-shadow-sm">
                        Thank You for
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500 font-semibold mt-2 animate-shimmer">
                          Trusting Me
                        </span>
                      </h2>

                      <p className="text-lg sm:text-xl md:text-2xl text-slate-800 leading-relaxed max-w-3xl mx-auto font-medium tracking-wide drop-shadow-sm">
                        I can already see the beautiful financial future we're going to create together. You're not alone
                        in this journey anymore.
                      </p>
                    </div>

                    <div className={getSeasonalAnimationClass("animate-organic-scale-in")}>
                      <Button
                        onClick={saveOnboardingData}
                        className="relative group overflow-hidden bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500 hover:from-emerald-600 hover:via-green-500 hover:to-teal-600 text-white px-8 py-4 text-lg sm:text-xl rounded-full shadow-[0_0_50px_rgba(16,185,129,0.5)] transform hover:scale-110 transition-all duration-700 font-medium tracking-wide border-2 border-emerald-400/30"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        <MessageSquare className="mr-3 w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                        <span className="relative z-10">Begin Our Journey</span>
                        <Heart className="ml-3 w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Question Card with Enhanced Animation */}
                  <div className="relative min-h-[400px] sm:min-h-[500px]">
                    {/* Current question */}
                    <Card
                      className={`${isTransitioning ? "absolute" : "relative"} inset-0 overflow-hidden bg-gradient-to-br from-white/80 via-emerald-50/60 to-teal-50/70 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-8 md:p-10 border-2 border-emerald-200/50 shadow-[0_0_80px_rgba(16,185,129,0.2)] transition-opacity duration-200 ease-out ${
                          isTransitioning ? "opacity-0 z-10" : "opacity-100 z-20"
                        }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-shimmer"></div>
                      <div className="relative flex flex-col lg:flex-row items-start gap-6 sm:gap-8">
                        <div className="relative animate-gentle-float">
                          <PennyOrb isSpeaking={isSpeaking} size="medium" className="flex-shrink-0" />
                          <div className="absolute inset-0 bg-gradient-radial from-emerald-300/12 via-transparent to-transparent blur-2xl animate-pulse"></div>
                        </div>
                        <div className="flex-1 w-full">
                          <OnboardingQuestion
                            question={questions[currentQuestion]}
                            onAnswer={handleAnswer}
                            isListening={isListening}
                            onStartListening={startListening}
                            micEnabled={micEnabled}
                            isSpeaking={isSpeaking}
                          />
                        </div>
                      </div>
                    </Card>
                    {/* Next question (preloaded for seamless transition) */}
                    {isTransitioning && nextQuestion !== null && nextQuestion < questions.length && (
                      <Card className="absolute inset-0 overflow-hidden bg-gradient-to-br from-white/80 via-emerald-50/60 to-teal-50/70 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-8 md:p-10 border-2 border-emerald-200/50 shadow-[0_0_80px_rgba(16,185,129,0.2)] transition-opacity duration-200 ease-out opacity-100 z-30">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-shimmer"></div>
                        <div className="relative flex flex-col lg:flex-row items-start gap-6 sm:gap-8">
                          <div className="relative animate-gentle-float">
                            <PennyOrb isSpeaking={false} size="medium" className="flex-shrink-0" />
                            <div className="absolute inset-0 bg-gradient-radial from-emerald-300/12 via-transparent to-transparent blur-2xl animate-pulse"></div>
                          </div>
                          <div className="flex-1 w-full">
                            <OnboardingQuestion
                              question={questions[nextQuestion]}
                              onAnswer={() => {}}
                              isListening={false}
                              onStartListening={() => {}}
                              micEnabled={micEnabled}
                              isSpeaking={false}
                            />
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Back Button */}
                  {!showWelcome && !showPreQuestion && !isComplete && currentQuestion > 0 && (
                    <div className="flex justify-center">
                      <Button
                        onClick={handleBack}
                        variant="outline"
                        className="relative group overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-emerald-200/50 text-slate-800 hover:bg-white/80 hover:border-emerald-300/70 px-6 py-3 text-base rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.1)] font-medium transition-all duration-300 hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/30 via-teal-50/40 to-green-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <ArrowLeft className="mr-2 w-4 h-4 relative z-10" />
                        <span className="relative z-10">Back</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Sticky Progress Dots and Voice Waveform */}
            <div className="sticky bottom-0 left-0 w-full bg-transparent z-20">
              {!showWelcome && !showPreQuestion && !isComplete && (
                <ProgressDots
                  total={questions.length}
                  current={currentQuestion}
                  className="mx-auto"
                />
              )}
              {isListening && <VoiceWaveform className="mx-auto mt-2" />}
            </div>
          </div>
        </div>
      </div>
    </SeasonalTransitions>
  )
} 