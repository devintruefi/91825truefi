"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, ArrowRight, Heart, Sparkles, ArrowLeft } from "lucide-react"
import { OnboardingQuestion } from "@/components/onboarding-question"
import { PennyOrb } from "@/components/penny-orb"
import { SeasonalBackground } from "@/components/seasonal-background"
import { SeasonalTransitions } from "@/components/seasonal-transitions"
import { ProgressDots } from "@/components/progress-dots"
import { VoiceWaveform } from "@/components/voice-waveform"
import { ConfettiEffect } from "@/components/confetti-effect"
import { FloatingElements } from "@/components/floating-elements"
import { useNaturalTheme } from "@/hooks/use-natural-theme"
import { questions } from "@/lib/onboarding-questions"
import Image from "next/image"

export default function OnboardingClient() {
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
        window.location.href = "/chat"
      }
    } catch (error) {
      console.error("Failed to save onboarding data:", error)
    }
  }

  const getSeasonalAnimationClass = (baseClass: string) => {
    if (!theme) return baseClass;
    const timeClasses = {
      dawn: "animate-dawn-fade-in",
      morning: "animate-morning-fade-in",
      afternoon: "animate-afternoon-fade-in",
      evening: "animate-evening-fade-in",
      night: "animate-night-fade-in",
    };
    const seasonClasses = {
      spring: "animate-spring-scale-in",
      summer: "animate-summer-scale-in",
      autumn: "animate-autumn-scale-in",
      winter: "animate-winter-scale-in",
    };
    if (baseClass.includes("fade-in")) {
      return timeClasses[theme.timeOfDay] || baseClass;
    }
    if (baseClass.includes("scale-in")) {
      return seasonClasses[theme.season] || baseClass;
    }
    return baseClass;
  };

  return (
    <SeasonalBackground>
      <SeasonalTransitions slideDirection={slideDirection}>
        {showWelcome && (
          <OnboardingQuestion
            question={questions[0]}
            onComplete={handleWelcomeComplete}
            onBack={handleBack}
            isTransitioning={isTransitioning}
            isComplete={isComplete}
            showConfetti={showConfetti}
            setShowConfetti={setShowConfetti}
            isSpeaking={isSpeaking}
            setIsSpeaking={setIsSpeaking}
            isListening={isListening}
            setIsListening={setIsListening}
            startListening={startListening}
            micEnabled={micEnabled}
            setMicEnabled={setMicEnabled}
            audioEnabled={audioEnabled}
            setAudioEnabled={setAudioEnabled}
            speakText={speakText}
            isLoaded={isLoaded}
            getSeasonalAnimationClass={getSeasonalAnimationClass}
          />
        )}
        {showPreQuestion && (
          <OnboardingQuestion
            question={questions[0]}
            onComplete={handlePreQuestionComplete}
            onBack={handleBack}
            isTransitioning={isTransitioning}
            isComplete={isComplete}
            showConfetti={showConfetti}
            setShowConfetti={setShowConfetti}
            isSpeaking={isSpeaking}
            setIsSpeaking={setIsSpeaking}
            isListening={isListening}
            setIsListening={setIsListening}
            startListening={startListening}
            micEnabled={micEnabled}
            setMicEnabled={setMicEnabled}
            audioEnabled={audioEnabled}
            setAudioEnabled={setAudioEnabled}
            speakText={speakText}
            isLoaded={isLoaded}
            getSeasonalAnimationClass={getSeasonalAnimationClass}
          />
        )}
        {!showWelcome && !showPreQuestion && (
          <OnboardingQuestion
            question={questions[currentQuestion]}
            onComplete={handleAnswer}
            onBack={handleBack}
            isTransitioning={isTransitioning}
            isComplete={isComplete}
            showConfetti={showConfetti}
            setShowConfetti={setShowConfetti}
            isSpeaking={isSpeaking}
            setIsSpeaking={setIsSpeaking}
            isListening={isListening}
            setIsListening={setIsListening}
            startListening={startListening}
            micEnabled={micEnabled}
            setMicEnabled={setMicEnabled}
            audioEnabled={audioEnabled}
            setAudioEnabled={setAudioEnabled}
            speakText={speakText}
            isLoaded={isLoaded}
            getSeasonalAnimationClass={getSeasonalAnimationClass}
          />
        )}
        {isComplete && (
          <ConfettiEffect />
        )}
        <FloatingElements />
      </SeasonalTransitions>
    </SeasonalBackground>
  )
} 