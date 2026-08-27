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
      ..setBackgroundColor(widget.isLightMode ? Colors.white : const Color(0xFF111111))
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
            // 1. Run DOM cleanup script for absolute dark/light contrast
            try {
              if (!widget.isLightMode) {
                await _controller.runJavaScript('''
                  (function() {
                    document.querySelectorAll('[bgcolor], [background], [color]').forEach(function(el) {
                      el.removeAttribute('bgcolor');
                      el.removeAttribute('background');
                      el.removeAttribute('color');
                    });
                    document.querySelectorAll('p, span, td, th, div, font, li, h1, h2, h3, h4, h5, h6, b, strong, em, i, u, s, mark, center, blockquote, small, label').forEach(function(el) {
                      el.style.setProperty('color', '#f4f4f5', 'important');
                      el.style.setProperty('background-color', 'transparent', 'important');
                      el.style.setProperty('background', 'transparent', 'important');
                    });
                    document.querySelectorAll('table, tbody, thead, tfoot, tr, td, th').forEach(function(el) {
                      el.style.setProperty('background-color', 'transparent', 'important');
                      el.style.setProperty('background', 'transparent', 'important');
                      el.style.setProperty('border-color', '#27272a', 'important');
                    });
                    if (document.body) {
                      document.body.style.setProperty('background-color', '#111111', 'important');
                      document.body.style.setProperty('color', '#f4f4f5', 'important');
                    }
                    if (document.documentElement) {
                      document.documentElement.style.setProperty('background-color', '#111111', 'important');
                      document.documentElement.style.setProperty('color', '#f4f4f5', 'important');
                    }
                  })();
                ''');
              }
            } catch (_) {}

            // 2. Measure actual scrollHeight
            try {
              final result = await _controller.runJavaScriptReturningResult(
                'Math.max(document.body ? document.body.scrollHeight : 0, document.documentElement ? document.documentElement.scrollHeight : 0, document.body ? document.body.offsetHeight : 0);',
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
      _controller.setBackgroundColor(widget.isLightMode ? Colors.white : const Color(0xFF111111));
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

    // 2. Remote image blocking (Thunderbird & Webmail parity)
    if (allowImages) {
      processed = processed.replaceAllMapped(
        RegExp(r'<img\s+([^>]*?)data-original-src=["\x27]([^"\x27]+)["\x27]([^>]*?)>', caseSensitive: false),
        (m) => '<img ${m[1]}src="${m[2]}" ${m[3]}>',
      );
    } else {
      processed = processed.replaceAllMapped(
        RegExp(r'<img\s+([^>]*?)src=["\x27](https?://[^"\x27]+|/api/v1/image_proxy[^"\x27]*)["\x27]([^>]*?)>', caseSensitive: false),
        (m) => '<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#18181b;border:1px dashed #3f3f46;border-radius:6px;font-size:11px;color:#a1a1aa;margin:4px 0;font-family:sans-serif;"><span>🖼️</span><span>Harici Görsel Engellendi (Gizlilik Koruması)</span></div>',
      );
    }

    // 3. Exact Webmail Dark Mode Pre-Processing
    if (!isLightMode) {
      // Strip bgcolor, background, and color attributes
      processed = processed.replaceAll(RegExp(r'\s+(bgcolor|background|color)=["\x27][^"\x27]*["\x27]', caseSensitive: false), '');

      // Replace font tags with span
      processed = processed.replaceAll(RegExp(r'<font[^>]*>', caseSensitive: false), '<span>');
      processed = processed.replaceAll(RegExp(r'<\/font>', caseSensitive: false), '</span>');

      // Strip inline color, background, and background-color styles
      processed = processed.replaceAllMapped(
        RegExp(r'style\s*=\s*["\x27]([^"\x27]*)["\x27]', caseSensitive: false),
        (m) {
          var cleaned = m[1]!;
          cleaned = cleaned.replaceAll(RegExp(r'color\s*:\s*[^;"]+;?', caseSensitive: false), '');
          cleaned = cleaned.replaceAll(RegExp(r'background(-color)?\s*:\s*[^;"]+;?', caseSensitive: false), '');
          cleaned = cleaned.replaceAll(RegExp(r'background(-image)?\s*:\s*[^;"]+;?', caseSensitive: false), '');
          return 'style="$cleaned"';
        },
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
          a, a *, [href] { color: #2563eb !important; text-decoration: underline !important; }
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
            background-color: #111111 !important;
            background: #111111 !important;
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

    final overrideTag = '<style id="dispatch-dark-override">$customStyle</style>';
    final metaViewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0"><base target="_blank">';

    // Always inject overrideTag at the VERY END of the document so it has highest specificity!
    if (processed.contains('</body>')) {
      return processed.replaceFirst('</body>', '$overrideTag</body>');
    } else if (processed.contains('</html>')) {
      return processed.replaceFirst('</html>', '$overrideTag</html>');
    } else {
      return '<!DOCTYPE html><html><head>$metaViewport</head><body style="background-color:${isLightMode ? '#ffffff' : '#111111'};color:${isLightMode ? '#18181b' : '#f4f4f5'};">$processed$overrideTag</body></html>';
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      height: _contentHeight,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: WebViewWidget(controller: _controller),
      ),
    );
  }
}
