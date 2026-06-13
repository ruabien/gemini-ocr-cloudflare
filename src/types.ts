export interface UserSession {
  name: string;
  role: string;
  department: string;
  isAuthenticated: boolean;
}

export interface RecentActivity {
  id: string;
  fileName: string;
  time: string;
  format: string;
  status: string;
  icon: string;
}

export interface OcrConfig {
  engine: string;
  outputFormat: string;
  // Add other configuration fields as needed
}
