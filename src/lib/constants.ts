import { WorkflowStep } from "@/types";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  prompt: string;
  steps: WorkflowStep[];
}

export const WORKFLOW_TEMPLATES: TemplateDefinition[] = [
  {
    id: "tpl_customer_support",
    name: "Customer Support Ticket Triage",
    description: "Classify ticket sentiment and topic, set priority, extract key details, draft resolution email, and route critical issues.",
    prompt: "When a customer emails a complaint, classify its category and sentiment, assess urgency priority, extract customer entity details, draft a polite resolution email, and determine escalation requirement.",
    steps: [
      {
        id: "step_1",
        type: "classify",
        title: "Classify Issue Category & Sentiment",
        instruction: "Analyze the customer message. Classify into category (Billing, Technical, Account, Product) and sentiment (Positive, Neutral, Negative, Frustrated). Return a JSON object with category and sentiment.",
        input_from: "input.text",
        output_key: "classification",
      },
      {
        id: "step_2",
        type: "prioritize",
        title: "Assess Urgency Priority",
        instruction: "Based on the customer message and classification, assign a priority level (P1-Critical, P2-High, P3-Medium, P4-Low) with justification.",
        input_from: "input.text, classification",
        output_key: "priority",
      },
      {
        id: "step_3",
        type: "extract",
        title: "Extract Customer Entities",
        instruction: "Extract customer name, account or invoice number, error codes, and main problem statement. Return structured JSON.",
        input_from: "input.text",
        output_key: "extracted_entities",
      },
      {
        id: "step_4",
        type: "draft_email",
        title: "Draft Support Response Email",
        instruction: "Draft a helpful, professional, and empathetic response email to the customer addressing their specific issue and next steps.",
        input_from: "input.text, classification, extracted_entities",
        output_key: "draft_email",
      },
      {
        id: "step_5",
        type: "decision",
        title: "Determine Escalation Action",
        instruction: "Evaluate if priority is P1-Critical or sentiment is Frustrated. If true, flag for tier-2 manager review; otherwise route to standard support queue.",
        input_from: "priority, classification",
        output_key: "escalation_decision",
      },
    ],
  },
  {
    id: "tpl_hr_onboarding",
    name: "HR Employee Onboarding",
    description: "Extract new hire information, summarize terms, draft welcome email, and prioritize setup checklist.",
    prompt: "Process new hire submission: extract personal information and equipment requirements, summarize employment terms, draft an executive welcome email, and prioritize IT provisioning tasks.",
    steps: [
      {
        id: "step_1",
        type: "extract",
        title: "Extract New Hire Information",
        instruction: "Extract candidate full name, email, job title, department, start date, manager name, and hardware preferences.",
        input_from: "input.text",
        output_key: "hire_details",
      },
      {
        id: "step_2",
        type: "summarize",
        title: "Summarize Onboarding Scope",
        instruction: "Create a 3-bullet executive summary of the employee's role, start date, and first week objectives.",
        input_from: "hire_details",
        output_key: "role_summary",
      },
      {
        id: "step_3",
        type: "prioritize",
        title: "Prioritize Provisioning Checklist",
        instruction: "Generate a prioritized checklist of IT access and equipment tasks ranked by urgency for day one readiness.",
        input_from: "hire_details",
        output_key: "it_priorities",
      },
      {
        id: "step_4",
        type: "draft_email",
        title: "Draft Welcome Email",
        instruction: "Draft an engaging welcome email from HR containing start date, reporting location, schedule, and orientation link.",
        input_from: "hire_details, role_summary",
        output_key: "welcome_email",
      },
    ],
  },
  {
    id: "tpl_meeting_notes",
    name: "Meeting Notes -> Action Items + Follow-up Email",
    description: "Summarize raw meeting discussion, extract action items with assignees, prioritize tasks, and draft recap email.",
    prompt: "From unstructured meeting notes, summarize main discussion topics, extract action items with owners and deadlines, prioritize high-impact deliverables, and draft a follow-up email to all participants.",
    steps: [
      {
        id: "step_1",
        type: "summarize",
        title: "Summarize Meeting Discussions",
        instruction: "Summarize key discussion themes, key agreements reached, and notable open questions in concise bullet points.",
        input_from: "input.text",
        output_key: "meeting_summary",
      },
      {
        id: "step_2",
        type: "extract",
        title: "Extract Action Items and Owners",
        instruction: "Extract all specific action items, assignees/owners, and stated deadlines or milestones. Return a structured list.",
        input_from: "input.text",
        output_key: "action_items",
      },
      {
        id: "step_3",
        type: "prioritize",
        title: "Prioritize Action Items",
        instruction: "Rank the extracted action items by strategic urgency (High/Medium/Low) based on impact and timelines.",
        input_from: "action_items",
        output_key: "prioritized_actions",
      },
      {
        id: "step_4",
        type: "draft_email",
        title: "Draft Meeting Follow-up Email",
        instruction: "Compose a clear follow-up email to attendees summarizing decisions made and listing prioritized action items with deadlines.",
        input_from: "meeting_summary, prioritized_actions",
        output_key: "followup_email",
      },
    ],
  },
  {
    id: "tpl_lead_qualification",
    name: "Lead Qualification & Sales Outreach",
    description: "Qualify inbound sales inquiries, score budget and timeline, route enterprise leads, and draft personalized outreach.",
    prompt: "Analyze sales inquiry: extract prospect details, company scale, budget, and business needs; classify buying readiness; score lead priority; evaluate enterprise routing condition; and draft customized outreach email.",
    steps: [
      {
        id: "step_1",
        type: "extract",
        title: "Extract Prospect Data",
        instruction: "Extract contact name, company name, company size, budget indicator, product interest, and implementation timeline.",
        input_from: "input.text",
        output_key: "lead_info",
      },
      {
        id: "step_2",
        type: "classify",
        title: "Classify Buying Intent",
        instruction: "Classify prospect intent into: High Intent (Immediate Evaluation), Medium Intent (Exploring Options), Low Intent (Information Gathering).",
        input_from: "lead_info, input.text",
        output_key: "intent_classification",
      },
      {
        id: "step_3",
        type: "prioritize",
        title: "Calculate Lead Score",
        instruction: "Calculate lead score (Hot, Warm, Cold) based on budget, company size, and timeline urgency, with rationalization.",
        input_from: "lead_info, intent_classification",
        output_key: "lead_score",
      },
      {
        id: "step_4",
        type: "decision",
        title: "Enterprise Account Routing",
        instruction: "Determine if lead qualifies as Enterprise (employees > 200 or budget > $50k). Output route: 'Enterprise AE Routing' or 'Self-serve / SMB Funnel'.",
        input_from: "lead_info, lead_score",
        output_key: "routing_decision",
      },
      {
        id: "step_5",
        type: "draft_email",
        title: "Draft Personalized Outreach",
        instruction: "Draft a personalized sales outreach email acknowledging their pain points and proposing a 20-minute discovery conversation.",
        input_from: "lead_info, routing_decision",
        output_key: "outreach_email",
      },
    ],
  },
];
