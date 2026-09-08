import json
import tempfile
import unittest
from pathlib import Path

from content_factory import enrich_factory_draft
from pipeline import STATE_APPROVED, STATE_REJECTED, approve, reject


class ApprovalPipelineTests(unittest.TestCase):
    def _draft(self, root: Path) -> Path:
        path = root / "draft.json"
        path.write_text(
            json.dumps(
                {
                    "product_id": "OMR-1",
                    "status": "DRAFT_REVIEW_REQUIRED",
                    "publishing": {"auto_publish": False, "requires_human_approval": True},
                    "moneyprinter_payload": {"video_subject": "x", "video_script": "y", "video_terms": [], "video_aspect": "9:16"},
                }
            ),
            encoding="utf-8",
        )
        return path

    def test_approval_never_allows_social_publish(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            record = approve(self._draft(root), root, "Alaa")
            self.assertEqual(record["state"], STATE_APPROVED)
            self.assertTrue(record["render_allowed"])
            self.assertFalse(record["social_publish_allowed"])

    def test_rejection_blocks_render(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            record = reject(self._draft(root), root, "Alaa", "needs changes")
            self.assertEqual(record["state"], STATE_REJECTED)
            self.assertFalse(record["render_allowed"])
            self.assertFalse(record["social_publish_allowed"])

    def test_content_factory_stays_review_only(self):
        product = {
            "id": "OMR-1",
            "name": "عربية ريموت",
            "active": True,
            "workflow_status": "PUBLISHED",
            "qa_status": "PASS",
            "description": "لعبة تحكم عن بعد",
            "processed_image": "/products/x.webp",
        }
        draft = enrich_factory_draft(product)
        self.assertEqual(draft["factory"]["render_mode"], "HUMAN_APPROVAL_REQUIRED")
        self.assertFalse(draft["factory"]["social_publish_allowed"])
        self.assertEqual(draft["creative"]["source_image"], "/products/x.webp")


if __name__ == "__main__":
    unittest.main()
