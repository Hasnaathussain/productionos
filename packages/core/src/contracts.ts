export const TOOL_NAME = "ProductionOS";
export const TOOL_VERSION = "0.1.0";
export const MANIFEST_VERSION = 1 as const;
export const STATE_SCHEMA_VERSION = 1 as const;
export const DISCOVERY_SCHEMA_VERSION = 1 as const;
export const GRAPH_SCHEMA_VERSION = 1 as const;
export const REQUIREMENT_GRAPH_SCHEMA_VERSION = 3 as const;
export const EVIDENCE_SCHEMA_VERSION = 1 as const;
export const REMEDIATION_SCHEMA_VERSION = 1 as const;

export type MaturityProfile = "prototype" | "public" | "saas" | "business_critical" | "regulated";
export type Severity = "critical" | "high" | "medium" | "low";
export type ControlStatus =
  | "UNASSESSED"
  | "INFERRED"
  | "STATICALLY_VERIFIED"
  | "TEST_VERIFIED"
  | "RUNTIME_VERIFIED"
  | "WAIVED"
  | "FAILED"
  | "NOT_APPLICABLE"
  | "STALE";
export type VerificationMethod = "static" | "test" | "runtime";

export interface ProjectManifest {
  version: typeof MANIFEST_VERSION;
  project: {
    type: string;
    maturity: MaturityProfile;
  };
  runtime?: {
    framework?: string;
    deployment?: string;
    language?: string;
  };
  database?: {
    provider?: string;
    orm?: string;
  };
  auth?: {
    enabled?: boolean;
    provider?: string;
  };
  payments?: {
    enabled?: boolean;
    provider?: string;
  };
  uploads?: {
    enabled?: boolean;
    storage?: string;
  };
  ai?: {
    enabled?: boolean;
    provider?: string;
  };
  data?: {
    pii?: string[];
  };
  scale?: {
    expected_users?: number;
  };
  reliability?: {
    availability_target?: number;
  };
}

export interface SignalEvidence {
  files: string[];
  matches: number;
}

export type SignalMap = Record<string, SignalEvidence>;

export interface RouteFact {
  path: string;
  file: string;
  kind: "app-route" | "page" | "pages-api" | "server-action" | "unknown";
  methods: string[];
}

export interface DiscoveryResult {
  schemaVersion: typeof DISCOVERY_SCHEMA_VERSION;
  generatedAt: string;
  root: string;
  filesScanned: number;
  language: string;
  packageManager: string;
  framework: string | null;
  deployment: string | null;
  dependencies: string[];
  devDependencies: string[];
  sourceFiles: string[];
  configFiles: string[];
  routes: RouteFact[];
  environmentVariables: string[];
  signals: SignalMap;
  ast: AstSummary;
  toolchain: {
    hasTests: boolean;
    hasCi: boolean;
    hasContainer: boolean;
    hasLockfile: boolean;
  };
}

export interface AstFileFact {
  path: string;
  imports: string[];
  exports: string[];
  calls: string[];
}

export interface AstSummary {
  parser: "typescript";
  parserVersion: string;
  files: AstFileFact[];
}

export interface CapabilityNode {
  id: string;
  label: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
}

export interface CapabilityEdge {
  from: string;
  to: string;
  reason: string;
}

export interface CapabilityGraph {
  schemaVersion: typeof GRAPH_SCHEMA_VERSION;
  generatedAt: string;
  nodes: CapabilityNode[];
  edges: CapabilityEdge[];
}

export type EvidenceArtifact = "source_reference" | "test_result" | "runtime_observation";

export interface EvidenceRequirement {
  method: VerificationMethod;
  artifact: EvidenceArtifact;
  description: string;
}

export interface RequirementDefinition {
  id: string;
  title: string;
  domain: string;
  severity: Severity;
  triggerCapabilities: string[];
  rationale: string;
  recommendation: string;
  failureModes: string[];
  tradeoffs: string[];
  verification: VerificationMethod[];
  evidence: EvidenceRequirement[];
  limitations: string[];
  falsePositiveBoundary: string;
  affectedFiles: string[];
}

export interface RequirementEdge {
  from: string;
  to: string;
  kind: "activates" | "depends_on";
  reason: string;
}

export interface RequirementGraph {
  schemaVersion: typeof REQUIREMENT_GRAPH_SCHEMA_VERSION;
  generatedAt: string;
  requirements: RequirementDefinition[];
  edges: RequirementEdge[];
}

export interface CheckResult {
  outcome: "pass" | "fail" | "unknown";
  summary: string;
  details: string[];
  files: string[];
}

export interface ControlFinding {
  controlId: string;
  version: string;
  title: string;
  domain: string;
  severity: Severity;
  status: ControlStatus;
  summary: string;
  rationale: string;
  recommendation: string;
  verification: VerificationMethod[];
  affectedFiles: string[];
  triggeredBy: string[];
  evaluatedAt: string;
}

export interface ControlDefinition extends RequirementDefinition {
  check(context: EvaluationContext): CheckResult;
}

export interface SnapshotFile {
  path: string;
  content: string;
  hash: string;
}

export interface RepositorySnapshot {
  root: string;
  files: SnapshotFile[];
  fingerprint: string;
  truncated: boolean;
}

export interface EvaluationContext {
  root: string;
  manifest: ProjectManifest;
  discovery: DiscoveryResult;
  capabilities: CapabilityGraph;
  snapshot: RepositorySnapshot;
}

export interface EvidenceRecord {
  schemaVersion: typeof EVIDENCE_SCHEMA_VERSION;
  evidenceId: string;
  controlId: string;
  controlVersion: string;
  status: Exclude<ControlStatus, "STALE" | "WAIVED" | "NOT_APPLICABLE">;
  method: VerificationMethod;
  command: string[];
  workingDirectory: string;
  exitCode: number | null;
  startedAt: string;
  completedAt: string;
  affectedFiles: string[];
  inputFingerprint: string;
  outputSummary: string;
  output?: string;
  limitations: string[];
}

export interface Waiver {
  control: string;
  reason: string;
  owner: string;
  expires?: string;
}

export interface GateResult {
  profile: MaturityProfile;
  decision: "PASS" | "BLOCKED";
  generatedAt: string;
  counts: Record<ControlStatus, number>;
  blocking: ControlFinding[];
  waivers: Waiver[];
  evidence: {
    staticVerified: number;
    testVerified: number;
    runtimeVerified: number;
    stale: number;
  };
}

export interface ProjectState {
  schemaVersion: typeof STATE_SCHEMA_VERSION;
  toolVersion: string;
  root: string;
  currentMilestone: string;
  lastCommand: string | null;
  updatedAt: string;
  artifacts: string[];
  summary: {
    framework: string | null;
    capabilities: string[];
    unresolvedControls: number;
    failedControls: number;
    staleEvidence: number;
  };
  blockers: string[];
  nextActions: string[];
}

export interface RemediationPlan {
  schemaVersion: typeof REMEDIATION_SCHEMA_VERSION;
  controlId: string;
  status: "PLANNED" | "READY" | "APPLIED" | "BLOCKED";
  risk: "low" | "medium" | "high";
  preconditions: string[];
  changes: string[];
  verification: string[];
  rollback: string[];
  files: string[];
  generatedAt: string;
  appliedAt?: string;
}

export interface ValidationIssue {
  path: string;
  message: string;
}
