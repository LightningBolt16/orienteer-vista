
import { v4 as uuidv4 } from 'uuid';
import { Club, ClubMember, ClubRole } from '../types/club';

// Mock data for development
const mockClubs: Club[] = [
  {
    id: '1',
    name: 'Täby OK',
    logo_url: '/lovable-uploads/72c7a51b-361f-4cac-b3a7-32223a5cfa7f.png',
    is_subscribed: true,
    member_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const mockMembers: Record<string, ClubMember[]> = {
  '1': [
    {
      id: 'member1',
      name: 'Elias Ljungdell',
      profile_image: 'https://placehold.co/200x200?text=EL',
      club_role: 'admin',
      role: 'elite',
      accuracy: 95,
      speed: 120
    },
    {
      id: 'member2',
      name: 'Hugo S',
      profile_image: 'https://placehold.co/200x200?text=HS',
      club_role: 'admin',
      role: 'accurate',
      accuracy: 98,
      speed: 180
    }
  ]
};

// Mock functions to simulate database operations
export const getMockClubs = (): Promise<Club[]> => {
  return Promise.resolve([...mockClubs]);
};

export const getMockClubById = (id: string): Promise<Club | null> => {
  const club = mockClubs.find(c => c.id === id);
  return Promise.resolve(club || null);
};

export const getMockClubMembers = (clubId: string): Promise<ClubMember[]> => {
  return Promise.resolve(mockMembers[clubId] || []);
};

// Function to manually add a user to a club (by admin)
export const addMemberToClub = (
  userId: string,
  userName: string,
  clubId: string,
  role: ClubRole = 'member'
): Promise<boolean> => {
  if (!mockMembers[clubId]) {
    mockMembers[clubId] = [];
  }
  
  // Check if user is already a member
  const existingMember = mockMembers[clubId].find(m => m.id === userId);
  if (existingMember) {
    return Promise.resolve(false);
  }
  
  // Add user to club members
  mockMembers[clubId].push({
    id: userId,
    name: userName,
    club_role: role
  });
  
  return Promise.resolve(true);
};

export const leaveMockClub = (userId: string): Promise<boolean> => {
  // Remove from all clubs
  Object.keys(mockMembers).forEach(clubId => {
    mockMembers[clubId] = mockMembers[clubId].filter(member => member.id !== userId);
  });
  
  return Promise.resolve(true);
};

export const updateMockMemberRole = (
  userId: string,
  clubId: string,
  role: ClubRole
): Promise<boolean> => {
  if (mockMembers[clubId]) {
    const member = mockMembers[clubId].find(m => m.id === userId);
    if (member) {
      member.club_role = role;
      return Promise.resolve(true);
    }
  }
  return Promise.resolve(false);
};
