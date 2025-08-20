// Manages dedicated onboarding chat sessions
// Ensures onboarding happens in isolated chat context

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface OnboardingChatSession {
  sessionId: string;
  userId: string;
  isOnboarding: true;
  startedAt: Date;
  completedAt?: Date;
  currentStep: string;
  messages: OnboardingMessage[];
}

export interface OnboardingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  component_type?: ComponentType;
  component_data?: any;
  is_onboarding: boolean;
  onboarding_progress_snapshot?: any;
  timestamp: Date;
}

export type ComponentType = 
  | 'plaid'
  | 'income_confirm'
  | 'goals_select'
  | 'risk_slider'
  | 'dependents_select'
  | 'budget_review'
  | 'dashboard_preview'
  | 'info_card'
  | 'buttons'
  | 'pie_chart'
  | 'progress_bar'
  | 'error_card'
  | 'success_card';

export interface ComponentContract<T = any> {
  kind: 'plaid' | 'income' | 'goals' | 'risk' | 'dependents' | 'budget' | 'finish';
  value: T;
}

export class OnboardingChatSessionManager {
  private userId: string;
  private sessionId?: string;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  // Get or create dedicated onboarding session
  async getOrCreateSession(): Promise<string> {
    try {
      // Check if user has an existing onboarding session
      const existingSession = await prisma.ai_conversation_context.findFirst({
        where: {
          user_id: this.userId,
          is_onboarding: true,
          is_complete: false
        },
        orderBy: {
          created_at: 'desc'
        }
      });
      
      if (existingSession) {
        this.sessionId = existingSession.id;
        return existingSession.id;
      }
      
      // Create new onboarding session
      const newSession = await prisma.ai_conversation_context.create({
        data: {
          id: crypto.randomUUID(),
          user_id: this.userId,
          session_id: `onboarding_${Date.now()}`,
          is_onboarding: true,
          is_complete: false,
          context: {
            type: 'onboarding',
            startedAt: new Date(),
            currentStep: 'connect_accounts'
          },
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      this.sessionId = newSession.id;
      
      // Update user to track onboarding session
      await prisma.users.update({
        where: { id: this.userId },
        data: {
          onboarding_session_id: newSession.id,
          updated_at: new Date()
        }
      });
      
      return newSession.id;
      
    } catch (error) {
      console.error('Failed to get/create onboarding session:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
  
  // Save structured message with component data
  async saveStructuredMessage(
    role: 'user' | 'assistant',
    content: string,
    componentType?: ComponentType,
    componentData?: any,
    progressSnapshot?: any
  ): Promise<void> {
    if (!this.sessionId) {
      this.sessionId = await this.getOrCreateSession();
    }
    
    try {
      await prisma.ai_messages.create({
        data: {
          id: crypto.randomUUID(),
          conversation_id: this.sessionId,
          user_id: this.userId,
          role: role,
          content: content,
          component_type: componentType,
          component_data: componentData ? JSON.stringify(componentData) : null,
          is_onboarding: true,
          onboarding_progress_snapshot: progressSnapshot ? JSON.stringify(progressSnapshot) : null,
          created_at: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to save structured message:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
  
  // Load session history with structured components
  async loadSessionHistory(): Promise<OnboardingMessage[]> {
    if (!this.sessionId) {
      this.sessionId = await this.getOrCreateSession();
    }
    
    try {
      const messages = await prisma.ai_messages.findMany({
        where: {
          conversation_id: this.sessionId,
          is_onboarding: true
        },
        orderBy: {
          created_at: 'asc'
        }
      });
      
      return messages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        component_type: msg.component_type as ComponentType | undefined,
        component_data: msg.component_data ? JSON.parse(msg.component_data as string) : undefined,
        is_onboarding: true,
        onboarding_progress_snapshot: msg.onboarding_progress_snapshot ? 
          JSON.parse(msg.onboarding_progress_snapshot as string) : undefined,
        timestamp: msg.created_at
      }));
      
    } catch (error) {
      console.error('Failed to load session history:', error);
      return [];
    } finally {
      await prisma.$disconnect();
    }
  }
  
  // Mark session as complete
  async completeSession(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session to complete');
    }
    
    try {
      await prisma.ai_conversation_context.update({
        where: { id: this.sessionId },
        data: {
          is_complete: true,
          context: {
            ...(await this.getContext()),
            completedAt: new Date()
          },
          updated_at: new Date()
        }
      });
      
      // Clear onboarding session from user
      await prisma.users.update({
        where: { id: this.userId },
        data: {
          onboarding_session_id: null,
          has_completed_onboarding: true,
          onboarding_completed_at: new Date(),
          updated_at: new Date()
        }
      });
      
    } catch (error) {
      console.error('Failed to complete session:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
  
  // Get current context
  private async getContext(): Promise<any> {
    if (!this.sessionId) return {};
    
    const session = await prisma.ai_conversation_context.findUnique({
      where: { id: this.sessionId }
    });
    
    return session?.context || {};
  }
  
  // Update session step
  async updateSessionStep(step: string): Promise<void> {
    if (!this.sessionId) {
      this.sessionId = await this.getOrCreateSession();
    }
    
    try {
      const context = await this.getContext();
      
      await prisma.ai_conversation_context.update({
        where: { id: this.sessionId },
        data: {
          context: {
            ...context,
            currentStep: step,
            lastUpdated: new Date()
          },
          updated_at: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to update session step:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
  
  // Check if user should be in onboarding
  static async shouldShowOnboarding(userId: string): Promise<boolean> {
    try {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          has_completed_onboarding: true,
          onboarding_session_id: true
        }
      });
      
      // Show onboarding if not completed
      if (!user?.has_completed_onboarding) {
        return true;
      }
      
      // Check if there's an incomplete session
      if (user.onboarding_session_id) {
        const session = await prisma.ai_conversation_context.findUnique({
          where: { id: user.onboarding_session_id }
        });
        
        return session ? !session.is_complete : false;
      }
      
      return false;
      
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      return false;
    } finally {
      await prisma.$disconnect();
    }
  }
}