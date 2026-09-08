import os
import unittest

from src.omran_browser.policy import assert_allowed_url
from src.omran_browser.schema import new_intake


class BrowserUseGuardTests(unittest.TestCase):
    def test_store_domain_is_allowed(self):
        assert_allowed_url("https://omrantoys.store/products/test")

    def test_unknown_domain_is_blocked(self):
        old = os.environ.get("OMRAN_BROWSER_ALLOWED_DOMAINS")
        os.environ["OMRAN_BROWSER_ALLOWED_DOMAINS"] = ""
        try:
            with self.assertRaises(ValueError):
                assert_allowed_url("https://example.com/product")
        finally:
            if old is None:
                os.environ.pop("OMRAN_BROWSER_ALLOWED_DOMAINS", None)
            else:
                os.environ["OMRAN_BROWSER_ALLOWED_DOMAINS"] = old

    def test_intake_is_forced_to_needs_review(self):
        payload = {
            "source_url": "https://omrantoys.store/product/test",
            "product_title": "منتج اختبار",
            "brand": None,
            "model_sku": None,
            "dimensions": {"length": None, "width": None, "height": None, "unit": None},
            "components": [],
            "age_guidance": None,
            "materials": [],
            "variants": [],
            "image_urls": [],
            "uncertainty": ["بيانات ناقصة"],
        }
        intake = new_intake(payload)
        self.assertEqual(intake["workflow_status"], "NEEDS_REVIEW")
        self.assertEqual(intake["qa_status"], "PENDING")
        self.assertFalse(intake["active"])


if __name__ == "__main__":
    unittest.main()
