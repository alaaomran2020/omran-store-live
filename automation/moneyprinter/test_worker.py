import unittest

from worker import build_draft, is_approved


class MoneyPrinterWorkerTests(unittest.TestCase):
    def test_rejects_needs_review(self):
        product = {"id": "x", "name": "test", "active": False, "workflow_status": "NEEDS_REVIEW"}
        self.assertFalse(is_approved(product))

    def test_rejects_failed_qa_when_present(self):
        product = {"id": "x", "name": "test", "active": True, "workflow_status": "PUBLISHED", "qa_status": "FAIL"}
        self.assertFalse(is_approved(product))

    def test_draft_never_auto_publishes(self):
        product = {
            "id": "OMR-1",
            "name": "عربية ريموت",
            "active": True,
            "workflow_status": "PUBLISHED",
            "qa_status": "PASS",
            "description": "لعبة تحكم عن بعد",
            "category": "تحكم عن بعد",
        }
        draft = build_draft(product)
        self.assertEqual(draft["status"], "DRAFT_REVIEW_REQUIRED")
        self.assertFalse(draft["publishing"]["auto_publish"])
        self.assertTrue(draft["publishing"]["requires_human_approval"])
        self.assertEqual(draft["moneyprinter_payload"]["video_aspect"], "9:16")


if __name__ == "__main__":
    unittest.main()
