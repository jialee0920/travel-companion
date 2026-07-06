'use client';

import { MapPin } from 'lucide-react';
import {
  getLocationEnvironmentMessage,
  requestGeolocationFromUserGesture,
  type GeoPosition,
} from '@/lib/geo/browser-geolocation';

type Props = {
  loading?: boolean;
  loadingMessage?: string | null;
  error?: string | null;
  onStart: () => void;
  onSuccess: (position: GeoPosition) => void;
  onError: (message: string) => void;
  compact?: boolean;
};

const SUBTITLE = '아래 버튼을 눌러 위치를 허용해 주세요.';

export function LocationAllowPrompt({
  loading = false,
  loadingMessage,
  error,
  onStart,
  onSuccess,
  onError,
  compact = false,
}: Props) {
  const envMessage = getLocationEnvironmentMessage();
  const hasError = Boolean(error) && !loading;
  const autoRetrying = loading && Boolean(loadingMessage);

  function handleClick() {
    onStart();
    requestGeolocationFromUserGesture(onSuccess, onError);
  }

  const buttonLabel = loading
    ? loadingMessage || '요청 중…'
    : hasError
      ? '다시 시도'
      : '위치 허용하기';

  const statusText = autoRetrying
    ? loadingMessage
    : hasError
      ? error
      : envMessage ?? SUBTITLE;

  if (compact) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium">내 주변 동행을 보려면 위치 허용이 필요합니다</p>
        <p
          className={`mt-1 text-xs leading-relaxed ${
            hasError ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {statusText}
        </p>
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {buttonLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/85 px-5 backdrop-blur-[2px]">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MapPin className="size-6" />
      </span>
      <p className="text-center text-sm font-semibold text-foreground">
        내 주변 동행을 보려면 위치 허용이 필요합니다
      </p>
      <p
        className={`text-center text-xs leading-relaxed ${
          autoRetrying
            ? 'font-medium text-primary'
            : hasError
              ? 'text-destructive'
              : 'text-muted-foreground'
        }`}
      >
        {statusText}
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-60"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
