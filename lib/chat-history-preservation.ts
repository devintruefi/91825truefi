/**
 * Chat History Preservation - Maintain rich, human-readable chat history
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RichChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  type: 'user' | 'assistant' | 'component';
  content: string;
  richContent?: {
    component?: {
      type: string;
      stepId: string;
      data: any;
      userSelection?: any;
    };
    displayText?: string;
    timestamp: string;
  };
  createdAt: Date;
}

/**
 * Save a rich chat message with preserved display content
 */
export async function saveRichChatMessage(
  message: Omit<RichChatMessage, 'id' | 'createdAt'>
): Promise<void> {
  try {
    // Never save debug/system messages
    if (isSystemMessage(message.content)) {
      console.log('Skipping system message:', message.content);
      return;
    }
    
    // Prepare rich content with human-readable display
    const richContent = prepareRichContent(message);
    
    await prisma.chat_messages.create({
      data: {
        id: crypto.randomUUID(),
        session_id: message.sessionId,
        user_id: message.userId,
        message_type: message.type,
        content: richContent.displayText || message.content,
        rich_content: richContent,
        turn_number: await getNextTurnNumber(message.sessionId),
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error saving rich chat message:', error);
    throw error;
  }
}

/**
 * Prepare rich content for storage
 */
function prepareRichContent(message: any): any {
  const richContent: any = {
    timestamp: new Date().toISOString()
  };
  
  // If it's a component response, format it nicely
  if (message.richContent?.component) {
    const component = message.richContent.component;
    
    // Create human-readable display text
    richContent.displayText = formatComponentDisplay(component);
    
    // Store the component data for re-rendering
    richContent.component = {
      type: component.type,
      stepId: component.stepId,
      data: component.data,
      userSelection: component.userSelection
    };
    
    // Add metadata for easy querying
    richContent.metadata = {
      stepCompleted: component.stepId,
      componentType: component.type
    };
  } else {
    // Regular message
    richContent.displayText = message.content;
  }
  
  return richContent;
}

/**
 * Format component data for human-readable display
 */
function formatComponentDisplay(component: any): string {
  const { type, stepId, data, userSelection } = component;
  
  // Format based on component type
  switch (type) {
    case 'buttons':
      if (userSelection) {
        return `${data.question || data.title}\n\nYou selected: ${formatSelection(userSelection)}`;
      }
      return data.question || data.title || 'Please make a selection';
      
    case 'form':
      if (userSelection) {
        const fields = Object.entries(userSelection)
          .map(([key, value]) => `${formatFieldName(key)}: ${value}`)
          .join('\n');
        return `${data.title || 'Form completed'}\n\n${fields}`;
      }
      return data.title || 'Please fill out the form';
      
    case 'slider':
      if (userSelection) {
        return `${data.question || data.title}\n\nYou selected: ${userSelection.value || userSelection}`;
      }
      return data.question || data.title || 'Please adjust the slider';
      
    case 'checkboxes':
      if (userSelection) {
        const selections = Array.isArray(userSelection) 
          ? userSelection.map(s => `✓ ${s}`).join('\n')
          : `✓ ${userSelection}`;
        return `${data.question || data.title}\n\n${selections}`;
      }
      return data.question || data.title || 'Please select options';
      
    case 'pieChart':
      if (data.categories) {
        const breakdown = data.categories
          .map((cat: any) => `${cat.label}: $${cat.amount?.toLocaleString() || 0}`)
          .join('\n');
        return `${data.title || 'Budget Review'}\n\n${breakdown}`;
      }
      return data.title || 'Budget Review';
      
    case 'cards':
      return data.title || data.question || 'Review the information';
      
    case 'plaid':
      if (userSelection?.connected) {
        return 'Successfully connected your financial accounts';
      }
      return 'Connect your financial accounts';
      
    default:
      return data.question || data.title || `Step: ${stepId}`;
  }
}

/**
 * Format user selection for display
 */
function formatSelection(selection: any): string {
  if (typeof selection === 'string') {
    return selection;
  }
  
  if (typeof selection === 'object') {
    if (selection.label) {
      return selection.label;
    }
    if (selection.value) {
      return String(selection.value);
    }
    return JSON.stringify(selection, null, 2);
  }
  
  return String(selection);
}

/**
 * Format field names for display
 */
function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Check if content is a system/debug message
 */
function isSystemMessage(content: string): boolean {
  const systemPatterns = [
    /^\[Component Response:/i,
    /^\[System:/i,
    /^\[Debug:/i,
    /^buttons:welcome/i,
    /^__.*__$/,
    /^stepId:/i,
    /^instanceId:/i
  ];
  
  return systemPatterns.some(pattern => pattern.test(content));
}

/**
 * Get next turn number for session
 */
async function getNextTurnNumber(sessionId: string): Promise<number> {
  const lastMessage = await prisma.chat_messages.findFirst({
    where: { session_id: sessionId },
    orderBy: { turn_number: 'desc' }
  });
  
  return (lastMessage?.turn_number || 0) + 1;
}

/**
 * Retrieve rich chat history for display
 */
export async function getRichChatHistory(
  userId: string,
  sessionId?: string
): Promise<RichChatMessage[]> {
  try {
    const messages = await prisma.chat_messages.findMany({
      where: {
        user_id: userId,
        ...(sessionId && { session_id: sessionId })
      },
      orderBy: { created_at: 'asc' }
    });
    
    return messages
      .filter(msg => !isSystemMessage(msg.content))
      .map(msg => ({
        id: msg.id,
        sessionId: msg.session_id,
        userId: msg.user_id || userId,
        type: msg.message_type as any,
        content: msg.content,
        richContent: msg.rich_content as any,
        createdAt: msg.created_at
      }));
  } catch (error) {
    console.error('Error retrieving chat history:', error);
    return [];
  }
}

/**
 * Clean up existing chat history to remove system messages
 */
export async function cleanupChatHistory(userId: string): Promise<number> {
  try {
    const messages = await prisma.chat_messages.findMany({
      where: { user_id: userId }
    });
    
    let cleanedCount = 0;
    
    for (const msg of messages) {
      if (isSystemMessage(msg.content)) {
        // Delete system messages
        await prisma.chat_messages.delete({
          where: { id: msg.id }
        });
        cleanedCount++;
      } else if (msg.content.includes('[Component Response:')) {
        // Clean up content but preserve the message
        const cleanContent = msg.content.replace(/\[Component Response:.*?\]/g, '').trim();
        if (cleanContent) {
          await prisma.chat_messages.update({
            where: { id: msg.id },
            data: { content: cleanContent }
          });
          cleanedCount++;
        }
      }
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up chat history:', error);
    return 0;
  }
}

/**
 * Format onboarding step for chat display
 */
export function formatOnboardingStepForChat(
  stepId: string,
  stepConfig: any,
  userResponse?: any
): string {
  const stepLabels: Record<string, string> = {
    privacy_consent: 'Privacy & Consent',
    welcome: 'Welcome to TrueFi',
    main_goal: 'Your Main Financial Goal',
    life_stage: 'Current Life Stage',
    family_size: 'Family Size',
    location: 'Your Location',
    household_snapshot: 'Household Financial Snapshot',
    connect_accounts: 'Account Connection',
    verify_income: 'Income Verification',
    income_structure: 'Income Structure',
    benefits_equity: 'Benefits & Equity',
    budget_review: 'Budget Review',
    assets_liabilities_quick_add: 'Assets & Liabilities',
    debts_breakdown: 'Debt Overview',
    housing: 'Housing Situation',
    insurance: 'Insurance Coverage',
    emergency_fund: 'Emergency Fund Planning',
    risk_comfort: 'Risk Comfort Level',
    wrap_up: 'Setup Complete!'
  };
  
  const label = stepLabels[stepId] || stepConfig?.label || stepId;
  
  if (userResponse) {
    return `${label}\n\nYour response: ${formatSelection(userResponse)}`;
  }
  
  return label;
}