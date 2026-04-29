import { useState, useEffect } from "react";

const CookieBanner = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem("cookie_consent")) setVisible(true);
    }, []);

    const respond = (value: "accepted" | "declined") => {
        localStorage.setItem("cookie_consent", value);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 inset-x-0 z-50 border-t border-[#EFEDE6]/10 bg-black/95 backdrop-blur-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-8">
                <p className="flex-1 text-[11px] text-[#A8A59C] font-mono leading-relaxed">
                    We use essential cookies to keep you signed in. No tracking or advertising cookies are used.{" "}
                    <a href="/privacy" className="underline hover:text-[#EFEDE6] transition-colors">
                        Privacy Policy
                    </a>
                </p>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={() => respond("declined")}
                        className="font-mono text-[10px] uppercase tracking-widest text-[#67645B] hover:text-[#A8A59C] transition-colors px-3 py-1.5"
                    >
                        Decline
                    </button>
                    <button
                        onClick={() => respond("accepted")}
                        className="font-mono text-[10px] uppercase tracking-widest bg-[#F5FF3D] text-black px-4 py-1.5 hover:bg-[#F5FF3D]/90 transition-colors"
                    >
                        Accept
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieBanner;
