export type User = {
  id: string;
  email: string;
  full_name: string;
  avatar?: string;
  created_at: string;
};

export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  country?: string;
  city?: string;
  linkedin?: string;
  summary?: string;
  skills: string[];
  languages: string[];
  current_education?: string;
  current_status?: string;
  intended_destination?: string;
  intended_degree?: string;
  preferred_field?: string;
  career_goals_short?: string;
  career_goals_long?: string;
};

export type Education = {
  id: string | number;
  degree: string;
  school: string;
  major?: string;
  period?: string;
  graduation_year?: string;
  gpa?: string;
  details?: string;
};

export type WorkExperience = {
  id: string | number;
  role: string;
  company: string;
  period?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  achievements?: string[];
};

export type Project = {
  id: string | number;
  name: string;
  description?: string;
  link_or_credential?: string;
};

export type Document = {
  id: string;
  name: string;
  type: string;
  status: string;
  last_edited: string;
  progress?: number;
  author?: string;
  file_path?: string;
  processing_status?: string;
  extracted_data?: Record<string, unknown>;
  conflicts?: ProfileConflict[];
};

export type ProfileConflict = {
  field: string;
  existing_value: unknown;
  proposed_value: unknown;
  existing_source?: string;
  proposed_source?: string;
  confidence?: number;
};

export type University = {
  id: string;
  name: string;
  country?: string;
  city?: string;
  website?: string;
  institution_type?: string;
  recognition?: string;
  accreditation?: string;
  campuses?: Campus[];
  rankings?: Ranking[];
  last_verified?: string;
};

export type Campus = {
  id: string;
  name: string;
  city?: string;
  address?: string;
};

export type Ranking = {
  provider: string;
  rank: number;
  year: number;
};

export type Program = {
  id: string;
  name: string;
  university_id: string;
  university_name: string;
  campus?: string;
  degree_level: string;
  field: string;
  duration?: string;
  study_mode?: string;
  language?: string;
  tuition?: number;
  currency?: string;
  admission_requirements?: string[];
  intakes?: Intake[];
};

export type Intake = {
  name: string;
  deadline: string;
  is_open: boolean;
};

export type Recommendation = {
  id: string;
  university_id: string;
  program_id: string;
  match_score: number;
  eligibility: string;
  academic_fit?: number;
  budget_fit?: number;
  scholarship_fit?: number;
  career_fit?: number;
  reasons?: string[];
  missing_requirements?: string[];
  estimated_cost?: number;
  intake?: string;
  deadline?: string;
  sources?: SourceReference[];
};

export type SourceReference = {
  title: string;
  url: string;
  type?: string;
};

export type Scholarship = {
  id: string;
  name: string;
  provider?: string;
  funding_level?: string;
  amount?: number;
  currency?: string;
  eligible_nationalities?: string[];
  degree_levels?: string[];
  minimum_gpa?: number;
  deadline?: string;
  application_url?: string;
  eligibility_status?: string;
  last_verified?: string;
};

export type TrackedItem = {
  id: string;
  university_id?: string;
  program_id?: string;
  status: string;
  priority?: string;
  notes?: string;
  next_action?: string;
  due_date?: string;
};

export type RoadmapTask = {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  due_date?: string;
  related_document_id?: string;
  related_program_id?: string;
};

export type DashboardSummary = {
  completion_percentage: number;
  saved_unis_count: number;
  uploaded_docs_count: number;
  recent_chats: Array<{ id: string; title: string; time: string }>;
  active_goals?: Array<{ goal: string; status: string }>;
  roadmap_progress?: number;
  next_action?: string;
};

export type Conversation = {
  id: string;
  title: string;
  last_message?: string;
  updated_at: string;
  message_count?: number;
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  sender: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
  intent?: string;
  selectedAgent?: string;
  status?: "sending" | "streaming" | "complete" | "failed";
  quickReplies?: QuickReply[];
  sources?: SourceReference[];
  recommendations?: RecommendationCardData[];
  structuredData?: Record<string, unknown>;
};

export type QuickReply = {
  text: string;
  action?: string;
};

export type RecommendationCardData = {
  id: string;
  university: string;
  program: string;
  matchScore: number;
  eligibility: string;
  category?: "ambitious" | "strong" | "safe" | "ineligible";
};