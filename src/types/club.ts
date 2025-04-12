
// Custom type definitions for club-related features

export type UserRole = 'beginner' | 'accurate' | 'fast' | 'elite';
export type ClubRole = 'member' | 'trainer' | 'manager' | 'admin';

export interface Club {
  id: string;
  name: string;
  logo_url?: string;
  is_subscribed: boolean;
  member_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ClubMember {
  id: string;
  name: string;
  profile_image?: string;
  club_role: ClubRole;
  role?: UserRole;
  accuracy?: number;
  speed?: number;
}

// Removed ClubRequest interface since users won't be requesting to join clubs
