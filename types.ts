export interface TeamMember {
  id: string;
  name: string;
  position: string;
  year: string;
  major: string;
  hometown: string;
  funFact?: string;
  imageUrl: string;
  isExec?: boolean;
  email?: string;
  team?: 'Design Team' | 'General Body'; // Team assignment for Exec Board members
}

export interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  chairs: { name: string; role: string }[];
  status: 'current' | 'past';
  // Project-specific roles (separate from main user role)
  leaderId?: string; // UID of project leader (assigned by President/VP)
  leaderEmail?: string; // Email of project leader
  members?: ProjectMember[]; // Project members assigned by leader
  createdAt?: string;
  updatedAt?: string;
  // Project approval system
  approvalStatus?: 'pending' | 'approved'; // pending: waiting for President/VP approval, approved: active project
  createdBy?: string; // UID of user who created the project
  approvedBy?: string; // UID of President/VP who approved
  approvedAt?: string; // When project was approved
  // Soft delete system (trash)
  deletedAt?: string | null; // Timestamp when project was deleted (null = not deleted)
  deletedBy?: string; // UID of user who deleted the project
  // Permanent delete approval system
  permanentDeleteRequest?: {
    requestedBy: string; // UID of President/VP who requested permanent delete
    requestedAt: string; // Timestamp
    approvedByLeader?: boolean; // Whether project leader approved
    approvedByLeaderAt?: string; // When leader approved
    approvedByLeaderBy?: string; // UID of leader who approved
    rejectedByLeader?: boolean; // Whether project leader rejected
    rejectedByLeaderAt?: string; // When leader rejected
    rejectedByLeaderBy?: string; // UID of leader who rejected
    approvedByExec?: boolean; // Whether second President/VP approved
    approvedByExecAt?: string; // When second exec approved
    approvedByExecBy?: string; // UID of exec who approved
    rejectedByExec?: boolean; // Whether second President/VP rejected
    rejectedByExecAt?: string; // When second exec rejected
    rejectedByExecBy?: string; // UID of exec who rejected
  };
}

export interface Notification {
  id: string;
  userId: string; // UID of user to notify
  type: 'project_deleted' | 'project_deletion_cancelled';
  title: string;
  message: string;
  projectId?: string;
  projectTitle?: string;
  read: boolean;
  createdAt: string;
  rejectedBy?: string; // UID of user who rejected (for cancellation notifications)
  rejectedByName?: string; // Name of user who rejected
}

export interface ProjectMember {
  userId: string; // User UID
  userEmail: string;
  userName: string;
  projectRole: string; // Project-specific role/position (e.g., 'Software Lead', 'Hardware Lead', 'Designer')
  assignedBy?: string; // Leader UID who assigned this member
  assignedAt?: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  description: string;
  type: 'upcoming' | 'past' | 'this_week';
  imageUrl?: string;
  location?: string;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  tier?: string;
}
