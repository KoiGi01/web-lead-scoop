import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type UserCredits = Tables<"user_credits">;

interface UseCreditsReturn {
  balance: number;
  plan: string;
  loading: boolean;
  deduct: (amount: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCredits(userId: string | undefined): UseCreditsReturn {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching credits:", error);
        setCredits(null);
      } else if (data) {
        setCredits(data);
      }
    } catch (err) {
      console.error("Unexpected error fetching credits:", err);
      setCredits(null);
    } finally {
      setLoading(false);
    }
  };

  const deduct = async (amount: number) => {
    if (!userId) {
      throw new Error("User ID is required to deduct credits");
    }

    if (!credits || credits.balance < amount) {
      throw new Error("Insufficient credits");
    }

    try {
      const newBalance = credits.balance - amount;
      const { data, error } = await supabase
        .from("user_credits")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setCredits(data);
      }
    } catch (err) {
      console.error("Error deducting credits:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [userId]);

  return {
    balance: credits?.balance ?? 0,
    plan: credits?.plan ?? "free",
    loading,
    deduct,
    refetch: fetchCredits,
  };
}
