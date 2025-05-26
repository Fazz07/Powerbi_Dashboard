import { useAuthStore } from '../store/authStore';
import type { Report } from '../components/ModalWindow'; // Import Report type
import type { UnifiedVisualId } from '../pages/Dashboard'; // Assuming this type exists

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface DashboardCustomization {
  id: string;
  userId: string;
  visualOrder: UnifiedVisualId[];
  selectedDynamicReports: Report[]; // Store the full Report object or necessary parts
  lastUpdated: string;
}

const getAuthHeader = (): Record<string, string> => {
  const token = useAuthStore.getState().getToken();
  if (!token) {
    // This shouldn't happen if called from an authenticated context, but handle defensively
    console.error("Attempted API call without auth token.");
    throw new Error("User not authenticated");
  }
  return { Authorization: `Bearer ${token}` };
};

export const fetchDashboardConfig = async (): Promise<DashboardCustomization | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/dashboard`, {
      method: 'GET',
      headers: getAuthHeader(),
    });

    if (response.status === 404) {
      return null; // No config saved yet, return null
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard config: ${response.statusText}`);
    }
    return await response.json() as DashboardCustomization;
  } catch (error) {
    console.error("Error in fetchDashboardConfig:", error);
    throw error; // Re-throw to be caught by the caller
  }
};

export const saveDashboardConfig = async (
  visualOrder: UnifiedVisualId[],
  selectedDynamicReports: Report[]
): Promise<DashboardCustomization> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/dashboard`, {
      method: 'PUT',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ visualOrder, selectedDynamicReports }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save dashboard config: ${response.statusText}`);
    }
    return await response.json() as DashboardCustomization;
  } catch (error) {
    console.error("Error in saveDashboardConfig:", error);
    throw error; // Re-throw
  }
};