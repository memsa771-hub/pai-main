export const queryKeys = {
  profile: {
    all: ["profile"] as const,
    detail: () => ["profile", "detail"] as const,
    completeness: () => ["profile", "completeness"] as const,
    conflicts: () => ["profile", "conflicts"] as const,
  },
  conversations: {
    all: ["conversations"] as const,
    detail: (sessionId: string) => ["conversations", sessionId] as const,
    list: () => ["conversations", "list"] as const,
  },
  documents: {
    all: ["documents"] as const,
    detail: (documentId: string) => ["documents", documentId] as const,
    list: () => ["documents", "list"] as const,
  },
  universities: {
    all: ["universities"] as const,
    detail: (universityId: string) => ["universities", universityId] as const,
    list: (params?: Record<string, string>) => ["universities", "list", params ?? {}] as const,
  },
  programs: {
    detail: (programId: string) => ["programs", programId] as const,
  },
  recommendations: {
    all: ["recommendations"] as const,
    detail: (recId: string) => ["recommendations", recId] as const,
  },
  scholarships: {
    all: ["scholarships"] as const,
    list: (params?: Record<string, string>) => ["scholarships", "list", params ?? {}] as const,
  },
  roadmap: {
    all: ["roadmap"] as const,
  },
  tracker: {
    all: ["tracker"] as const,
  },
  dashboard: {
    summary: () => ["dashboard", "summary"] as const,
  },
};