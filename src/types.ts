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
  order?: number; // Display order for sorting
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
  leaderName?: string; // Name of project leader (for display)
  members?: ProjectMember[]; // Project members assigned by leader
  projectRoles?: string[]; // Custom project roles defined by leader (e.g., 'Software Lead', 'Hardware Lead')
  createdAt?: string;
  updatedAt?: string;
  order?: number; // Display order for sorting
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
  type: 'upcoming' | 'past';
  imageUrl?: string;
  location?: string;
    // Approval system
  approvalStatus?: 'pending' | 'approved';
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // Soft delete system
  deletedAt?: string | null;
  deletedBy?: string;
  // Permanent delete approval system
  permanentDeleteRequest?: {
    requestedBy: string; // UID of President/VP who requested permanent delete
    requestedAt: string; // Timestamp
    approvedByExec1?: boolean; // Whether first President/VP approved
    approvedByExec1At?: string; // When first exec approved
    approvedByExec1By?: string; // UID of first exec who approved
    rejectedByExec1?: boolean; // Whether first President/VP rejected
    rejectedByExec1At?: string; // When first exec rejected
    rejectedByExec1By?: string; // UID of first exec who rejected
    approvedByExec2?: boolean; // Whether second President/VP approved
    approvedByExec2At?: string; // When second exec approved
    approvedByExec2By?: string; // UID of second exec who approved
    rejectedByExec2?: boolean; // Whether second President/VP rejected
    rejectedByExec2At?: string; // When second exec rejected
    rejectedByExec2By?: string; // UID of second exec who rejected
  };
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  link?: string;
  tier?: string;
  // Approval system
  approvalStatus?: 'pending' | 'approved';
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // Soft delete system
  deletedAt?: string | null;
  deletedBy?: string;
  // Permanent delete approval system
  permanentDeleteRequest?: {
    requestedBy: string; // UID of President/VP who requested permanent delete
    requestedAt: string; // Timestamp
    approvedByExec1?: boolean; // Whether first President/VP approved
    approvedByExec1At?: string; // When first exec approved
    approvedByExec1By?: string; // UID of first exec who approved
    rejectedByExec1?: boolean; // Whether first President/VP rejected
    rejectedByExec1At?: string; // When first exec rejected
    rejectedByExec1By?: string; // UID of first exec who rejected
    approvedByExec2?: boolean; // Whether second President/VP approved
    approvedByExec2At?: string; // When second exec approved
    approvedByExec2By?: string; // UID of second exec who approved
    rejectedByExec2?: boolean; // Whether second President/VP rejected
    rejectedByExec2At?: string; // When second exec rejected
    rejectedByExec2By?: string; // UID of second exec who rejected
  };
}

export interface HomePageWhatWeDo {
  title: string;
  content: string; // HTML content for rich text
  buttonText: string;
  buttonUrl?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface InstagramPost {
  id: string;
  caption?: string;
  mediaUrl: string;
  permalink: string;
  timestamp: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  thumbnailUrl?: string;
}

/** Site content: footer (stored in config/footer). More sections (e.g. hero) can be added later. */
export interface FooterContent {
  phone?: string;
  email1?: string;
  email2?: string;
  missionStatement?: string;
  addressLine1?: string;
  addressLine2?: string;
  instagramUrl?: string;
  groupmeUrl?: string;
  slackUrl?: string;
}

export const DEFAULT_FOOTER: FooterContent = {
  phone: '484-268-3741',
  email1: 'gmk5561@psu.edu',
  email2: 'president.asme.psu@gmail.com',
  missionStatement: 'Developing & Supporting the next generation of Mechanical Engineers',
  addressLine1: '125 Hammond',
  addressLine2: 'University Park, PA 16802',
  instagramUrl: 'https://www.instagram.com/asmepsu/',
  groupmeUrl: '',
  slackUrl: '',
};
