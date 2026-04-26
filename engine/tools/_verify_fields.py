"""Quick verification: fill to temp paths and print key fields."""
from __future__ import annotations
import fitz, tempfile
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent))
from fill_pdf_forms import PROJECTS, fill_ds375

for pid in ["4335-euclid", "2921-el-cajon"]:
    tmp = Path(tempfile.mktemp(suffix=".pdf"))
    fill_ds375(PROJECTS[pid], tmp)
    doc = fitz.open(str(tmp))
    fields = {}
    for page in doc:
        for w in page.widgets():
            if w.field_value:
                fields[w.field_name] = w.field_value[:100]
    print(f"\n=== {pid} ===")
    for k in ["Applicant Name", "Project Address", "Community Planning Area",
              "Base Zone", "Existing", "Proposed", "Existing_2", "Proposed_2",
              "Existing_3", "Proposed_3"]:
        print(f"  {k}: {fields.get(k, '<empty>')}")
    tmp.unlink()
