import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type SearchSession = Tables<"search_sessions">;

export interface SearchHistoryEntry {
  id: string;
  keyword: string;
  location: string;
  leadCount: number;
  emailCount: number;
  whatsappCount: number;
  timestamp: number;
}

interface UseSearchHistoryReturn {
  history: SearchHistoryEntry[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useSearchHistory(userId: string | undefined): UseSearchHistoryReturn {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("search_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching search history:", error);
        setHistory([]);
      } else if (data) {
        // Map database format to frontend format (camelCase)
        const mappedHistory: SearchHistoryEntry[] = data.map((session: SearchSession) => ({
          id: session.id,
          keyword: session.keyword,
          location: session.location,
          leadCount: session.lead_count,
          emailCount: session.email_count,
          whatsappCount: session.whatsapp_count,
          timestamp: new Date(session.created_at).getTime(),
        }));
        setHistory(mappedHistory);
      }
    } catch (err) {
      console.error("Unexpected error fetching search history:", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  return {
    history,
    loading,
    refetch: fetchHistory,
  };
}
