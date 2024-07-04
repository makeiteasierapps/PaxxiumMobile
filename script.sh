#!/bin/bash

# Ensure you are on the branch you want to clean
git checkout main

# Backup the current branch
git branch backup-main

# Filter commits by author email
git filter-branch --commit-filter '
    if [ "$GIT_COMMITTER_EMAIL" = "makeiteasierapps@gmail.com" ]; then
        git commit-tree "$@";
    else
        skip_commit "$@";
    fi' HEAD

# Clean up the backup branch if everything is fine
# git branch -D backup-main