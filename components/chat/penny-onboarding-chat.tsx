"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useUser } from '@/contexts/user-context';
import { OnboardingComponents } from './onboarding-components';
import { onboardingFlow, quickStartTemplates } from '@/lib/onboarding/onboarding-flow';
import { OnboardingPhase, OnboardingMessage, OnboardingProgress } from '@/lib/onboarding/types';
import { OnboardingProgressSidebar } from './onboarding-progress-sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Send, 
  Trophy, 
  Star, 
  CheckCircle,
  ArrowRight,
  Loader2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content?: string;
  component?: OnboardingMessage;
  timestamp: Date;
}

export function PennyOnboardingChat() {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPhase, setCurrentPhase] = useState<OnboardingPhase>('welcome');
  const [progress, setProgress] = useState<OnboardingProgress>({
    userId: user?.id || '',
    currentPhase: 'welcome',
    completedPhases: [],
    answers: {},
    startedAt: new Date(),
    lastUpdated: new Date(),
    completionPercentage: 0,
    points: 0,
    achievements: []
  });
  const [isTyping, setIsTyping] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize onboarding on mount - always start fresh
  useEffect(() => {
    if (user) {
      // Clear any existing onboarding data from localStorage to ensure fresh start
      localStorage.removeItem('onboarding_progress');
      localStorage.removeItem('onboarding_complete');
      startOnboarding();
    }
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startOnboarding = async () => {
    // Reset state to ensure fresh start
    setMessages([]);
    setCurrentPhase('welcome');
    setCurrentQuestionIndex(0);
    setProgress({
      userId: user?.id || '',
      currentPhase: 'welcome',
      completedPhases: [],
      answers: {},
      startedAt: new Date(),
      lastUpdated: new Date(),
      completionPercentage: 0,
      points: 0,
      achievements: []
    });
    
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome-1',
      role: 'assistant',
      content: onboardingFlow.phases.welcome.questions[0].content,
      component: onboardingFlow.phases.welcome.questions[0],
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const triggerCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleComponentComplete = async (value: any, message: OnboardingMessage) => {
    // Save answer
    const updatedAnswers = {
      ...progress.answers,
      [message.saveKey || message.id]: value
    };

    // Add user's response to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: typeof value === 'string' ? value : JSON.stringify(value),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Calculate progress based on total questions answered
    const phaseOrder: OnboardingPhase[] = [
      'welcome', 'quick-wins', 'financial-snapshot', 
      'personalization', 'goals-dreams', 'complete'
    ];
    const totalQuestions = phaseOrder.reduce((sum, phase) => {
      if (phase === 'complete') return sum;
      return sum + (onboardingFlow.phases[phase]?.questions?.length || 0);
    }, 0);
    const answeredQuestions = Object.keys(updatedAnswers).length;
    const progressPercentage = Math.min(100, Math.round((answeredQuestions / totalQuestions) * 100));

    // Update progress
    const updatedProgress: OnboardingProgress = {
      ...progress,
      answers: updatedAnswers,
      lastUpdated: new Date(),
      points: progress.points + 10,
      completionPercentage: progressPercentage
    };

    // Check for celebration
    if (message.celebration) {
      triggerCelebration();
      updatedProgress.achievements.push(`completed-${currentPhase}`);
    }

    // Save to backend
    await saveProgress(updatedProgress);

    // Move to next question or phase
    moveToNext(updatedProgress);
  };

  const moveToNext = async (updatedProgress: OnboardingProgress) => {
    const phase = onboardingFlow.phases[currentPhase];
    const nextQuestionIndex = currentQuestionIndex + 1;

    if (nextQuestionIndex < phase.questions.length) {
      // Next question in current phase
      setCurrentQuestionIndex(nextQuestionIndex);
      await addAssistantMessage(phase.questions[nextQuestionIndex]);
    } else {
      // Move to next phase
      const phaseOrder: OnboardingPhase[] = [
        'welcome', 'quick-wins', 'financial-snapshot', 
        'personalization', 'goals-dreams', 'complete'
      ];
      const currentIndex = phaseOrder.indexOf(currentPhase);
      
      if (currentIndex < phaseOrder.length - 1) {
        const nextPhase = phaseOrder[currentIndex + 1];
        
        // Check if user chose quick setup and should skip some phases
        if (updatedProgress.answers.onboardingDepth === 'quick' && 
            (nextPhase === 'personalization' || nextPhase === 'goals-dreams')) {
          // Skip to complete
          completeOnboarding(updatedProgress);
        } else {
          // Transition message
          await addTransitionMessage(nextPhase);
          
          // Move to next phase
          setCurrentPhase(nextPhase);
          setCurrentQuestionIndex(0);
          
          // Add first question of new phase
          await addAssistantMessage(onboardingFlow.phases[nextPhase].questions[0]);
          
          // Update progress
          if (!updatedProgress.completedPhases.includes(currentPhase)) {
            updatedProgress.completedPhases.push(currentPhase);
          }
          updatedProgress.currentPhase = nextPhase;
          
          // Recalculate progress percentage based on questions answered
          const totalQuestions = phaseOrder.reduce((sum, phase) => {
            if (phase === 'complete') return sum;
            return sum + (onboardingFlow.phases[phase]?.questions?.length || 0);
          }, 0);
          const answeredQuestions = Object.keys(updatedProgress.answers).length;
          updatedProgress.completionPercentage = Math.min(100, Math.round((answeredQuestions / totalQuestions) * 100));
        }
      } else {
        // Onboarding complete!
        completeOnboarding(updatedProgress);
      }
    }
    
    setProgress(updatedProgress);
  };

  const addAssistantMessage = async (message: OnboardingMessage) => {
    setIsTyping(true);
    
    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: message.content,
      component: message,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(false);
    
    // Play sound if enabled
    if (audioEnabled) {
      playNotificationSound();
    }
  };

  const addTransitionMessage = async (nextPhase: OnboardingPhase) => {
    const transitionMessages: Record<OnboardingPhase, string> = {
      'welcome': '',
      'quick-wins': "Great! Let's understand what matters most to you 🎯",
      'financial-snapshot': "Perfect! Now let's get a quick snapshot of your finances 📊",
      'personalization': "Awesome! Let's personalize your experience ✨",
      'goals-dreams': "You're doing amazing! Let's talk about your dreams 🌟",
      'complete': "🎉 Congratulations! You're all set!"
    };

    if (transitionMessages[nextPhase]) {
      const message: ChatMessage = {
        id: `transition-${Date.now()}`,
        role: 'system',
        content: transitionMessages[nextPhase],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, message]);
      
      // Trigger mini celebration
      if (nextPhase === 'complete') {
        triggerCelebration();
      }
    }
  };

  const completeOnboarding = async (finalProgress: OnboardingProgress) => {
    // Save final progress
    finalProgress.completedPhases.push(currentPhase);
    finalProgress.completionPercentage = 100;
    await saveProgress(finalProgress);

    // Generate dashboard data
    await generateDashboard(finalProgress);

    // Add completion message
    const completionMessage: ChatMessage = {
      id: 'complete-1',
      role: 'assistant',
      content: "🎉 Amazing! Your personalized dashboard is ready with custom insights, budget recommendations, and goal tracking!",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, completionMessage]);

    // Big celebration!
    triggerCelebration();
    
    // Redirect to dashboard after delay
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 3000);
  };

  const saveProgress = async (progressData: OnboardingProgress) => {
    try {
      const response = await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progressData)
      });
      
      if (!response.ok) {
        console.error('Failed to save progress');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const generateDashboard = async (progressData: OnboardingProgress) => {
    try {
      const response = await fetch('/api/onboarding/generate-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          answers: progressData.answers
        })
      });
      
      if (!response.ok) {
        console.error('Failed to generate dashboard');
      }
    } catch (error) {
      console.error('Error generating dashboard:', error);
    }
  };

  const playNotificationSound = () => {
    // Simple beep sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA');
    audio.play().catch(() => {});
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    // Get current question
    const phase = onboardingFlow.phases[currentPhase];
    const currentQuestion = phase.questions[currentQuestionIndex];
    
    // Process text input based on question type
    if (currentQuestion.type === 'text' || !currentQuestion.type) {
      handleComponentComplete(textInput, currentQuestion);
    }
    
    setTextInput('');
  };

  const renderComponent = (message: OnboardingMessage) => {
    const Component = OnboardingComponents[message.type as keyof typeof OnboardingComponents];
    
    if (!Component && message.type !== 'text') {
      return null;
    }

    if (message.type === 'text') {
      return null; // Text messages are displayed as content
    }

    return (
      <Component
        data={message.data}
        onComplete={(value) => handleComponentComplete(value, message)}
        onSkip={message.skipOption ? () => handleComponentComplete(null, message) : undefined}
      />
    );
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Progress Sidebar */}
      <OnboardingProgressSidebar
        progress={progress}
        currentPhase={currentPhase}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestionsInPhase={onboardingFlow.phases[currentPhase].questions.length}
      />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🪙</span>
                  </div>
                  {isTyping && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold">Penny - Your AI Financial Assistant</h2>
                  <p className="text-xs text-gray-500">
                    {currentPhase === 'welcome' ? 'Let\'s get to know each other!' :
                     currentPhase === 'quick-wins' ? 'Understanding your situation...' :
                     currentPhase === 'financial-snapshot' ? 'Getting your financial overview...' :
                     currentPhase === 'personalization' ? 'Personalizing your experience...' :
                     currentPhase === 'goals-dreams' ? 'Setting up your goals...' :
                     'Almost done!'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Points */}
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3" />
                  {progress.points} pts
                </Badge>
                
                {/* Audio Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
            <AnimatePresence>
              {messages.map((message, messageIndex) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                  "flex",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-lg",
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm px-4 py-2'
                      : message.role === 'system'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl px-4 py-2 text-center w-full'
                      : 'bg-white dark:bg-gray-800 rounded-2xl rounded-bl-sm shadow-lg p-4'
                  )}
                >
                  {message.content && (
                    <div>
                      {message.role === 'assistant' && messageIndex === messages.length - 1 && (
                        <div className="text-xs text-gray-500 mb-2">
                          Step {currentQuestionIndex + 1} of {onboardingFlow.phases[currentPhase].questions.length}
                        </div>
                      )}
                      <p className={message.role === 'system' ? 'font-semibold' : ''}>
                        {message.content}
                      </p>
                    </div>
                  )}
                  {message.component && message.role === 'assistant' && (
                    <div className="mt-4">
                      {renderComponent(message.component)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-sm shadow-lg px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </motion.div>
          )}
          
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input (for text questions) */}
        {onboardingFlow.phases[currentPhase].questions[currentQuestionIndex]?.type === 'text' && (
          <div className="bg-white dark:bg-gray-900 border-t">
            <form onSubmit={handleTextSubmit} className="max-w-2xl mx-auto px-6 py-4">
              <div className="flex gap-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your answer here and press Enter..."
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" disabled={!textInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}