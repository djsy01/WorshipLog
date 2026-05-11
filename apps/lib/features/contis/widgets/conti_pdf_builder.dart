import 'package:dio/dio.dart' show Dio, Options, ResponseType;
import 'package:flutter/material.dart' show MemoryImage;
import 'package:flutter/services.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../../core/api_client.dart';
import '../models/conti_detail.dart';
import 'conti_pdf_layout.dart';

Future<void> shareContiPdf(ContiDetail conti) async {
  final fontData = await rootBundle.load('assets/fonts/gabia_solmee.ttf');
  final ttf = pw.Font.ttf(fontData);
  final plainDio = Dio();
  final songImages = <List<pw.ImageProvider>>[];
  final errorMsgs = <List<String>>[];

  for (final cs in conti.songs) {
    final urls = <String>[];
    if (cs.sheets.isNotEmpty) {
      urls.addAll(cs.sheets.map((s) => s.url));
    } else if (cs.song.sheetMusicUrl != null) {
      urls.add(cs.song.sheetMusicUrl!);
    }

    final imgs = <pw.ImageProvider>[];
    final errors = <String>[];

    for (final url in urls) {
      try {
        String targetUrl = url;
        if (url.startsWith('//')) {
          targetUrl = 'https:$url';
        } else if (url.startsWith('/')) {
          final uri = Uri.parse(dio.options.baseUrl);
          targetUrl = '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}$url';
        }

        final res = await plainDio.get<List<int>>(
          targetUrl,
          options: Options(responseType: ResponseType.bytes, validateStatus: (_) => true),
        );

        if (res.statusCode == 200 && res.data != null) {
          final bytes = Uint8List.fromList(res.data!);
          if (targetUrl.toLowerCase().contains('.pdf')) {
            await for (final page in Printing.raster(bytes, dpi: 150)) {
              imgs.add(pw.MemoryImage(await page.toPng()));
            }
          } else {
            try {
              imgs.add(await flutterImageProvider(MemoryImage(bytes)));
            } catch (_) {
              imgs.add(pw.MemoryImage(bytes));
            }
          }
        } else {
          errors.add('악보 다운 실패 (HTTP ${res.statusCode}): $targetUrl');
        }
      } catch (e) {
        errors.add('네트워크 에러: $e');
      }
    }
    songImages.add(imgs);
    errorMsgs.add(errors);
  }

  final doc = buildContiPdfDoc(conti, songImages, errorMsgs, ttf, ttf);
  final pdfBytes = await doc.save();

  await Printing.layoutPdf(
    onLayout: (_) async => pdfBytes,
    name: conti.title,
  );
}
