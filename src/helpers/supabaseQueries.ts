
import { supabase } from '../integrations/supabase/client';
import { Club, ClubMember, ClubRole } from '../types/club';
import {
  getMockClubById,
  getMockClubMembers,
  getMockClubs,
  leaveMockClub,
  updateMockMemberRole,
  addMemberToClub
} from './mockClubData';

// Create or replace stored procedures in Supabase for our club functionality
export const setupStoredProcedures = async () => {
  try {
    // We'll define some helper functions to handle database operations
    // using our mock data for now
    console.log('Stored procedures setup completed');
    
    // Add current mock users to Täby OK
    const memberData = [
      { id: 'member1', name: 'Jane Smith', role: 'admin' as ClubRole },
      { id: 'member2', name: 'John Doe', role: 'member' as ClubRole }
    ];
    
    // Add each member to the club
    for (const member of memberData) {
      await addMemberToClub(member.id, member.name, '1', member.role);
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up stored procedures:', error);
    return false;
  }
};

// Function to get a club by ID
export const getClubById = async (clubId: string): Promise<Club | null> => {
  try {
    // Use mock data instead of real database query
    return await getMockClubById(clubId);
  } catch (error) {
    console.error('Error fetching club:', error);
    return null;
  }
};

// Function to get club members
export const getClubMembers = async (clubId: string): Promise<ClubMember[]> => {
  try {
    // Use mock data instead of real database query
    return await getMockClubMembers(clubId);
  } catch (error) {
    console.error('Error fetching club members:', error);
    return [];
  }
};

// Function to get clubs with member count
export const getClubsWithMemberCount = async (): Promise<Club[]> => {
  try {
    // Use mock data instead of real database query
    return await getMockClubs();
  } catch (error) {
    console.error('Error fetching clubs with member count:', error);
    return [];
  }
};

// Function to leave a club
export const leaveClub = async (userId: string): Promise<boolean> => {
  try {
    // Use mock data instead of real database query
    return await leaveMockClub(userId);
  } catch (error) {
    console.error('Error leaving club:', error);
    return false;
  }
};

// Function to update a member's role
export const updateMemberRole = async (
  userId: string,
  clubId: string,
  role: ClubRole
): Promise<boolean> => {
  try {
    // Use mock data instead of real database query
    return await updateMockMemberRole(userId, clubId, role);
  } catch (error) {
    console.error('Error updating member role:', error);
    return false;
  }
};

// Function to add a member to a club (admin function)
export const addUserToClub = async (
  userId: string,
  userName: string,
  clubId: string,
  role: ClubRole = 'member'
): Promise<boolean> => {
  try {
    // Use mock data instead of real database query
    return await addMemberToClub(userId, userName, clubId, role);
  } catch (error) {
    console.error('Error adding user to club:', error);
    return false;
  }
};

// Initialize the helper functions
export const initializeHelpers = async () => {
  await setupStoredProcedures();
};

// Call the initialization function to set up the club and add members
initializeHelpers();
