export const CHANNEL_CONFIG = {
  'bridgette': {
    project: 'general',
    description: 'General conversation and cross-project questions',
    context: 'You are available for any topic — strategy, ideas, questions, or just conversation.',
  },
  'bridge-frontend': {
    project: 'bridge-frontend',
    description: 'Bridge web app frontend (Next.js, React, Tailwind, shadcn/ui)',
    context: 'The Bridge frontend is built with Next.js (App Router), React, Tailwind CSS, and shadcn/ui. The app is a B2B AI Business Intelligence platform. Think in components, routes, and user experience.',
  },
  'bridge-backend': {
    project: 'bridge-backend',
    description: 'Bridge backend and Supabase infrastructure',
    context: 'The Bridge backend uses Supabase (Postgres, Auth, Storage, Edge Functions). API design, database schema, RLS policies, and infrastructure decisions live here.',
  },
  'bridge-prd': {
    project: 'bridge-prd',
    description: 'PRDs and product specs for Bridge',
    context: 'This channel is for product requirements documents, feature specs, and product strategy. Be thorough and structured. Write complete PRDs when asked.',
  },
  'moralis-site': {
    project: 'moralis',
    description: 'Morális studio website and automation builds',
    context: 'Morális is a creative studio targeting brick-and-mortar small businesses. Think local restaurants, boutiques, gyms — owners who are not technical but need a strong digital presence and AI-powered automations.',
  },
  'idea-capture': {
    project: 'ideas',
    description: 'Quick ideas, brainstorms, concepts — capture everything',
    context: 'This is a fast-capture channel. Ideas come in raw — help structure them, ask 1-2 clarifying questions, and suggest how to move them forward.',
  },
  'skills-lab': {
    project: 'skills',
    description: 'Shared skills, templates, and agent capabilities',
    context: 'This channel explores reusable AI agent capabilities, prompt templates, and workflow patterns that can be shared across Bridge and Morális projects.',
  },
  'agent-logs': {
    project: 'logs',
    description: 'Bridgette reports and activity logs',
    context: 'This channel is for logging and reporting. Responses here should be structured, concise, and data-oriented.',
  },
};

export const DEFAULT_CONTEXT = {
  project: 'general',
  description: 'General conversation',
  context: 'No specific project context — respond helpfully to whatever comes up.',
};

export const MODEL = 'claude-sonnet-4-20250514';
export const MAX_TOKENS = 4096;
export const MAX_MEMORY_MESSAGES = 20;
export const RATE_LIMIT_MS = 3000;

// Channels where Bridgette responds to every message (no @mention required)
export const ACTIVE_CHANNELS = new Set(Object.keys(CHANNEL_CONFIG));
