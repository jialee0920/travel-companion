import { linkifyToReactNodes } from '@/lib/text/linkify';
import { cn } from '@/lib/utils';

type Props = {
  text: string;
  className?: string;
  as?: 'p' | 'span' | 'div';
};

/**
 * 본문 텍스트의 http(s) URL을 클릭 가능한 링크로 표시.
 * React 텍스트 노드로 렌더해 XSS를 피하고, URL만 <a>로 분리한다.
 */
export function LinkifiedText({ text, className, as: Tag = 'p' }: Props) {
  return <Tag className={cn(className)}>{linkifyToReactNodes(text)}</Tag>;
}
