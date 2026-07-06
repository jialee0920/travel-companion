'use client';

import { MapPin } from 'lucide-react';
import {
  getLocationEnvironmentMessage,
  requestGeolocationFromUserGesture,
  type GeoPosition,
} from '@/lib/geo/browser-geolocation';

type Props = {
  loading?: boolean;
  error?: string | null;
  onStart: () => void;
  onSuccess: (position: GeoPosition) => void;
  onError: (message: string) => void;
  compact?: boolean;
};

export function LocationAllowPrompt({
  loading = false,
  error,
  onStart,
  onSuccess,
  onError,
  compact = false,
}: Props) {
  const envMessage = getLocationEnvironmentMessage();

  function handleClick() {
    onStart();
    requestGeolocationFromUserGesture(onSuccess, onError);
  }

  if (compact) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium">내 주변 동행을 보려면 위치 허용이 필요합니다</p>
        {(envMessage || error) && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {envMessage ?? error}
          </p>
        )}
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? '요청 중…' : '위치 허용하기'}
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/80 px-6 backdrop-blur-[2px]">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MapPin className="size-6" />
      </span>
      <p className="text-center text-sm font-semibold text-foreground">
        내 주변 동행을 보려면
        <br />
        위치 허용이 필요합니다
      </p>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        버튼을 누르면 브라우저 위치 허용 팝업이 표시됩니다.
        {envMessage ? ` ${envMessage}` : ''}
      </p>
      {(envMessage || error) && (
        <p className="text-center text-xs font-medium text-destructive">{envMessage ?? error}</p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-60"
      >
        {loading ? '요청 중…' : '위치 허용하기'}
      </button>
    </div>
  );
}
