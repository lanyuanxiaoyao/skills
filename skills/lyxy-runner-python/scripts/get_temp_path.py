# /// script
# dependencies = []
# ///

import tempfile

temp_dir = tempfile.gettempdir()
temp_file_path = tempfile.NamedTemporaryFile(
    mode="w", suffix=".py", prefix="uv_script_", dir=temp_dir, delete=False
).name

print(temp_file_path)
