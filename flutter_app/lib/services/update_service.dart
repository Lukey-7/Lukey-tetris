import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

class UpdateService {
  static const String currentVersion = 'v1.1.1';
  static const String repoOwner = 'Lukey-7';
  static const String repoName = 'Lukey-tetris';

  static Future<void> checkForUpdates(BuildContext context, {bool isManual = false}) async {
    try {
      final url = Uri.parse('https://api.github.com/repos/$repoOwner/$repoName/releases/latest');
      final response = await http.get(url).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final latestTag = data['tag_name'] as String? ?? '';
        final htmlUrl = data['html_url'] as String? ?? 'https://github.com/$repoOwner/$repoName/releases';
        final assets = data['assets'] as List<dynamic>? ?? [];
        String? apkDownloadUrl;

        for (final asset in assets) {
          final name = asset['name'] as String? ?? '';
          if (name.endsWith('.apk')) {
            apkDownloadUrl = asset['browser_download_url'] as String?;
            break;
          }
        }

        if (latestTag.isNotEmpty && latestTag != currentVersion) {
          if (!context.mounted) return;
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              backgroundColor: const Color(0xFF1E241E),
              shape: RoundedRectangleBorder(
                side: const BorderSide(color: Color(0xFF88C070), width: 3),
                borderRadius: BorderRadius.circular(4),
              ),
              title: const Text(
                '?? UPDATE AVAILABLE!',
                style: TextStyle(
                  fontFamily: 'monospace',
                  color: Color(0xFF88C070),
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              content: Text(
                'New version $latestTag is ready! Install over current app without losing your scores or data.',
                style: const TextStyle(
                  fontFamily: 'monospace',
                  color: Colors.white70,
                  fontSize: 12,
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('LATER', style: TextStyle(color: Colors.grey, fontFamily: 'monospace')),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF88C070),
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
                  ),
                  onPressed: () async {
                    Navigator.pop(ctx);
                    final target = Uri.parse(apkDownloadUrl ?? htmlUrl);
                    if (await canLaunchUrl(target)) {
                      await launchUrl(target, mode: LaunchMode.externalApplication);
                    }
                  },
                  child: const Text('DOWNLOAD APK', style: TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                ),
              ],
            ),
          );
          return;
        }
      }

      if (isManual && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF1E241E),
            content: Text(
              '?? App is up to date ($currentVersion)!',
              style: TextStyle(fontFamily: 'monospace', color: Color(0xFF88C070)),
            ),
          ),
        );
      }
    } catch (e) {
      if (isManual && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Offline mode active or could not reach GitHub.'),
          ),
        );
      }
    }
  }
}
