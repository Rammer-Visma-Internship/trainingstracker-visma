export type Locale = "en" | "pt";

export type UserRole = "employee" | "admin";

export type TrainingFormat = "in-person" | "online" | "self-paced";

export type EmployeeStatus = "on_track" | "below_target" | "missing_data";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  department: string | null;
  manager_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  training_name: string;
  session_date: string;
  duration_hours: number;
  format: TrainingFormat;
  notes: string | null;
  created_at: string;
}

export interface SystemConfig {
  id: number;
  yearly_goal_hours: number;
  goal_period: "monthly" | "yearly";
  updated_at: string;
}

export interface EmployeeSummary {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  manager_name: string | null;
  yearly_hours: number;
  status: EmployeeStatus;
}
