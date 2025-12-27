import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null); // Initialisé à null

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { username, role, permissions: [] }
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Charger l'utilisateur depuis le localStorage au démarrage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    // Simuler l'appel API (À remplacer par fetch vers votre endpoint /token)
    // Pour le dev, on simule une réponse réussie
    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const res = await fetch("http://127.0.0.1:8000/api/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Identifiants incorrects");

      const data = await res.json(); // { access_token, user_details }
      
      const userData = data.user; 
      // Stockage
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  // Helper pour vérifier les droits d'écriture
  const canWrite = () => {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;
    // Logique plus fine à implémenter selon les permissions spécifiques
    return true; // Simplifié pour l'exemple
  };

  // Helper pour trouver la redirection d'accueil (Secrétaire)
  const getHomeRedirect = () => {
    if (!user) return "/login";
    if (user.role === "SUPER_ADMIN") return "/administration";
    
    // Si secrétaire de mention, on cherche son entité
    const mentionPerm = user.permissions.find(p => p.entity_type === "MENTION");
    if (mentionPerm) {
       // Note: Pour rediriger correctement, le backend devrait renvoyer 
       // l'arborescence complète (InstID, EtabID) dans les permissions de l'user.
       // Ici on suppose qu'on a ces infos dans l'objet permission
       return `/institution/${mentionPerm.institution_id}/etablissement/${mentionPerm.composante_id}`;
    }
    return "/administration";
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, canWrite, getHomeRedirect, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};