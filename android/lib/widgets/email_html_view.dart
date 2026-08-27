import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../services/api_service.dart';

class EmailHtmlView extends StatefulWidget {
  final String html;
  final bool allowRemoteImages;
  final bool isLightMode;

  const EmailHtmlView({
    super.key,
    required this.html,
    this.allowRemoteImages = false,
    this.isLightMode = false,
  });

  @override
  State<EmailHtmlView> createState() => _EmailHtmlViewState();
}

class _EmailHtmlViewState extends State<EmailHtmlView> {
  late final WebViewController _controller;
  double _contentHeight = 300;

  @override
  void initState() {
    super.initState();
    _initController();
  }

  void _initController() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(widget.isLightMode ? Colors.white : Colors.transparent)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (NavigationRequest request) {
            final uri = Uri.tryParse(request.url);
            if (uri != null && (request.url.startsWith('http://') || request.url.startsWith('https://') || request.url.startsWith('mailto:'))) {
              launchUrl(uri, mode: LaunchMode.externalApplication);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
          onPageFinished: (String url) async {
            if (!mounted) return;
            try {
              final result = await _controller.runJavaScriptReturningResult(
                'Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight);',
              );
              final height = double.tryParse(result.toString());
              if (height != null && height > 50 && mounted) {
                setState(() {
                  _contentHeight = height + 30;
                });
              }
            } catch (_) {}
          },
        ),
      );

    _loadHtml();
  }

  @override
  void didUpdateWidget(covariant EmailHtmlView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.html != widget.html ||
        oldWidget.allowRemoteImages != widget.allowRemoteImages ||
        oldWidget.isLightMode != widget.isLightMode) {
      _controller.setBackgroundColor(widget.isLightMode ? Colors.white : Colors.transparent);
      _loadHtml();
    }
  }

  void _loadHtml() {
    final fullDoc = _generateFullHtml(widget.html, widget.allowRemoteImages, widget.isLightMode);
    _controller.loadHtmlString(fullDoc, baseUrl: ApiService.baseUrl);
  }

  String _generateFullHtml(String rawHtml, bool allowImages, bool isLightMode) {
    var processed = rawHtml;

    // 1. Resolve relative URLs like /api/v1/image_proxy... or /uploads/...
    final serverBase = ApiService.baseUrl;
    processed = processed.replaceAllMapped(
      RegExp(r'''src=["'](/[^"']+)["']''', caseSensitive: false),
      (m) => 'src="$serverBase${m[1]}"',
    );

    // 2. Remote image blocking (Thunderbird parity)
    if (!allowImages) {
      processed = processed.replaceAllMapped(
        RegExp(r'<img([^>]*)>', caseSensitive: false),
        (m) => '<span style="display:inline-block; padding:4px 8px; margin:4px 0; background:#1e293b; color:#94a3b8; border-radius:6px; font-size:11px; border:1px dashed #475569;">📷 [Fotoğraf Gizlendi]</span>',
      );
    }

    final customStyle = isLightMode
        ? '''
          :root { color-scheme: light !important; }
          html, body {
            margin: 0 !important;
            padding: 8px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 15px !important;
            line-height: 1.6 !important;
            word-wrap: break-word !important;
            color: #18181b !important;
            background-color: #ffffff !important;
          }
          * { max-width: 100% !important; box-sizing: border-box; }
          table { max-width: 100% !important; width: 100% !important; }
          a, a *, [href] { color: #2563eb !important; }
          img { max-width: 100% !important; height: auto !important; border-radius: 8px !important; }
        '''
        : '''
          :root { color-scheme: dark !important; }
          * {
            background-color: transparent !important;
            background: transparent !important;
            color: #f4f4f5 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            box-sizing: border-box;
          }
          html, body {
            margin: 0 !important;
            padding: 8px !important;
            background-color: transparent !important;
            background: transparent !important;
            color: #f4f4f5 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 15px !important;
            line-height: 1.6 !important;
            word-wrap: break-word !important;
          }
          table, tbody, thead, tfoot, tr, td, th, div, section, article, main, header, footer, center, blockquote {
            background-color: transparent !important;
            background: transparent !important;
            border-color: #27272a !important;
          }
          p, div, span, td, th, li, h1, h2, h3, h4, h5, h6, font, b, strong, em, i, u, s, mark, blockquote, center, label, small {
            color: #f4f4f5 !important;
            background-color: transparent !important;
          }
          a, a *, [href] {
            color: #60a5fa !important;
            text-decoration: underline !important;
          }
          pre, code, kbd, samp {
            background-color: #18181b !important;
            color: #f4f4f5 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
          }
          pre {
            padding: 12px 16px !important;
            overflow-x: auto !important;
            margin: 12px 0 !important;
          }
          img {
            max-width: 100% !important;
            height: auto !important;
            border-radius: 8px !important;
          }
          hr {
            border: 0 !important;
            border-top: 1px solid #27272a !important;
            margin: 16px 0 !important;
          }
        ''';

    final styleTag = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0"><style>$customStyle</style>';

    if (processed.contains('<head>')) {
      return processed.replaceFirst('<head>', '<head>$styleTag');
    } else if (processed.contains('<html>') || processed.contains('<!DOCTYPE') || processed.contains('<!doctype')) {
      return '<!DOCTYPE html><html><head>$styleTag</head><body>$processed</body></html>';
    } else {
      return '<!DOCTYPE html><html><head>$styleTag</head><body>$processed</body></html>';
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      height: _contentHeight,
      child: WebViewWidget(controller: _controller),
    );
  }
}
