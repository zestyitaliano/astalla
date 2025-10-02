import type { TrendDirection } from "@/components/dashboard/metric-card";
import type { MeResponse } from "@shared/api";

type QuickAction = {
  id: string;
  label: string;
  value: string;
  description: string;
  tone: "sunrise" | "peach" | "lavender";
};

type TimelineEntry = {
  id: string;
  time: string;
  title: string;
  meta: string;
  category: "meeting" | "update" | "insight";
};

type Task = {
  id: string;
  title: string;
  owner: string;
  due: string;
  status: "In Review" | "Blocked" | "Live" | "Planning";
  priority: "High" | "Medium" | "Low";
};

type SheetRow = {
  id: string;
  workspace: string;
  owner: string;
  status: Task["status"];
  health: "On Track" | "Watch" | "Risk";
  progress: number;
  lastUpdated: string;
};

type Insight = {
  id: string;
  title: string;
  detail: string;
  action: string;
};

type Alert = {
  id: string;
  label: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

type Metric = {
  id: string;
  title: string;
  value: string;
  helperText?: string;
  change?: number;
  trend?: TrendDirection;
  tone: "coral" | "amber" | "teal" | "indigo";
};

type DashboardData = {
  user: MeResponse;
  welcome: {
    dateLabel: string;
    headline: string;
    message: string;
    stats: {
      activeReports: number;
      tasksDue: number;
    };
  };
  quickActions: QuickAction[];
  metrics: Metric[];
  timeline: TimelineEntry[];
  tasks: Task[];
  insights: Insight[];
  alerts: Alert[];
  sheet: {
    lastSynced: string;
    rows: SheetRow[];
  };
};

export const internalDashboardData: DashboardData = {
  user: {
    id: "user_internal",
    name: "Dwayne Tatum",
    email: "dwayne.tatum@astalla.io",
    orgId: "org_internal"
  },
  welcome: {
    dateLabel: "Tuesday, 19 December",
    headline: "Hey Dwayne, need help? 👋",
    message:
      "You're viewing the internal operations control center. Every insight below is powered by our own data warehouse so we can iterate safely before reconnecting external APIs.",
    stats: {
      activeReports: 12,
      tasksDue: 6
    }
  },
  quickActions: [
    {
      id: "quick-health",
      label: "Workspace health",
      value: "93%",
      description: "All internal sources are syncing on time",
      tone: "sunrise"
    },
    {
      id: "quick-automation",
      label: "Automations running",
      value: "42",
      description: "12 new triggers published this week",
      tone: "peach"
    },
    {
      id: "quick-qa",
      label: "QA reviews",
      value: "8",
      description: "Awaiting internal sign-off before launch",
      tone: "lavender"
    }
  ],
  metrics: [
    {
      id: "metric-workspaces",
      title: "Active workspaces",
      value: "18",
      helperText: "6 launched this quarter",
      change: 0.12,
      trend: "up",
      tone: "coral"
    },
    {
      id: "metric-automations",
      title: "Internal automations",
      value: "57",
      helperText: "Across marketing, finance and CX",
      change: 0.08,
      trend: "up",
      tone: "amber"
    },
    {
      id: "metric-coverage",
      title: "Reporting coverage",
      value: "87%",
      helperText: "Pulling from warehouse + ops sheets",
      change: 0.02,
      trend: "up",
      tone: "teal"
    },
    {
      id: "metric-saved",
      title: "Hours saved weekly",
      value: "126",
      helperText: "vs. manual spreadsheet workflows",
      tone: "indigo"
    }
  ],
  timeline: [
    {
      id: "timeline-1",
      time: "09:00",
      title: "Leadership stand-up",
      meta: "Ops team review",
      category: "meeting"
    },
    {
      id: "timeline-2",
      time: "11:30",
      title: "Lifecycle workspace audit",
      meta: "Check SLA definitions",
      category: "update"
    },
    {
      id: "timeline-3",
      time: "14:00",
      title: "Revenue reporting dry run",
      meta: "Finance + RevOps",
      category: "meeting"
    },
    {
      id: "timeline-4",
      time: "16:30",
      title: "Enablement content refresh",
      meta: "Prep launch deck",
      category: "insight"
    }
  ],
  tasks: [
    {
      id: "task-1",
      title: "Finalize retention report template",
      owner: "Alex Rivera",
      due: "Today 4:30 PM",
      status: "In Review",
      priority: "High"
    },
    {
      id: "task-2",
      title: "QA billing operations workspace",
      owner: "Priya Patel",
      due: "Tomorrow 10:00 AM",
      status: "Blocked",
      priority: "High"
    },
    {
      id: "task-3",
      title: "Publish customer journey automation",
      owner: "Morgan Lee",
      due: "Friday",
      status: "Live",
      priority: "Medium"
    },
    {
      id: "task-4",
      title: "Draft onboarding playbook",
      owner: "Jordan Blake",
      due: "Next Monday",
      status: "Planning",
      priority: "Low"
    }
  ],
  insights: [
    {
      id: "insight-1",
      title: "Reporting focus",
      detail: "Acquisition costs trended down 4% w/o external feeds. Highlight the organic lift in Monday's readout.",
      action: "Add to weekly briefing"
    },
    {
      id: "insight-2",
      title: "Data hygiene",
      detail: "3 internal forms still writing to legacy tables. Consolidating them will unlock attribution at the journey level.",
      action: "Create clean-up task"
    }
  ],
  alerts: [
    {
      id: "alert-1",
      label: "Billing ops",
      detail: "Revenue workspace awaiting QA sign-off",
      severity: "high"
    },
    {
      id: "alert-2",
      label: "Lifecycle",
      detail: "Journey automation paused for copy refresh",
      severity: "medium"
    },
    {
      id: "alert-3",
      label: "Insights",
      detail: "Analytics export scheduled for tonight",
      severity: "low"
    }
  ],
  sheet: {
    lastSynced: "5 minutes ago",
    rows: [
      {
        id: "sheet-1",
        workspace: "Lifecycle Automation",
        owner: "Priya Patel",
        status: "Live",
        health: "On Track",
        progress: 92,
        lastUpdated: "Today 09:24"
      },
      {
        id: "sheet-2",
        workspace: "Revenue Insights",
        owner: "Alex Rivera",
        status: "In Review",
        health: "Watch",
        progress: 76,
        lastUpdated: "Today 08:10"
      },
      {
        id: "sheet-3",
        workspace: "Billing Ops",
        owner: "Jordan Blake",
        status: "Blocked",
        health: "Risk",
        progress: 54,
        lastUpdated: "Yesterday 17:45"
      },
      {
        id: "sheet-4",
        workspace: "Customer Experience",
        owner: "Morgan Lee",
        status: "Live",
        health: "On Track",
        progress: 88,
        lastUpdated: "Yesterday 15:20"
      },
      {
        id: "sheet-5",
        workspace: "Marketing Performance",
        owner: "Jules Chen",
        status: "Planning",
        health: "Watch",
        progress: 43,
        lastUpdated: "2 days ago"
      },
      {
        id: "sheet-6",
        workspace: "Enablement Hub",
        owner: "Noah Brooks",
        status: "In Review",
        health: "On Track",
        progress: 67,
        lastUpdated: "2 days ago"
      }
    ]
  }
};
