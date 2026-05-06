import 'dart:typed_data';
import 'package:dio/dio.dart' show Dio, BaseOptions, Options, ResponseType;
import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import '../../../core/api_client.dart';
import 'conti_sheet_viewer.dart';

class ContiInlinePdfPreview extends StatefulWidget {
  final String url;
  final String title;
  final ColorScheme cs;

  const ContiInlinePdfPreview({
    super.key,
    required this.url,
    required this.title,
    required this.cs,
  });

  @override
  State<ContiInlinePdfPreview> createState() => _ContiInlinePdfPreviewState();
}

class _ContiInlinePdfPreviewState extends State<ContiInlinePdfPreview> {
  List<Uint8List> _images = [];
  bool _loading = true;
  String? _error;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _loadPdfAsImages();
  }

  Future<void> _loadPdfAsImages() async {
    try {
      String targetUrl = widget.url;
      if (widget.url.startsWith('//')) {
        targetUrl = 'https:${widget.url}';
      } else if (widget.url.startsWith('/')) {
        final uri = Uri.parse(dio.options.baseUrl);
        targetUrl = '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}${widget.url}';
      }

      final plainDio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ));

      final res = await plainDio.get<List<int>>(
        targetUrl,
        options: Options(responseType: ResponseType.bytes, validateStatus: (_) => true),
      );

      if (res.statusCode == 200 && res.data != null) {
        final bytes = Uint8List.fromList(res.data!);
        final imgs = <Uint8List>[];
        await for (final page in Printing.raster(bytes, dpi: 150)) {
          imgs.add(await page.toPng());
        }
        if (mounted) setState(() { _images = imgs; _loading = false; });
      } else {
        throw Exception('HTTP ${res.statusCode}');
      }
    } catch (e) {
      if (mounted) setState(() { _error = '악보를 불러오지 못했습니다.'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Container(
        height: 200, width: double.infinity,
        decoration: BoxDecoration(
          border: Border.all(color: widget.cs.outline.withValues(alpha: 0.2)),
          color: widget.cs.surfaceContainerHighest.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 12),
              Text('PDF 악보 불러오는 중...', style: TextStyle(fontSize: 13, color: Colors.grey)),
            ],
          ),
        ),
      );
    }

    if (_error != null || _images.isEmpty) {
      return Container(
        height: 100, width: double.infinity,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          border: Border.all(color: widget.cs.outline.withValues(alpha: 0.2)),
          color: widget.cs.surfaceContainerHighest.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(_error ?? '렌더링된 페이지가 없습니다.', style: TextStyle(color: widget.cs.error)),
      );
    }

    final pageController = PageController(initialPage: _currentPage);

    return Stack(
      alignment: Alignment.center,
      children: [
        _images.length == 1
            ? Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  border: Border.all(color: widget.cs.outline.withValues(alpha: 0.2)),
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.memory(_images[0], fit: BoxFit.contain, width: double.infinity),
                ),
              )
            : AspectRatio(
                aspectRatio: 1 / 1.414,
                child: PageView.builder(
                  controller: pageController,
                  itemCount: _images.length,
                  onPageChanged: (i) => setState(() => _currentPage = i),
                  itemBuilder: (_, i) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: widget.cs.outline.withValues(alpha: 0.2)),
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.memory(_images[i], fit: BoxFit.contain, width: double.infinity),
                      ),
                    ),
                  ),
                ),
              ),
        if (_images.length > 1) ...[
          Positioned(
            left: 0,
            child: ContiNavArrow(
              icon: Icons.chevron_left,
              enabled: _currentPage > 0,
              onTap: () => pageController.previousPage(duration: const Duration(milliseconds: 250), curve: Curves.easeInOut),
            ),
          ),
          Positioned(
            right: 0,
            child: ContiNavArrow(
              icon: Icons.chevron_right,
              enabled: _currentPage < _images.length - 1,
              onTap: () => pageController.nextPage(duration: const Duration(milliseconds: 250), curve: Curves.easeInOut),
            ),
          ),
          Positioned(
            bottom: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(12)),
              child: Text('${_currentPage + 1} / ${_images.length}', style: const TextStyle(color: Colors.white, fontSize: 12)),
            ),
          ),
        ],
      ],
    );
  }
}
