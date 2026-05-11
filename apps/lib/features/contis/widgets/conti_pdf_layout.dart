import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../models/conti_detail.dart';

pw.Document buildContiPdfDoc(
  ContiDetail conti,
  List<List<pw.ImageProvider>> songImages,
  List<List<String>> errorMsgs,
  pw.Font ttf,
  pw.Font ttfBold,
) {
  final doc = pw.Document(theme: pw.ThemeData.withFont(base: ttf, bold: ttfBold));

  if (conti.songs.isEmpty) {
    doc.addPage(pw.Page(
      pageFormat: PdfPageFormat.a4,
      build: (_) => pw.Center(
        child: pw.Text('찬양이 없습니다.', style: pw.TextStyle(font: ttf, fontSize: 16)),
      ),
    ));
    return doc;
  }

  const borderColor = PdfColor.fromInt(0xFFD1D5DB);

  for (int i = 0; i < conti.songs.length; i++) {
    final cs = conti.songs[i];
    final bpm = cs.tempo ?? cs.song.tempo;
    final songKey = cs.key ?? cs.song.defaultKey;
    final borderSide = const pw.BorderSide(color: borderColor, width: 1);
    final songFormItems = [if (cs.note != null && cs.note!.isNotEmpty) cs.note!];

    doc.addPage(pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(32),
      header: (_) => _buildHeader(conti, cs, i, bpm, songKey, borderColor, borderSide, songFormItems, ttf),
      build: (_) => _buildBody(i, songImages, errorMsgs, ttf),
    ));
  }

  return doc;
}

pw.Widget _buildHeader(
  ContiDetail conti,
  ContiSongItem cs,
  int i,
  int? bpm,
  String? songKey,
  PdfColor borderColor,
  pw.BorderSide borderSide,
  List<String> songFormItems,
  pw.Font ttf,
) {
  const purple = PdfColor.fromInt(0xFF7C3AED);
  const dark = PdfColor.fromInt(0xFF333333);
  final titleText = cs.song.artist != null && cs.song.artist!.isNotEmpty
      ? '${cs.song.title} - ${cs.song.artist}'
      : cs.song.title;

  return pw.Column(
    mainAxisSize: pw.MainAxisSize.min,
    children: [
      pw.Container(
        alignment: pw.Alignment.center,
        margin: const pw.EdgeInsets.only(bottom: 10),
        child: pw.Column(children: [
          pw.Text(
            conti.title,
            style: pw.TextStyle(font: ttf, fontSize: 18, fontWeight: pw.FontWeight.bold, color: const PdfColor.fromInt(0xFF111111)),
          ),
          if (conti.worshipDate != null) ...[
            pw.SizedBox(height: 2),
            pw.Text(
              '${conti.worshipDate!.year}년 ${conti.worshipDate!.month}월 ${conti.worshipDate!.day}일',
              style: pw.TextStyle(font: ttf, fontSize: 13, color: purple),
            ),
          ],
        ]),
      ),
      pw.Table(
        border: pw.TableBorder.all(color: borderColor, width: 1),
        columnWidths: const {
          0: pw.FixedColumnWidth(68),
          1: pw.FlexColumnWidth(),
          2: pw.FixedColumnWidth(40),
          3: pw.FixedColumnWidth(45),
          4: pw.FixedColumnWidth(55),
          5: pw.FixedColumnWidth(75),
        },
        children: [
          pw.TableRow(children: [
            _cell(pw.Text('${i + 1}번', style: pw.TextStyle(font: ttf, fontSize: 12, fontWeight: pw.FontWeight.bold, color: purple)), center: true, hPad: 4),
            _cell(pw.Text(titleText, style: pw.TextStyle(font: ttf, fontSize: 13, fontWeight: pw.FontWeight.bold))),
            _cell(pw.Text('Key', style: pw.TextStyle(font: ttf, fontSize: 12, fontWeight: pw.FontWeight.bold, color: purple)), center: true, hPad: 4),
            _cell(pw.Text((songKey != null && songKey.isNotEmpty) ? songKey : '-', style: pw.TextStyle(font: ttf, fontSize: 12, color: dark)), center: true, hPad: 4),
            _cell(pw.Text('tempo', style: pw.TextStyle(font: ttf, fontSize: 12, fontWeight: pw.FontWeight.bold, color: purple)), center: true, hPad: 4),
            _cell(pw.Text(bpm != null ? '$bpm BPM' : '-', style: pw.TextStyle(font: ttf, fontSize: 12, color: dark)), center: true),
          ]),
        ],
      ),
      if (songFormItems.isNotEmpty)
        pw.Table(
          border: pw.TableBorder(left: borderSide, right: borderSide, bottom: borderSide, verticalInside: borderSide),
          columnWidths: const {0: pw.FixedColumnWidth(68), 1: pw.FlexColumnWidth()},
          children: [
            pw.TableRow(children: [
              _cell(pw.Text('송폼', style: pw.TextStyle(font: ttf, fontSize: 12, fontWeight: pw.FontWeight.bold, color: purple)), center: true),
              _cell(pw.Text(songFormItems.join('  |  '), style: pw.TextStyle(font: ttf, fontSize: 15, color: dark))),
            ]),
          ],
        ),
      pw.SizedBox(height: 8),
    ],
  );
}

List<pw.Widget> _buildBody(
  int i,
  List<List<pw.ImageProvider>> songImages,
  List<List<String>> errorMsgs,
  pw.Font ttf,
) {
  final widgets = <pw.Widget>[];

  if (errorMsgs[i].isNotEmpty) {
    widgets.add(pw.Container(
      margin: const pw.EdgeInsets.only(bottom: 8),
      padding: const pw.EdgeInsets.all(8),
      decoration: pw.BoxDecoration(
        color: PdfColors.red50,
        border: pw.Border.all(color: PdfColors.red200),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: errorMsgs[i]
            .map((err) => pw.Text(err, style: pw.TextStyle(font: ttf, fontSize: 10, color: PdfColors.red600)))
            .toList(),
      ),
    ));
  }

  if (songImages[i].isEmpty && errorMsgs[i].isEmpty) {
    widgets.add(pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 12),
      child: pw.Text('(이 곡은 등록된 악보가 없습니다.)', style: pw.TextStyle(font: ttf, fontSize: 11, color: PdfColors.grey500)),
    ));
  }

  for (final img in songImages[i]) {
    widgets.add(pw.Container(
      alignment: pw.Alignment.center,
      constraints: const pw.BoxConstraints(maxHeight: 650),
      width: double.infinity,
      margin: const pw.EdgeInsets.only(top: 8, bottom: 20),
      child: pw.Image(img, fit: pw.BoxFit.contain),
    ));
  }

  return widgets;
}

pw.Widget _cell(pw.Widget child, {bool center = false, double hPad = 8}) =>
    pw.Container(
      padding: pw.EdgeInsets.symmetric(horizontal: hPad, vertical: 4),
      alignment: center ? pw.Alignment.center : pw.Alignment.centerLeft,
      child: child,
    );
