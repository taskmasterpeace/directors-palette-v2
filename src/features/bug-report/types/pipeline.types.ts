export type SecurityVerdict = 'allow' | 'flag' | 'block'

export interface SecurityGateResult {
  security_score: number    // 0-100, 0 = malicious
  quality_score: number     // 0-100, 0 = useless
  security_flags: string[]  // e.g. ["xss_attempt", "prompt_injection"]
  quality_issues: string[]  // e.g. ["no_specific_feature"]
  suggested_followup: string
  verdict: SecurityVerdict
}

export type PipelineEventType =
  | 'security_blocked'
  | 'security_flagged'
  | 'needs_info'
  | 'triage_started'
  | 'triage_complete'
  | 'fix_pr_created'
  | 'needs_manual_review'

export interface PipelineNotification {
  event: PipelineEventType
  issueNumber: number
  issueUrl: string
  title: string
  priority?: 'high' | 'medium' | 'low'
  prUrl?: string
  summary: string
}
