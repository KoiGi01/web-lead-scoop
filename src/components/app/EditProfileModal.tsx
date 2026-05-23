import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Loader2, Save } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type UserProfile = Tables<"user_profiles">;

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  profile: UserProfile | null;
  onSaved: () => Promise<void> | void;
}

const profileValue = (value: string | null | undefined) => value || "";

const getAuthName = (user: User | null) => {
  const metadata = user?.user_metadata || {};
  const name =
    metadata.full_name ||
    metadata.name ||
    [metadata.given_name, metadata.family_name].filter(Boolean).join(" ");
  return typeof name === "string" ? name : "";
};

export default function EditProfileModal({ open, onClose, user, profile, onSaved }: EditProfileModalProps) {
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [clientType, setClientType] = useState("");
  const [pricingTier, setPricingTier] = useState("");
  const [location, setLocation] = useState("");
  const [sellsOnline, setSellsOnline] = useState(true);

  useEffect(() => {
    if (!open) return;
    setFullName(profileValue(profile?.full_name) || getAuthName(user));
    setCompanyName(profileValue(profile?.company_name));
    setRoleTitle(profileValue(profile?.role_title));
    setCompanyWebsite(profileValue(profile?.company_website));
    setPhone(profileValue(profile?.phone));
    setServiceType(profileValue(profile?.service_type) || "Lead research");
    setClientType(profileValue(profile?.client_type) || "any");
    setPricingTier(profileValue(profile?.pricing_tier) || "mid_tier");
    setLocation(profileValue(profile?.location));
    setSellsOnline(profile?.sells_online ?? true);
  }, [open, profile, user]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("user_profiles").upsert({
        id: user.id,
        full_name: fullName.trim() || null,
        company_name: companyName.trim() || null,
        role_title: roleTitle.trim() || null,
        company_website: companyWebsite.trim() || null,
        phone: phone.trim() || null,
        service_type: serviceType.trim() || "Lead research",
        service_other: profile?.service_other || null,
        client_type: clientType.trim() || "any",
        pricing_tier: pricingTier.trim() || "mid_tier",
        location: location.trim() || null,
        sells_online: sellsOnline,
      });

      if (error) throw error;
      await onSaved();
      toast({ title: "Profile saved", description: "Your account details were updated." });
      onClose();
    } catch (error) {
      toast({
        title: "Profile error",
        description: error instanceof Error ? error.message : "Could not update your profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !saving && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border border-[#EFEDE6]/10 bg-black p-0 text-[#EFEDE6] shadow-2xl sm:max-w-2xl">
        <div className="h-1 w-full bg-[#F5FF3D]" />
        <div className="p-5 sm:p-7">
          <DialogHeader className="mb-6 text-left">
            <DialogTitle className="font-display text-2xl font-black text-[#EFEDE6]">
              Edit profile
            </DialogTitle>
            <p className="text-sm leading-6 text-[#A8A59C]">
              Keep your company and search defaults up to date.
            </p>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Your name" value={fullName} onChange={setFullName} />
              <Field label="Role/title" value={roleTitle} onChange={setRoleTitle} placeholder="Founder, Sales lead..." />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company name" value={companyName} onChange={setCompanyName} />
              <Field label="Company website" value={companyWebsite} onChange={setCompanyWebsite} placeholder="https://example.com" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone" value={phone} onChange={setPhone} />
              <Field label="Preferred market" value={location} onChange={setLocation} placeholder="United States, Mexico, Miami..." />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="What you sell" value={serviceType} onChange={setServiceType} />
              <Field label="Target buyers" value={clientType} onChange={setClientType} />
              <Field label="Deal size" value={pricingTier} onChange={setPricingTier} />
            </div>

            <label className="flex cursor-pointer items-center gap-3 border border-[#EFEDE6]/10 bg-[#EFEDE6]/[0.03] p-3 text-sm text-[#A8A59C]">
              <input
                type="checkbox"
                checked={sellsOnline}
                onChange={(event) => setSellsOnline(event.target.checked)}
                className="h-4 w-4 accent-[#F5FF3D]"
              />
              I can work with customers outside my local area
            </label>
          </div>

          <div className="mt-7 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" variant="accent" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const Field = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <label className="grid gap-1.5">
    <span className="font-mono text-[10px] uppercase tracking-widest text-[#A8A59C]">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 w-full border border-[#EFEDE6]/10 bg-[#050505] px-3 text-sm text-[#EFEDE6] outline-none transition-colors placeholder:text-[#67645B] focus:border-[#F5FF3D]"
    />
  </label>
);
