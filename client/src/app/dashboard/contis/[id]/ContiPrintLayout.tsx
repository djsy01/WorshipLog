import type { Conti } from '@/lib/api';
import PdfSheetViewer from '@/components/PdfSheetViewer';

export default function ContiPrintLayout({ conti }: { conti: Conti }) {
  return (
    <>
      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          body { margin: 0; padding: 0; }
        }
      `}</style>
      <div className="hidden print:block print-content" style={{ fontFamily: 'Arial, sans-serif', color: '#111' }}>
        {conti.songs.map((cs, index) => {
          const printSheets = cs.sheets.length > 0 ? cs.sheets : cs.song.sheetMusicUrl ? [{ id: 'default', url: cs.song.sheetMusicUrl }] : [];
          return (
            <div key={cs.id} style={{ pageBreakBefore: index === 0 ? 'auto' : 'always', padding: '8mm 8mm 6mm' }}>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111' }}>{conti.title}</div>
                {conti.worshipDate && (
                  <div style={{ fontSize: '13px', color: '#7c3aed', marginTop: '2px' }}>
                    {new Date(conti.worshipDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}
              </div>
              {printSheets.map((sheet, si) => {
                const isPdf = sheet.url.toLowerCase().includes('.pdf');
                if (isPdf) {
                  return (
                    <PdfSheetViewer
                      key={sheet.id}
                      url={sheet.url}
                      songHeader={{
                        num: index + 1,
                        title: cs.song.title,
                        key: cs.key ?? cs.song.defaultKey ?? undefined,
                        artist: cs.song.artist ?? undefined,
                        note: cs.note ?? undefined,
                        tempo: cs.tempo ?? cs.song.tempo ?? undefined,
                      }}
                      contiTitle={conti.title}
                      contiDate={
                        conti.worshipDate
                          ? new Date(conti.worshipDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                          : undefined
                      }
                    />
                  );
                }
                return (
                  <div key={sheet.id} style={si > 0 ? { pageBreakBefore: 'always', padding: '8mm 0 0' } : {}}>
                    {si > 0 && (
                      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111' }}>{conti.title}</div>
                        {conti.worshipDate && (
                          <div style={{ fontSize: '13px', color: '#7c3aed', marginTop: '2px' }}>
                            {new Date(conti.worshipDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    )}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '13px', tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '68px' }} />
                        <col />
                        <col style={{ width: '38px' }} />
                        <col style={{ width: '52px' }} />
                        <col style={{ width: '50px' }} />
                        <col style={{ width: '76px' }} />
                      </colgroup>
                      <tbody>
                        <tr>
                          <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontWeight: 'bold', color: '#7c3aed', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {index + 1}번{si > 0 ? ` (${si + 1}p)` : ''}
                          </td>
                          <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontWeight: 'bold', fontSize: '13px', overflow: 'hidden' }}>
                            {cs.song.title}{cs.song.artist ? ` - ${cs.song.artist}` : ''}
                          </td>
                          <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontWeight: 'bold', color: '#7c3aed', textAlign: 'center' }}>Key</td>
                          <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', textAlign: 'center', color: '#333' }}>
                            {cs.key ?? cs.song.defaultKey ?? '-'}
                          </td>
                          <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontWeight: 'bold', color: '#7c3aed', textAlign: 'center' }}>tempo</td>
                          <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', textAlign: 'center', color: '#333' }}>
                            {(cs.tempo ?? cs.song.tempo) ? `${cs.tempo ?? cs.song.tempo} BPM` : '-'}
                          </td>
                        </tr>
                        {cs.note && (
                          <tr>
                            <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontWeight: 'bold', color: '#7c3aed', textAlign: 'center' }}>송폼</td>
                            <td colSpan={5} style={{ border: '1px solid #d1d5db', padding: '6px 8px', color: '#333', fontSize: '15px' }}>{cs.note}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                      <img src={sheet.url} alt={`${cs.song.title} 악보 ${si + 1}p`} style={{ maxWidth: '600px', width: '100%' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
