
import { v4 as uuidv4 } from 'uuid';
import { Club, ClubMember, ClubRequest, ClubRole } from '../types/club';

// Mock data for development
const mockClubs: Club[] = [
  {
    id: '1',
    name: 'Orienteering Masters',
    logo_url: 'https://placehold.co/200x200?text=OM',
    is_subscribed: true,
    member_count: 24,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Forest Runners',
    logo_url: 'https://placehold.co/200x200?text=FR',
    is_subscribed: false,
    member_count: 16,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'City Navigators',
    logo_url: 'https://placehold.co/200x200?text=CN',
    is_subscribed: false,
    member_count: 32,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const mockMembers: Record<string, ClubMember[]> = {
  '1': [
    {
      id: 'member1',
      name: 'Jane Smith',
      profile_image: 'https://placehold.co/200x200?text=JS',
      club_role: 'admin',
      role: 'elite',
      accuracy: 95,
      speed: 120
    },
    {
      id: 'member2',
      name: 'John Doe',
      profile_image: 'https://placehold.co/200x200?text=JD',
      club_role: 'member',
      role: 'accurate',
      accuracy: 98,
      speed: 180
    }
  ],
  '2': [
    {
      id: 'member3',
      name: 'Emily Johnson',
      profile_image: 'https://placehold.co/200x200?text=EJ',
      club_role: 'admin',
      role: 'fast',
      accuracy: 80,
      speed: 90
    }
  ],
  '3': [
    {
      id: 'member4',
      name: 'Michael Brown',
      profile_image: 'https://placehold.co/200x200?text=MB',
      club_role: 'admin',
      role: 'elite',
      accuracy: 92,
      speed: 110
    }
  ]
};

const mockRequests: Record<string, ClubRequest[]> = {
  '1': [
    {
      id: 'req1',
      user_id: 'user1',
      user_name: 'New User',
      created_at: new Date().toISOString()
    }
  ],
  '2': [],
  '3': []
};

// User's pending requests
let userPendingRequests: string[] = [];

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

export const getMockClubRequests = (clubId: string): Promise<ClubRequest[]> => {
  return Promise.resolve(mockRequests[clubId] || []);
};

export const getMockUserPendingRequests = (): Promise<{club_id: string}[]> => {
  return Promise.resolve(userPendingRequests.map(id => ({ club_id: id })));
};

export const createMockClubRequest = (userId: string, clubId: string): Promise<boolean> => {
  if (!userPendingRequests.includes(clubId)) {
    userPendingRequests.push(clubId);
  }
  
  if (!mockRequests[clubId]) {
    mockRequests[clubId] = [];
  }
  
  // Add to club's request list
  mockRequests[clubId].push({
    id: uuidv4(),
    user_id: userId,
    user_name: 'Current User',
    created_at: new Date().toISOString()
  });
  
  return Promise.resolve(true);
};

export const updateMockClubName = (clubId: string, name: string): Promise<boolean> => {
  const club = mockClubs.find(c => c.id === clubId);
  if (club) {
    club.name = name;
    return Promise.resolve(true);
  }
  return Promise.resolve(false);
};

export const updateMockClubLogo = (clubId: string, logoUrl: string): Promise<boolean> => {
  const club = mockClubs.find(c => c.id === clubId);
  if (club) {
    club.logo_url = logoUrl;
    return Promise.resolve(true);
  }
  return Promise.resolve(false);
};

export const handleMockClubRequest = (
  requestId: string,
  userId: string,
  clubId: string,
  action: 'approve' | 'reject'
): Promise<boolean> => {
  if (action === 'approve') {
    // Add user to club members
    if (!mockMembers[clubId]) {
      mockMembers[clubId] = [];
    }
    
    mockMembers[clubId].push({
      id: userId,
      name: 'New Member',
      club_role: 'member'
    });
  }
  
  // Remove the request
  if (mockRequests[clubId]) {
    mockRequests[clubId] = mockRequests[clubId].filter(req => req.id !== requestId);
  }
  
  // Remove from pending requests
  userPendingRequests = userPendingRequests.filter(id => id !== clubId);
  
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

export const leaveMockClub = (userId: string): Promise<boolean> => {
  // Remove from all clubs
  Object.keys(mockMembers).forEach(clubId => {
    mockMembers[clubId] = mockMembers[clubId].filter(member => member.id !== userId);
  });
  
  return Promise.resolve(true);
};

export const createMockClub = (
  name: string,
  logoUrl?: string,
  ownerId?: string
): Promise<string> => {
  const newClubId = uuidv4();
  
  // Create the club
  const newClub: Club = {
    id: newClubId,
    name,
    logo_url: logoUrl,
    is_subscribed: false,
    member_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  mockClubs.push(newClub);
  
  // Add the creator as admin
  if (ownerId) {
    mockMembers[newClubId] = [{
      id: ownerId,
      name: 'Club Creator',
      club_role: 'admin'
    }];
  }
  
  return Promise.resolve(newClubId);
};
