# Plan: Add `.env` to `.gitignore`

## Goal
Prevent the `.env` file from being committed to the public GitHub repository, even though its current contents are public-safe.

## Current state
- `.gitignore` exists but does not include `.env`.
- `.env` contains only the Supabase project URL and publishable/anon key, which are public by design.

## Steps
1. Append `.env` to `.gitignore` under a short comment.
2. Verify the file change reads correctly.

## Outcome
`.env` will be excluded from version control going forward. Existing committed `.env` history, if any, is outside the scope of this change.