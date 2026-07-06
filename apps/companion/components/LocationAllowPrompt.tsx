'use client';

import { MapPin } from 'lucide-react';
import {
  getLocationEnvironmentMessage,
  isIosDevice,
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
  const hasError = Boolean(error);

  function handleClick() {
    onStart();
    requestGeolocationFromUserGesture(onSuccess, onError);
  }

  const buttonLabel = loading ? '요청 중…' : hasError ? '다시 시도' : '위치 허용하기';

  const helpText = hasError
    ? error
    : isIosDevice()
      ? '버튼을 누르면 Safari 위치 허용 팝업이 표시됩니다. 팝업이 안 뜨면 아래 안내를 확인해 주세요.'
      : '버튼을 누르면 브라우저 위치 허용 팝업이 표시됩니다.';

  if (compact) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium">내 주변 동행을 보려면 위치 허용이 필요합니다</p>
        {envMessage && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{envMessage}</p>
        )}
        {hasError && (
          <p className="mt-2 text-xs leading-relaxed text-destructive">{error}</p>
        )}
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
        내 주변 동행을 보려면
        <br />
        위치 허용이 필요합니다
      </p>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        {helpText}
        {envMessage ? ` ${envMessage}` : ''}
      </p>
      {hasError && (
        <p className="max-h-28 overflow-y-auto text-center text-[11px] leading-relaxed text-destructive">
          {error}
        </p>
      )}
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
