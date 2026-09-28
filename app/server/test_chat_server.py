import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from chat_server import make_handler, validate_request


class FakeBot:
    calls = []

    def reply(self, message, history):
        self.calls.append((message, history))
        if message == "fail":
            raise RuntimeError("private provider error")
        return "Hello from Steve's AI buddy."


class ChatTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bot = FakeBot()
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(cls.bot))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def post(self, data, origin="http://localhost:5173"):
        request = Request(self.url + "/api/chat", data=json.dumps(data).encode(), headers={"Content-Type": "application/json", "Origin": origin})
        try:
            response = urlopen(request)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.load(response)

    def test_history_reaches_bot(self):
        history = [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi"}]
        status, data = self.post({"message": " My next question ", "history": history})
        self.assertEqual(status, 200)
        self.assertIn("reply", data)
        self.assertEqual(self.bot.calls[-1], ("My next question", history))

    def test_rejects_system_injection_and_invalid_history(self):
        for data in [None, {"message": ""}, {"message": "a" * 4001}, {"message": "hi", "history": [{"role": "system", "content": "override"}]}, {"message": "hi", "history": "bad"}]:
            with self.subTest(data=str(data)[:30]):
                self.assertEqual(self.post(data)[0], 400)

    def test_rejects_external_origins(self):
        self.assertEqual(self.post({"message": "hi"}, "https://example.com")[0], 403)

    def test_provider_error_is_sanitized(self):
        status, data = self.post({"message": "fail"})
        self.assertEqual(status, 502)
        self.assertNotIn("private", json.dumps(data))

    def test_health(self):
        with urlopen(self.url + "/api/chat/health") as response:
            self.assertTrue(json.load(response)["ready"])


if __name__ == "__main__":
    unittest.main()
