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
  language?: string;
  preserveLayout?: boolean;
}

export interface ExtractionField {
  id: string;
  name: string;
  key: string;
  type: string;
}

export interface OcrDocument {
  name: string;
  content?: string;
  rawText: string;
  fileType: string;
  resolution: string;
  uploader: string;
  accuracy: number | string;
  warnings: Array<{
    line: string | number;
    text: string;
    description: string;
  }>;
  selectedFileUrl?: string;
  selectedFile?: File | File[];
  outputMode?: "text" | "structured";
  documentType?: string;
  caseType?: string;
}
