"""Quick smoke test for the smart caching credential flow."""

import os
import sys
import tempfile

# Ensure mock_data is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

from mock_data.config import load_or_generate_credentials


def test_smart_caching() -> None:
    """Test: generate -> save -> reload -> skip registration."""
    # Use a temp file to avoid polluting real credentials
    tmp_dir = os.path.join(os.path.dirname(__file__), "_test_tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_file = os.path.join(tmp_dir, "test_creds.json")

    # Clean up any previous test
    if os.path.exists(tmp_file):
        os.remove(tmp_file)

    # Run 1: No file exists -> should generate + needs_registration=True
    creds_1, needs_reg_1 = load_or_generate_credentials(tmp_file, 3)
    assert needs_reg_1 is True, f"Expected needs_registration=True, got {needs_reg_1}"
    assert len(creds_1) == 3, f"Expected 3 credentials, got {len(creds_1)}"
    assert os.path.exists(tmp_file), "Credentials file should have been created"
    print("RUN 1 PASSED: Generated 3 credentials, needs_registration=True")

    # Run 2: File exists with 3 entries, requesting 3 -> cache hit
    creds_2, needs_reg_2 = load_or_generate_credentials(tmp_file, 3)
    assert needs_reg_2 is False, f"Expected needs_registration=False, got {needs_reg_2}"
    assert len(creds_2) == 3
    assert creds_2[0].email == creds_1[0].email, "Cached credentials should match"
    print("RUN 2 PASSED: Cache hit, needs_registration=False")

    # Run 3: File exists with 3 entries, requesting 5 -> insufficient, regenerate
    creds_3, needs_reg_3 = load_or_generate_credentials(tmp_file, 5)
    assert needs_reg_3 is True, f"Expected needs_registration=True, got {needs_reg_3}"
    assert len(creds_3) == 5
    print("RUN 3 PASSED: Cache insufficient (3 < 5), regenerated 5, needs_registration=True")

    # Run 4: File now has 5 entries, requesting 3 -> cache hit (5 >= 3)
    creds_4, needs_reg_4 = load_or_generate_credentials(tmp_file, 3)
    assert needs_reg_4 is False
    assert len(creds_4) == 3
    print("RUN 4 PASSED: Cache hit (5 >= 3), returned first 3")

    # Cleanup
    os.remove(tmp_file)
    os.rmdir(tmp_dir)
    print("\nAll smart caching tests PASSED.")


if __name__ == "__main__":
    test_smart_caching()
