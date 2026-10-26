import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "../api";
import useToast from "../hooks/useToast";
import { AuthContext } from "./contexts";

export default function AuthProvider({ children }) {
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() =>
    api.getStoredRefreshToken() ? "loading" : "anonymous"
  );

  useEffect(() => {
    api.setAuthFailureHandler(() => {
      api.clearSession();
      setUser(null);
      setStatus("anonymous");
      showToast("Your session ended. Please sign in again.", "error");
    });
  }, [showToast]);

  useEffect(() => {
    if (!api.getStoredRefreshToken()) return;
    api
      .refreshSession()
      .then((currentUser) => {
        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch(() => setStatus("anonymous"));
  }, []);

  const signIn = useCallback(async (email, password) => {
    const signedIn = await api.login(email, password);
    setUser(signedIn);
    setStatus("authenticated");
    return signedIn;
  }, []);

  const signUp = useCallback(async (details) => {
    const created = await api.register(details);
    setUser(created);
    setStatus("authenticated");
    return created;
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(
    () => ({ user, status, signIn, signUp, signOut }),
    [user, status, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}