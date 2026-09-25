from pathlib import Path
from shutil import copytree

from mkdocs.config.defaults import MkDocsConfig


def on_post_build(*, config: MkDocsConfig) -> None:
    """Copy generated TypeDoc after MkDocs finishes processing Markdown."""
    repository_root = Path(__file__).resolve().parents[2]
    source = (
        repository_root
        / "packages"
        / "cactus-plugin-satp-hermes"
        / "public"
        / "typedoc"
    )
    if not source.is_dir():
        return

    destination = Path(config.site_dir) / "satp-hermes" / "typedoc"
    copytree(source, destination, dirs_exist_ok=True)
