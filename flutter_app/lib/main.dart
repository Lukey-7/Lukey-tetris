import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'services/haptic_service.dart';
import 'services/update_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.black,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const LukeyTetrisApp());
}

class LukeyTetrisApp extends StatelessWidget {
  const LukeyTetrisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Lukey-Tetris',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F140F),
        fontFamily: 'monospace',
      ),
      home: const TetrisGameScreen(),
    );
  }
}

class TetrisGameScreen extends StatefulWidget {
  const TetrisGameScreen({super.key});

  @override
  State<TetrisGameScreen> createState() => _TetrisGameScreenState();
}

class _TetrisGameScreenState extends State<TetrisGameScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initWebView();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      UpdateService.checkForUpdates(context);
    });
  }

  Future<void> _initWebView() async {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0F140F))
      ..addJavaScriptChannel(
        'FlutterHaptics',
        onMessageReceived: (JavaScriptMessage message) {
          HapticService.trigger(message.message);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (NavigationRequest request) {
            if (request.url.contains('space.html')) {
              _controller.loadFlutterAsset('assets/web/space.html');
              return NavigationDecision.prevent;
            }
            if (request.url.contains('index.html')) {
              _controller.loadFlutterAsset('assets/web/index.html');
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
            });
          },
        ),
      )
      ..loadFlutterAsset('assets/web/index.html');
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvoked: (didPop) async {
        if (didPop) return;
        // Trigger pause in game when user clicks back
        _controller.runJavaScript('if (window.tetrisUI) window.tetrisUI.engine.pause();');
        final shouldExit = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF1E241E),
            shape: RoundedRectangleBorder(
              side: const BorderSide(color: Color(0xFF88C070), width: 3),
              borderRadius: BorderRadius.circular(4),
            ),
            title: const Text('??? EXIT GAME?', style: TextStyle(fontFamily: 'monospace', color: Color(0xFF88C070))),
            content: const Text(
              'Your game state and scores are automatically saved.',
              style: TextStyle(fontFamily: 'monospace', color: Colors.white70, fontSize: 12),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('RESUME', style: TextStyle(color: Color(0xFF88C070), fontFamily: 'monospace')),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red[800]),
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('EXIT', style: TextStyle(fontFamily: 'monospace')),
              ),
            ],
          ),
        );
        if (shouldExit == true) {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        body: SafeArea(
          bottom: false,
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_isLoading)
                Container(
                  color: const Color(0xFF0F140F),
                  child: const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '??? LUKEY-TETRIS',
                          style: TextStyle(
                            fontFamily: 'monospace',
                            color: Color(0xFF88C070),
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
                          ),
                        ),
                        SizedBox(height: 16),
                        CircularProgressIndicator(color: Color(0xFF88C070)),
                        SizedBox(height: 12),
                        Text(
                          'LOADING 8-BIT ENGINE...',
                          style: TextStyle(fontFamily: 'monospace', color: Colors.grey, fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
