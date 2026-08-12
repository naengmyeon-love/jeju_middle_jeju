export type Approval = {
  status: string;
  explicit?: boolean;
  reviewer?: string | null;
  approvedAt?: string | null;
};

export type Artifact = {
  key: string;
  label: string;
  sourcePath: string | null;
  href: string | null;
  exists: boolean;
  public: boolean;
  note?: string;
};

export type ExecutionRun = {
  id: string;
  agent: string;
  model: string;
  stage: string;
  stageLabel: string;
  startedAt: string | null;
  finishedAt: string | null;
  status: string;
  outputFiles: Artifact[];
  adopted: boolean;
};

export type Project = {
  id: string;
  topic: string;
  characters: string[];
  createdAt: string | null;
  updatedAt: string | null;
  status: string;
  completion: {
    phase: string;
    summary: string;
    planVariants: { completed: number; expected: number };
    scenario: boolean;
    storyboard: { completed: number; expected: number };
    imageCount: number;
    referencedImageCount: number;
    draftVideo: boolean;
    finalVideo: boolean;
    complete: boolean;
  };
  artifacts: Artifact[];
  reviews: { planning: string; video: string };
  approvals: { production: Approval; final: Approval; distribution: Approval };
  modelVersions: Record<string, unknown>;
  executionHistory: ExecutionRun[];
  executionHistoryRecorded: boolean;
  errors: { at?: string; stage?: string; message?: string; impact?: string; resolution?: string }[];
  publications: { platform?: string; status?: string; url?: string | null; publishedAt?: string | null }[];
};

export type DashboardData = {
  generatedAt: string;
  control: {
    repository: string;
    requestUrl: string;
    queueUrl: string;
    actionsUrl: string;
  };
  policy: {
    agents: { agent: string; model: string; allowedStages: string[] }[];
    stages: Record<string, string>;
  };
  summary: { projects: number; complete: number; active: number; blocked: number; executionRuns: number };
  projects: Project[];
};
