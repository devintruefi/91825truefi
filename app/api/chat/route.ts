// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as jwt from 'jsonwebtoken';
import { OnboardingManager, OnboardingState, OnboardingContext } from '@/lib/onboarding/manager';
import { ONBOARDING_STEPS, OnboardingStep } from '@/lib/onboarding/steps';
import { normalizeStepId, isValidStepId } from '@/lib/onboarding/step-utils';
import { initializeFreshSession, buildFreshSessionMessage, getItemsCollected } from '@/lib/onboarding/fresh-session';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body first
    const { 
      sessionId, 
      userId: requestUserId, 
      message, 
      componentResponse, 
      onboardingProgress,
      isOnboarding,
      userFirstName: requestUserFirstName
    } = await request.json();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let userId = '';
    let isAuthenticated = false;
    let userFirstName = 'there';

    // Check for authentication token
    if (!token) {
      console.log('No authorization token provided in request');
      
      // Check if this is an onboarding request - allow limited access
      if (isOnboarding || componentResponse) {
        console.log('Onboarding request detected without token - checking for userId in request');
        // For onboarding, try to use userId from request if provided
        if (requestUserId) {
          userId = requestUserId;
          userFirstName = requestUserFirstName || 'there';
          console.log('Using userId from request for onboarding:', userId);
        } else {
          console.error('No token and no userId in onboarding request');
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
      } else {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    } else {
      // Verify the token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        userId = decoded.userId || decoded.sub || decoded.user_id || '';
        userFirstName = decoded.first_name || decoded.firstName || 'there';
        isAuthenticated = true;
        console.log('Token verified successfully for user:', userId);
      } catch (error) {
        console.error('Token verification failed:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    // Use userId from token, not from request body for security
    if (!userId && requestUserId) {
      userId = requestUserId;
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Check if user is in onboarding
    let userOnboardingProgress = await prisma.onboarding_progress.findUnique({
      where: { user_id: userId }
    });

    // If no onboarding record exists, initialize fresh session properly
    if (!userOnboardingProgress) {
      console.log('No onboarding record found, initializing fresh session');
      const freshSession = await initializeFreshSession(userId);
      userOnboardingProgress = await prisma.onboarding_progress.findUnique({
        where: { user_id: userId }
      });
      console.log('Fresh session initialized:', {
        currentStep: freshSession.currentStep,
        itemsCollected: freshSession.itemsCollected,
        startedAtConsent: freshSession.shouldStartAtConsent
      });
    }

    const isOnboarding = !userOnboardingProgress?.is_complete;

    // If not in onboarding and no component response, handle as regular chat
    if (!isOnboarding && !componentResponse) {
      // Handle regular chat with OpenAI
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: "You are Penny, a friendly and knowledgeable AI financial advisor. Help users with their financial questions and guidance."
            },
            {
              role: "user",
              content: message || "Hello"
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

        const assistantMessage = completion.choices[0].message.content || "I'm here to help with your financial journey!";

        // Save to chat history
        if (sessionId) {
          await prisma.chat_messages.create({
            data: {
              id: crypto.randomUUID(),
              session_id: sessionId,
              user_id: userId,
              message_type: 'assistant',
              content: assistantMessage,
              turn_number: 1,
              created_at: new Date()
            }
          });
        }

        return NextResponse.json({
          content: assistantMessage,
          sessionId
        });
      } catch (error) {
        console.error('OpenAI API error:', error);
        return NextResponse.json({
          content: "I'm here to help with your financial journey! What would you like to know?",
          sessionId
        });
      }
    }

    // Check if user has Plaid data by querying database
    const plaidConnections = await prisma.plaid_connections.findMany({
      where: { user_id: userId }
    });
    const hasPlaidData = plaidConnections.length > 0;

    // Get items collected for progress tracking
    const itemsCollected = await getItemsCollected(userId);
    
    // Handle onboarding flow
    const state: OnboardingState = {
      userId,
      currentStep: userOnboardingProgress?.current_step as OnboardingStep || 'welcome',
      responses: onboardingProgress?.responses || {},
      progress: onboardingProgress || {},
      hasPlaidData: hasPlaidData,
      incomeConfirmed: onboardingProgress?.incomeConfirmed || false,
      selectedGoals: onboardingProgress?.selectedGoals || [],
      is_complete: userOnboardingProgress?.is_complete || false
    };

    const ctx: OnboardingContext = {
      userId,
      sessionId: sessionId || crypto.randomUUID(),
      prisma
    };

    let nextStep: OnboardingStep | 'complete' = state.currentStep;
    let assistantMessage = '';
    let component = null;

    // Handle initial message for fresh session (no componentResponse)
    // This should trigger when loading the chat page fresh without any interaction
    if (!componentResponse && !message && isOnboarding) {
      console.log('Fresh session - building initial component message');
      const freshMessage = buildFreshSessionMessage(state.currentStep as any, itemsCollected);
      
      // Save the component message to chat history
      if (sessionId) {
        await prisma.chat_messages.create({
          data: {
            id: crypto.randomUUID(),
            session_id: sessionId,
            user_id: userId,
            message_type: 'assistant',
            content: freshMessage.componentData.question,
            rich_content: {
              component: {
                type: freshMessage.componentType,
                stepId: freshMessage.stepId,
                data: freshMessage.componentData,
                meta: freshMessage.meta
              }
            },
            turn_number: 1,
            created_at: new Date()
          }
        });
      }
      
      return NextResponse.json({
        content: freshMessage.componentData.question,
        component: {
          type: freshMessage.componentType,
          stepId: freshMessage.stepId,
          data: freshMessage.componentData,
          meta: freshMessage.meta
        },
        onboardingProgress: {
          currentStep: state.currentStep,
          percent: freshMessage.header.percentage,
          stepNumber: freshMessage.header.index,
          totalSteps: freshMessage.header.total,
          itemsCollected: freshMessage.header.itemsCollected,
          isComplete: false
        },
        meta: {
          onboarding: true,
          progress: {
            currentStep: state.currentStep,
            percent: freshMessage.header.percentage
          }
        },
        sessionId: sessionId || crypto.randomUUID()
      });
    }
    
    // Handle component response
    if (componentResponse) {
      // Normalize and validate step ID
      const responseStepId = normalizeStepId(componentResponse.stepId || componentResponse.question);
      
      console.log('=== Onboarding Step Processing ===');
      console.log('User ID:', userId);
      console.log('Expected step:', state.currentStep);
      console.log('Received step ID (raw):', componentResponse.stepId || componentResponse.question || 'undefined');
      console.log('Received step ID (normalized):', responseStepId || 'undefined');
      console.log('Response value:', componentResponse.value !== undefined ? componentResponse.value : componentResponse);
      console.log('Component type:', componentResponse.componentType || 'not provided');
      
      // Validate that response is for current step
      if (responseStepId && responseStepId !== state.currentStep) {
        console.error('Step mismatch - expected:', state.currentStep, 'got:', responseStepId);
        
        // Attempt to recover by updating the current step to match the response
        // This handles cases where the frontend has a different step than the backend
        if (isValidStepId(responseStepId)) {
          console.log('Attempting step recovery - updating current step to:', responseStepId);
          
          // Update database to match the frontend state
          await prisma.onboarding_progress.upsert({
            where: { user_id: userId },
            update: {
              current_step: responseStepId,
              updated_at: new Date()
            },
            create: {
              user_id: userId,
              current_step: responseStepId,
              is_complete: false,
              updated_at: new Date()
            }
          });
          
          // Update the state to continue processing
          state.currentStep = responseStepId as OnboardingStep;
        } else {
          // If we can't recover, return sync error
          return NextResponse.json({
            error: 'OUT_OF_SYNC',
            message: `Expected response for step '${state.currentStep}' but got '${responseStepId}'`,
            expected: state.currentStep,
            received: responseStepId
          }, { status: 409 });
        }
      }
      
      // Process the response
      const answerValue = componentResponse.value !== undefined ? componentResponse.value : componentResponse;
      
      // Log the actual processing for debugging
      console.log('=== Processing Answer ===');
      console.log('Step:', state.currentStep);
      console.log('Answer value:', answerValue);
      console.log('Answer type:', typeof answerValue);
      
      try {
        await OnboardingManager.handleAnswer(
          state.currentStep,
          answerValue,
          ctx
        );
        console.log('Answer handled successfully');
      } catch (error) {
        console.error('Error handling answer:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
        console.error('Answer value that caused error:', answerValue);
        console.error('Current step that caused error:', state.currentStep);
        
        // Don't return error for non-critical failures, just log and continue
        console.log('WARNING: Error handling answer, continuing with flow');
      }

      // Determine next step
      console.log('=== Determining Next Step ===');
      console.log('Current state before next():', state);
      nextStep = OnboardingManager.next(state);
      console.log('Next step determined:', nextStep);

      // Skip any steps that should be skipped
      while (nextStep !== 'complete' && OnboardingManager.shouldSkip(nextStep, state)) {
        nextStep = OnboardingManager.next({ ...state, currentStep: nextStep });
      }

      // Update current step in database
      if (nextStep !== 'complete') {
        await prisma.onboarding_progress.upsert({
          where: { user_id: userId },
          update: { 
            current_step: nextStep,
            updated_at: new Date()
          },
          create: {
            user_id: userId,
            current_step: nextStep,
            is_complete: false,
            updated_at: new Date()
          }
        });
      } else {
        // Mark onboarding as complete
        await prisma.onboarding_progress.upsert({
          where: { user_id: userId },
          update: {
            current_step: 'complete',
            is_complete: true,
            updated_at: new Date()
          },
          create: {
            user_id: userId,
            current_step: 'complete',
            is_complete: true,
            updated_at: new Date()
          }
        });
      }

      state.currentStep = nextStep as OnboardingStep;
      console.log('State updated with next step:', state.currentStep);
      
      // Re-check Plaid data status after step processing (in case it changed)
      const updatedPlaidConnections = await prisma.plaid_connections.findMany({
        where: { user_id: userId }
      });
      state.hasPlaidData = updatedPlaidConnections.length > 0;
    }

    // Get component for current/next step
    console.log('=== Building Component for Step ===');
    console.log('State current step:', state.currentStep);
    const stepConfig = OnboardingManager.getCurrent(state);
    console.log('Step config found:', !!stepConfig);
    
    try {
      if (stepConfig) {
        assistantMessage = stepConfig.message;
        component = await OnboardingManager.buildComponent(state);
        console.log('Component built by OnboardingManager:', !!component);
        console.log('Component type:', component?.type);
        console.log('Component data keys:', component?.data ? Object.keys(component.data) : 'none');
        
        // If no component was built but we're in onboarding, use fresh session to build proper component
        if (!component && state.currentStep !== 'complete' && isOnboarding) {
          console.log('WARNING: No component built by OnboardingManager, using fresh session builder');
          const freshMessage = buildFreshSessionMessage(state.currentStep as any, itemsCollected);
          component = {
            type: freshMessage.componentType,
            stepId: freshMessage.stepId,
            data: freshMessage.componentData,
            meta: freshMessage.meta
          };
          assistantMessage = freshMessage.componentData.question;
        }
      } else if (nextStep === 'complete' || state.currentStep === 'complete') {
        assistantMessage = "🎉 Congratulations! Your financial wellness journey is all set up. Welcome to your personalized dashboard!";
      } else if (isOnboarding) {
        console.log('ERROR: No step config found, using fresh session builder for:', state.currentStep);
        // Use fresh session builder for any onboarding step
        const freshMessage = buildFreshSessionMessage(state.currentStep as any, itemsCollected);
        component = {
          type: freshMessage.componentType,
          stepId: freshMessage.stepId,
          data: freshMessage.componentData,
          meta: freshMessage.meta
        };
        assistantMessage = freshMessage.componentData.question;
      }
    } catch (buildError) {
      console.error('Error building component:', buildError);
      console.error('Error stack:', buildError instanceof Error ? buildError.stack : 'No stack');
      console.error('Current step when error occurred:', state.currentStep);
      
      // Try to recover with fresh session builder
      if (isOnboarding && state.currentStep !== 'complete') {
        console.log('Attempting recovery with fresh session builder');
        try {
          const freshMessage = buildFreshSessionMessage(state.currentStep as any, itemsCollected);
          component = {
            type: freshMessage.componentType,
            stepId: freshMessage.stepId,
            data: freshMessage.componentData,
            meta: freshMessage.meta
          };
          assistantMessage = freshMessage.componentData.question;
          console.log('Recovery successful with fresh session builder');
        } catch (freshError) {
          console.error('Fresh session builder also failed:', freshError);
          throw buildError; // Re-throw original error
        }
      } else {
        throw buildError;
      }
    }
    
    // Enhanced logging for debugging
    console.log('=== Onboarding Response Summary ===');
    console.log('User ID:', userId);
    console.log('Current step:', state.currentStep);
    console.log('Has component:', !!component);
    console.log('Component type:', component?.type);
    console.log('Component data keys:', component?.data ? Object.keys(component.data) : 'none');
    if (component?.data?.options) {
      console.log('Options count:', component.data.options.length);
    }

    // Calculate progress with step numbers
    const progress = OnboardingManager.getProgress(state);
    const detailedProgress = OnboardingManager.getDetailedProgress(state);

    // Build response - ensure we always have the expected structure
    const response = {
      content: assistantMessage,
      component: component,
      assistantMessage: {
        content: assistantMessage,
        component: component
      },
      onboardingProgress: {
        currentStep: state.currentStep,
        percent: progress,
        stepNumber: detailedProgress.stepNumber,
        totalSteps: detailedProgress.totalSteps,
        itemsCollected: itemsCollected,
        isComplete: state.is_complete
      },
      meta: {
        onboarding: !state.is_complete,
        progress: {
          currentStep: state.currentStep,
          percent: progress
        }
      },
      sessionId: sessionId || crypto.randomUUID()
    };

    // Save message to chat history with rich_content
    if (sessionId) {
      await prisma.chat_messages.create({
        data: {
          id: crypto.randomUUID(),
          session_id: sessionId,
          user_id: userId,
          message_type: 'assistant',
          content: assistantMessage,
          rich_content: component ? { component } : null,
          turn_number: 1,
          created_at: new Date()
        }
      });
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('=== CHAT ROUTE CRITICAL ERROR ===');
    console.error('Error Type:', error?.name || 'Unknown');
    console.error('Error Message:', error?.message || 'No message');
    console.error('Error Stack:', error?.stack || 'No stack trace');
    console.error('Full Error:', error);
    
    // Try to get current step from request or database
    let currentStepId = 'welcome';
    try {
      const { componentResponse, userId: requestUserId } = await request.clone().json();
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        const userId = decoded.userId || decoded.sub || decoded.user_id || requestUserId || '';
        
        if (userId) {
          const progress = await prisma.onboarding_progress.findUnique({
            where: { user_id: userId }
          });
          currentStepId = progress?.current_step || 'welcome';
        }
      }
      
      // If we have a component response, use its stepId
      if (componentResponse?.stepId) {
        currentStepId = componentResponse.stepId;
      }
    } catch (e) {
      // Fallback to 'welcome' if we can't determine the step
      console.error('Could not determine current step:', e);
    }
    
    // Return a user-friendly recoverable response
    const fallbackMessage = {
      content: "Looks like that didn't load properly. Want to retry or skip for now?",
      component: {
        type: 'buttons',
        stepId: currentStepId, // Use the actual current step
        data: {
          question: 'What would you like to do?',
          options: [
            { id: 'retry', label: 'Try again', value: '__retry__', icon: '🔄' },
            { id: 'skip', label: 'Skip for now', value: '__skip__', icon: '⏭️' }
          ]
        },
        meta: {
          nonce: crypto.randomUUID(),
          stepId: currentStepId,
          timestamp: new Date().toISOString()
        }
      },
      meta: { onboarding: true }
    };
    
    return NextResponse.json({
      content: fallbackMessage.content,
      component: fallbackMessage.component,
      assistantMessage: fallbackMessage,
      onboardingProgress: {
        currentStep: currentStepId,
        percent: 0,
        stepNumber: 1,
        totalSteps: 27,
        itemsCollected: 0,
        isComplete: false
      },
      meta: fallbackMessage.meta,
      sessionId: crypto.randomUUID()
    }, { status: 200 });
  }
}