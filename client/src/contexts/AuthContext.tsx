import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User, UserRole } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signInAsGuest: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (firebaseUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      await fetchUserData(firebaseUser);
    }
  };

  useEffect(() => {
    // Check for guest mode first
    const guestMode = localStorage.getItem("guestMode") === "true";
    if (guestMode) {
      try {
        const guestUserStr = localStorage.getItem("guestUser");
        if (guestUserStr) {
          const guestUser = JSON.parse(guestUserStr) as User;
          setUser(guestUser);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error restoring guest user:", error);
      }
    }

    // Set Firebase persistence to browser local storage
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        // Persistence set successfully
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          setFirebaseUser(firebaseUser);
          
          if (firebaseUser) {
            await fetchUserData(firebaseUser);
          } else {
            setUser(null);
          }
          
          setLoading(false);
        });

        return () => unsubscribe();
      })
      .catch((error) => {
        console.error("Error setting persistence:", error);
        setLoading(false);
      });
  }, []);

  const signOut = async () => {
    // Clear guest mode
    localStorage.removeItem("guestMode");
    localStorage.removeItem("guestUser");
    
    // Sign out from Firebase if signed in
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out from Firebase:", error);
    }
    
    setUser(null);
    setFirebaseUser(null);
  };

  const signInAsGuest = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // Create a local guest user without Firebase authentication
      const guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const guestUser: User = {
        uid: guestId,
        email: `${guestId}@guest.local`,
        role: "buyer",
        phone: "",
        address: "",
        city: "",
        fullName: "زائر",
        emailVerified: false,
        createdAt: Date.now(),
        isGuest: true
      };
      
      // Store guest mode in localStorage
      localStorage.setItem("guestMode", "true");
      localStorage.setItem("guestUser", JSON.stringify(guestUser));
      
      // Update local state
      setUser(guestUser);
      
      console.log("✅ Guest mode enabled");
      return { success: true };
    } catch (error: any) {
      console.error("Guest mode error:", error);
      return { success: false, error: "فشل دخول الزائر" };
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signOut, refreshUser, signInAsGuest }}>
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
