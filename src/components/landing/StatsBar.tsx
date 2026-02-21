import { useEffect, useRef, useState } from "react";

interface Stat {
    value: number;
    suffix: string;
    label: string;
    prefix?: string;
}

const stats: Stat[] = [
    { value: 34, suffix: "K+", label: "Leads Generated" },
    { value: 8200, suffix: "+", label: "Businesses Scraped" },
    { value: 47, suffix: "+", label: "Countries Supported" },
    { value: 2, prefix: "~", suffix: " min", label: "Avg. Search Time" },
];

function useCountUp(target: number, duration = 1800, active = false) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!active) return;
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration, active]);
    return count;
}

function StatItem({ stat, active }: { stat: Stat; active: boolean }) {
    const count = useCountUp(stat.value, 1600, active);
    return (
        <div className="flex flex-col items-center gap-1 px-6 py-4">
            <p className="text-3xl font-bold text-white tabular-nums">
                {stat.prefix ?? ""}{count.toLocaleString()}{stat.suffix}
            </p>
            <p className="text-sm text-white/55 font-medium">{stat.label}</p>
        </div>
    );
}

const StatsBar = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setActive(true); },
            { threshold: 0.3 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className="relative overflow-hidden bg-gradient-to-r from-[hsl(252,87%,30%)] via-[hsl(240,82%,35%)] to-[hsl(228,82%,30%)] border-y border-white/10">
            {/* Noise texture overlay */}
            <div className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    backgroundSize: "200px 200px",
                }}
            />
            <div className="relative mx-auto max-w-5xl px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
                    {stats.map((s) => (
                        <StatItem key={s.label} stat={s} active={active} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StatsBar;
