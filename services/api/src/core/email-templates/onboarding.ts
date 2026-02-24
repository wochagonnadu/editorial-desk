// PATH: services/api/src/core/email-templates/onboarding.ts
// WHAT: Onboarding email templates for 5-step voice profiling
// WHY:  Keeps onboarding content consistent across reply-driven flow
// RELEVANT: services/api/src/core/onboarding.ts,specs/001-virtual-newsroom-mvp/contracts/api.md

export interface EmailTemplate {
  subject: string;
  textBody: string;
  html: string;
}

const templates: Record<number, (name: string) => EmailTemplate> = {
  1: (name) => ({
    subject: 'Step 1: how you describe your work',
    textBody: `Hi ${name}, describe your work style in your own words.`,
    html: `<p>Hi ${name}, describe your work style in your own words.</p>`,
  }),
  2: (name) => ({
    subject: 'Step 2: audience and signature phrases',
    textBody: `Hi ${name}, who is your audience and what phrases do you use often?`,
    html: `<p>Hi ${name}, who is your audience and what phrases do you use often?</p>`,
  }),
  3: (name) => ({
    subject: 'Step 3: review and corrections',
    textBody: `Hi ${name}, share how you would correct a rough draft.`,
    html: `<p>Hi ${name}, share how you would correct a rough draft.</p>`,
  }),
  4: (name) => ({
    subject: 'Step 4: Q&A style',
    textBody: `Hi ${name}, answer two common audience questions in your style.`,
    html: `<p>Hi ${name}, answer two common audience questions in your style.</p>`,
  }),
  5: (name) => ({
    subject: 'Step 5: myths and boundaries',
    textBody: `Hi ${name}, list common myths and boundaries you never cross.`,
    html: `<p>Hi ${name}, list common myths and boundaries you never cross.</p>`,
  }),
};

export const getOnboardingTemplate = (step: number, expertName: string): EmailTemplate => {
  return (templates[step] ?? templates[1])(expertName);
};
