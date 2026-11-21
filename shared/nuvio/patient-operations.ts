/**
 * Nuvio Medical Tourism Platform - Patient Operations & Lead Nurturing Contracts
 * Defines coordinator tasks, communication queue items, timeline events, and query filters.
 */
import { z } from "zod";

export const TASK_CATEGORIES = [
  "enquiry_review",
  "document_verification",
  "doctor_confirmation",
  "treatment_estimate",
  "consultation_scheduling",
  "visa_letter_review",
  "communication_approval",
  "patient_followup",
  "re_engagement",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_PRIORITIES = ["urgent", "high", "medium", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const coordinatorTaskSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(TASK_CATEGORIES),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  status: z.enum(TASK_STATUSES).default("pending"),
  assignedCoordinator: z.string().default("nuvio_concierge"),
  dueDate: z.number().int(),
  createdAt: z.number().int(),
  completedAt: z.number().int().optional(),
  completedBy: z.string().optional(),
  resolutionNotes: z.string().optional(),
});

export type CoordinatorTask = z.infer<typeof coordinatorTaskSchema>;
export type CoordinatorTaskInput = z.input<typeof coordinatorTaskSchema>;

export const COMMUNICATION_PURPOSES = [
  "inquiry_welcome",
  "information_request",
  "document_reminder",
  "consultation_update",
  "estimate_ready",
  "visa_guidance",
  "follow_up_checkin",
  "re_engagement",
] as const;

export type CommunicationPurpose = (typeof COMMUNICATION_PURPOSES)[number];

export const COMMUNICATION_STATUSES = [
  "pending_review",
  "approved",
  "rejected",
  "sent",
] as const;

export type CommunicationStatus = (typeof COMMUNICATION_STATUSES)[number];

export const communicationQueueItemSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  patientName: z.string().default("Patient"),
  purpose: z.enum(COMMUNICATION_PURPOSES),
  draftMessage: z.string().min(1).describe("Short, natural 1-3 sentence coordinator draft"),
  language: z.string().default("English"),
  relatedStage: z.string().default("new_enquiry"),
  status: z.enum(COMMUNICATION_STATUSES).default("pending_review"),
  scheduledTime: z.number().int().optional(),
  createdAt: z.number().int(),
  reviewedAt: z.number().int().optional(),
  reviewedBy: z.string().optional(),
  rejectionReason: z.string().optional(),
  channel: z.enum(["whatsapp", "email", "sms", "manual_call"]).default("whatsapp"),
});

export type CommunicationQueueItem = z.infer<typeof communicationQueueItemSchema>;
export type CommunicationQueueItemInput = z.input<typeof communicationQueueItemSchema>;

export const CASE_EVENT_TYPES = [
  "enquiry_received",
  "patient_replied",
  "information_requested",
  "document_requested",
  "document_received",
  "consultation_requested",
  "consultation_confirmed",
  "follow_up_scheduled",
  "coordinator_action_completed",
  "patient_stage_changed",
  "communication_drafted",
  "communication_approved",
  "communication_rejected",
  "task_created",
  "task_completed",
] as const;

export type CaseEventType = (typeof CASE_EVENT_TYPES)[number];

export const detailedCaseEventSchema = z.object({
  at: z.number().int(),
  stage: z.string(),
  eventType: z.enum(CASE_EVENT_TYPES),
  actor: z.string().min(1),
  note: z.string().min(1),
  requiresHumanApproval: z.boolean().optional(),
  approved: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type DetailedCaseEvent = z.infer<typeof detailedCaseEventSchema>;

export interface OperationsFilterQuery {
  search?: string;
  stage?: string;
  coordinator?: string;
  hasOverdueFollowups?: boolean;
  hasPendingDocuments?: boolean;
  hasConsultationRequests?: boolean;
  needsResponse?: boolean;
}
