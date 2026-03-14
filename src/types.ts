export interface User {
  id: string;
  name: string;
  role: 'client' | 'freelancer';
  pfi: number;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string;
  amount: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  submission?: string;
  feedback?: string;
}

export interface Project {
  id: string;
  client_id: string;
  title: string;
  description: string;
  budget: number;
  status: 'open' | 'in_progress' | 'completed';
  freelancer_id?: string;
  created_at: string;
  milestones?: Milestone[];
}
