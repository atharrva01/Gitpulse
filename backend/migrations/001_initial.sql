CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    github_id       BIGINT UNIQUE NOT NULL,
    login           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url      TEXT NOT NULL DEFAULT '',
    bio             TEXT NOT NULL DEFAULT '',
    location        VARCHAR(255) NOT NULL DEFAULT '',
    github_token    TEXT NOT NULL DEFAULT '',
    impact_score    INT NOT NULL DEFAULT 0,
    current_streak  INT NOT NULL DEFAULT 0,
    longest_streak  INT NOT NULL DEFAULT 0,
    last_synced_at  TIMESTAMPTZ,
    email_digest_opt BOOLEAN NOT NULL DEFAULT false,
    email           VARCHAR(255) NOT NULL DEFAULT '',
    is_public       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pull_requests (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_pr_id    BIGINT NOT NULL,
    repo_owner      VARCHAR(255) NOT NULL,
    repo_name       VARCHAR(255) NOT NULL,
    repo_full_name  VARCHAR(511) NOT NULL,
    title           TEXT NOT NULL DEFAULT '',
    number          INT NOT NULL,
    state           VARCHAR(50) NOT NULL DEFAULT 'merged',
    additions       INT NOT NULL DEFAULT 0,
    deletions       INT NOT NULL DEFAULT 0,
    review_count    INT NOT NULL DEFAULT 0,
    merged_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    html_url        TEXT NOT NULL DEFAULT '',
    UNIQUE(user_id, github_pr_id)
);

CREATE INDEX idx_prs_user_id ON pull_requests(user_id);
CREATE INDEX idx_prs_merged_at ON pull_requests(merged_at DESC);
CREATE INDEX idx_prs_repo ON pull_requests(user_id, repo_full_name);

CREATE TABLE IF NOT EXISTS reviews (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_review_id  BIGINT NOT NULL,
    repo_full_name    VARCHAR(511) NOT NULL,
    pr_number         INT NOT NULL,
    pr_title          TEXT NOT NULL DEFAULT '',
    state             VARCHAR(50) NOT NULL,
    submitted_at      TIMESTAMPTZ NOT NULL,
    time_to_review    BIGINT,
    UNIQUE(user_id, github_review_id)
);

CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_submitted_at ON reviews(submitted_at DESC);

CREATE TABLE IF NOT EXISTS repo_stats (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repo_full_name   VARCHAR(511) NOT NULL,
    pr_count         INT NOT NULL DEFAULT 0,
    review_count     INT NOT NULL DEFAULT 0,
    total_additions  INT NOT NULL DEFAULT 0,
    total_deletions  INT NOT NULL DEFAULT 0,
    first_contrib    TIMESTAMPTZ,
    last_contrib     TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, repo_full_name)
);

CREATE INDEX idx_repo_stats_user ON repo_stats(user_id);

CREATE TABLE IF NOT EXISTS streak_days (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day        DATE NOT NULL,
    has_pr     BOOLEAN NOT NULL DEFAULT false,
    has_review BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(user_id, day)
);

CREATE INDEX idx_streak_days_user ON streak_days(user_id, day DESC);

CREATE TABLE IF NOT EXISTS sync_jobs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(50) NOT NULL DEFAULT 'pending',
    type        VARCHAR(50) NOT NULL DEFAULT 'incremental',
    started_at  TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
