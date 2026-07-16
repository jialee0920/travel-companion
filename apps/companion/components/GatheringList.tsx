'use client';

import { useState } from 'react';
import { GatheringCard } from '@/components/GatheringCard';
import { RegionTabFilter } from '@/components/RegionTabFilter';
import type { GatheringRecord } from '@/lib/db/gatherings';
import {
  DEFAULT_REGION_TAB,
  filterByRegionTab,
  type RegionTabId,
} from '@/lib/regions/product-tabs';

type Props = {
  gatherings: GatheringRecord[];
};

export function GatheringList({ gatherings }: Props) {
  const [tab, setTab] = useState<RegionTabId>(DEFAULT_REGION_TAB);
  const filtered = filterByRegionTab(gatherings, tab);

  return (
    <>
      <RegionTabFilter active={tab} onChange={setTab} />

      <div className="-mx-4 flex flex-col gap-3 bg-[#F5F5F5] px-4 pb-4 pt-2">
        {filtered.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-muted-foreground">
            이 지역에 모집글이 없습니다.
          </p>
        ) : (
          filtered.map((gathering) => (
            <GatheringCard key={gathering.id} gathering={gathering} />
          ))
        )}
      </div>
    </>
  );
}
