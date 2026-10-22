const MIN_DESCRIPTION_LENGTH = 50;
const FOLLOW_UP_DAYS = 14;
const MAX_STEPS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseLocalDate(isoDate) {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysSince(isoDate) {
  return Math.round((startOfToday() - parseLocalDate(isoDate)) / DAY_MS);
}

// Suggests the most useful next actions across all applications.
export function buildNextSteps(applications, applicationInsights) {
  const insightsById = Object.fromEntries(applicationInsights.map((i) => [i.id, i]));
  const steps = [];

  for (const a of applications) {
    const info = insightsById[a.id] || {};
    const hasDescription = (a.job_description || "").trim().length >= MIN_DESCRIPTION_LENGTH;
    const base = `/applications/${a.id}`;

    if (a.status === "Interview") {
      if (!hasDescription) {
        steps.push({
          key: `${a.id}-description`,
          priority: 0,
          kind: "interview",
          text: `Add the job description so you can prepare for your ${a.company} interview.`,
          to: base,
          label: "Add description",
        });
      } else if (!info.question_count) {
        steps.push({
          key: `${a.id}-questions`,
          priority: 0,
          kind: "interview",
          text: `Generate interview questions for the ${a.role} role at ${a.company}.`,
          to: `${base}/prep`,
          label: "Generate questions",
        });
      } else if (!info.practiced_count) {
        steps.push({
          key: `${a.id}-practice`,
          priority: 1,
          kind: "interview",
          text: `Practice your answers before the ${a.company} interview.`,
          to: `${base}/prep`,
          label: "Practice",
        });
      }
      continue;
    }

    if (a.status !== "Applied") continue;

    const days = daysSince(a.applied_date);
    if (days >= FOLLOW_UP_DAYS) {
      steps.push({
        key: `${a.id}-follow-up`,
        priority: 2,
        kind: "followup",
        text: `No update from ${a.company} in ${days} days. A short follow-up email can help.`,
        to: base,
        label: "Open",
      });
    }

    if (!a.resume_id) {
      steps.push({
        key: `${a.id}-resume`,
        priority: 3,
        kind: "setup",
        text: `Link the resume you sent to ${a.company}.`,
        to: base,
        label: "Link resume",
      });
    } else if (hasDescription && info.best_match_score == null) {
      steps.push({
        key: `${a.id}-match`,
        priority: 4,
        kind: "match",
        text: `See how your resume matches the ${a.company} posting.`,
        to: `${base}/match`,
        label: "Check match",
      });
    }
  }

  return steps.sort((x, y) => x.priority - y.priority).slice(0, MAX_STEPS);
}

// Counts applications per week (weeks start on Monday) for the last few weeks.
export function weeklyCounts(applications, weeks = 8) {
  const today = startOfToday();
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysSinceMonday);

  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7 * i);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    buckets.push({
      key: start.getTime(),
      label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      startTime: start.getTime(),
      endTime: end.getTime(),
      count: 0,
    });
  }

  for (const a of applications) {
    const time = parseLocalDate(a.applied_date).getTime();
    const bucket = buckets.find((b) => time >= b.startTime && time < b.endTime);
    if (bucket) bucket.count += 1;
  }

  return buckets;
}