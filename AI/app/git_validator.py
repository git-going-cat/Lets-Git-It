import re

_GIT_SUBCOMMANDS = frozenset({
    "add", "am", "archive", "bisect", "blame", "branch", "checkout",
    "cherry-pick", "clean", "clone", "commit", "config", "describe",
    "diff", "fetch", "format-patch", "gc", "grep", "init", "log",
    "merge", "mv", "notes", "pull", "push", "rebase", "reflog",
    "remote", "reset", "restore", "revert", "rm", "shortlog", "show",
    "sparse-checkout", "stash", "status", "submodule", "switch", "tag",
    "worktree",
})


def is_git_like(text: str) -> bool:
    if re.search(r"[가-힣]", text):
        return False
    parts = text.strip().lower().split()
    if not parts:
        return False
    if parts[0] == "git":
        return len(parts) > 1 and parts[1] in _GIT_SUBCOMMANDS
    return parts[0] in _GIT_SUBCOMMANDS
