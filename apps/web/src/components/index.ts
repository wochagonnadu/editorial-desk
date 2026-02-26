// PATH: apps/web/src/components/index.ts
// WHAT: Components barrel for shared top-level UI modules
// WHY:  Keeps imports stable while feature screens evolve
// RELEVANT: apps/web/src/App.tsx,apps/web/src/components/PipelineControls.tsx,apps/web/src/components/ApprovalStatus.tsx

export * from './ApprovalConfig';
export * from './ApprovalStatus';
export * from './PipelineControls';
export * from './VersionDiff';
