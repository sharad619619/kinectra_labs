import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  dominantHand: "right" | "left";
  sportsAcademy?: string;
  role?: "athlete" | "coach";
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (username: string, password?: string, role?: "athlete" | "coach") => Promise<boolean>;
  signup: (
    username: string,
    email: string,
    skillLevel: "beginner" | "intermediate" | "advanced",
    dominantHand: "right" | "left",
    sportsAcademy?: string,
    password?: string,
    role?: "athlete" | "coach"
  ) => Promise<boolean>;
  loginWithGoogle: (credential: string, role?: "athlete" | "coach") => Promise<boolean>;
  loginAsGuest: (role?: "athlete" | "coach") => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const token = localStorage.getItem("kinectra_token");
        if (token) {
          const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const profile = await res.json();
            const storedRole = (localStorage.getItem("kinectra_role") as "athlete" | "coach") || "athlete";
            setUser({ ...profile, role: storedRole });
            setIsLoading(false);
            return;
          } else {
            localStorage.removeItem("kinectra_token");
          }
        }

        const isGuest = localStorage.getItem("kinectra_guest") === "true";
        if (isGuest) {
          const storedRole = (localStorage.getItem("kinectra_role") as "athlete" | "coach") || "athlete";
          setUser({
            id: "guest",
            username: storedRole === "coach" ? "Guest Coach" : "Guest Athlete",
            email: storedRole === "coach" ? "coach@kinectra.local" : "guest@kinectra.local",
            skillLevel: "intermediate",
            dominantHand: "right",
            role: storedRole,
          });
        }
      } catch (e) {
        console.error("Failed to load user session token", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMe();
  }, [API_BASE_URL]);

  const login = async (username: string, password?: string, role: "athlete" | "coach" = "athlete"): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password: password || "password123" }),
      });
      if (res.ok) {
        const { token, user: profile } = await res.json();
        localStorage.setItem("kinectra_token", token);
        localStorage.setItem("kinectra_role", role);
        setUser({ ...profile, role });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const signup = async (
    username: string,
    email: string,
    skillLevel: "beginner" | "intermediate" | "advanced",
    dominantHand: "right" | "left",
    sportsAcademy?: string,
    password?: string,
    role: "athlete" | "coach" = "athlete"
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password: password || "password123",
          skillLevel,
          dominantHand,
          sportsAcademy: sportsAcademy || "Independent",
        }),
      });
      if (res.ok) {
        const { token, user: profile } = await res.json();
        localStorage.setItem("kinectra_token", token);
        localStorage.setItem("kinectra_role", role);
        setUser({ ...profile, role });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const loginWithGoogle = async (credential: string, role: "athlete" | "coach" = "athlete"): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential }),
      });
      if (res.ok) {
        const { token, user: profile } = await res.json();
        localStorage.setItem("kinectra_token", token);
        localStorage.setItem("kinectra_role", role);
        setUser({ ...profile, role });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const loginAsGuest = (role: "athlete" | "coach" = "athlete") => {
    const guestUser: UserProfile = {
      id: "guest",
      username: role === "coach" ? "Guest Coach" : "Guest Athlete",
      email: role === "coach" ? "coach@kinectra.local" : "guest@kinectra.local",
      skillLevel: "intermediate",
      dominantHand: "right",
      role,
    };
    setUser(guestUser);
    localStorage.setItem("kinectra_guest", "true");
    localStorage.setItem("kinectra_role", role);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("kinectra_token");
    localStorage.removeItem("kinectra_guest");
    localStorage.removeItem("kinectra_role");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, loginWithGoogle, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
