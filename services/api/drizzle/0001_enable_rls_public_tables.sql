-- PATH: services/api/drizzle/0001_enable_rls_public_tables.sql
-- WHAT: Enables Row Level Security on all public MVP tables
-- WHY:  Removes external PostgREST exposure by default and satisfies security lint
-- RELEVANT: services/api/drizzle/0000_faulty_squadron_sinister.sql,specs/001-virtual-newsroom-mvp/security-review.md

ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_sequence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factcheck_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_decision ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;
