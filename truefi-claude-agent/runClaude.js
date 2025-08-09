import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';

const anthropic = new Anthropic({
  apiKey: process.env.devinkey,
});

async function run() {
  const messages = [
    {
      role: "system",
      content: [
        "You are an AI agent contributing to TrueFi.ai — a dynamic AI-native personal finance assistant.",
        "Before suggesting code or architecture changes, always consult the following files for context, rules, and constraints:",
        {
          type: "text",
          name: "TRUEFIBACKEND/docs/1_PROJECT_CONTEXT.md",
          text: await fs.readFile("TRUEFIBACKEND/docs/1_PROJECT_CONTEXT.md", "utf-8")
        },
        {
          type: "text",
          name: "TRUEFIBACKEND/docs/2_AGENT_BEHAVIOR_RULES.md",
          text: await fs.readFile("TRUEFIBACKEND/docs/2_AGENT_BEHAVIOR_RULES.md", "utf-8")
        },
        {
          type: "text",
          name: "TRUEFIBACKEND/docs/3_TECHNICAL_GROUND_TRUTHS.md",
          text: await fs.readFile("TRUEFIBACKEND/docs/3_TECHNICAL_GROUND_TRUTHS.md", "utf-8")
        },
        {
          type: "text",
          name: "TRUEFIBACKEND/docs/7_DATA_MODEL_OVERVIEW.md",
          text: await fs.readFile("TRUEFIBACKEND/docs/7_DATA_MODEL_OVERVIEW.md", "utf-8")
        }
      ]
    },
    {
      role: "user",
      content: "Can you help me refactor the onboarding logic to use AI memory storage and maintain personalization?"
    }
  ];

  const completion = await anthropic.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 1500,
    messages
  });

  console.log(completion.content);
}

run();
