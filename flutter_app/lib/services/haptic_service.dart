import 'package:flutter/services.dart';
import 'package:vibration/vibration.dart';

class HapticService {
  static Future<void> trigger(String type) async {
    try {
      final hasVibrator = (await Vibration.hasVibrator()) == true;
      if (type == 'heavy' || type == 'tetris') {
        if (hasVibrator) {
          Vibration.vibrate(pattern: [0, 40, 30, 40]);
        } else {
          HapticFeedback.heavyImpact();
        }
      } else if (type == 'medium' || type == 'clear') {
        if (hasVibrator) {
          Vibration.vibrate(duration: 25);
        } else {
          HapticFeedback.mediumImpact();
        }
      } else {
        if (hasVibrator) {
          Vibration.vibrate(duration: 12);
        } else {
          HapticFeedback.lightImpact();
        }
      }
    } catch (e) {
      // Fallback
      HapticFeedback.selectionClick();
    }
  }
}
