import { useCallback, useEffect, useState } from "react";
import { getInsights } from "../api";

const EMPTY = { applications: [], resumes: [] };

export default function useInsights() {
  const [insights, setInsights] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInsights()
      .then(setInsights)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refresh = useCallback(() => {
    getInsights()
      .then(setInsights)
      .catch(() => {});
  }, []);

  return { insights, loading, refresh };
}