'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  url: string;
  songHeader?: { num: number; title: string; key?: string; artist?: string; note?: string; tempo?: number };
  contiTitle?: string;
  contiDate?: string;
}

export default function PdfSheetViewer({ url, songHeader, contiTitle, contiDate }: Props) {
  const [numPages, setNumPages] = useState<number>(0);

  return (
    <Document file={url} onLoadSuccess={({ numPages }) => setNumPages(numPages)} loading={null} error={null}>
      {Array.from({ length: numPages }, (_, i) => (
        <div key={i + 1} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...(i > 0 ? { pageBreakBefore: 'always', padding: '8px 24px 16px' } : {}) }}>
          {i > 0 && contiTitle && (
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111' }}>{contiTitle}</div>
              {contiDate && <div style={{ fontSize: '13px', color: '#7c3aed', marginTop: '2px' }}>{contiDate}</div>}
            </div>
          )}
          {songHeader && (
            <table style={{ width: '650px', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '12px', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: i > 0 ? '68px' : '44px' }} />
                <col />
                {songHeader.artist && <col style={{ width: '130px' }} />}
                <col style={{ width: '50px' }} />
                <col style={{ width: '76px' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontWeight: 'bold', color: '#7c3aed', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {songHeader.num}번{i > 0 ? ` (${i + 1}p)` : ''}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontWeight: 'bold', fontSize: '13px', overflow: 'hidden' }}>
                    {songHeader.title}
                  </td>
                  {songHeader.artist && (
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', color: '#555', overflow: 'hidden' }}>
                      {songHeader.artist}
                    </td>
                  )}
                  <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontWeight: 'bold', color: '#7c3aed', textAlign: 'center' }}>tempo</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', textAlign: 'center', color: '#333' }}>
                    {songHeader.tempo ? `${songHeader.tempo} BPM` : '-'}
                  </td>
                </tr>
                {(songHeader.note || songHeader.key) && (
                  <tr>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontWeight: 'bold', color: '#7c3aed', textAlign: 'center' }}>송폼</td>
                    <td colSpan={songHeader.artist ? 4 : 3} style={{ border: '1px solid #d1d5db', padding: '4px 8px', color: '#333' }}>
                      {[songHeader.key && `Key: ${songHeader.key}`, songHeader.note].filter(Boolean).join('  |  ')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          <Page pageNumber={i + 1} width={650} renderTextLayer={false} renderAnnotationLayer={false} />
        </div>
      ))}
    </Document>
  );
}
