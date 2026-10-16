import unittest
from homunculus.speech import speech_command

class SpeechTests(unittest.TestCase):
    def test_linux_text_is_data_not_command_options(self):
        text = '--help; $(touch /tmp/nope)'
        args, data = speech_command('/usr/bin/spd-say', text, 'linux')
        self.assertEqual(args[-2:], ['--', text])
        self.assertIsNone(data)
        args, data = speech_command('/usr/bin/espeak-ng', text, 'linux')
        self.assertEqual(data.decode(), text)
        self.assertEqual(args[-1], '--stdin')

    def test_windows_text_is_encoded_not_interpolated_as_code(self):
        text = "'); Remove-Item anything; ('"
        args, data = speech_command('powershell', text, 'win32')
        self.assertNotIn(text, args[-1])
        self.assertIn('FromBase64String', args[-1])
        self.assertIsNone(data)

    def test_failed_host_voice_allows_browser_fallback(self):
        from homunculus.speech import Speaker
        speaker = Speaker(enabled=False)
        try:
            speaker.command = 'a-system-command'
            self.assertTrue(speaker.available)
            speaker.error = 'System speech failed'
            self.assertFalse(speaker.available)
        finally:
            speaker.close()
