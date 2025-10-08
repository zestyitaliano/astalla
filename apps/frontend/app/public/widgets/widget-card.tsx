"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, type RefObject } from "react";

interface WidgetChartConfig {
  type?: string | null;
  points?: Array<number> | null;
  color?: string | null;
}

interface WidgetMediaConfig {
  src: string;
  alt?: string | null;
}

export interface PublicWidgetCardProps {
  widget: {
    id?: string;
    label?: string | null;
    value?: string | number | null;
    description?: string | null;
    type?: string | null;
    media?: WidgetMediaConfig | null;
    chart?: WidgetChartConfig | null;
  };
}

function useReflowOnResize(containerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current;

    if (!container || typeof window === "undefined" || !("ResizeObserver" in window)) {
      return;
    }

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [containerRef]);
}

function Sparkline({ points, color }: { points: number[]; color?: string | null }) {
  const gradientId = useId();
  const path = useMemo(() => {
    if (!points.length) {
      return "";
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 100;
    const height = 40;

    return points
      .map((value, index) => {
        const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [points]);

  if (!path) {
    return null;
  }

  return (
    <svg
      viewBox="0 0 100 40"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="none"
      className="h-full w-full text-brand-primary"
    >
      <path
        d={path}
        fill="none"
        stroke={color ?? "currentColor"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={(color ?? "currentColor").toString()} stopOpacity="0.14" />
          <stop offset="100%" stopColor={(color ?? "currentColor").toString()} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L100 40 L0 40 Z`} fill={`url(#${gradientId})`} stroke="none" opacity={0.6} />
    </svg>
  );
}

export default function PublicWidgetCard({ widget }: PublicWidgetCardProps) {
  const { label, value, description, media, chart } = widget;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const shouldRenderSparkline = Array.isArray(chart?.points) && (chart?.type === "sparkline" || chart?.type === "trend");

  useReflowOnResize(chartContainerRef);

  const formattedValue = useMemo(() => {
    if (typeof value === "number") {
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
    }
    if (typeof value === "string") {
      return value;
    }
    return "—";
  }, [value]);

  return (
    <article className="group flex h-full min-h-[200px] flex-col justify-between gap-4 rounded-3xl border border-border/60 bg-white/85 p-5 text-left shadow-sm transition-shadow supports-[backdrop-filter]:bg-white/70 content-visibility-auto contain-intrinsic-size-[320px]">
      <div className="space-y-2">
        <p className="text-[clamp(.85rem,1.4vw,1rem)] font-medium text-muted-foreground">{label ?? widget.id ?? "Widget"}</p>
        {description ? <p className="text-sm text-muted-foreground/80">{description}</p> : null}
      </div>

      {media?.src ? (
        <div className="relative w-full overflow-hidden rounded-2xl border border-border/40">
          <Image
            src={media.src}
            alt={media.alt ?? ""}
            loading="lazy"
            width={960}
            height={540}
            sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 88vw"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      {shouldRenderSparkline ? (
        <div ref={chartContainerRef} className="relative flex w-full flex-1 items-center">
          <div className="relative h-full w-full min-h-[180px] sm:min-h-[220px]">
            <div className="absolute inset-0">
              <Sparkline points={chart?.points ?? []} color={chart?.color} />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[clamp(1.5rem,3vw,2.3rem)] font-semibold tracking-tight text-foreground">{formattedValue}</p>
      )}
    </article>
  );
}
