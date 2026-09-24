export const meta = {
  name: 'review-analyzers',
  description: 'Run pr-review-toolkit analyzers over a fixed diff, then check each finding against the code',
  whenToUse: 'Invoked by the pr-review-autosave review skill in --workflow mode; not meant to be run directly',
  phases: [
    { title: 'Review', detail: 'one pr-review-toolkit agent per applicable analyzer', model: 'opus' },
    { title: 'Verify', detail: 'one refutation check per finding', model: 'opus' },
  ],
}

// args (built by skills/review/SKILL.md step 3W):
//   worktree     absolute path of the checkout under review
//   diffCommand  git command that prints the complete change set
//   target       human-readable label, e.g. "PR #123 - Title" or "WIP abc1234"
//   analyzers    pr-review-toolkit agent names, e.g. ["code-reviewer", "pr-test-analyzer"]

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'important', 'suggestion'] },
          files: { type: 'array', items: { type: 'string' }, description: 'path:line, relative to the worktree' },
          details: { type: 'string' },
          fix: { type: 'string', description: 'Concrete remediation, or empty string if none' },
        },
        required: ['title', 'severity', 'files', 'details', 'fix'],
      },
    },
    strengths: { type: 'array', items: { type: 'string' } },
  },
  required: ['findings', 'strengths'],
}

const VERDICT = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['refuted', 'reason'],
}

if (!args || !args.analyzers) throw new Error('Run this via /pr-review-autosave:review --workflow, not directly')

const { worktree, diffCommand, target, analyzers } = args

const scope = `You are reviewing ${target}.

The code under review is in ${worktree}. Read files there using absolute paths; do not cd to another directory or read source from any other checkout.

The complete change set is the output of:

    ${diffCommand}

Review only that diff. Do not use a bare \`git diff\` or \`git status\` to find the scope — in this checkout they may be empty or unrelated.

This is read-only: do not edit files, commit, push, or post anything to GitHub.`

const reviewPrompt = `${scope}

Report each issue as a finding. Severity:
- critical: must fix before merge (bugs, data loss, security, broken behavior)
- important: should fix
- suggestion: nice to have

Anything that needs no action (ratings, positive observations) goes in strengths, not findings. Return an empty findings array if you find nothing.`

const verifyPrompt = (f, analyzer) => `${scope}

The ${analyzer} agent reported this finding:

Title: ${f.title}
Severity: ${f.severity}
Files: ${f.files.join(', ')}
Details: ${f.details}

Check it against the code. Set refuted=true only when you can show the finding is wrong — the line does not do what it claims, the case is already handled elsewhere, or the path is unreachable — and cite that evidence in reason. If you cannot confirm or disprove it, set refuted=false. A dropped real issue costs more than a kept false one.`

const results = await pipeline(
  analyzers,
  analyzer => agent(reviewPrompt, {
    label: `review:${analyzer}`,
    phase: 'Review',
    model: 'opus',
    agentType: `pr-review-toolkit:${analyzer}`,
    schema: FINDINGS,
  }),
  (review, analyzer) => {
    if (!review) return null
    return parallel(review.findings.map((f, i) => () =>
      agent(verifyPrompt(f, analyzer), {
        label: `verify:${analyzer}#${i + 1}`,
        phase: 'Verify',
        model: 'opus',
        schema: VERDICT,
      }).then(verdict => ({ ...f, analyzer, verdict }))
    )).then(checked => ({
      analyzer,
      strengths: review.strengths,
      // A verifier that died returns null; keep the finding unverified rather than drop it.
      findings: checked.map((c, i) => c || { ...review.findings[i], analyzer, verdict: null }),
    }))
  },
)

const completed = results.filter(Boolean)
const failedAnalyzers = analyzers.filter((_, i) => !results[i])
if (failedAnalyzers.length) log(`No result from: ${failedAnalyzers.join(', ')}`)

const all = completed.flatMap(r => r.findings)
const refuted = all.filter(f => f.verdict && f.verdict.refuted)
if (refuted.length) log(`${refuted.length} of ${all.length} findings refuted during verification`)

return {
  findings: all
    .filter(f => !(f.verdict && f.verdict.refuted))
    .map(({ verdict, ...f }) => ({ ...f, verified: verdict !== null })),
  refuted: refuted.map(f => ({ title: f.title, analyzer: f.analyzer, files: f.files, reason: f.verdict.reason })),
  strengths: completed.flatMap(r => r.strengths.map(s => ({ analyzer: r.analyzer, text: s }))),
  failedAnalyzers,
}
