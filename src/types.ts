export interface TeamMember {
  id: string;
  name: string;
  position: string;
  year: string;
  major: string;
  hometown: string;
  funFact?: string;
  imageUrl: string;
  imageFocusX?: number; // 0~100, horizontal focus point for square crop
  imageFocusY?: number; // 0~100, vertical focus point for square crop
  imageZoom?: number; // >=1, visual zoom level for square crop
  isExec?: boolean;
  email?: string;
  /** Team assignment for exec roles; labels come from config/teamSettings.teamNames */
  team?: string;
  /** When true, member appears in the Executive Board block on the main About page (independent of team). */
  onExecutiveBoard?: boolean;
  order?: number; // Display order for sorting
  status?: 'approved' | 'pending' | 'rejected'; // From users collection
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
  slackUrl?: string;
  deadline?: string;
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
  // Detail page: "Want to Get Involved?" / Join Slack section
  slack?: string;
  timeline?: string;
  img?: string;
  joinSectionTitle?: string;
  joinSectionDescription?: string;
  joinButtonLabel?: string;
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
  type: 'upcoming' | 'this_week' | 'past';
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
  slackUrl: 'https://forms.gle/Nrfpx14Qz82qBK2a6',
};

/** Site content: home page (stored in config/home). */
export interface HomeContent {
  heroLine1?: string;
  heroLine2?: string;
  heroLine3?: string;
  nextMeetingTitle?: string;
  whatWeDoTitle?: string;
  whatWeDoParagraph1?: string;
  whatWeDoParagraph2?: string;
  whatWeDoButtonText?: string;
  whatWeDoButtonUrl?: string;
}

export const DEFAULT_HOME: HomeContent = {
  heroLine1: 'WE ARE',
  heroLine2: 'THE AMERICAN SOCIETY OF MECHANICAL ENGINEERS',
  heroLine3: '@ PENN STATE',
  nextMeetingTitle: 'Next Meeting',
  whatWeDoTitle: 'What we do',
  whatWeDoParagraph1: 'The Penn State Chapter of ASME provides members with opportunities for professional development, hands-on design experience, and outreach within and beyond Penn State. If you are interested in growing professionally, getting in contact with employers, or working on cool projects, you are in the right spot!',
  whatWeDoParagraph2: 'Everyone is welcome (not just Mechanical engineers), and there are no membership requirements or dues. Just show up!',
  whatWeDoButtonText: 'Join our GroupMe',
  whatWeDoButtonUrl: '',
};

/** Site content: about page (stored in config/about). */
export interface AboutContent {
  aboutTitle?: string;
  /** Hero image on main /about (left column, h-64 on md — matches public layout) */
  heroImageUrl?: string;
  aboutParagraph1?: string;
  aboutParagraph2?: string;
  aboutLinkUrl?: string;
  /** e.g. Jost, Inter, Georgia, Arial */
  paragraphFontFamily?: string;
  /** e.g. 400, 500, 600, 700 */
  paragraphFontWeight?: string;
}

export const DEFAULT_ABOUT: AboutContent = {
  aboutTitle: 'About Us',
  aboutParagraph1: 'Established in 1880, the American Society of Mechanical Engineers (ASME) is an international organization comprised of over 85,000 members from over 100 countries.',
  aboutParagraph2: 'ASME serves both mechanical and interdisciplinary engineers in technical standardization, experimental procedures, and development codes to make the engineering landscape safer overall. To learn more about the international ASME organization visit this link. WE ARE! the Penn State\'s chapter of ASME and are looking forward to providing unique opportunities for Mechanical Engineers at PSU.',
  aboutLinkUrl: 'https://www.asme.org',
};

/** About page: General Body section (stored in config/aboutGeneralBody). */
export interface GeneralBodyContent {
  activitiesTitle?: string;
  activitiesList?: string[];
  leftImageUrl?: string;
  pastEventsTitle?: string;
  pastEventsList?: string[];
  bodySectionTitle?: string;
}

export const DEFAULT_GENERAL_BODY: GeneralBodyContent = {
  activitiesTitle: 'Our Activities',
  activitiesList: ['THON Fundraisers', 'Design Team Meetings', 'General Body Meetings', 'Project Meetings', 'Socials'],
  leftImageUrl: 'https://picsum.photos/seed/about/800/600',
  pastEventsTitle: 'Past Events',
  pastEventsList: ['Event 1 - Date', 'Event 2 - Date', 'Event 3 - Date'],
  bodySectionTitle: 'Our General Body',
};

/** Blank General Body form (admin per-team tabs). Public page uses DEFAULT_GENERAL_BODY for unfilled fields. */
export const EMPTY_GENERAL_BODY_FORM: GeneralBodyContent = {
  activitiesTitle: '',
  activitiesList: [],
  leftImageUrl: '',
  pastEventsTitle: '',
  pastEventsList: [],
  bodySectionTitle: '',
};

/** About page: Design Team section (stored in config/aboutDesignTeam). */
export interface DesignTeamContent {
  sectionTitle?: string;
  leftImageUrl?: string;
  pastProjectsTitle?: string;
  currentProjectsTitle?: string;
  /** Intro block: paragraph 1 */
  introParagraph1?: string;
  /** Intro block: paragraph 2 */
  introParagraph2?: string;
  /** Intro block: paragraph 3 (use "visit this link" for the link text) */
  introParagraph3?: string;
  /** URL for the link in paragraph 3 */
  introLinkUrl?: string;
  /** Intro block: paragraph 4 (e.g. WE ARE! ... Our Design Team focuses...) */
  introParagraph4?: string;
  /** Intro paragraphs font family (e.g. Jost, Inter, Georgia) */
  introFontFamily?: string;
  /** Intro paragraphs font weight (e.g. 400, 500, 600, 700) */
  introFontWeight?: string;
  /** Section title font family */
  sectionTitleFontFamily?: string;
  /** Section title font weight */
  sectionTitleFontWeight?: string;
}

export const DEFAULT_DESIGN_TEAM: DesignTeamContent = {
  sectionTitle: 'Our Design Team',
  leftImageUrl: 'https://picsum.photos/seed/designteam/800/600',
  pastProjectsTitle: 'Past Projects',
  currentProjectsTitle: 'Fall 2025 Projects',
  introParagraph1: 'Established in 1880, the American Society of Mechanical Engineers (ASME) is an international organization comprised of over 85,000 members from over 100 countries.',
  introParagraph2: 'ASME serves both mechanical and interdisciplinary engineers in technical standardization, experimental procedures, and development codes to make the engineering landscape safer overall. The organization plays a crucial role in establishing safety standards, codes, and best practices that are used worldwide in various industries including manufacturing, energy, aerospace, and biomedical engineering.',
  introParagraph3: 'To learn more about the international ASME organization, visit this link.',
  introLinkUrl: 'https://www.asme.org',
  introParagraph4: "WE ARE! the Penn State's chapter of ASME and are looking forward to providing unique opportunities for Mechanical Engineers at PSU. Our Design Team focuses on hands-on engineering projects, CAD design, prototyping, and bringing innovative ideas to life.",
};

/** Per-team About blocks (config/aboutTeamBlocks): same shape as General Body; exec-board team uses the General Body tab instead. */
export interface AboutTeamBlocksDoc {
  blocks: Record<string, GeneralBodyContent>;
}

/** Site content: sponsors page (stored in config/sponsors). */
export interface SponsorsContent {
  contactEmail?: string;
  bannerTitle?: string;
  bannerText?: string;
  getInTouchTitle?: string;
  getInTouchParagraph?: string;
  donateLabel?: string;
  donateUrl?: string;
  thonLabel?: string;
  thonUrl?: string;
  guestSpeakerText?: string;
  specialThanksTitle?: string;
  specialThanksParagraph?: string;
}

export const DEFAULT_SPONSORS: SponsorsContent = {
  contactEmail: 'president.asme.psu@gmail.com',
  bannerTitle: 'Become a Sponsor',
  bannerText: "If you're interested in becoming a sponsor, email us at {{email}} to receive our Sponsorship packet!",
  getInTouchTitle: 'Get in Touch!',
  getInTouchParagraph: 'Looking to provide professional insight and support to ASME? Consider choosing one of the options below to help us out!',
  donateLabel: 'Donate',
  donateUrl: 'https://secure.ddar.psu.edu/s/1218/2014/index.aspx?sid=1218&gid=1&pgid=658&cid=2321&dids=17094&bledit=1&appealcode=AZZ1K',
  thonLabel: 'Donate to THON',
  thonUrl: 'https://donate.thon.org/events/4542',
  guestSpeakerText: 'Become a guest speaker by emailing us at {{email}}',
  specialThanksTitle: 'Special Thanks to our Supporters',
  specialThanksParagraph: 'On behalf of the Pennsylvania State University Chapter of the American Society of Mechanical Engineers (ASME), we thank you in advance for considering a donation or Sponsorship. We appreciate the time you have taken to review this packet. With your investment, we will engage more students in Mechanical Engineering and enrich their undergraduate experiences. In tandem, we will advance our members\' careers and contribute to the local community in State College.',
};
