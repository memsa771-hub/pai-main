'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Types
export interface DocumentItem {
  id: string;
  name: string;
  type: 'SOP' | 'LOR' | 'Resume' | 'Transcript' | 'Other';
  lastEdited: string;
  status: 'optimized' | 'completed' | 'draft' | 'pending';
  progress?: number; // for SOP AI Optimization percentage
  author?: string; // for LORs
  file_path?: string;
}

export interface UniversityDocs {
  university: string;
  degree: string;
  term: string;
  documents: DocumentItem[];
}

export interface WorkExperience {
  id: string | number;
  role: string;
  company: string;
  period: string;
  description: string;
}

export interface Education {
  id: string | number;
  degree: string;
  school: string;
  period: string;
  gpa: string;
  details?: string;
}

export interface ProjectItem {
  id: string | number;
  name: string;
  description: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  summary: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: string[];
  projects: ProjectItem[];
  careerGoalsShort: string;
  careerGoalsLong: string;
  phone?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  country?: string;
  city?: string;
  linkedin?: string;
  current_education?: string;
  current_status?: string;
  intended_destination?: string;
  intended_degree?: string;
  preferred_field?: string;
}

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'started' | 'completed' | 'locked';
  priority?: 'high' | 'medium' | 'low';
  type?: string;
}

export interface RoadmapSection {
  number: number;
  title: string;
  steps: RoadmapStep[];
}

export interface UniversityRoadmap {
  university: string;
  degree: string;
  term: string;
  progress: number;
  sections: RoadmapSection[];
}

export interface AppSettings {
  theme: 'light' | 'dark';
  aiModel: string;
  aiTone: string;
  aiDetail: string;
  emailNotifications: boolean;
  weeklyDigest: boolean;
  desktopNotifications: boolean;
}

export interface TrackedUniversity {
  id: number;
  name: string;
  location?: string;
  avg_gpa?: string;
  avg_gre?: string;
  deadlines?: string;
  status: string; // Interested, Planning, Applied
  acceptance_rate?: string;
  reqs?: string[]; // Parsed from JSON string
}

interface AppContextType {
  isLoggedIn: boolean;
  isAuthReady: boolean;
  username: string;
  profile: UserProfile;
  documents: UniversityDocs[];
  recentActivity: { id: string; text: string; time: string; type?: string }[];
  roadmaps: Record<string, UniversityRoadmap>;
  activeRoadmapUni: string;
  setActiveRoadmapUni: (uni: string) => void;
  settings: AppSettings;
  trackedUnis: TrackedUniversity[];
  dashboardSummary: {
    completion_percentage: number;
    saved_unis_count: number;
    uploaded_docs_count: number;
    recent_chats: { id: string; title: string; time: string }[];
  };
  
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (signupData: any) => Promise<boolean>;
  logout: () => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<Response>;
  uploadDocument: (university: string, name: string, type: string, file?: File) => Promise<void>;
  addSkill: (skill: string) => Promise<void>;
  removeSkill: (skill: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  addEducation: (edu: Omit<Education, 'id'>) => Promise<void>;
  deleteEducation: (id: number) => Promise<void>;
  addExperience: (exp: Omit<WorkExperience, 'id'>) => Promise<void>;
  deleteExperience: (id: number) => Promise<void>;
  addProject: (proj: Omit<ProjectItem, 'id'>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  
  addTrackedUni: (name: string, status: string) => Promise<void>;
  removeTrackedUni: (id: number) => Promise<void>;
  updateSettings: (data: Partial<AppSettings>) => void;
  startRoadmapStep: (uni: string, sectionIndex: number, stepId: string) => Promise<void>;
  refreshDashboardSummary: () => Promise<void>;
  fetchState: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:8000';

const defaultProfile: UserProfile = {
  name: 'Jane Doe',
  email: 'jane.doe@berkeley.edu',
  avatar: '/avatar.webp',
  summary: 'A motivated undergraduate student passionate about bridging the gap between technology and human-centric design.',
  workExperience: [],
  education: [],
  skills: [],
  projects: [],
  careerGoalsShort: '',
  careerGoalsLong: ''
};

const defaultSettings: AppSettings = {
  theme: 'light',
  aiModel: 'DeepSeek Chat (V3)',
  aiTone: 'Professional & Encouraging',
  aiDetail: 'Balanced',
  emailNotifications: true,
  weeklyDigest: true,
  desktopNotifications: false
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [documents, setDocuments] = useState<UniversityDocs[]>([]);
  const [roadmaps, setRoadmaps] = useState<Record<string, UniversityRoadmap>>({});
  const [activeRoadmapUni, setActiveRoadmapUni] = useState<string>('');
  const [trackedUnis, setTrackedUnis] = useState<TrackedUniversity[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  const [dashboardSummary, setDashboardSummary] = useState({
    completion_percentage: 0,
    saved_unis_count: 0,
    uploaded_docs_count: 0,
    recent_chats: []
  });

  // Base Fetch Wrapper
  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('placement-ai-token');
    const headers = {
      ...(options.headers || {}),
    } as Record<string, string>;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
    return response;
  };

  // Sync state with backend
  const fetchState = async () => {
    try {
      // 1. Fetch user info
      const userRes = await apiFetch('/api/auth/me');
      if (userRes.status === 401) {
        logout();
        return;
      }
      if (userRes.ok) {
        const userData = await userRes.json();
        
        let skillsParsed = [];
        try {
          if (userData.skills) {
            skillsParsed = JSON.parse(userData.skills);
          }
        } catch(e) {}
        
        // Map backend User to Frontend UserProfile
        const mappedProfile: UserProfile = {
          name: userData.full_name,
          email: userData.email,
          avatar: userData.avatar || '/avatar.webp',
          summary: userData.summary || '',
          phone: userData.phone,
          dob: userData.dob,
          gender: userData.gender,
          nationality: userData.nationality,
          country: userData.country,
          city: userData.city,
          linkedin: userData.linkedin,
          current_education: userData.current_education,
          current_status: userData.current_status,
          intended_destination: userData.intended_destination,
          intended_degree: userData.intended_degree,
          preferred_field: userData.preferred_field,
          skills: skillsParsed,
          education: userData.education.map((e: any) => ({
            id: e.id,
            degree: e.degree,
            school: e.school,
            period: e.period || '',
            gpa: e.gpa || '',
            details: e.details || ''
          })),
          workExperience: userData.work_experience.map((w: any) => ({
            id: w.id,
            role: w.role,
            company: w.company,
            period: w.period || '',
            description: w.description || ''
          })),
          projects: userData.projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description || ''
          })),
          careerGoalsShort: userData.career_goals_short || '',
          careerGoalsLong: userData.career_goals_long || ''
        };
        setProfile(mappedProfile);
      }

      // 2. Fetch tracked universities
      const trackerRes = await apiFetch('/api/tracker/universities');
      if (trackerRes.ok) {
        const list = await trackerRes.json();
        const mappedList: TrackedUniversity[] = list.map((uni: any) => {
          let reqsParsed = [];
          try {
            if (uni.reqs) reqsParsed = JSON.parse(uni.reqs);
          } catch(e) {}
          return {
            id: uni.id,
            name: uni.name,
            location: uni.location,
            avg_gpa: uni.avg_gpa,
            avg_gre: uni.avg_gre,
            deadlines: uni.deadlines,
            status: uni.status,
            acceptance_rate: uni.acceptance_rate,
            reqs: reqsParsed
          };
        });
        setTrackedUnis(mappedList);
      }

      // 3. Fetch documents
      const docsRes = await apiFetch('/api/documents');
      if (docsRes.ok) {
        const list = await docsRes.json();
        
        // Group documents by target university
        const groupedDocs: Record<string, DocumentItem[]> = {};
        list.forEach((doc: any) => {
          // Placeholder target university or group generic documents together
          const target = "My Portfolio"; 
          if (!groupedDocs[target]) groupedDocs[target] = [];
          groupedDocs[target].push({
            id: doc.id,
            name: doc.name,
            type: doc.type,
            lastEdited: doc.last_edited,
            status: doc.status,
            progress: doc.progress,
            author: doc.author,
            file_path: doc.file_path
          });
        });
        
        const mappedDocs: UniversityDocs[] = Object.keys(groupedDocs).map(uni => ({
          university: uni,
          degree: "",
          term: "",
          documents: groupedDocs[uni]
        }));
        setDocuments(mappedDocs);
      }

      // 4. Fetch roadmaps
      const roadmapsRes = await apiFetch('/api/roadmap');
      if (roadmapsRes.ok) {
        const list = await roadmapsRes.json();
        const roadmapsDict: Record<string, UniversityRoadmap> = {};
        
        list.forEach((r: any) => {
          roadmapsDict[r.university] = {
            university: r.university,
            degree: r.degree || '',
            term: r.term || '',
            progress: r.progress,
            sections: r.sections.map((s: any) => ({
              number: s.number,
              title: s.title,
              steps: s.steps.map((st: any) => ({
                id: st.id,
                title: st.title,
                description: st.description || '',
                status: st.status,
                priority: st.priority,
                type: st.type
              }))
            }))
          };
        });
        
        setRoadmaps(roadmapsDict);
        if (list.length > 0 && !activeRoadmapUni) {
          setActiveRoadmapUni(list[0].university);
        }
      }

      // 5. Fetch dashboard summary
      await refreshDashboardSummary();

    } catch (e) {
      console.error('Error fetching state from API', e);
    }
  };

  const refreshDashboardSummary = async () => {
    try {
      const summaryRes = await apiFetch('/api/dashboard/summary');
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setDashboardSummary({
          completion_percentage: data.completion_percentage,
          saved_unis_count: data.saved_unis_count,
          uploaded_docs_count: data.uploaded_docs_count,
          recent_chats: data.recent_chats
        });
        setRecentActivity(data.recent_activity);
      }
    } catch(e) {
      console.error('Error loading dashboard summary', e);
    }
  };

  // Validate stored token with backend before treating the user as logged in
  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const token = localStorage.getItem('placement-ai-token');
        const email = localStorage.getItem('placement-ai-username');

        if (token && email) {
          const userRes = await apiFetch('/api/auth/me');
          if (userRes.ok) {
            setIsLoggedIn(true);
            setUsername(email);
            await fetchState();
          } else {
            logout();
          }
        }

        const savedTheme = localStorage.getItem('placement-ai-theme') as 'light' | 'dark' | null;
        if (savedTheme) {
          setSettings(prev => ({ ...prev, theme: savedTheme }));
          document.documentElement.setAttribute('data-theme', savedTheme);
        }
      } catch (e) {
        console.error('Error validating session', e);
        logout();
      } finally {
        setIsAuthReady(true);
      }
    };

    bootstrapAuth();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const body = { email, password: password || "placeholder123" };
      const response = await fetch(`${API_BASE_URL}/api/auth/login/json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('placement-ai-token', data.access_token);
        localStorage.setItem('placement-ai-username', email);
        
        setIsLoggedIn(true);
        setUsername(email);
        
        // Wait and load database data
        await fetchState();
        return true;
      } else if (response.status === 401) {
        localStorage.removeItem('placement-ai-token');
        localStorage.removeItem('placement-ai-username');
        setIsLoggedIn(false);
        return false;
      } else {
        const err = await response.json();
        alert(err.detail || "Invalid login credentials.");
        return false;
      }
    } catch (e) {
      console.error("Login failed", e);
      return false;
    }
  };

  const signup = async (signupData: any): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('placement-ai-token', data.access_token);
        localStorage.setItem('placement-ai-username', signupData.email);
        
        setIsLoggedIn(true);
        setUsername(signupData.email);
        
        await fetchState();
        return true;
      } else {
        const err = await response.json();
        alert(err.detail || "Failed to create account.");
        return false;
      }
    } catch (e) {
      console.error("Signup failed", e);
      return false;
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUsername('');
    localStorage.removeItem('placement-ai-token');
    localStorage.removeItem('placement-ai-username');
    setProfile(defaultProfile);
    setDocuments([]);
    setRoadmaps({});
    setTrackedUnis([]);
    setRecentActivity([]);
  };

  const uploadDocument = async (university: string, name: string, type: string, file?: File) => {
    try {
      const formData = new FormData();
      formData.append('university', university);
      formData.append('type', type);
      
      if (file) {
        formData.append('file', file);
      } else {
        // Create a mock blob text if mock upload triggered from older code
        const blob = new Blob(["Mock file content text"], { type: "text/plain" });
        formData.append('file', blob, name);
      }
      
      const response = await apiFetch('/api/documents/upload', {
        method: 'POST',
        body: formData // Form headers will be appended automatically
      });
      
      if (response.ok) {
        await fetchState(); // Reload documents and profile details
      } else {
        const err = await response.json();
        console.error('File upload failed', err.detail);
      }
    } catch(e) {
      console.error('Error uploading document', e);
    }
  };

  const addSkill = async (skill: string) => {
    if (profile.skills.includes(skill)) return;
    const updatedSkills = [...profile.skills, skill];
    await updateProfile({ skills: updatedSkills });
  };

  const removeSkill = async (skill: string) => {
    const updatedSkills = profile.skills.filter(s => s !== skill);
    await updateProfile({ skills: updatedSkills });
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      // Map frontend fields back to schema updates
      const body: any = { ...data };
      if (data.name) {
        body.full_name = data.name;
        delete body.name;
      }
      if (data.workExperience) delete body.workExperience;
      if (data.education) delete body.education;
      if (data.projects) delete body.projects;
      
      const response = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchState();
      }
    } catch (e) {
      console.error('Failed to update profile', e);
    }
  };

  // Education Helpers
  const addEducation = async (edu: Omit<Education, 'id'>) => {
    try {
      const response = await apiFetch('/api/profile/education', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edu)
      });
      if (response.ok) await fetchState();
    } catch(e) { console.error(e); }
  };

  const deleteEducation = async (id: number) => {
    try {
      const response = await apiFetch(`/api/profile/education/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) await fetchState();
    } catch(e) { console.error(e); }
  };

  // Experience Helpers
  const addExperience = async (exp: Omit<WorkExperience, 'id'>) => {
    try {
      const response = await apiFetch('/api/profile/experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exp)
      });
      if (response.ok) await fetchState();
    } catch(e) { console.error(e); }
  };

  const deleteExperience = async (id: number) => {
    try {
      const response = await apiFetch(`/api/profile/experience/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) await fetchState();
    } catch(e) { console.error(e); }
  };

  // Project Helpers
  const addProject = async (proj: Omit<ProjectItem, 'id'>) => {
    try {
      const response = await apiFetch('/api/profile/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proj)
      });
      if (response.ok) await fetchState();
    } catch(e) { console.error(e); }
  };

  const deleteProject = async (id: number) => {
    try {
      const response = await apiFetch(`/api/profile/project/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) await fetchState();
    } catch(e) { console.error(e); }
  };

  // Tracker Helpers
  const addTrackedUni = async (name: string, status: string) => {
    try {
      const response = await apiFetch('/api/tracker/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, status })
      });
      if (response.ok) await fetchState();
    } catch(e) { console.error(e); }
  };

  const removeTrackedUni = async (id: number) => {
    try {
      const response = await apiFetch(`/api/tracker/universities/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) await fetchState();
    } catch(e) { console.error(e); }
  };

  const updateSettings = (data: Partial<AppSettings>) => {
    const updated = { ...settings, ...data };
    setSettings(updated);
    localStorage.setItem('placement-ai-settings', JSON.stringify(updated));

    if (data.theme) {
      document.documentElement.setAttribute('data-theme', data.theme);
      localStorage.setItem('placement-ai-theme', data.theme);
    }
  };

  const startRoadmapStep = async (uni: string, sectionIndex: number, stepId: string) => {
    try {
      const response = await apiFetch('/api/roadmap/step/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ university: uni, section_index: sectionIndex, step_id: stepId })
      });
      
      if (response.ok) {
        await fetchState();
      }
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        isAuthReady,
        username,
        profile,
        documents,
        recentActivity,
        roadmaps,
        activeRoadmapUni,
        setActiveRoadmapUni,
        settings,
        trackedUnis,
        dashboardSummary,
        login,
        signup,
        logout,
        apiFetch,
        uploadDocument,
        addSkill,
        removeSkill,
        updateProfile,
        addEducation,
        deleteEducation,
        addExperience,
        deleteExperience,
        addProject,
        deleteProject,
        addTrackedUni,
        removeTrackedUni,
        updateSettings,
        startRoadmapStep,
        refreshDashboardSummary,
        fetchState
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
