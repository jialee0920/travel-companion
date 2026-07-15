import { AppHeader } from '@/components/AppHeader';
import { InquiryForm } from '@/components/InquiryForm';
import { PageShell } from '@/components/PageShell';

export default function InquiryPage() {
  return (
    <PageShell active="profile" hideNav>
      <AppHeader title="문의하기" subtitle="운영팀 확인 후 연락드려요" backHref="/orders" />
      <div className="pb-8">
        <InquiryForm />
      </div>
    </PageShell>
  );
}
