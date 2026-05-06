'use client';

import dynamic from 'next/dynamic';

interface Props {
  url: string;
  songHeader?: { num: number; title: string; key?: string; artist?: string; note?: string; tempo?: number };
  contiTitle?: string;
  contiDate?: string;
}

const PdfSheetViewerClient = dynamic(() => import('./PdfSheetViewerClient'), {
  ssr: false,
});

export default function PdfSheetViewer(props: Props) {
  return <PdfSheetViewerClient {...props} />;
}
