'use client';

import { MapPin, Shield } from 'lucide-react';

type Props = {
  onAccept: () => void;
  onDecline: () => void;
};

export function LocationConsentBanner({ onAccept, onDecline }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-md px-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPin className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
              <Shield className="size-3.5" /> 위치 정보 이용 안내
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              동행자와의 거리·방향(각도) 표시를 위해 화면 사용 중 GPS 위치를 조회합니다.
              백그라운드 추적은 하지 않으며, 동의 철회 시 위치 기반 기능이 비활성화됩니다.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onAccept}
                className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                동의하고 사용
              </button>
              <button
                type="button"
                onClick={onDecline}
                className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground"
              >
                거부
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
